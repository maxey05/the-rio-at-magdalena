import { site } from "@/lib/content";

type MapEmbedProps = {
  className?: string;
};

export function MapEmbed({ className }: MapEmbedProps) {
  return (
    <iframe
      src={site.mapEmbedUrl}
      title={site.mapTitle}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      className={`block w-full border-0 ${className ?? "h-80"}`}
    />
  );
}
