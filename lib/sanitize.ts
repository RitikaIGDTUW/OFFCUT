import "server-only";
import sanitizeHtml from "sanitize-html";

/** Rich-text descriptions are stored as HTML; strip anything that could run script. */
export function cleanHtml(input: string) {
  return sanitizeHtml(input, {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "h2", "h3", "blockquote", "a", "code"],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
    },
  });
}

/** Plain text (for reviews, notes): remove all tags. */
export const cleanText = (input: string) => sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} }).trim();

/** Converts plain text with blank lines into paragraphs (used when admins type plain text). */
export function textToHtml(text: string) {
  if (/<\w+[^>]*>/.test(text)) return cleanHtml(text);
  return cleanHtml(
    text
      .split(/\n{2,}/)
      .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
      .join(""),
  );
}
