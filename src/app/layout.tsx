import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Club Ciclista",
  description: "Rutes, carrera i equipacions del club ciclista.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ca">
      <body>
        <SiteHeader />
        <div className="site-shell">
          <main>{children}</main>
          <footer className="site-footer">
            <div className="container site-footer__inner">
              <p>Club ciclista · Calendari de rutes</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
