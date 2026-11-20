import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { IOrder } from "@/models/Order";
import type { SiteSettings } from "./settings";

/**
 * PDFs drawn with pdf-lib using built-in fonts (no files to ship).
 * Built-in fonts only support WinAnsi characters, so we print "Rs." instead of the rupee sign.
 */
const INK = rgb(0.1, 0.1, 0.094);
const GRAPHITE = rgb(0.36, 0.35, 0.33);
const SIGNAL = rgb(1, 0.357, 0.122);
const MOSS = rgb(0.247, 0.353, 0.235);
const RULE = rgb(0.81, 0.78, 0.73);

const rs = (n: number) => `Rs. ${Math.round(n).toLocaleString("en-IN")}`;
const ascii = (s: string) => s.replace(/[^\x20-\x7E\xA0-\xFF]/g, "-");

type Ctx = { page: PDFPage; mono: PDFFont; monoBold: PDFFont; sans: PDFFont; sansBold: PDFFont };

async function setup() {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const ctx: Ctx = {
    page,
    mono: await pdf.embedFont(StandardFonts.Courier),
    monoBold: await pdf.embedFont(StandardFonts.CourierBold),
    sans: await pdf.embedFont(StandardFonts.Helvetica),
    sansBold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };
  page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(0.949, 0.933, 0.902) });
  return { pdf, ctx };
}

function text(ctx: Ctx, s: string, x: number, y: number, opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb> } = {}) {
  ctx.page.drawText(ascii(s), { x, y, size: opts.size ?? 10, font: opts.font ?? ctx.sans, color: opts.color ?? INK });
}
function right(ctx: Ctx, s: string, xRight: number, y: number, size = 10, font?: PDFFont) {
  const f = font ?? ctx.mono;
  text(ctx, s, xRight - f.widthOfTextAtSize(ascii(s), size), y, { size, font: f });
}
function hr(ctx: Ctx, y: number, color = INK) {
  ctx.page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 1, color });
}
function header(ctx: Ctx, title: string, settings: SiteSettings) {
  text(ctx, "OFFCUT", 40, 790, { size: 20, font: ctx.monoBold });
  text(ctx, "MATERIAL EXCHANGE", 40, 776, { size: 8, font: ctx.mono, color: GRAPHITE });
  right(ctx, title, 555, 790, 16, ctx.monoBold);
  text(ctx, ascii(settings.contact.address), 40, 762, { size: 8, color: GRAPHITE });
  text(ctx, `${settings.contact.email} · ${settings.contact.phone}`.replace("·", "|"), 40, 751, { size: 8, color: GRAPHITE });
  hr(ctx, 740);
}

function addressBlock(ctx: Ctx, order: IOrder, x: number, y: number) {
  const a = order.shippingAddress;
  text(ctx, "SHIP TO", x, y, { size: 8, font: ctx.mono, color: GRAPHITE });
  [a.fullName, a.line1, a.line2, `${a.city}, ${a.state} ${a.pincode}`, a.country, `Ph: ${a.phone}`]
    .filter(Boolean)
    .forEach((l, i) => text(ctx, l as string, x, y - 14 - i * 12, { size: 10 }));
}

export async function invoicePdf(order: IOrder, settings: SiteSettings) {
  const { pdf, ctx } = await setup();
  header(ctx, "TAX INVOICE", settings);
  text(ctx, "INVOICE NO.", 40, 715, { size: 8, font: ctx.mono, color: GRAPHITE });
  text(ctx, `INV-${order.orderNumber}`, 40, 702, { size: 11, font: ctx.monoBold });
  text(ctx, "DATE", 220, 715, { size: 8, font: ctx.mono, color: GRAPHITE });
  text(ctx, new Date(order.createdAt).toLocaleDateString("en-IN"), 220, 702, { size: 11, font: ctx.mono });
  text(ctx, "PAYMENT", 360, 715, { size: 8, font: ctx.mono, color: GRAPHITE });
  text(ctx, `${order.paymentMethod.toUpperCase()} / ${order.paymentStatus.toUpperCase()}`, 360, 702, { size: 11, font: ctx.mono });
  addressBlock(ctx, order, 40, 670);

  let y = 570;
  hr(ctx, y + 14);
  text(ctx, "LOT", 40, y, { size: 8, font: ctx.mono, color: GRAPHITE });
  text(ctx, "DESCRIPTION", 110, y, { size: 8, font: ctx.mono, color: GRAPHITE });
  right(ctx, "QTY", 400, y, 8);
  right(ctx, "RATE", 470, y, 8);
  right(ctx, "AMOUNT", 555, y, 8);
  hr(ctx, y - 6, RULE);
  y -= 22;
  for (const it of order.items) {
    text(ctx, `#${it.lotNumber}`, 40, y, { size: 9, font: ctx.mono });
    text(ctx, it.title.slice(0, 48), 110, y, { size: 9 });
    text(ctx, it.specs.slice(0, 60), 110, y - 11, { size: 7, font: ctx.mono, color: GRAPHITE });
    right(ctx, String(it.qty), 400, y, 9);
    right(ctx, rs(it.price), 470, y, 9);
    right(ctx, rs(it.price * it.qty), 555, y, 9);
    y -= 30;
    if (y < 200) break;
  }
  hr(ctx, y + 10, RULE);
  const rows: [string, number][] = [
    ["Subtotal", order.subtotal],
    ...(order.discount ? ([[`Discount (${order.couponCode ?? ""})`, -order.discount]] as [string, number][]) : []),
    [`GST @ ${order.taxRate}% (CGST ${order.taxRate / 2}% + SGST ${order.taxRate / 2}%)`, order.tax],
    ["Shipping", order.shipping],
  ];
  y -= 6;
  for (const [k, v] of rows) {
    right(ctx, k, 470, y, 9, ctx.sans);
    right(ctx, v < 0 ? `- ${rs(-v)}` : rs(v), 555, y, 9);
    y -= 15;
  }
  hr(ctx, y + 6);
  right(ctx, "TOTAL", 470, y - 10, 11, ctx.sansBold);
  right(ctx, rs(order.total), 555, y - 10, 12, ctx.monoBold);

  ctx.page.drawRectangle({ x: 40, y: 80, width: 515, height: 40, borderColor: MOSS, borderWidth: 1 });
  text(ctx, `IMPACT: THIS ORDER DIVERTED ${order.kgDiverted.toFixed(1)} KG FROM LANDFILL (~${order.co2SavedKg.toFixed(0)} KG CO2e AVOIDED, EST.)`, 50, 96, {
    size: 8,
    font: ctx.mono,
    color: MOSS,
  });
  text(ctx, "Computer-generated invoice for a college-project demo. Not a valid tax document.", 40, 50, { size: 7, color: GRAPHITE });
  return pdf.save();
}

export async function packingSlipPdf(order: IOrder, settings: SiteSettings) {
  const { pdf, ctx } = await setup();
  header(ctx, "PACKING SLIP", settings);
  text(ctx, order.orderNumber, 40, 712, { size: 14, font: ctx.monoBold });
  text(ctx, `${order.shippingMethod.toUpperCase()} · ${order.paymentMethod === "cod" ? `COD - COLLECT ${rs(order.total)}` : "PREPAID"}`.replace("·", "|"), 40, 698, {
    size: 9,
    font: ctx.mono,
    color: order.paymentMethod === "cod" ? SIGNAL : INK,
  });
  addressBlock(ctx, order, 40, 670);
  let y = 560;
  hr(ctx, y + 14);
  text(ctx, "PICK", 40, y, { size: 8, font: ctx.mono, color: GRAPHITE });
  text(ctx, "LOT / ITEM", 90, y, { size: 8, font: ctx.mono, color: GRAPHITE });
  right(ctx, "QTY", 555, y, 8);
  y -= 24;
  for (const it of order.items) {
    ctx.page.drawRectangle({ x: 42, y: y - 2, width: 10, height: 10, borderColor: INK, borderWidth: 1 });
    text(ctx, `#${it.lotNumber}  ${it.title.slice(0, 60)}`, 90, y, { size: 10 });
    text(ctx, it.specs, 90, y - 12, { size: 8, font: ctx.mono, color: GRAPHITE });
    right(ctx, `${it.qty} ${it.sellByWeight ? "kg" : it.unitType}`, 555, y, 10);
    y -= 34;
  }
  text(ctx, "Packed by: ____________________    Checked by: ____________________", 40, 100, { size: 9 });
  return pdf.save();
}

export async function esgCertificatePdf(p: { company: string; industry: string; kg: number; co2: number; lots: number; since: Date }) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]); // A4 landscape
  const serif = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  const mono = await pdf.embedFont(StandardFonts.Courier);
  const monoBold = await pdf.embedFont(StandardFonts.CourierBold);
  page.drawRectangle({ x: 0, y: 0, width: 842, height: 595, color: rgb(0.949, 0.933, 0.902) });
  page.drawRectangle({ x: 24, y: 24, width: 794, height: 547, borderColor: INK, borderWidth: 1.5 });
  page.drawRectangle({ x: 32, y: 32, width: 778, height: 531, borderColor: RULE, borderWidth: 0.75 });
  const center = (s: string, y: number, size: number, font = mono, color = INK) =>
    page.drawText(ascii(s), { x: (842 - font.widthOfTextAtSize(ascii(s), size)) / 2, y, size, font, color });
  center("OFFCUT  -  CERTIFICATE OF MATERIAL DIVERSION", 520, 11, monoBold);
  center("This certifies that", 455, 18, serif, GRAPHITE);
  center(p.company, 405, 40, serif);
  center(`${p.industry.toUpperCase()}`, 380, 10, mono, GRAPHITE);
  center("diverted the following industrial off-cuts from landfill through the OFFCUT exchange", 340, 16, serif, GRAPHITE);
  const stats: [string, string][] = [
    [`${p.kg.toFixed(1)} KG`, "MATERIAL DIVERTED"],
    [`${p.co2.toFixed(0)} KG`, "CO2e AVOIDED (EST.)"],
    [`${p.lots}`, "LOTS LISTED"],
  ];
  stats.forEach(([v, l], i) => {
    const x = 151 + i * 190;
    page.drawRectangle({ x, y: 210, width: 170, height: 90, borderColor: INK, borderWidth: 1 });
    page.drawText(v, { x: x + 85 - monoBold.widthOfTextAtSize(v, 22) / 2, y: 262, size: 22, font: monoBold, color: MOSS });
    page.drawText(l, { x: x + 85 - mono.widthOfTextAtSize(l, 8) / 2, y: 230, size: 8, font: mono, color: GRAPHITE });
  });
  center(`Partner since ${p.since.toLocaleDateString("en-IN")}  |  Issued ${new Date().toLocaleDateString("en-IN")}`, 150, 9);
  center("CO2e is estimated from material-specific emission factors for virgin production.", 110, 8, mono, GRAPHITE);
  center("College-project demo document.", 96, 8, mono, GRAPHITE);
  page.drawRectangle({ x: 395, y: 52, width: 52, height: 6, color: SIGNAL });
  return pdf.save();
}

export function pdfResponse(bytes: Uint8Array, filename: string) {
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
