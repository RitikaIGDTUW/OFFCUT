import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { markOrderPaid } from "@/lib/orders";
import { Order } from "@/models/Order";

/**
 * OPTIONAL Razorpay webhook. Not needed for the localhost demo (payments are confirmed by the
 * signature-verifying server action), and Razorpay can't reach localhost anyway. Kept so the
 * project would also work behind a public URL / tunnel. Idempotent: an order is marked paid once.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(raw, sig)) return NextResponse.json({ error: "invalid signature" }, { status: 400 });

  const event = JSON.parse(raw) as {
    event: string;
    payload?: { payment?: { entity?: { id: string; order_id: string } } };
  };
  if (event.event === "payment.captured" || event.event === "order.paid") {
    const p = event.payload?.payment?.entity;
    if (p?.order_id) {
      await dbConnect();
      const order = await Order.findOne({ razorpayOrderId: p.order_id });
      if (order) await markOrderPaid(order, p.id, "webhook");
    }
  }
  return NextResponse.json({ received: true });
}
