/** Shared Open Graph image layout: an archival sample tag on linen. Rendered by next/og (Satori). */
export const OG_SIZE = { width: 1200, height: 630 };

export function SampleTagOG({ lot, title, specs, price, badge, image }: { lot: string; title: string; specs: string; price?: string; badge?: string; image?: string }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", background: "#F2EEE6", padding: 48, fontFamily: "monospace" }}>
      <div style={{ flex: 1, display: "flex", border: "3px solid #1A1A18", background: "#F2EEE6" }}>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" width={460} height={528} style={{ objectFit: "cover", borderRight: "3px solid #1A1A18" }} />
        ) : null}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 40, justifyContent: "space-between" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: "#1A1A18", letterSpacing: 2 }}>
            <span>{lot}</span>
            <span style={{ border: "2px solid #1A1A18", padding: "2px 10px" }}>OFFCUT</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: title.length > 40 ? 50 : 62, lineHeight: 1.05, color: "#1A1A18", fontFamily: "serif" }}>{title}</span>
            <span style={{ marginTop: 18, fontSize: 22, color: "#5C5A55", letterSpacing: 1 }}>{specs}</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <span style={{ fontSize: 52, color: "#1A1A18" }}>{price ?? ""}</span>
            {badge ? <span style={{ background: "#FF5B1F", border: "2px solid #1A1A18", padding: "6px 14px", fontSize: 24, color: "#1A1A18" }}>{badge}</span> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
