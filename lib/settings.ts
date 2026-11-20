import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { dbConnect } from "./db";
import { Settings, DEFAULT_SETTINGS, type ISettings } from "@/models/Settings";
import { plain, type Plain } from "./utils";

export type SiteSettings = Plain<ISettings>;

/** Loads (or lazily creates) the singleton settings document. Cached per request. */
export const getSettings = cache(
  unstable_cache(loadSettings, ["settings"], { tags: ["settings"], revalidate: 600 }),
);

async function loadSettings(): Promise<SiteSettings> {
  await dbConnect();
  let s = await Settings.findOne({ key: "global" }).lean();
  if (!s) {
    await Settings.create(DEFAULT_SETTINGS);
    s = await Settings.findOne({ key: "global" }).lean();
  }
  return plain(s as ISettings);
}
