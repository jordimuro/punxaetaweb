import type { Metadata } from "next";
import { AuthProvider, InstagramLink } from "@/components/auth";
import { SiteHeader } from "@/components/site-header";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Club Ciclista La Punxaeta",
  description: "Rutes, carrera i equipacions del Club Ciclista La Punxaeta.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ca">
      <body>
        <AuthProvider>
          <SiteHeader />
          <div className="site-shell">
            <main>{children}</main>
            <footer className="site-footer">
              <div className="container site-footer__inner">
                <p>Club Ciclista La Punxaeta - Muro</p>
                <InstagramLink className="site-footer__instagram" label="" />
              </div>
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
