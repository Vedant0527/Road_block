import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Roadblock — Autonomous Agentic Multi-Merchant Commerce",
  description: "Zero-Trust Agentic multi-vendor checkout and settlement platform powered by PayPal Orders v2",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-roadblock-dark text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}

