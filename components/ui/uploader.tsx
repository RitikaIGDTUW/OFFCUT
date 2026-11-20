"use client";
import { useRef, useState, type DragEvent } from "react";
import { SafeImage } from "./safe-image";
import { FileText, Upload, X, Link2 } from "lucide-react";
import { toast } from "sonner";
import { useUploadThing } from "@/lib/uploadthing";
import { useFeatures } from "@/components/providers";
import type { UploadEndpoint } from "@/app/api/uploadthing/core";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Input } from "./form";

export type UploadedFile = { url: string; key?: string; name?: string };

/**
 * On-theme drag & drop uploader backed by UploadThing.
 * If UPLOADTHING_TOKEN is not set, it degrades to "paste an image URL" so the demo still works.
 */
export function Uploader({
  endpoint,
  value,
  onChange,
  max = 1,
  accept = "image/*",
  label = "Drop files or click to upload",
  showPreview = true,
}: {
  endpoint: UploadEndpoint;
  value: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  max?: number;
  accept?: string;
  label?: string;
  showPreview?: boolean;
}) {
  const { uploads } = useFeatures();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [urlDraft, setUrlDraft] = useState("");

  const { startUpload, isUploading } = useUploadThing(endpoint, {
    onUploadProgress: (p) => setProgress(p),
    onClientUploadComplete: (res) => {
      setProgress(null);
      const added = res.map((r) => ({ url: r.ufsUrl, key: r.key, name: r.name }));
      onChange([...value, ...added].slice(0, max));
      toast.success(`${added.length} file${added.length > 1 ? "s" : ""} uploaded`);
    },
    onUploadError: (e) => {
      setProgress(null);
      toast.error(e.message || "Upload failed");
    },
  });

  const remaining = max - value.length;
  const handleFiles = (files: FileList | File[] | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, remaining);
    if (!arr.length) return toast.error(`Maximum ${max} file${max > 1 ? "s" : ""}`);
    void startUpload(arr);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    handleFiles(e.dataTransfer.files);
  };
  const addUrl = () => {
    try {
      const u = new URL(urlDraft);
      onChange([...value, { url: u.toString(), name: u.pathname.split("/").pop() }].slice(0, max));
      setUrlDraft("");
    } catch {
      toast.error("Enter a full https:// URL");
    }
  };
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const isImage = accept.includes("image") && !accept.includes("pdf");

  return (
    <div className="space-y-3">
      {showPreview && value.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {value.map((f, i) => (
            <li key={f.url + i} className="relative border border-ink bg-paper-2">
              {isImage || /\.(png|jpe?g|webp|gif|avif)|images\.unsplash|ufs\.sh|utfs\.io/i.test(f.url) ? (
                <div className="relative aspect-square">
                  <SafeImage src={f.url} alt={f.name ?? "Uploaded file"} fill sizes="120px" className="object-cover" />
                </div>
              ) : (
                <a href={f.url} target="_blank" rel="noreferrer" className="flex aspect-square flex-col items-center justify-center gap-1 p-2 text-center text-xs">
                  <FileText size={20} aria-hidden />
                  <span className="line-clamp-2 break-all">{f.name ?? "file"}</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute right-1 top-1 border border-ink bg-paper p-0.5 hover:bg-ink hover:text-paper"
                aria-label={`Remove ${f.name ?? "file"}`}
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {remaining > 0 ? (
        uploads ? (
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-ink px-4 py-8 text-center transition-colors",
              drag ? "bg-signal/15" : "bg-paper hover:bg-paper-2",
            )}
          >
            <Upload size={20} aria-hidden />
            <p className="text-sm">{isUploading ? "Uploading…" : label}</p>
            <p className="spec text-[10px] text-graphite">
              {isUploading && progress !== null ? `${progress}%` : `Up to ${remaining} more · via UploadThing`}
            </p>
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              multiple={max > 1}
              className="sr-only"
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        ) : (
          <div className="border border-dashed border-ink p-3">
            <p className="mb-2 flex items-center gap-2 text-xs text-graphite">
              <Link2 size={14} aria-hidden /> UploadThing is not configured (no UPLOADTHING_TOKEN) — paste a public URL instead.
            </p>
            <div className="flex gap-2">
              <Input
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                placeholder="https://images.unsplash.com/photo-…"
                aria-label="File URL"
              />
              <Button type="button" variant="outline" onClick={addUrl}>
                Add
              </Button>
            </div>
          </div>
        )
      ) : null}
    </div>
  );
}
