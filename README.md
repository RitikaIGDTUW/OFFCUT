# OFFCUT — Industrial-grade leftovers. Maker-grade prices.

A full-stack B2B/B2C marketplace for industrial **dead-stock and off-cut materials** — leather strips,
aerospace aluminium, Gore-Tex roll ends, walnut shorts, marble remnants — catalogued by exact dimensions,
weight, grade and condition.

> **College project — runs locally only** on `http://localhost:3000`. No deployment, no paid services.
> Razorpay runs in **TEST MODE**; no real money moves.

Three roles:

| Role | What they can do |
|---|---|
| **Buyer** | Browse & filter by spec, "Will it fit?" calculator, cart, checkout (Razorpay test / COD), orders, invoices, wishlist, reviews, Material Wanted requests |
| **Supplier** (factory) | Onboarding wizard (GSTIN, documents, payout details), submit off-cuts with photos, accept/decline offers, payouts ledger, ESG certificate PDF |
| **Admin** | Dashboard & charts, lots CRUD (bulk actions, CSV import/export, image reorder), categories, orders (status, tracking, refunds, invoices, packing slips), submissions kanban, suppliers, users, reviews, coupons, requests, inventory, reports, audit log, site settings |

---

## 1. Requirements

- **Node.js 20.9+** (tested on Node 22)
- **MongoDB** — either
  - local MongoDB Community Server (`mongodb://127.0.0.1:27017/offcut`), or
  - a free **MongoDB Atlas** M0 cluster (recommended — it supports transactions)
- Optional free accounts: UploadThing, Razorpay (test mode), Gmail/Mailtrap SMTP, Google OAuth

## 2. Setup

```bash
npm install
cp .env.example .env.local      # Windows: copy .env.example .env.local
```

Fill in `.env.local`:

| Variable | Required? | How to get it |
|---|---|---|
| `MONGODB_URI` | **yes** | Local: `mongodb://127.0.0.1:27017/offcut`. Atlas: Create cluster → *Connect* → *Drivers* → copy the `mongodb+srv://…` string, add `/offcut` before `?`, and allow your IP under *Network Access*. |
| `AUTH_SECRET` | **yes** | Any long random string: `npx auth secret` or `openssl rand -base64 32` |
| `NEXT_PUBLIC_SITE_URL`, `AUTH_URL` | yes | `http://localhost:3000` (already in the example) |
| `UPLOADTHING_TOKEN` | recommended | [uploadthing.com](https://uploadthing.com) → create app → *API Keys* → copy the token. Without it, upload widgets turn into "paste an image URL" fields. |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID` | optional | [dashboard.razorpay.com](https://dashboard.razorpay.com) → switch to **Test Mode** → *Account & Settings → API Keys* → generate (`rzp_test_…`). Without them, only Cash on Delivery is offered. |
| `RAZORPAY_WEBHOOK_SECRET` | not needed | Only used by the optional webhook route (Razorpay can't reach localhost). |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | optional | Gmail: enable 2-step verification → create an *App password* → `smtp.gmail.com`, port `587`. Or use a Mailtrap sandbox. Without SMTP, emails go to a free **Ethereal** test inbox and a preview link is printed in the terminal (or, offline, the email is printed to the console). |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | optional | Google Cloud Console → *Credentials* → OAuth client (Web). Authorised redirect URI: `http://localhost:3000/api/auth/callback/google`. The Google button only appears when both are set. |

> The original brief mentioned `RESEND_API_KEY`; this project uses **Nodemailer** instead (as the brief's tech
> stack specifies), so Resend is not needed.

## 3. Seed & run

```bash
npm run seed     # ⚠ wipes and re-creates all OFFCUT collections
npm run dev      # http://localhost:3000
```

Demo accounts created by the seed:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@offcut.test` | `Admin@123` |
| Buyer (maker) | `buyer@offcut.test` | `Buyer@123` |
| Buyer (student) | `student@offcut.test` | `Student@123` |
| Supplier — tannery | `tannery@offcut.test` | `Supplier@123` |
| Supplier — textile mill | `mill@offcut.test` | `Supplier@123` |
| Supplier — aerospace CNC | `aero@offcut.test` | `Supplier@123` |
| Supplier — pending verification | `newfactory@offcut.test` | `Supplier@123` |

Seed contents: 10 categories (+1 subcategory), **49 lots** with real specs and Unsplash photos, 14 orders in
every status, payouts, reviews (one pending moderation), coupons **`MAKER10`**, **`STUDENT15`**, `FLAT200`,
supplier submissions in every kanban column, Material Wanted requests, and site settings.

Production mode: `npm run build && npm start`.

## 4. Razorpay test payments

1. Put your `rzp_test_…` keys in `.env.local` and restart `npm run dev`.
2. Checkout → choose *Pay online — Razorpay* (a **TEST MODE** badge is shown).
3. Use any of:

| Method | Test value |
|---|---|
| Card (success) | `4111 1111 1111 1111`, any future expiry, any CVV, OTP any 4–6 digits |
| Card (Mastercard) | `5267 3181 8797 5449` |
| UPI (success) | `success@razorpay` |
| UPI (failure) | `failure@razorpay` |
| Netbanking | pick any bank → click *Success* or *Failure* on the test page |

**How it works (no webhook needed):** the server creates a Razorpay order → the browser opens Razorpay
Checkout → on success the browser sends `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature` to the
`verifyPayment` server action → the server recomputes **HMAC-SHA256(`order_id|payment_id`, KEY_SECRET)** and
only marks the order paid if it matches. If the buyer closes the popup or the payment fails, the order stays
**pending** with a **Retry payment** button; stock is held for 30 minutes, after which the order is
auto-cancelled and the stock released. Admins can issue refunds through Razorpay's refund API.

Cash on Delivery can be switched off in *Admin → Content & settings*.

## 5. Project structure

```
app/
  (shop)/        home, shop, shop/[category], lot/[slug] (+OG image), search, cart, checkout,
                 order/[orderNumber], about, how-it-works, sustainability, faq, contact,
                 shipping-returns, terms, privacy, suppliers (landing)
  (auth)/        login, register, forgot-password, reset-password/[token], verify-email/[token]
  account/       dashboard, orders(+detail), addresses, wishlist, requests, profile
  supplier/      dashboard, onboarding, submit, submissions, lots
  admin/         dashboard, products(+new/[id]), categories, orders(+[id]), submissions, suppliers,
                 users, reviews, coupons, requests, inventory, reports, audit, settings
  api/           auth/[...nextauth], uploadthing, webhooks/razorpay (optional),
                 orders/[orderNumber]/invoice, supplier/certificate, admin/export
actions/         server actions grouped by domain (auth, cart, checkout, account, supplier, admin/*)
components/      ui/ (restyled shadcn-style kit), shop/, admin/, supplier/, account/, auth/, layout/, emails/
lib/             db, auth, guards, catalog queries, pricing, orders, razorpay, email, pdf, validations/, …
models/          Mongoose models (User, Supplier, Category, Product, Order, Settings, misc.ts for the rest)
store/           Zustand cart
scripts/seed.ts  demo data
middleware.ts    role-based route protection
```

## 6. Key design decisions (for the viva)

- **Server Components by default**; mutations are **Server Actions** validated with **Zod**. Every action
  re-checks the user's role **against the database** (`lib/guards.ts`), not just the JWT — middleware alone is
  never trusted.
- **Prices and stock are always recomputed on the server** at checkout (`lib/orders.ts → quote()`); the
  browser's cart prices are only a preview.
- **Atomic stock decrement:** `updateOne({ _id, quantityAvailable: { $gte: qty } }, { $inc: … })` — two buyers
  can never both buy the last piece. Order creation + stock decrement run in a **MongoDB transaction**
  (`withOptionalTransaction` in `lib/db.ts`). A plain local `mongod` can't run transactions, so the code falls
  back to the same atomic updates with manual rollback.
- **Secrets never reach the browser:** `passwordHash`, `costPrice` and supplier `payoutDetails` are
  `select: false` in the schemas; password-reset and email-verification tokens are stored only as SHA-256 hashes.
- **Rate limiting** (in-memory) on login, registration, password reset, contact form, newsletter and reviews.
- **Rich text** descriptions are sanitised with `sanitize-html`.
- **Cart:** Zustand + localStorage for guests; synced to MongoDB for signed-in users and merged on login.
- **Caching:** catalog/settings data use Next's data cache with tags (`catalog`, `settings`), invalidated by
  `revalidateTag` whenever an admin edits lots, categories, orders or settings.
- **Uploads:** UploadThing endpoints check auth + role in `.middleware()`; removed images are deleted with
  `UTApi.deleteFiles`.
- **Emails:** React Email templates, sent with Nodemailer (SMTP → Ethereal → console fallback).
- **PDFs** (invoice, packing slip, ESG certificate) are drawn with `pdf-lib` — no external service.
- **Design system** "Tactile Industrial Editorial": linen paper, ink hairlines, one hazard-orange accent,
  Instrument Serif + Inter Tight + JetBrains Mono, 0–2 px radii, "stamp" hovers, sample-tag product cards,
  visible grid lines, registration marks, barcode dividers, light/dark mode, `prefers-reduced-motion` respected.

## 7. Notes & limitations

- Supplier names are anonymised on lot pages unless *Show supplier company names* is enabled in settings.
- CO₂e numbers are estimates from rounded per-material emission factors (`lib/co2.ts`), shown for awareness.
- Testimonials and the "featured supplier" story on the homepage are labelled as sample content.
- Photos: Unsplash (credited in the footer). All seed image URLs were checked to return images.
- Pinned dependency versions: `motion-dom` is pinned via `overrides` because newer releases are incompatible
  with the framer-motion version used.

## 8. Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run build` / `npm start` | Production build / serve |
| `npm run seed` | Reset & seed the database |
| `npm run lint` | ESLint (Next + TypeScript rules, `no-explicit-any` is an error) |
| `npm run typecheck` | `tsc --noEmit` (strict mode) |
| `npm run format` | Prettier |
