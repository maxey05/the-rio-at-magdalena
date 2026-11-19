import { GalleryGrid } from "@/components/gallery-grid";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { gallery, galleryNote } from "@/lib/content";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Gallery",
  description:
    "Photos of The Rio At Magdalena: the riverbank, the camps, the cliff edge and aerial views of Camp 1 and Camp 2 with every slot marked.",
  path: "/gallery",
});

export default function GalleryPage() {
  return (
    <>
      <PageHeader
        overline="Gallery"
        title="The Rio, up close"
        intro="The camps, the cliff and the river. Tap a photo to see it bigger."
      />
      <Section labelledBy="gallery-grid-title">
        <h2 id="gallery-grid-title" className="sr-only">
          Photos
        </h2>
        <GalleryGrid photos={gallery} />
        <p className="mt-4 text-ink-muted">{galleryNote}</p>
      </Section>
    </>
  );
}
