import Image from "next/image";
import type { CSSProperties } from "react";
import { CameraIcon } from "@/components/icons";
import type { Photo } from "@/lib/content";

type HomePhotoSize = "default" | "large" | "fill";

type HomePhotoProps = {
  photo: Photo;
  sizes: string;
  tilt: string;
  size?: HomePhotoSize;
  position?: string;
  priority?: boolean;
  className?: string;
};

const frameSizeClass: Record<HomePhotoSize, string> = {
  default: "",
  large: "polaroid-lg",
  fill: "polaroid-fill",
};

export function HomePhoto({ photo, sizes, tilt, size = "default", position, priority = false, className }: HomePhotoProps) {
  const imageClassName = size === "fill" ? "" : (className ?? "");

  return (
    <div className={`polaroid ${frameSizeClass[size]}`} style={{ "--r": tilt } as CSSProperties}>
      <div className={`polaroid-img group/photo ${imageClassName}`}>
        {photo.src ? (
          <>
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes={sizes}
              priority={priority}
              style={position ? { objectPosition: position } : undefined}
              className="object-cover transition-transform duration-1000 ease-out group-hover/photo:scale-105 group-hover/card:scale-105"
            />
            <span className="film" aria-hidden="true" />
          </>
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
    </div>
  );
}
