import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/guards";
import { dbConnect } from "@/lib/db";
import { esgCertificatePdf, pdfResponse } from "@/lib/pdf";
import { Supplier } from "@/models/Supplier";
import { Product, co2Factor } from "@/models/Product";

/** ESG impact certificate for the signed-in supplier (admins can pass ?supplierId=). */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user || (user.role !== "supplier" && user.role !== "admin")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await dbConnect();
  const qId = new URL(req.url).searchParams.get("supplierId");
  const supplier = user.role === "admin" && qId ? await Supplier.findById(qId).lean() : await Supplier.findOne({ userId: user.id }).lean();
  if (!supplier) return NextResponse.json({ error: "No supplier profile" }, { status: 404 });

  const lots = await Product.find({ supplierId: supplier._id }).select("materialType weightKg soldQty sellByWeight").lean();
  // CO2 is estimated from what has actually sold (= diverted), per material.
  const co2 = lots.reduce((s, l) => s + (l.sellByWeight ? l.soldQty : l.weightKg * l.soldQty) * co2Factor(l.materialType), 0);
  const bytes = await esgCertificatePdf({
    company: supplier.companyName,
    industry: supplier.industry,
    kg: supplier.totalKgDiverted,
    co2,
    lots: lots.length,
    since: supplier.createdAt,
  });
  return pdfResponse(bytes, `offcut-esg-${supplier.companyName.replace(/\W+/g, "-").toLowerCase()}.pdf`);
}
