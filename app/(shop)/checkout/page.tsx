import type { Metadata } from "next";
import { requirePageUser } from "@/lib/guards";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";
import { getSettings } from "@/lib/settings";
import { features } from "@/lib/env";
import { isTestMode } from "@/lib/razorpay";
import { plain } from "@/lib/utils";
import { CheckoutFlow } from "@/components/shop/checkout-flow";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const sessionUser = await requirePageUser(undefined, "/checkout");
  await dbConnect();
  const [user, settings] = await Promise.all([User.findById(sessionUser.id).select("name email phone addresses").lean(), getSettings()]);
  return (
    <div className="container-x py-10">
      <CheckoutFlow
        addresses={plain(user?.addresses ?? [])}
        defaultName={user?.name ?? ""}
        defaultPhone={user?.phone ?? ""}
        codEnabled={settings.codEnabled}
        razorpayEnabled={features.razorpay}
        testMode={!features.razorpay || isTestMode()}
        expressSurcharge={settings.shipping.expressSurcharge}
      />
    </div>
  );
}
