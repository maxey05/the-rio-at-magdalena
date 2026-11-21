import type { Metadata } from "next";
import { Figtree, Fraunces } from "next/font/google";
import localFont from "next/font/local";
import { site } from "@/lib/content";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
  variable: "--font-fraunces",
  display: "swap",
});

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

const mackinac = localFont({
  src: "./fonts/P22Mackinac-Book.otf",
  weight: "400",
  style: "normal",
  variable: "--font-mackinac",
  display: "swap",
});

const crimson = localFont({
  src: [
    { path: "./fonts/CrimsonPro-Variable.ttf", weight: "200 900", style: "normal" },
    { path: "./fonts/CrimsonPro-Italic-Variable.ttf", weight: "200 900", style: "italic" },
  ],
  variable: "--font-crimson",
  display: "swap",
});

const instrument = localFont({
  src: "./fonts/InstrumentSans-Variable.ttf",
  weight: "400 700",
  variable: "--font-instrument",
  display: "swap",
});

const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: site.name,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: "en_PH",
    title: site.name,
    description: site.description,
    url: "/",
  },
  twitter: { card: "summary_large_image", images: ["/opengraph-image.jpg"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${figtree.variable} ${mackinac.variable} ${crimson.variable} ${instrument.variable}`}>
      <body>{children}</body>
    </html>
  );
}
