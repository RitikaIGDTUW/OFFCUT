"use client";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Jotform AI agent — floating chat bubble for buyers and suppliers.
 * Rendered once from app/layout.tsx so the script loads a single time for the whole site.
 * Not shown on /admin: the script is skipped on a direct load, and the bubble is hidden
 * (body.hide-chatbot, see globals.css) when navigating into /admin from another page.
 */
export function Chatbot() {
  const pathname = usePathname();
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  useEffect(() => {
    document.body.classList.toggle("hide-chatbot", isAdmin);
    return () => document.body.classList.remove("hide-chatbot");
  }, [isAdmin]);

  if (isAdmin) return null;
  return <Script id="jotform-agent" src="https://cdn.jotfor.ms/agent/embedjs/01a1fa4b4f9070008ade106d0e94a70a2740/embed.js" strategy="afterInteractive" />;
}
