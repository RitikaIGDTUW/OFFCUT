"use client";

/** Last-resort boundary (replaces the root layout), so it uses inline styles only. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: "#F4F0E7", color: "#252A28", fontFamily: "monospace", padding: 40 }}>
        <h1>OFFCUT — something went wrong.</h1>
        <button onClick={reset} style={{ border: "1px solid #252A28", padding: "8px 16px", background: "#183D35", color: "#F4F0E7", cursor: "pointer" }}>
          Try again
        </button>
      </body>
    </html>
  );
}
