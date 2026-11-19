import type { Metadata } from "next";
import { site } from "@/lib/content";

const ogImage = {
  url: "/opengraph-image.jpg",
  width: 1200,
  height: 630,
  alt: "The Rio At Magdalena: camp between two rivers.",
};

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  absoluteTitle?: string;
};

export function pageMetadata({ title, description, path, absoluteTitle }: PageMetadataInput): Metadata {
  const fullTitle = absoluteTitle ?? `${title} | ${site.name}`;
  return {
    title: absoluteTitle ? { absolute: absoluteTitle } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: site.name,
      locale: "en_PH",
      title: fullTitle,
      description,
      url: path,
      images: [ogImage],
    },
  };
}
