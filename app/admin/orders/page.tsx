import { dbConnect } from "@/lib/db";
import { Order } from "@/models/Order";
import { plain, sp } from "@/lib/utils";
import { PageHeader } from "@/components/ui/primitives";
import { OrdersTable } from "@/components/admin/orders-table";

export const metadata = { title: "Orders" };

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = sp((await searchParams).q) ?? "";
  await dbConnect();
  const orders = plain(
    await Order.find().select("orderNumber email total orderStatus paymentStatus paymentMethod createdAt items cancelRequest returnRequest").sort({ createdAt: -1 }).limit(2000).lean(),
  );
  const rows = orders.map((o) => ({
    _id: o._id,
    orderNumber: o.orderNumber,
    email: o.email,
    total: o.total,
    orderStatus: o.orderStatus,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    createdAt: o.createdAt,
    lots: o.items.length,
    flag: (o.cancelRequest?.reason && !o.cancelRequest.resolved ? "cancel requested" : o.returnRequest?.reason && !o.returnRequest.resolved ? "return requested" : "") as string,
  }));
  return (
    <>
      <PageHeader eyebrow="Commerce" title={<>Orders</>} />
      <OrdersTable rows={rows} initialSearch={q} />
    </>
  );
}
