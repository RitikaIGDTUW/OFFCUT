/**
 * Enum values shared by Mongoose models, Zod schemas and UI.
 * Kept free of server imports so client components can use them.
 */
export const ROLES = ["buyer", "supplier", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const BUYER_TYPES = ["maker", "student", "tailor", "architect", "diy", "business"] as const;
export type BuyerType = (typeof BUYER_TYPES)[number];
export const BUYER_TYPE_LABEL: Record<BuyerType, string> = {
  maker: "Maker / craftsperson",
  student: "Architecture / design student",
  tailor: "Tailor / garment maker",
  architect: "Architect / model maker",
  diy: "DIY hobbyist",
  business: "Business / studio",
};

export const CONDITIONS = ["new-dead-stock", "offcut", "remnant", "seconds"] as const;
export const CONDITION_LABEL: Record<(typeof CONDITIONS)[number], string> = {
  "new-dead-stock": "New dead-stock",
  offcut: "Off-cut",
  remnant: "Remnant",
  seconds: "Seconds",
};
export const UNIT_TYPES = ["piece", "bundle", "roll", "kg", "sqft", "meter"] as const;
export const PRODUCT_STATUS = ["draft", "pending-review", "active", "sold-out", "archived"] as const;
export const GRADES = ["A", "B", "C"] as const;
export const DIM_UNITS = ["mm", "cm", "in", "m"] as const;

export const ORDER_STATUS = ["placed", "confirmed", "packed", "shipped", "delivered", "cancelled", "returned"] as const;
export const PAYMENT_STATUS = ["pending", "paid", "failed", "refunded"] as const;
export type OrderStatus = (typeof ORDER_STATUS)[number];

export const SUBMISSION_STATUS = ["new", "reviewing", "offer-sent", "accepted", "rejected", "picked-up", "listed"] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUS)[number];
export const VERIFICATION = ["pending", "verified", "rejected"] as const;

export const COLOUR_SWATCHES: Record<string, string> = {
  Black: "#1A1A18",
  White: "#F7F5F0",
  Grey: "#8D8B86",
  Silver: "#C3C7CB",
  Tan: "#C39A6B",
  Brown: "#6B4226",
  Natural: "#D9C7A7",
  Red: "#A8322D",
  Blue: "#2E4C7A",
  Green: "#3F5A3C",
  Yellow: "#D9A93B",
  Orange: "#FF5B1F",
  Clear: "transparent",
  Multi: "linear-gradient(135deg,#A8322D,#D9A93B,#2E4C7A)",
};

/** Tag colour per category slug, used on product cards. */
export const CATEGORY_TONE: Record<string, "steel" | "oxide" | "moss" | "ink"> = {
  metals: "steel",
  "hardware-trims": "steel",
  leather: "oxide",
  "wood-veneer": "oxide",
  "foam-cork": "moss",
  textiles: "ink",
};
