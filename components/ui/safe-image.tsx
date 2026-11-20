import Image, { type ImageProps } from "next/image";

/** Hosts configured in next.config.ts → images.remotePatterns. */
const OPTIMIZABLE = [/^https:\/\/utfs\.io\//, /^https:\/\/[^/]+\.ufs\.sh\//, /^https:\/\/images\.unsplash\.com\//, /^https:\/\/images\.pexels\.com\//];

/**
 * next/image everywhere, but if an admin pasted an image URL from another host we render it
 * unoptimised instead of crashing (next/image throws for unknown hosts).
 */
export function SafeImage(props: ImageProps) {
  const src = typeof props.src === "string" ? props.src : "";
  const ok = !src || src.startsWith("/") || OPTIMIZABLE.some((r) => r.test(src));
  return <Image {...props} unoptimized={props.unoptimized ?? !ok} alt={props.alt} />;
}
