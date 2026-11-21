import Image from "next/image";
import { CameraIcon } from "@/components/icons";
import type { Photo } from "@/lib/content";

type HomePhotoProps = {
  photo: Photo;
  sizes: string;
  position?: string;
  priority?: boolean;
  className?: string;
};

export function HomePhoto({ photo, sizes, position, priority = false, className }: HomePhotoProps) {
  return (
    <div className={`group/photo relative overflow-hidden bg-oatmeal ${className ?? ""}`}>
      {photo.src ? (
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes={sizes}
          priority={priority}
          style={position ? { objectPosition: position } : undefined}
          className="object-cover transition-transform duration-1000 ease-out group-hover/photo:scale-105 group-hover/card:scale-105"
        />
      ) : (
        <div
          role="img"
          aria-label={`Photo coming soon: ${photo.alt}`}
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center text-olive-strong"
        >
          <CameraIcon width={28} height={28} strokeWidth={1.3} />
          <span className="font-brand-label text-overline font-semibold uppercase tracking-caps">{photo.caption}</span>
        </div>
      )}
    </div>
  );
}
