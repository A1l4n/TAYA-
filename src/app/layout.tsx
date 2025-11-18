import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TAYA - Multi-Tenant ERP Platform",
  description: "Enterprise-grade ERP platform with hierarchical management, resource allocation, and advanced permissions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="antialiased">
        {children}
      </body>
    </html>
  );
}

