import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/guards";
import { dbConnect } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { invoicePdf, packingSlipPdf, pdfResponse } from "@/lib/pdf";
import { Order } from "@/models/Order";

/**
 * GET /api/orders/OC-2026-000123/invoice            → invoice PDF (order owner or admin)
 * GET /api/orders/OC-2026-000123/invoice?type=slip  → packing slip (admin only)
 */
export async function GET(req: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in" }, { status: 401 });
  const { orderNumber } = await params;
  const type = new URL(req.url).searchParams.get("type");
  await dbConnect();
  const order = await Order.findOne({ orderNumber }).lean();
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isOwner = order.userId.toString() === user.id;
  if (user.role !== "admin" && (!isOwner || type === "slip")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const settings = await getSettings();
  if (type === "slip") return pdfResponse(await packingSlipPdf(order, settings), `packing-slip-${orderNumber}.pdf`);
  return pdfResponse(await invoicePdf(order, settings), `invoice-${orderNumber}.pdf`);
}
