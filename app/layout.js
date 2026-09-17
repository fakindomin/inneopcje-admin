import { Analytics } from "@vercel/analytics/react";
import { SITE_URL } from "../lib/site";
import "./globals.css";

const DESCRIPTION = "Sprawdź, czy to dobry wybór, zanim kupisz.";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: "innaopcja.pl",
  description: DESCRIPTION,
  openGraph: {
    title: "innaopcja.pl",
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "innaopcja.pl",
    locale: "pl_PL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "innaopcja.pl",
    description: DESCRIPTION,
  },
};

export const viewport = {
  themeColor: "#E4572E",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <body className="antialiased min-h-dvh">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
