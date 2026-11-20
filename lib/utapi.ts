import "server-only";
import { UTApi } from "uploadthing/server";
import { features } from "./env";

/** Server-side UploadThing client, used to delete files we no longer reference. */
let api: UTApi | null = null;

export async function deleteUploadedFiles(keys: (string | undefined | null)[]) {
  const clean = keys.filter((k): k is string => Boolean(k));
  if (!clean.length || !features.uploads) return;
  try {
    api ??= new UTApi();
    await api.deleteFiles(clean);
  } catch (e) {
    // Seed images (Unsplash) have no key; a failed delete should never block the user action.
    console.error("[uploadthing] deleteFiles failed", e);
  }
}

/** Given old and new lists of files, returns keys that disappeared (to delete from UploadThing). */
export function removedKeys(before: { key?: string | null }[], after: { key?: string | null }[]) {
  const keep = new Set(after.map((f) => f.key).filter(Boolean));
  return before.map((f) => f.key).filter((k): k is string => Boolean(k) && !keep.has(k));
}
