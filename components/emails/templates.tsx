import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

/**
 * All transactional emails, built with React Email in the OFFCUT look:
 * linen background, ink text, monospace labels, one hazard-orange button.
 */
const c = {
  paper: "#F4F0E7",
  panel: "#D9DED5",
  ink: "#252A28",
  graphite: "#5C5A55",
  rule: "#CFC8BA",
  signal: "#183D35",
  moss: "#183D35",
};
const mono = "'JetBrains Mono', 'Courier New', monospace";
const serif = "'Instrument Serif', Georgia, serif";
const sans = "'Inter Tight', Arial, sans-serif";

function Layout({ preview, title, children }: { preview: string; title: string; children: ReactNode }) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ background: c.paper, color: c.ink, fontFamily: sans, margin: 0, padding: "24px 0" }}>
        <Container style={{ maxWidth: 560, border: `1px solid ${c.ink}`, background: c.paper }}>
          <Section style={{ borderBottom: `1px solid ${c.ink}`, padding: "14px 24px" }}>
            <Text style={{ fontFamily: mono, fontSize: 13, letterSpacing: "0.12em", margin: 0, fontWeight: 700 }}>
              OFFCUT ⌐ MATERIAL EXCHANGE
            </Text>
          </Section>
          <Section style={{ padding: "28px 24px 8px" }}>
            <Heading style={{ fontFamily: serif, fontWeight: 400, fontSize: 34, lineHeight: "1.05", margin: "0 0 16px" }}>
              {title}
            </Heading>
            {children}
          </Section>
          <Hr style={{ borderColor: c.rule, margin: "24px 0 0" }} />
          <Section style={{ padding: "12px 24px 18px" }}>
            <Text style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.08em", color: c.graphite, margin: 0 }}>
              INDUSTRIAL-GRADE LEFTOVERS. MAKER-GRADE PRICES. · THIS IS A LOCAL COLLEGE-PROJECT DEMO.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const P = ({ children }: { children: ReactNode }) => (
  <Text style={{ fontSize: 15, lineHeight: "1.6", margin: "0 0 14px" }}>{children}</Text>
);
const Label = ({ children }: { children: ReactNode }) => (
  <Text style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.08em", color: c.graphite, margin: "0 0 4px", textTransform: "uppercase" }}>
    {children}
  </Text>
);
const CTA = ({ href, children }: { href: string; children: ReactNode }) => (
  <Button
    href={href}
    style={{
      background: c.signal,
      color: c.paper,
      border: `1px solid ${c.ink}`,
      padding: "12px 20px",
      fontFamily: mono,
      fontSize: 13,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      fontWeight: 700,
      margin: "8px 0 8px",
    }}
  >
    {children}
  </Button>
);

export type EmailLine = { title: string; lotNumber: string; qty: number; price: number };
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function Lines({ items }: { items: EmailLine[] }) {
  return (
    <Section style={{ border: `1px solid ${c.rule}`, background: c.panel, padding: "8px 14px", margin: "8px 0 16px" }}>
      {items.map((i) => (
        <Text key={i.lotNumber} style={{ fontSize: 14, margin: "6px 0" }}>
          <span style={{ fontFamily: mono, fontSize: 11 }}>LOT #{i.lotNumber}</span> · {i.title} × {i.qty} —{" "}
          <strong>{inr(i.price * i.qty)}</strong>
        </Text>
      ))}
    </Section>
  );
}

/* ───────── Templates ───────── */
export const WelcomeEmail = ({ name, url }: { name: string; url: string }) => (
  <Layout preview="Welcome to OFFCUT" title={`Welcome, ${name}.`}>
    <P>You now have access to graded, measured off-cuts from tanneries, mills and machine shops across India.</P>
    <CTA href={url}>Browse fresh lots</CTA>
  </Layout>
);

export const VerifyEmail = ({ name, url }: { name: string; url: string }) => (
  <Layout preview="Verify your email" title="Confirm your email">
    <P>Hi {name}, tap the button to verify your email address. The link is valid for 48 hours.</P>
    <CTA href={url}>Verify email</CTA>
  </Layout>
);

export const ResetPasswordEmail = ({ name, url }: { name: string; url: string }) => (
  <Layout preview="Reset your password" title="Reset your password">
    <P>Hi {name}, someone (hopefully you) asked to reset your OFFCUT password. This link expires in 1 hour.</P>
    <CTA href={url}>Choose a new password</CTA>
    <P>If you didn&apos;t ask for this, you can ignore this email.</P>
  </Layout>
);

export const OrderConfirmationEmail = (p: {
  name: string;
  orderNumber: string;
  items: EmailLine[];
  total: number;
  paymentMethod: string;
  kgDiverted: number;
  url: string;
}) => (
  <Layout preview={`Order ${p.orderNumber} confirmed`} title="Order received.">
    <Label>Order</Label>
    <P>
      <strong style={{ fontFamily: mono }}>{p.orderNumber}</strong> · {p.paymentMethod === "cod" ? "Cash on delivery" : "Paid online"}
    </P>
    <Lines items={p.items} />
    <P>
      Total: <strong>{inr(p.total)}</strong>
    </P>
    <Text style={{ color: c.moss, fontFamily: mono, fontSize: 12, letterSpacing: "0.06em" }}>
      ♻ THIS ORDER DIVERTS {p.kgDiverted.toFixed(1)} KG FROM LANDFILL
    </Text>
    <CTA href={p.url}>View order</CTA>
  </Layout>
);

export const OrderStatusEmail = (p: {
  name: string;
  orderNumber: string;
  status: string;
  note?: string;
  trackingNumber?: string;
  courier?: string;
  url: string;
}) => (
  <Layout preview={`Order ${p.orderNumber}: ${p.status}`} title={`Your order is ${p.status}.`}>
    <Label>Order</Label>
    <P>
      <strong style={{ fontFamily: mono }}>{p.orderNumber}</strong>
    </P>
    {p.note ? <P>{p.note}</P> : null}
    {p.trackingNumber ? (
      <>
        <Label>Tracking</Label>
        <P>
          {p.courier ?? "Courier"} · <strong style={{ fontFamily: mono }}>{p.trackingNumber}</strong>
        </P>
      </>
    ) : null}
    <CTA href={p.url}>Track order</CTA>
  </Layout>
);

export const SubmissionReceivedEmail = (p: { company: string; material: string; url: string }) => (
  <Layout preview="We received your off-cuts submission" title="Submission received.">
    <P>
      Thanks {p.company}. Our grading team will review <strong>{p.material}</strong> within 2 working days and send an offer.
    </P>
    <CTA href={p.url}>View submission</CTA>
  </Layout>
);

export const OfferSentEmail = (p: { company: string; material: string; amount: number; message?: string; url: string }) => (
  <Layout preview="You have an offer from OFFCUT" title={`Offer: ${inr(p.amount)}`}>
    <P>
      For your submission <strong>{p.material}</strong>. {p.message}
    </P>
    <CTA href={p.url}>Accept or decline</CTA>
  </Layout>
);

export const SupplierVerifiedEmail = (p: { company: string; verified: boolean; reason?: string; url: string }) => (
  <Layout
    preview={p.verified ? "Your supplier account is verified" : "Supplier verification update"}
    title={p.verified ? "You're verified." : "Verification needs attention"}
  >
    <P>
      {p.verified
        ? `${p.company} can now submit off-cuts and receive payouts.`
        : `We couldn't verify ${p.company} yet. Reason: ${p.reason ?? "—"}`}
    </P>
    <CTA href={p.url}>Open supplier portal</CTA>
  </Layout>
);

export const MaterialMatchEmail = (p: { name: string; material: string; lots: { title: string; url: string }[]; note?: string }) => (
  <Layout preview="We found material for your request" title="We found a match.">
    <P>
      Hi {p.name}, you asked for <strong>{p.material}</strong>. These lots might work:
    </P>
    {p.lots.map((l) => (
      <P key={l.url}>
        → <a href={l.url} style={{ color: c.ink }}>{l.title}</a>
      </P>
    ))}
    {p.note ? <P>{p.note}</P> : null}
  </Layout>
);

export const ContactEmail = (p: { name: string; email: string; subject: string; message: string }) => (
  <Layout preview={`Contact: ${p.subject}`} title="New contact message">
    <Label>From</Label>
    <P>
      {p.name} · {p.email}
    </P>
    <Label>Subject</Label>
    <P>{p.subject}</P>
    <Label>Message</Label>
    <P>{p.message}</P>
  </Layout>
);

export const AdminPasswordResetNotice = ({ name, url }: { name: string; url: string }) => (
  <Layout preview="Reset your password" title="Password reset requested">
    <P>Hi {name}, an OFFCUT administrator sent you a password-reset link. It expires in 1 hour.</P>
    <CTA href={url}>Choose a new password</CTA>
  </Layout>
);
