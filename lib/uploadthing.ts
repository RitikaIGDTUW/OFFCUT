"use client";
import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

/** Typed client hook — the UI is our own on-theme dropzone (components/ui/uploader.tsx). */
export const { useUploadThing } = generateReactHelpers<OurFileRouter>();
