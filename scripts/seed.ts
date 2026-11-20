/**
 * npm run seed — wipes and repopulates the OFFCUT database with demo data.
 *
 * Creates: 1 admin, 2 buyers, 3 verified suppliers (+1 pending), 10 categories, 49 lots,
 * orders in every status, payouts, reviews, coupons (MAKER10, STUDENT15, FLAT200),
 * supplier submissions in every kanban column, Material Wanted requests and settings.
 */
import fs from "fs";
import path from "path";
import mongoose, { Types } from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { Supplier } from "../models/Supplier";
import { Category } from "../models/Category";
import { Product } from "../models/Product";
import { Order, type IOrderItem } from "../models/Order";
import { Settings, DEFAULT_SETTINGS } from "../models/Settings";
import { Counter } from "../models/Counter";
import { Cart, Coupon, MaterialRequest, Payout, Review, SupplierSubmission, AuditLog, StockAdjustment, Notification, ContactMessage, NewsletterSubscriber } from "../models/misc";
import { img, imgs, type ImageTheme } from "../lib/seed-images";
import { DEFAULT_FAQ } from "../lib/content";
import { computeTotals, lineWeight } from "../lib/pricing";
import { co2Factor } from "../lib/co2";
import { formatDims, slugify, type DimUnit } from "../lib/utils";

/* ───────── load .env.local / .env without extra dependencies ───────── */
for (const f of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const daysAgo = (n: number, h = 11) => {
  const d = new Date(Date.now() - n * 86_400_000);
  d.setHours(h, 17, 0, 0);
  return d;
};

/* ───────── Categories ───────── */
const CATEGORIES: { name: string; slug: string; description: string; image: [ImageTheme, number] }[] = [
  { name: "Leather", slug: "leather", description: "Full-grain, veg-tan and chrome-tan hides, strips and remnants from Indian and Italian tanneries.", image: ["leather", 0] },
  { name: "Textiles & Technical Fabrics", slug: "textiles", description: "Roll-ends and dead-stock: Gore-Tex, Cordura, selvedge denim, linen, wool suiting.", image: ["textiles", 0] },
  { name: "Metals", slug: "metals", description: "Aerospace aluminium, stainless, brass, copper and titanium plate and bar ends.", image: ["metals", 0] },
  { name: "Wood & Veneer", slug: "wood-veneer", description: "Hardwood shorts, turning blanks, plywood offcuts and veneer bundles.", image: ["wood", 2] },
  { name: "Stone & Marble", slug: "stone-marble", description: "Marble, granite and terrazzo remnants from fabrication yards.", image: ["stone", 0] },
  { name: "Plastics & Acrylic", slug: "plastics-acrylic", description: "Cast acrylic, polycarbonate and HDPE sheet offcuts.", image: ["plastics", 0] },
  { name: "Composites", slug: "composites", description: "Carbon fibre, Kevlar and fibreglass fabric remnants and plate.", image: ["composites", 0] },
  { name: "Foam & Cork", slug: "foam-cork", description: "Cork sheet, EVA and technical foam offcuts.", image: ["cork", 0] },
  { name: "Glass", slug: "glass", description: "Art-glass assortments and float-glass offcuts.", image: ["glass", 0] },
  { name: "Hardware & Trims", slug: "hardware-trims", description: "Dead-stock fasteners, rivets, zippers and trims.", image: ["hardware", 0] },
];

/* ───────── Lots ─────────
 * [title, category, supplier, materialType, grade, gradeDetail, condition, [L,W,T,unit], weightKg/unit, qty,
 *  unitType, price, retail, cost, colour, finish, origin, imageTheme, imageIdx[], tags, extra]  */
type S = "tannery" | "mill" | "aero" | null;
type LotSpec = {
  t: string;
  c: string;
  s: S;
  m: string;
  g: "A" | "B" | "C";
  gd?: string;
  cond?: "new-dead-stock" | "offcut" | "remnant" | "seconds";
  d: [number, number, number, DimUnit];
  kg: number;
  q: number;
  u: "piece" | "bundle" | "roll" | "kg" | "sqft" | "meter";
  p: number;
  r?: number;
  cost?: number;
  col: string;
  fin?: string;
  ori?: string;
  im: [ImageTheme, number[]];
  tags: string[];
  roll?: number;
  sbw?: boolean;
  status?: "draft" | "pending-review" | "active" | "archived";
  feat?: boolean;
  cert?: string[];
  desc: string;
};

const LOTS: LotSpec[] = [
  // Leather
  { t: "Full-grain Italian veg-tan leather strips", c: "leather", s: "tannery", m: "Leather", g: "A", gd: "Full-grain Italian veg-tan", d: [600, 140, 1.4, "mm"], kg: 0.9, q: 9, u: "bundle", p: 1450, r: 4800, cost: 600, col: "Tan", fin: "Natural, unfinished", ori: "Italy", im: ["leather", [0, 1, 2]], tags: ["veg-tan", "straps", "watch straps", "belts"], feat: true, cert: ["Leather Working Group Gold"], desc: "Bundle of 12 strips cut from the shoulder of Tuscan vegetable-tanned bends. Takes tooling, burnishing and dye beautifully.\n\nIdeal for watch straps, key fobs, card wallets and knife sheaths. Edges are raw; a few strips have faint hide marks on the flesh side." },
  { t: "Black chrome-tan nappa off-cuts", c: "leather", s: "tannery", m: "Leather", g: "A", gd: "Chrome-tan nappa", d: [450, 300, 1.0, "mm"], kg: 0.6, q: 14, u: "bundle", p: 980, r: 2900, cost: 380, col: "Black", fin: "Semi-aniline", ori: "India", im: ["leather", [6, 3]], tags: ["nappa", "garment", "gloves"], desc: "Soft, drapey garment-weight nappa left over from a jacket order. Bundle of 4 pieces. Great for gloves, pouches, linings and bag panels." },
  { t: "Oil pull-up side off-cut, chestnut", c: "leather", s: "tannery", m: "Leather", g: "B", gd: "Oil pull-up, full-grain", d: [900, 400, 2.0, "mm"], kg: 0.8, q: 6, u: "piece", p: 1890, r: 5200, cost: 820, col: "Brown", fin: "Waxy pull-up", ori: "India", im: ["leather", [4, 5]], tags: ["pull-up", "boots", "bags"], desc: "Large side off-cut with the classic pull-up colour shift. Grade B for a couple of healed scratches near one edge — the usable clear area is at least 700 × 350 mm." },
  { t: "Mixed suede split remnants (by kg)", c: "leather", s: "tannery", m: "Leather", g: "C", gd: "Suede split", cond: "remnant", d: [300, 200, 1.2, "mm"], kg: 1, q: 18, u: "kg", sbw: true, p: 650, r: 1600, cost: 180, col: "Multi", ori: "India", im: ["leather", [7, 2]], tags: ["suede", "patches", "crafts"], desc: "Assorted colours of suede split, pieces roughly 150–300 mm. Sold by the kilogram — perfect for patches, tassels, shoe repairs and kids' craft kits." },
  { t: "Veg-tan shoulder belt blanks", c: "leather", s: "tannery", m: "Leather", g: "A", gd: "8–9 oz veg-tan", d: [1200, 50, 3.5, "mm"], kg: 1.1, q: 8, u: "bundle", p: 1250, r: 3600, cost: 520, col: "Natural", ori: "India", im: ["leather", [1, 0]], tags: ["belt", "veg-tan", "strap"], desc: "Bundle of 6 pre-cut 50 mm belt blanks, 3.5 mm thick. Square-cut edges, ready for bevelling and finishing." },
  { t: "Croc-embossed calf remnant, oxblood", c: "leather", s: "tannery", m: "Leather", g: "B", gd: "Embossed calf", d: [500, 350, 1.2, "mm"], kg: 0.35, q: 5, u: "piece", p: 720, r: 2400, cost: 250, col: "Red", fin: "Embossed, glazed", ori: "India", im: ["leather", [3]], tags: ["embossed", "croc", "small goods"], desc: "Dead-stock croc-embossed calf from a cancelled handbag run. Minor crease marks on one corner." },
  { t: "Leather scrap mix for small goods (by kg)", c: "leather", s: "tannery", m: "Leather", g: "C", cond: "remnant", d: [150, 80, 2.0, "mm"], kg: 1, q: 25, u: "kg", sbw: true, p: 390, r: 1200, cost: 90, col: "Multi", ori: "India", im: ["leather", [5, 7]], tags: ["scrap", "keychains", "coasters"], desc: "Small pieces in mixed tannages and colours. Great for keychains, coasters, zipper pulls and practice cuts." },
  // Textiles
  { t: "Gore-Tex 3-layer waterproof fabric roll end", c: "textiles", s: "mill", m: "Technical fabric", g: "A", gd: "Gore-Tex 3L", d: [4200, 1500, 0.3, "mm"], roll: 4.2, kg: 1.1, q: 3, u: "roll", p: 2900, r: 9800, cost: 1100, col: "Black", fin: "DWR coated", ori: "Vietnam", im: ["textiles", [8, 9]], tags: ["gore-tex", "waterproof", "outdoor", "jacket"], feat: true, cert: ["bluesign"], desc: "1.5 m wide × 4.2 m roll end of three-layer waterproof breathable membrane fabric. Enough for one full shell jacket or several prototypes.\n\nSeam-tape not included." },
  { t: "14 oz Japanese selvedge denim roll end", c: "textiles", s: "mill", m: "Denim", g: "A", gd: "14 oz selvedge", d: [3000, 800, 0.8, "mm"], roll: 3, kg: 1.4, q: 4, u: "roll", p: 1650, r: 4500, cost: 700, col: "Blue", fin: "Raw, unsanforised", ori: "Japan", im: ["textiles", [6, 7]], tags: ["denim", "selvedge", "jeans"], desc: "Narrow-loom selvedge denim with red ID. 80 cm usable width × 3 m. Raw and unwashed — expect 8–10% shrinkage." },
  { t: "Cordura 1000D nylon offcut bundle", c: "textiles", s: "mill", m: "Nylon", g: "A", gd: "1000D Cordura", d: [1000, 700, 0.6, "mm"], kg: 1.6, q: 7, u: "bundle", p: 1150, r: 3200, cost: 450, col: "Black", fin: "PU coated back", ori: "India", im: ["textiles", [9, 8]], tags: ["cordura", "bags", "edc"], desc: "Bundle of 5 pieces of abrasion-resistant 1000D nylon. The go-to for backpacks, tool rolls and EDC pouches." },
  { t: "100% linen roll end, natural", c: "textiles", s: "mill", m: "Linen", g: "A", d: [2500, 1400, 0.3, "mm"], roll: 2.5, kg: 0.9, q: 5, u: "roll", p: 980, r: 2600, cost: 380, col: "Natural", fin: "Enzyme washed", ori: "India", im: ["textiles", [3, 4]], tags: ["linen", "shirting", "home"], desc: "Mid-weight 180 gsm linen in undyed natural. Perfect for shirts, aprons and tea towels." },
  { t: "Wool tweed suiting remnant", c: "textiles", s: "mill", m: "Wool", g: "A", gd: "Herringbone tweed", d: [1800, 1500, 1.0, "mm"], kg: 0.9, q: 3, u: "piece", p: 1400, r: 4200, cost: 600, col: "Grey", ori: "Scotland", im: ["textiles", [5, 4]], tags: ["tweed", "suiting", "tailoring"], desc: "Enough for a waistcoat or a short jacket. Grey herringbone, 100% wool, 380 gsm." },
  { t: "Printed cotton poplin dead-stock bolt", c: "textiles", s: "mill", m: "Cotton", g: "A", cond: "new-dead-stock", d: [10000, 1120, 0.2, "mm"], roll: 10, kg: 1.2, q: 2, u: "roll", p: 1800, r: 4000, cost: 700, col: "Multi", ori: "India", im: ["textiles", [1, 2]], tags: ["cotton", "print", "quilting"], desc: "Full 10 m bolt from a cancelled kidswear order. Crisp 120 gsm poplin with a small botanical print." },
  { t: "Ripstop nylon 40D off-cuts (by kg)", c: "textiles", s: "mill", m: "Nylon", g: "B", gd: "40D ripstop", cond: "remnant", d: [800, 500, 0.1, "mm"], kg: 1, q: 12, u: "kg", sbw: true, p: 520, r: 1500, cost: 160, col: "Multi", ori: "India", im: ["textiles", [0, 5]], tags: ["ripstop", "ultralight", "stuff sacks"], desc: "Ultralight ripstop in mixed colours, pieces 300–800 mm. Ideal for stuff sacks, kites and ultralight gear." },
  // Metals
  { t: "6061-T6 aluminium plate offcuts", c: "metals", s: "aero", m: "Aluminium", g: "A", gd: "6061-T6", d: [300, 200, 6, "mm"], kg: 0.97, q: 24, u: "piece", p: 420, r: 950, cost: 160, col: "Silver", fin: "Mill finish, film on one side", ori: "India", im: ["metals", [0, 4]], tags: ["6061", "aluminium", "cnc", "plate"], feat: true, cert: ["EN 10204 3.1 mill cert"], desc: "Precision-sawn plate ends from an aerospace bracket job. Flat, square-ish edges and full mill traceability. Great for CNC projects, jigs and enclosures." },
  { t: "7075-T6 aluminium bar ends", c: "metals", s: "aero", m: "Aluminium", g: "A", gd: "7075-T6", d: [250, 50, 25, "mm"], kg: 0.86, q: 16, u: "piece", p: 680, r: 1700, cost: 290, col: "Silver", ori: "USA", im: ["machining", [1, 0]], tags: ["7075", "aluminium", "bar"], desc: "High-strength aerospace alloy bar ends. Excellent for knife handles, bike parts and high-load brackets." },
  { t: "304 stainless steel sheet offcuts", c: "metals", s: "aero", m: "Stainless steel", g: "A", gd: "304 2B", d: [600, 300, 1.5, "mm"], kg: 2.1, q: 10, u: "piece", p: 540, r: 1300, cost: 220, col: "Silver", fin: "2B mill", ori: "India", im: ["metals", [3, 4]], tags: ["stainless", "304", "sheet"], desc: "Laser-cut stainless sheet offcuts with protective film. Good for splashbacks, brackets and enclosures." },
  { t: "Brushed brass sheet remnants", c: "metals", s: "aero", m: "Brass", g: "A", gd: "C26000", d: [300, 300, 1.0, "mm"], kg: 0.76, q: 8, u: "piece", p: 890, r: 2100, cost: 380, col: "Yellow", fin: "Brushed", ori: "India", im: ["metals", [6]], tags: ["brass", "jewellery", "sheet"], desc: "Cartridge brass with a satin brushed finish. Jewellery, nameplates, inlays." },
  { t: "Copper busbar off-cuts (by kg)", c: "metals", s: "aero", m: "Copper", g: "A", gd: "C11000 ETP", d: [200, 40, 6, "mm"], kg: 1, q: 30, u: "kg", sbw: true, p: 690, r: 1100, cost: 420, col: "Red", ori: "India", im: ["metals", [7, 5]], tags: ["copper", "busbar", "electrical"], desc: "Electrolytic tough-pitch copper busbar ends from a switchgear fabricator. Lengths 100–250 mm." },
  { t: "Titanium Grade 5 plate off-cut", c: "metals", s: "aero", m: "Titanium", g: "A", gd: "Ti-6Al-4V (Gr 5)", d: [150, 100, 4, "mm"], kg: 0.27, q: 6, u: "piece", p: 1950, r: 5200, cost: 900, col: "Grey", ori: "USA", im: ["machining", [2, 3]], tags: ["titanium", "gr5", "edc"], desc: "Aerospace-certified titanium plate offcut. The ultimate material for EDC tools, pocket clips and jewellery." },
  { t: "Mild steel laser skeleton offcuts (by kg)", c: "metals", s: "aero", m: "Steel", g: "C", gd: "IS 2062", cond: "remnant", d: [1200, 600, 3, "mm"], kg: 1, q: 120, u: "kg", sbw: true, p: 45, r: 90, cost: 20, col: "Grey", ori: "India", im: ["metals", [2, 8]], tags: ["steel", "welding", "sculpture"], desc: "Laser-cut skeletons and drops — irregular shapes with lots of usable flat areas. Welding practice, sculpture, garden art." },
  { t: "Black anodised aluminium extrusion ends", c: "metals", s: "aero", m: "Aluminium", g: "B", gd: "6063-T5 40×40 profile", d: [1000, 40, 40, "mm"], kg: 3.2, q: 5, u: "bundle", p: 1300, r: 3100, cost: 520, col: "Black", fin: "Anodised", ori: "India", im: ["metals", [8, 1]], tags: ["extrusion", "t-slot", "frames"], desc: "Bundle of 10 T-slot extrusion ends, 300–1000 mm long. Minor handling scuffs. Ideal for 3D-printer frames and workbench jigs." },
  // Wood
  { t: "Black walnut hardwood offcuts", c: "wood-veneer", s: null, m: "Walnut", g: "A", gd: "FAS American black walnut", d: [450, 90, 25, "mm"], kg: 6.2, q: 7, u: "bundle", p: 2400, r: 6400, cost: 1100, col: "Brown", fin: "Planed all round", ori: "USA", im: ["wood", [2, 8, 3]], tags: ["walnut", "hardwood", "boxes"], feat: true, desc: "Bundle of 8 planed walnut shorts with straight grain and some sapwood. Perfect for boxes, cutting boards and small furniture parts." },
  { t: "Burma teak plank shorts", c: "wood-veneer", s: null, m: "Teak", g: "A", gd: "Plantation Burma teak", d: [600, 150, 25, "mm"], kg: 6.5, q: 4, u: "bundle", p: 3200, r: 8500, cost: 1500, col: "Brown", ori: "Myanmar", im: ["wood", [0, 6]], tags: ["teak", "outdoor", "boat"], desc: "Bundle of 5 oily, durable teak shorts. Rot-resistant — great for outdoor and bathroom projects." },
  { t: "Quarter-sawn white oak veneer sheets", c: "wood-veneer", s: null, m: "Oak veneer", g: "A", gd: "Quarter-sawn, 0.6 mm", d: [2400, 300, 0.6, "mm"], kg: 1.8, q: 6, u: "bundle", p: 1600, r: 4200, cost: 600, col: "Natural", ori: "Germany", im: ["wood", [3, 9]], tags: ["veneer", "oak", "marquetry"], desc: "Bundle of 20 sequenced leaves with strong ray fleck. For marquetry, lamp shades and veneering panels." },
  { t: "Baltic birch plywood offcuts 12 mm", c: "wood-veneer", s: null, m: "Plywood", g: "B", gd: "BB/BB", d: [600, 400, 12, "mm"], kg: 1.9, q: 20, u: "piece", p: 380, r: 950, cost: 140, col: "Natural", ori: "Latvia", im: ["wood", [9, 7]], tags: ["plywood", "birch", "laser", "models"], desc: "Void-free birch ply offcuts. Excellent for laser cutting, jigs and architectural models." },
  { t: "Hard maple butcher-block cut-offs", c: "wood-veneer", s: null, m: "Maple", g: "A", d: [400, 100, 40, "mm"], kg: 6.8, q: 5, u: "bundle", p: 1500, r: 3800, cost: 640, col: "Natural", ori: "Canada", im: ["wood", [7, 5]], tags: ["maple", "cutting board", "end grain"], desc: "Bundle of 6 maple cut-offs from a countertop shop. Glue up an end-grain cutting board with these." },
  { t: "Sheesham (Indian rosewood) turning blanks", c: "wood-veneer", s: null, m: "Sheesham", g: "A", d: [300, 75, 75, "mm"], kg: 4.6, q: 6, u: "bundle", p: 1100, r: 2600, cost: 420, col: "Brown", ori: "India", im: ["wood", [4, 1]], tags: ["sheesham", "turning", "lathe"], desc: "Bundle of 4 kiln-dried square turning blanks. Rich figure; great for pens, bowls and handles." },
  // Stone
  { t: "Carrara marble remnant slab", c: "stone-marble", s: null, m: "Marble", g: "A", gd: "Bianco Carrara C", d: [600, 400, 20, "mm"], kg: 13, q: 4, u: "piece", p: 2200, r: 6800, cost: 900, col: "White", fin: "Polished one face", ori: "Italy", im: ["stone", [0, 3]], tags: ["marble", "carrara", "tabletop"], feat: true, desc: "Polished Carrara remnant from a kitchen counter job. Make a side-table top, pastry board or architectural model base." },
  { t: "Absolute black granite off-cut", c: "stone-marble", s: null, m: "Granite", g: "A", gd: "Absolute black", d: [500, 300, 18, "mm"], kg: 7.6, q: 6, u: "piece", p: 1200, r: 3200, cost: 450, col: "Black", fin: "Honed", ori: "India", im: ["stone", [5, 6]], tags: ["granite", "black"], desc: "Dense black granite with a honed finish. Great for plinths, coasters and trivets." },
  { t: "Green marble tiles dead-stock", c: "stone-marble", s: null, m: "Marble", g: "B", gd: "Verde Guatemala", cond: "new-dead-stock", d: [300, 300, 10, "mm"], kg: 24, q: 3, u: "bundle", p: 2600, r: 7200, cost: 1000, col: "Green", fin: "Polished", ori: "India", im: ["stone", [2, 4]], tags: ["tiles", "marble", "green"], desc: "Box of 10 polished green marble tiles, discontinued colour. One or two with chipped corners." },
  { t: "Terrazzo sample offcuts", c: "stone-marble", s: null, m: "Terrazzo", g: "B", d: [200, 200, 15, "mm"], kg: 5.4, q: 7, u: "bundle", p: 900, r: 2400, cost: 300, col: "Multi", ori: "India", im: ["stone", [6, 1]], tags: ["terrazzo", "samples", "coasters"], desc: "Bundle of 6 terrazzo sample squares in assorted mixes. Coasters, trivets and material libraries." },
  // Plastics
  { t: "Cast acrylic sheet offcuts, clear", c: "plastics-acrylic", s: null, m: "Acrylic", g: "A", gd: "Cast PMMA", d: [500, 300, 5, "mm"], kg: 0.9, q: 18, u: "piece", p: 520, r: 1450, cost: 180, col: "Clear", fin: "Gloss, masked", ori: "India", im: ["plastics", [1, 2]], tags: ["acrylic", "laser", "models"], desc: "Laser-friendly cast acrylic with masking on both faces. Displays, signage, architectural models." },
  { t: "Fluorescent orange acrylic offcuts 3 mm", c: "plastics-acrylic", s: null, m: "Acrylic", g: "A", gd: "Cast PMMA, fluorescent", d: [400, 300, 3, "mm"], kg: 1.7, q: 9, u: "bundle", p: 780, r: 2100, cost: 260, col: "Orange", ori: "Germany", im: ["plastics", [4, 0]], tags: ["acrylic", "fluorescent", "signage"], desc: "Bundle of 4 edge-glowing fluorescent acrylic sheets. Jewellery, signage, laser-cut lettering." },
  { t: "Polycarbonate twin-wall offcuts", c: "plastics-acrylic", s: null, m: "Polycarbonate", g: "B", d: [1000, 600, 6, "mm"], kg: 1.1, q: 10, u: "piece", p: 450, r: 1200, cost: 140, col: "Clear", ori: "India", im: ["plastics", [2, 3]], tags: ["polycarbonate", "greenhouse"], desc: "Lightweight UV-protected twin-wall sheet. Cold frames, light diffusers and model glazing." },
  { t: "HDPE cutting-board stock offcuts", c: "plastics-acrylic", s: null, m: "HDPE", g: "A", gd: "Food-grade", d: [450, 300, 12, "mm"], kg: 1.5, q: 12, u: "piece", p: 420, r: 1100, cost: 150, col: "White", ori: "India", im: ["plastics", [3, 0]], tags: ["hdpe", "food-safe", "jigs"], status: "pending-review", desc: "Food-grade HDPE offcuts for chopping boards, jigs and wear strips." },
  // Composites
  { t: "2×2 twill carbon fibre fabric remnant", c: "composites", s: "aero", m: "Carbon fibre", g: "A", gd: "3K 200 gsm 2×2 twill", d: [1000, 800, 0.3, "mm"], kg: 0.16, q: 6, u: "piece", p: 1900, r: 5600, cost: 800, col: "Black", ori: "Japan", im: ["composites", [0, 2]], tags: ["carbon", "twill", "layup"], feat: true, desc: "1 m × 0.8 m of dry 3K carbon fabric from an aerospace layup room. Ideal for vacuum-bagged skins and wet layups." },
  { t: "Carbon fibre plate offcut 2 mm", c: "composites", s: "aero", m: "Carbon fibre", g: "A", gd: "Pre-preg, matte finish", d: [300, 200, 2, "mm"], kg: 0.18, q: 10, u: "piece", p: 1350, r: 3800, cost: 600, col: "Black", fin: "Matte", ori: "India", im: ["composites", [1, 0]], tags: ["carbon", "plate", "drone"], desc: "Cured carbon plate offcut. Drone frames, knife scales, wallets." },
  { t: "Kevlar aramid fabric remnant", c: "composites", s: "aero", m: "Aramid", g: "A", gd: "Kevlar 49, 170 gsm", d: [1000, 600, 0.25, "mm"], kg: 0.12, q: 4, u: "piece", p: 1700, r: 4600, cost: 700, col: "Yellow", ori: "USA", im: ["composites", [2]], tags: ["kevlar", "aramid"], desc: "Plain-weave aramid fabric remnant — abrasion and cut resistant. Needs special shears." },
  { t: "E-glass woven roving roll end", c: "composites", s: "aero", m: "Fibreglass", g: "B", gd: "600 gsm woven roving", d: [5000, 1000, 0.5, "mm"], roll: 5, kg: 3, q: 3, u: "roll", p: 1100, r: 2800, cost: 380, col: "White", ori: "India", im: ["composites", [1, 2]], tags: ["fibreglass", "boat", "repair"], desc: "5 m roll end of fibreglass woven roving. Boat repair, moulds and surfboards." },
  // Foam & cork
  { t: "Cork sheet offcuts 3 mm", c: "foam-cork", s: null, m: "Cork", g: "A", d: [600, 450, 3, "mm"], kg: 0.5, q: 10, u: "bundle", p: 600, r: 1500, cost: 200, col: "Natural", ori: "Portugal", im: ["cork", [0, 1]], tags: ["cork", "pinboard", "coasters"], desc: "Bundle of 5 agglomerated cork sheets. Pin boards, drawer liners, coasters." },
  { t: "EVA foam offcuts 10 mm (cosplay grade)", c: "foam-cork", s: null, m: "EVA foam", g: "B", d: [1000, 500, 10, "mm"], kg: 0.8, q: 8, u: "bundle", p: 550, r: 1500, cost: 180, col: "Black", ori: "India", im: ["cork", [4, 5]], tags: ["eva", "cosplay", "foam"], desc: "High-density EVA sheets — cosplay armour, tool-drawer inserts, kneeling pads." },
  { t: "Wine-cork agglomerate granules (by kg)", c: "foam-cork", s: null, m: "Cork", g: "C", cond: "remnant", d: [10, 10, 5, "mm"], kg: 1, q: 15, u: "kg", sbw: true, p: 240, r: 600, cost: 50, col: "Natural", ori: "India", im: ["cork", [3, 2]], tags: ["cork", "granules", "filler"], desc: "Granulated wine corks — insulation filler, terrarium substrate, DIY cork boards with binder." },
  // Glass
  { t: "Stained-glass off-cut assortment (by kg)", c: "glass", s: null, m: "Art glass", g: "B", cond: "remnant", d: [200, 150, 3, "mm"], kg: 1, q: 20, u: "kg", sbw: true, p: 480, r: 1300, cost: 150, col: "Multi", ori: "India", im: ["glass", [0, 2, 3]], tags: ["stained glass", "mosaic", "lampwork"], desc: "Cathedral and opalescent art-glass cut-offs in mixed colours. Mosaics, suncatchers, lampshades." },
  { t: "Float glass offcuts 6 mm", c: "glass", s: null, m: "Glass", g: "B", d: [400, 300, 6, "mm"], kg: 1.8, q: 15, u: "piece", p: 350, r: 900, cost: 100, col: "Clear", fin: "Arrised edges", ori: "India", im: ["glass", [1]], tags: ["glass", "glazing", "shelves"], desc: "Clear float glass with arrised (safety-ground) edges. Picture frames, small shelves, cold frames." },
  // Hardware
  { t: "Stainless bolts & nuts assortment M6–M10 (by kg)", c: "hardware-trims", s: null, m: "Hardware", g: "A", gd: "A2-70 stainless", cond: "new-dead-stock", d: [60, 10, 10, "mm"], kg: 1, q: 25, u: "kg", sbw: true, p: 420, r: 900, cost: 160, col: "Silver", ori: "India", im: ["hardware", [1, 2, 0]], tags: ["bolts", "fasteners", "stainless"], desc: "Mixed A2 stainless hex bolts, nuts and washers from an over-ordered fabrication job." },
  { t: "Brass rivets & snaps dead-stock (box of 500)", c: "hardware-trims", s: null, m: "Brass", g: "A", cond: "new-dead-stock", d: [12, 12, 8, "mm"], kg: 0.6, q: 7, u: "bundle", p: 690, r: 1800, cost: 220, col: "Yellow", ori: "India", im: ["hardware", [3, 4]], tags: ["rivets", "snaps", "leathercraft"], desc: "Solid brass double-cap rivets and line-24 snaps. Pairs perfectly with our veg-tan strips." },
  { t: "YKK #5 metal zipper dead-stock bundle", c: "hardware-trims", s: null, m: "Hardware", g: "A", gd: "YKK #5 antique silver", cond: "new-dead-stock", d: [600, 30, 3, "mm"], kg: 1.2, q: 6, u: "bundle", p: 1100, r: 3000, cost: 400, col: "Silver", ori: "Japan", im: ["hardware", [0, 3]], tags: ["zipper", "ykk", "garments"], status: "draft", desc: "Bundle of 50 closed-end 60 cm metal zippers with antique-silver teeth." },
  { t: "Assorted drill bits dead-stock (archived)", c: "hardware-trims", s: null, m: "Hardware", g: "B", cond: "seconds", d: [150, 10, 10, "mm"], kg: 0.8, q: 2, u: "bundle", p: 650, r: 1400, cost: 200, col: "Grey", ori: "India", im: ["hardware", [4]], tags: ["drill bits"], status: "archived", desc: "HSS drill bit sets with damaged packaging." },
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set. Copy .env.example to .env.local first.");
  console.log("→ Connecting to MongoDB…");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });

  console.log("→ Clearing existing data…");
  await Promise.all(
    [User, Supplier, Category, Product, Order, Settings, Counter, Cart, Coupon, MaterialRequest, Payout, Review, SupplierSubmission, AuditLog, StockAdjustment, Notification, ContactMessage, NewsletterSubscriber].map((m) =>
      (m as mongoose.Model<unknown>).deleteMany({}),
    ),
  );

  console.log("→ Settings");
  await Settings.create({ ...DEFAULT_SETTINGS, faq: DEFAULT_FAQ });

  console.log("→ Users");
  const hash = (p: string) => bcrypt.hash(p, 10);
  const verified = new Date();
  const admin = await User.create({ name: "Asha Admin", email: "admin@offcut.test", passwordHash: await hash("Admin@123"), role: "admin", emailVerified: verified, buyerType: "business" });
  const buyer = await User.create({
    name: "Rohan Mehta",
    email: "buyer@offcut.test",
    passwordHash: await hash("Buyer@123"),
    role: "buyer",
    buyerType: "maker",
    phone: "9876543210",
    emailVerified: verified,
    addresses: [{ _id: new Types.ObjectId(), label: "Studio", fullName: "Rohan Mehta", phone: "9876543210", line1: "14 Craft Lane, Shahpur Jat", city: "New Delhi", state: "Delhi", pincode: "110049", country: "India", isDefault: true }],
  });
  const student = await User.create({
    name: "Meera Iyer",
    email: "student@offcut.test",
    passwordHash: await hash("Student@123"),
    role: "buyer",
    buyerType: "student",
    emailVerified: verified,
    addresses: [{ _id: new Types.ObjectId(), label: "Hostel", fullName: "Meera Iyer", phone: "9123456780", line1: "Room 214, CEPT Girls Hostel, Navrangpura", city: "Ahmedabad", state: "Gujarat", pincode: "380009", country: "India", isDefault: true }],
  });

  console.log("→ Suppliers");
  const mkSupplier = async (email: string, name: string, company: string, industry: string, gstin: string, address: string, upi: string, status: "verified" | "pending" = "verified") => {
    const u = await User.create({ name, email, passwordHash: await hash("Supplier@123"), role: "supplier", emailVerified: verified, buyerType: "business" });
    return Supplier.create({
      userId: u._id,
      companyName: company,
      industry,
      gstin,
      factoryAddress: address,
      contactPerson: name,
      phone: "9988776655",
      verificationStatus: status,
      onboardingComplete: true,
      documents: [{ name: "GST certificate (sample).pdf", url: img("machining", 3, 800) }],
      payoutDetails: { method: "upi", upiId: upi },
      commissionRate: 15,
      createdAt: daysAgo(120),
    });
  };
  const suppliers = {
    tannery: await mkSupplier("tannery@offcut.test", "Imran Qureshi", "Kanpur Hide & Tan Works", "Tannery", "09AAACK1234F1Z5", "Plot 22, Jajmau Industrial Area, Kanpur, UP 208010", "kanpurhide@okhdfc"),
    mill: await mkSupplier("mill@offcut.test", "Lakshmi Narayanan", "Tiruppur Technical Textiles", "Textile mill", "33AABCT5678G1Z2", "SIDCO Industrial Estate, Tiruppur, TN 641604", "tirutex@okicici"),
    aero: await mkSupplier("aero@offcut.test", "Vikram Rao", "Peenya Precision Aerostructures", "Aerospace CNC machining", "29AADCP9012H1Z8", "Phase 2, Peenya Industrial Area, Bengaluru, KA 560058", "peenyaaero@oksbi"),
  };
  await mkSupplier("newfactory@offcut.test", "Sunita Patil", "Kolhapur Foundry & Fab", "Metal fabrication", "27AAKCK3456J1Z1", "MIDC Shiroli, Kolhapur, MH 416122", "kolhapurfab@okaxis", "pending");

  console.log("→ Categories");
  const cats = new Map<string, Types.ObjectId>();
  for (const [i, c] of CATEGORIES.entries()) {
    const doc = await Category.create({ name: c.name, slug: c.slug, description: c.description, image: { url: img(c.image[0], c.image[1], 1200) }, order: i });
    cats.set(c.slug, doc._id);
  }
  // A subcategory example
  const leatherId = cats.get("leather")!;
  await Category.create({ name: "Veg-tan", slug: "veg-tan", description: "Vegetable-tanned leather only.", parent: leatherId, order: 10, image: { url: img("leather", 1, 1200) } });

  console.log(`→ ${LOTS.length} lots`);
  const lots: InstanceType<typeof Product>[] = [];
  for (const [i, l] of LOTS.entries()) {
    const photos = l.im[1].map((idx) => ({ url: img(l.im[0], idx), alt: `${l.t} — photo ${idx + 1}` }));
    const doc = new Product({
      lotNumber: `A-${String(i + 1).padStart(4, "0")}`,
      title: l.t,
      slug: slugify(l.t),
      description: l.desc
        .split(/\n\n/)
        .map((p) => `<p>${p}</p>`)
        .join(""),
      categoryId: cats.get(l.c),
      supplierId: l.s ? suppliers[l.s]._id : null,
      materialType: l.m,
      grade: l.g,
      gradeDetail: l.gd,
      condition: l.cond ?? "offcut",
      dimensions: { length: l.d[0], width: l.d[1], thickness: l.d[2] || null, unit: l.d[3] },
      isRoll: Boolean(l.roll),
      rollLength: l.roll ?? null,
      weightKg: l.kg,
      quantityAvailable: l.q,
      unitType: l.u,
      sellByWeight: Boolean(l.sbw),
      price: l.p,
      compareAtRetailPrice: l.r ?? null,
      costPrice: l.cost ?? null,
      colour: l.col,
      finish: l.fin,
      origin: l.ori,
      certifications: l.cert ?? [],
      images: photos,
      tags: l.tags,
      status: l.status ?? "active",
      featured: Boolean(l.feat),
      views: Math.floor(40 + ((i * 37) % 260)),
      createdAt: daysAgo(LOTS.length - i),
    });
    await doc.save();
    lots.push(doc);
  }
  await Counter.create({ _id: "lot", seq: LOTS.length });

  console.log("→ Orders");
  const settings = DEFAULT_SETTINGS;
  let orderSeq = 0;
  const year = new Date().getFullYear();
  type OrderSpec = { user: typeof buyer; items: [number, number][]; status: string; pay: "paid" | "pending" | "refunded" | "failed"; method: "cod" | "razorpay"; days: number; coupon?: string; tracking?: boolean };
  const ORDERS: OrderSpec[] = [
    { user: buyer, items: [[0, 2], [46, 1]], status: "delivered", pay: "paid", method: "razorpay", days: 27, coupon: "MAKER10" },
    { user: student, items: [[32, 3], [26, 2]], status: "delivered", pay: "paid", method: "cod", days: 24 },
    { user: buyer, items: [[14, 4]], status: "delivered", pay: "paid", method: "razorpay", days: 21 },
    { user: student, items: [[28, 1]], status: "delivered", pay: "paid", method: "razorpay", days: 18, coupon: "STUDENT15" },
    { user: buyer, items: [[7, 1], [9, 1]], status: "shipped", pay: "paid", method: "razorpay", days: 9, tracking: true },
    { user: buyer, items: [[22, 1]], status: "packed", pay: "paid", method: "razorpay", days: 6 },
    { user: student, items: [[37, 1], [38, 2]], status: "confirmed", pay: "paid", method: "razorpay", days: 4 },
    { user: buyer, items: [[17, 2]], status: "placed", pay: "pending", method: "cod", days: 2 },
    { user: student, items: [[31, 1]], status: "placed", pay: "pending", method: "cod", days: 1 },
    { user: buyer, items: [[2, 1]], status: "cancelled", pay: "refunded", method: "razorpay", days: 15 },
    { user: student, items: [[41, 2]], status: "returned", pay: "refunded", method: "razorpay", days: 12 },
    { user: buyer, items: [[15, 3], [18, 2]], status: "delivered", pay: "paid", method: "razorpay", days: 14 },
    { user: student, items: [[24, 1]], status: "delivered", pay: "paid", method: "cod", days: 7 },
    { user: buyer, items: [[19, 2]], status: "confirmed", pay: "paid", method: "razorpay", days: 0 },
  ];
  const HIST = ["placed", "confirmed", "packed", "shipped", "delivered"];
  const createdOrders = [];
  for (const o of ORDERS) {
    const items: IOrderItem[] = o.items.map(([idx, qty]) => {
      const p = lots[idx];
      return {
        productId: p._id,
        supplierId: p.supplierId ?? null,
        title: p.title,
        slug: p.slug,
        lotNumber: p.lotNumber,
        image: p.images[0]?.url,
        specs: formatDims(p.dimensions),
        unitType: p.unitType,
        sellByWeight: p.sellByWeight,
        weightKg: p.weightKg,
        price: p.price,
        qty,
      };
    });
    const coupon = o.coupon === "MAKER10" ? { code: "MAKER10", type: "percent" as const, value: 10 } : o.coupon === "STUDENT15" ? { code: "STUDENT15", type: "percent" as const, value: 15 } : null;
    const totals = computeTotals(items, settings.shipping, settings.taxRate, coupon, "standard");
    const created = daysAgo(o.days, 10 + (orderSeq % 8));
    const reached = HIST.indexOf(o.status);
    const history =
      reached >= 0
        ? HIST.slice(0, reached + 1).map((s, i) => ({ status: s, at: new Date(created.getTime() + i * 26 * 3600_000), by: i === 0 ? o.user.email : "admin@offcut.test", note: s === "shipped" ? "Delhivery 1452 8890 3311" : undefined }))
        : [{ status: "placed", at: created, by: o.user.email }, { status: o.status, at: new Date(created.getTime() + 20 * 3600_000), by: "admin@offcut.test", note: o.status === "cancelled" ? "Cancelled at customer's request — refunded" : "Returned — refunded" }];
    if (o.pay === "paid" && o.method === "razorpay") history.splice(1, 0, { status: "paid", at: new Date(created.getTime() + 60_000), by: o.user.email, note: "Razorpay payment pay_SEED" });
    orderSeq++;
    const kg = items.reduce((s, i) => s + lineWeight(i), 0);
    const co2 = items.reduce((s, i, k) => s + lineWeight(i) * co2Factor(lots[o.items[k][0]].materialType), 0);
    const order = await Order.create({
      orderNumber: `OC-${year}-${String(orderSeq).padStart(6, "0")}`,
      userId: o.user._id,
      email: o.user.email,
      items,
      shippingAddress: (({ fullName, phone, line1, line2, city, state, pincode, country }) => ({ fullName, phone, line1, line2, city, state, pincode, country }))(o.user.addresses[0]),
      shippingMethod: "standard",
      ...totals,
      taxRate: settings.taxRate,
      couponCode: coupon?.code,
      paymentMethod: o.method,
      paymentStatus: o.pay,
      razorpayOrderId: o.method === "razorpay" ? `order_SEED${orderSeq}` : undefined,
      razorpayPaymentId: o.method === "razorpay" && o.pay !== "pending" ? `pay_SEED${orderSeq}` : undefined,
      orderStatus: o.status,
      statusHistory: history,
      trackingNumber: o.tracking || reached >= 3 ? "1452 8890 3311" : undefined,
      courier: o.tracking || reached >= 3 ? "Delhivery" : undefined,
      stockRestored: ["cancelled", "returned"].includes(o.status),
      kgDiverted: Number(kg.toFixed(2)),
      co2SavedKg: Number(co2.toFixed(1)),
      createdAt: created,
      updatedAt: created,
    });
    // Stock: cancelled/returned orders already had stock restored.
    if (!["cancelled", "returned"].includes(o.status)) {
      for (const [idx, qty] of o.items) await Product.updateOne({ _id: lots[idx]._id }, { $inc: { quantityAvailable: -qty, soldQty: qty } });
    }
    createdOrders.push(order);

    // Payouts for paid orders with supplier lots
    if (o.pay === "paid") {
      const bySup = new Map<string, { gross: number; kg: number }>();
      for (const it of items) {
        if (!it.supplierId) continue;
        const k = it.supplierId.toString();
        const cur = bySup.get(k) ?? { gross: 0, kg: 0 };
        cur.gross += it.price * it.qty;
        cur.kg += lineWeight(it);
        bySup.set(k, cur);
      }
      for (const [sid, v] of bySup) {
        const commission = Math.round(v.gross * 0.15);
        const paid = o.days > 15;
        await Payout.create({ supplierId: sid, orderId: order._id, orderNumber: order.orderNumber, gross: v.gross, commission, amount: v.gross - commission, status: paid ? "paid" : "pending", reference: paid ? `UTR${400000 + orderSeq}` : undefined, paidAt: paid ? daysAgo(o.days - 7) : null, createdAt: created });
        await Supplier.updateOne({ _id: sid }, { $inc: { totalKgDiverted: v.kg } });
      }
    }
  }
  await Counter.create({ _id: `order-${year}`, seq: orderSeq });
  // Mark one popular lot as sold out to demo that state
  await Product.updateOne({ _id: lots[5]._id }, { quantityAvailable: 0, status: "sold-out", $inc: { soldQty: 5 } });

  console.log("→ Coupons");
  await Coupon.create([
    { code: "MAKER10", description: "10% off for makers", type: "percent", value: 10, minOrder: 500, perUserLimit: 3, usedCount: 1, usedBy: [{ userId: buyer._id, count: 1 }], isActive: true },
    { code: "STUDENT15", description: "15% off for design & architecture students", type: "percent", value: 15, minOrder: 1000, perUserLimit: 2, usedCount: 1, usedBy: [{ userId: student._id, count: 1 }], isActive: true },
    { code: "FLAT200", description: "₹200 off orders over ₹2,000", type: "flat", value: 200, minOrder: 2000, maxUses: 100, perUserLimit: 1, expiresAt: daysAgo(-60), isActive: true },
    { code: "DIWALI25", description: "Expired festive offer", type: "percent", value: 25, minOrder: 0, expiresAt: daysAgo(20), isActive: false },
  ]);

  console.log("→ Reviews");
  await Review.create([
    { productId: lots[0]._id, userId: buyer._id, userName: "Rohan M.", rating: 5, title: "Exactly as measured", body: "Every strip was 600 mm and within a hair of 1.4 mm. Made six watch straps and a card wallet. Will buy again.", verifiedPurchase: true, isApproved: true, createdAt: daysAgo(20) },
    { productId: lots[32]._id, userId: student._id, userName: "Meera I.", rating: 5, title: "Perfect for my studio model", body: "Clear, well masked and laser-cut cleanly. Saved me a lot compared with buying full sheets.", verifiedPurchase: true, isApproved: true, createdAt: daysAgo(19) },
    { productId: lots[14]._id, userId: buyer._id, userName: "Rohan M.", rating: 4, title: "Great plate, one edge rough", body: "Flat and true. One saw-cut edge needed a pass on the mill but that was expected for an off-cut.", verifiedPurchase: true, isApproved: true, createdAt: daysAgo(15) },
    { productId: lots[28]._id, userId: student._id, userName: "Meera I.", rating: 5, title: "Gorgeous slab", body: "The polish is perfect. It became the base for my thesis model.", verifiedPurchase: true, isApproved: true, createdAt: daysAgo(12) },
    { productId: lots[15]._id, userId: buyer._id, userName: "Rohan M.", rating: 3, title: "Good but heavier than I thought", body: "Material is excellent; check the weight before ordering if you're shipping far.", verifiedPurchase: true, isApproved: false, createdAt: daysAgo(3) },
  ]);

  console.log("→ Supplier submissions (every kanban column)");
  const sub = (supplier: keyof typeof suppliers, material: string, status: string, extra: Record<string, unknown> = {}) => ({
    supplierId: suppliers[supplier]._id,
    material,
    description: "Clean off-cuts from this month's production run, stored indoors on pallets. Grade mostly A with some B.",
    approxQuantity: "~40 kg",
    approxDimensions: "300–900 mm long, mixed widths",
    approxWeightKg: 40,
    photos: imgs(supplier === "tannery" ? "leather" : supplier === "mill" ? "textiles" : "metals", 1200)
      .slice(0, 3)
      .map((url) => ({ url })),
    pickupAddress: "Factory gate 2 — see company address",
    status,
    statusHistory: [{ status: "new", note: "Submitted by supplier", at: daysAgo(10) }, ...(status !== "new" ? [{ status, at: daysAgo(4) }] : [])],
    ...extra,
  });
  await SupplierSubmission.create([
    sub("tannery", "Chrome-tan upholstery hide off-cuts, tan", "new", { categoryId: cats.get("leather") }),
    sub("mill", "Recycled polyester fleece roll ends", "new", { categoryId: cats.get("textiles") }),
    sub("aero", "5083 marine aluminium plate drops", "reviewing", { categoryId: cats.get("metals"), notes: "Ask for thickness breakdown." }),
    sub("mill", "Organic cotton canvas 12 oz roll ends", "offer-sent", { categoryId: cats.get("textiles"), askingPrice: 9000, adminOffer: { amount: 7200, message: "Includes free pickup next Tuesday.", at: daysAgo(2) } }),
    sub("tannery", "Veg-tan shoulder off-cuts, 4–5 oz", "accepted", { categoryId: cats.get("leather"), adminOffer: { amount: 5400, at: daysAgo(6) }, supplierResponse: "accepted" }),
    sub("aero", "Carbon pre-preg scrap (cured panels)", "picked-up", { categoryId: cats.get("composites"), adminOffer: { amount: 3800, at: daysAgo(9) }, supplierResponse: "accepted" }),
    sub("tannery", "Full-grain Italian veg-tan strips", "listed", { categoryId: cats.get("leather"), adminOffer: { amount: 7000, at: daysAgo(30) }, supplierResponse: "accepted", linkedProductIds: [lots[0]._id] }),
    sub("mill", "Faulty-dye polyester batch", "rejected", { categoryId: cats.get("textiles"), adminOffer: { amount: 500, at: daysAgo(8) }, supplierResponse: "declined" }),
  ]);

  console.log("→ Material Wanted requests");
  await MaterialRequest.create([
    { userId: student._id, material: "Walnut veneer for a 1:50 facade model", dimensionsNeeded: "at least 400 × 300 mm", quantity: "4 sheets", budget: 1500, status: "open" },
    { userId: buyer._id, material: "3 mm 5052 aluminium sheet", dimensionsNeeded: "min 500 × 400 mm", quantity: "2 pieces", budget: 2000, status: "open" },
    { userId: buyer._id, material: "Horsehide or Chromexcel leather", dimensionsNeeded: "600 × 300 mm", quantity: "1 piece", status: "matched", matchedProductIds: [lots[2]._id], adminNote: "Closest match is our oil pull-up side." },
  ]);

  console.log("→ Syncing indexes");
  await Promise.all([Product, User, Order, Category, Supplier, Review, Coupon, Payout, SupplierSubmission].map((m) => (m as mongoose.Model<unknown>).syncIndexes()));

  const active = await Product.countDocuments({ status: "active" });
  console.log(`\n✔ Seed complete: ${LOTS.length} lots (${active} active), ${createdOrders.length} orders, 3 verified suppliers.\n`);
  console.log("  Admin     admin@offcut.test     / Admin@123");
  console.log("  Buyer     buyer@offcut.test     / Buyer@123");
  console.log("  Student   student@offcut.test   / Student@123");
  console.log("  Supplier  tannery@offcut.test   / Supplier@123  (also mill@, aero@; newfactory@ is pending verification)");
  console.log(`  Admin user id: ${admin._id}`);
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error("✖ Seed failed:", e);
  await mongoose.disconnect();
  process.exit(1);
});
