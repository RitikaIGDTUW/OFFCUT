"use server";
import Papa from "papaparse";
import { revalidatePath, revalidateTag } from "next/cache";
import { Types } from "mongoose";
import { actionError, assertAdmin } from "@/lib/guards";
import { audit } from "@/lib/audit";
import { textToHtml } from "@/lib/sanitize";
import { deleteUploadedFiles, removedKeys } from "@/lib/utapi";
import { slugify, type ActionResult } from "@/lib/utils";
import { objectId } from "@/lib/validations/common";
import { categorySchema, productSchema } from "@/lib/validations/product";
import { CONDITIONS, DIM_UNITS, GRADES, PRODUCT_STATUS, UNIT_TYPES } from "@/lib/constants";
import { Product, type IProduct } from "@/models/Product";
import { Category } from "@/models/Category";
import { nextLotNumber } from "@/models/Counter";
import { StockAdjustment, SupplierSubmission } from "@/models/misc";

const list = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

function refresh() {
  revalidateTag("catalog");
  revalidatePath("/admin/products");
}

async function uniqueSlug(base: string, excludeId?: string) {
  const root = slugify(base) || "lot";
  let slug = root;
  for (let i = 2; await Product.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }); i++) slug = `${root}-${i}`;
  return slug;
}

/* ───────── Products (lots) ───────── */
export async function saveProduct(input: unknown, id?: string, submissionId?: string): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await assertAdmin();
    const d = productSchema.parse(input);
    const doc = id ? await Product.findById(objectId.parse(id)).select("+costPrice") : new Product({ lotNumber: await nextLotNumber() });
    if (!doc) return { ok: false, error: "Lot not found." };
    const before = id ? doc.toObject() : undefined;
    const oldFiles = [...doc.images, ...(doc.specSheetPdf?.key ? [doc.specSheetPdf] : [])].map((f) => ({ key: f.key }));

    doc.set({
      title: d.title,
      slug: await uniqueSlug(d.slug || d.title, id),
      description: textToHtml(d.description),
      categoryId: d.categoryId,
      supplierId: d.supplierId ? objectId.parse(d.supplierId) : null,
      materialType: d.materialType,
      grade: d.grade,
      gradeDetail: d.gradeDetail || undefined,
      condition: d.condition,
      dimensions: { ...d.dimensions, thickness: d.dimensions.thickness || null },
      isRoll: d.isRoll,
      rollLength: d.isRoll ? d.rollLength || null : null,
      weightKg: d.weightKg,
      quantityAvailable: d.quantityAvailable,
      unitType: d.unitType,
      sellByWeight: d.sellByWeight,
      price: d.price,
      compareAtRetailPrice: d.compareAtRetailPrice || null,
      costPrice: d.costPrice || null,
      colour: d.colour || undefined,
      finish: d.finish || undefined,
      origin: d.origin || undefined,
      certifications: list(d.certifications),
      tags: list(d.tags).map((t) => t.toLowerCase()),
      images: d.images.map((im) => ({ ...im, alt: im.alt || d.title })),
      specSheetPdf: d.specSheetPdf ?? undefined,
      status: d.status,
      featured: d.featured,
    });
    await doc.save();

    const newFiles = [...doc.images, ...(doc.specSheetPdf?.key ? [doc.specSheetPdf] : [])].map((f) => ({ key: f.key }));
    await deleteUploadedFiles(removedKeys(oldFiles, newFiles));

    if (submissionId) {
      await SupplierSubmission.updateOne(
        { _id: objectId.parse(submissionId) },
        { status: "listed", $addToSet: { linkedProductIds: doc._id }, $push: { statusHistory: { status: "listed", note: `Listed as LOT #${doc.lotNumber}`, at: new Date() } } },
      );
    }
    await audit(admin, id ? "product.update" : "product.create", "Product", doc._id.toString(), before, doc.toObject());
    refresh();
    return { ok: true, data: { id: doc._id.toString() }, message: `LOT #${doc.lotNumber} saved` };
  } catch (e) {
    return actionError(e);
  }
}

export async function duplicateProduct(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await assertAdmin();
    const src = await Product.findById(objectId.parse(id)).select("+costPrice").lean<IProduct>();
    if (!src) return { ok: false, error: "Lot not found." };
    const { _id, createdAt: _c, updatedAt: _u, ...rest } = src;
    const copy = new Product({
      ...rest,
      lotNumber: await nextLotNumber(),
      title: `${src.title} (copy)`,
      slug: await uniqueSlug(`${src.title}-copy`),
      status: "draft",
      soldQty: 0,
      views: 0,
      // Copies share photos by URL but not the UploadThing keys, so deleting one never deletes the other's files.
      images: src.images.map(({ url, alt }) => ({ url, alt })),
      specSheetPdf: src.specSheetPdf?.url ? { url: src.specSheetPdf.url } : undefined,
    });
    await copy.save();
    await audit(admin, "product.duplicate", "Product", copy._id.toString(), { from: _id.toString() });
    refresh();
    return { ok: true, data: { id: copy._id.toString() }, message: `Duplicated as LOT #${copy.lotNumber}` };
  } catch (e) {
    return actionError(e);
  }
}

export type BulkAction = "activate" | "archive" | "feature" | "unfeature" | "delete" | "category";

export async function bulkProducts(ids: string[], action: BulkAction, categoryId?: string): Promise<ActionResult> {
  try {
    const admin = await assertAdmin();
    const oids = ids.map((i) => objectId.parse(i));
    if (!oids.length) return { ok: false, error: "Select at least one lot." };
    if (action === "delete") {
      const docs = await Product.find({ _id: { $in: oids } }).lean();
      await Product.deleteMany({ _id: { $in: oids } });
      await deleteUploadedFiles(docs.flatMap((d) => [...d.images.map((i) => i.key), d.specSheetPdf?.key]));
    } else if (action === "category") {
      await Product.updateMany({ _id: { $in: oids } }, { categoryId: objectId.parse(categoryId ?? "") });
    } else if (action === "activate") {
      await Product.updateMany({ _id: { $in: oids }, quantityAvailable: { $gt: 0 } }, { status: "active" });
      await Product.updateMany({ _id: { $in: oids }, quantityAvailable: { $lte: 0 } }, { status: "sold-out" });
    } else {
      const update = action === "archive" ? { status: "archived" } : { featured: action === "feature" };
      await Product.updateMany({ _id: { $in: oids } }, update);
    }
    await audit(admin, `product.bulk.${action}`, "Product", ids.join(","), undefined, { categoryId });
    refresh();
    return { ok: true, message: `${ids.length} lot(s) updated` };
  } catch (e) {
    return actionError(e);
  }
}

/**
 * CSV import. Columns (header row required):
 * title,category,materialType,grade,gradeDetail,condition,length,width,thickness,unit,weightKg,quantity,unitType,sellByWeight,price,retailPrice,colour,finish,origin,tags,imageUrl,status
 */
export async function importProductsCsv(csv: string): Promise<ActionResult<{ created: number; errors: string[] }>> {
  try {
    const admin = await assertAdmin();
    if (csv.length > 2_000_000) return { ok: false, error: "CSV too large (2 MB max)." };
    const parsed = Papa.parse<Record<string, string>>(csv.trim(), { header: true, skipEmptyLines: true });
    const cats = await Category.find().select("slug name").lean();
    const catBy = (v: string) => cats.find((c) => c.slug === slugify(v) || c.name.toLowerCase() === v.toLowerCase());
    const pick = <T extends readonly string[]>(arr: T, v: string | undefined, def: T[number]): T[number] => (arr.includes(v ?? "") ? (v as T[number]) : def);
    let created = 0;
    const errors: string[] = [];
    for (const [i, row] of parsed.data.entries()) {
      const cat = catBy(row.category ?? "");
      const input = {
        title: row.title,
        categoryId: cat?._id.toString() ?? "",
        materialType: row.materialType,
        grade: pick(GRADES, row.grade, "A"),
        gradeDetail: row.gradeDetail ?? "",
        condition: pick(CONDITIONS, row.condition, "offcut"),
        dimensions: { length: row.length, width: row.width, thickness: row.thickness || 0, unit: pick(DIM_UNITS, row.unit, "mm") },
        weightKg: row.weightKg || 0,
        quantityAvailable: row.quantity || 1,
        unitType: pick(UNIT_TYPES, row.unitType, "piece"),
        sellByWeight: /^(1|true|yes)$/i.test(row.sellByWeight ?? ""),
        price: row.price,
        compareAtRetailPrice: row.retailPrice || 0,
        colour: row.colour ?? "",
        finish: row.finish ?? "",
        origin: row.origin ?? "",
        tags: row.tags ?? "",
        images: row.imageUrl ? [{ url: row.imageUrl, alt: row.title }] : [],
        status: pick(PRODUCT_STATUS, row.status, "draft"),
      };
      const check = productSchema.safeParse(input);
      if (!check.success) {
        errors.push(`Row ${i + 2}: ${check.error.issues.map((x) => `${x.path.join(".")} ${x.message}`).join("; ")}`);
        continue;
      }
      const d = check.data;
      await new Product({
        ...d,
        lotNumber: await nextLotNumber(),
        slug: await uniqueSlug(d.title),
        description: textToHtml(d.description),
        supplierId: null,
        certifications: list(d.certifications),
        tags: list(d.tags),
        dimensions: { ...d.dimensions, thickness: d.dimensions.thickness || null },
        compareAtRetailPrice: d.compareAtRetailPrice || null,
        specSheetPdf: undefined,
      }).save();
      created++;
    }
    await audit(admin, "product.import", "Product", undefined, undefined, { created, errors: errors.length });
    refresh();
    return { ok: true, data: { created, errors }, message: `Imported ${created} lot(s)` };
  } catch (e) {
    return actionError(e);
  }
}

/* ───────── Inventory ───────── */
export async function adjustStock(id: string, delta: number, reason: string): Promise<ActionResult> {
  try {
    const admin = await assertAdmin();
    if (!Number.isFinite(delta) || delta === 0) return { ok: false, error: "Enter a non-zero adjustment." };
    if (reason.trim().length < 3) return { ok: false, error: "Give a reason for the adjustment." };
    const p = await Product.findById(objectId.parse(id));
    if (!p) return { ok: false, error: "Lot not found." };
    const before = p.quantityAvailable;
    p.quantityAvailable = Math.max(0, before + delta);
    await p.save();
    await StockAdjustment.create({ productId: p._id, lotNumber: p.lotNumber, delta: p.quantityAvailable - before, resultingQty: p.quantityAvailable, reason: reason.trim().slice(0, 200), by: admin.email });
    await audit(admin, "inventory.adjust", "Product", id, { qty: before }, { qty: p.quantityAvailable, reason });
    refresh();
    revalidatePath("/admin/inventory");
    return { ok: true, message: `Stock is now ${p.quantityAvailable}` };
  } catch (e) {
    return actionError(e);
  }
}

/* ───────── Categories ───────── */
export async function saveCategory(input: unknown, id?: string): Promise<ActionResult> {
  try {
    const admin = await assertAdmin();
    const d = categorySchema.parse(input);
    const slug = d.slug || slugify(d.name);
    const data = { name: d.name, slug, description: d.description, image: d.image ?? undefined, parent: d.parent ? objectId.parse(d.parent) : null, isActive: d.isActive };
    if (id && d.parent === id) return { ok: false, error: "A category can't be its own parent." };
    if (id) {
      const before = await Category.findById(objectId.parse(id)).lean();
      if (before?.image?.key && before.image.key !== d.image?.key) await deleteUploadedFiles([before.image.key]);
      await Category.updateOne({ _id: id }, data);
      await audit(admin, "category.update", "Category", id, before, data);
    } else {
      const order = await Category.countDocuments();
      const c = await Category.create({ ...data, order });
      await audit(admin, "category.create", "Category", c._id.toString(), undefined, data);
    }
    revalidateTag("catalog");
    revalidatePath("/admin/categories");
    return { ok: true, message: "Category saved" };
  } catch (e) {
    return actionError(e);
  }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  try {
    const admin = await assertAdmin();
    const oid = objectId.parse(id);
    if (await Product.exists({ categoryId: oid })) return { ok: false, error: "Move or delete this category's lots first." };
    if (await Category.exists({ parent: oid })) return { ok: false, error: "Delete its subcategories first." };
    const c = await Category.findByIdAndDelete(oid).lean();
    if (c?.image?.key) await deleteUploadedFiles([c.image.key]);
    await audit(admin, "category.delete", "Category", id, c);
    revalidateTag("catalog");
    revalidatePath("/admin/categories");
    return { ok: true, message: "Category deleted" };
  } catch (e) {
    return actionError(e);
  }
}

export async function reorderCategories(ids: string[]): Promise<ActionResult> {
  try {
    const admin = await assertAdmin();
    await Category.bulkWrite(ids.map((id, order) => ({ updateOne: { filter: { _id: new Types.ObjectId(objectId.parse(id)) }, update: { order } } })));
    await audit(admin, "category.reorder", "Category", undefined, undefined, ids);
    revalidateTag("catalog");
    return { ok: true };
  } catch (e) {
    return actionError(e);
  }
}
