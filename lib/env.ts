/**
 * Central place that reads environment variables and decides which optional
 * features are switched on. The app must run with ONLY MongoDB configured,
 * so every external service is guarded by one of these flags.
 */
export const env = {
  MONGODB_URI: process.env.MONGODB_URI ?? "",
  SITE_URL: process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID ?? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "",
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET ?? "",
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
  EMAIL_FROM: process.env.EMAIL_FROM ?? "OFFCUT <no-reply@offcut.test>",
};

export const features = {
  uploads: Boolean(process.env.UPLOADTHING_TOKEN),
  razorpay: Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET),
  google: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
  smtp: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
};

/** Subset of feature flags that is safe to send to the browser. */
export type PublicFeatures = { uploads: boolean; razorpay: boolean; google: boolean };
export const publicFeatures = (): PublicFeatures => ({
  uploads: features.uploads,
  razorpay: features.razorpay,
  google: features.google,
});
