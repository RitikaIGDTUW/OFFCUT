import { getSettings } from "@/lib/settings";
import { DEFAULT_FAQ } from "@/lib/content";
import { PageHeader } from "@/components/ui/primitives";
import { SettingsForm } from "@/components/admin/settings-form";

export const metadata = { title: "Content & settings" };

export default async function SettingsPage() {
  const s = await getSettings();
  return (
    <>
      <PageHeader eyebrow="Configuration" title={<>Content &amp; <em>settings</em></>} />
      <SettingsForm
        initial={{
          shipping: s.shipping,
          taxRate: s.taxRate,
          codEnabled: s.codEnabled,
          hero: { eyebrow: s.hero.eyebrow, title: s.hero.title, subtitle: s.hero.subtitle, images: s.hero.images ?? [] },
          announcement: s.announcement,
          landfillOffsetKg: s.landfillOffsetKg,
          lowStockThreshold: s.lowStockThreshold,
          showSupplierNames: s.showSupplierNames,
          contact: s.contact,
          social: s.social,
          seo: s.seo,
          faq: s.faq?.length ? s.faq : DEFAULT_FAQ,
        }}
      />
    </>
  );
}
