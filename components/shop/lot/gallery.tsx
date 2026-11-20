"use client";
import { useState, type MouseEvent } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import { cn } from "@/lib/utils";

/** Image gallery: hover-to-zoom main image (follows the cursor) + thumbnail strip. */
export function Gallery({ images, title, lotNumber }: { images: { url: string; alt?: string }[]; title: string; lotNumber: string }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const img = images[active];

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  return (
    <div>
      <div
        className="reg-marks relative aspect-square cursor-zoom-in overflow-hidden border border-ink bg-paper-2"
        onMouseMove={onMove}
        onMouseLeave={() => setZoom(null)}
      >
        {img ? (
          <SafeImage
            src={img.url}
            alt={img.alt || title}
            fill
            priority
            sizes="(min-width:1024px) 50vw, 100vw"
            className="object-cover transition-transform duration-200"
            style={zoom ? { transform: "scale(2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
          />
        ) : (
          <div className="grid h-full place-items-center font-mono text-sm text-graphite">NO PHOTO</div>
        )}
        <span className="spec absolute left-3 top-3 bg-paper px-2 py-1 text-[10px]">LOT #{lotNumber}</span>
        <span className="spec absolute bottom-3 right-3 bg-paper px-2 py-1 text-[10px]">
          FIG. {String(active + 1).padStart(2, "0")}/{String(images.length).padStart(2, "0")}
        </span>
      </div>
      {images.length > 1 ? (
        <ul className="mt-3 grid grid-cols-5 gap-2" aria-label="Choose image">
          {images.map((im, i) => (
            <li key={im.url + i}>
              <button
                onClick={() => setActive(i)}
                aria-label={`Show image ${i + 1}`}
                aria-current={i === active}
                className={cn("relative block aspect-square w-full border", i === active ? "border-ink outline outline-2 outline-signal" : "border-rule")}
              >
                <SafeImage src={im.url} alt="" fill sizes="100px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
