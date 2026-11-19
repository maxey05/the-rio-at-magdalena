import Image from "next/image";
import Link from "next/link";
import { CameraIcon } from "@/components/icons";
import type { Photo } from "@/lib/content";

type PhotoFit = "cover" | "natural";

type PhotoFrameProps = {
  photo: Photo;
  sizes: string;
  fit?: PhotoFit;
  priority?: boolean;
  className?: string;
};

type PhotoPlaceholderProps = {
  photo: Photo;
  ratio: string;
  className?: string;
};

export function PhotoPlaceholder({ photo, ratio, className }: PhotoPlaceholderProps) {
  return (
    <div
      style={{ aspectRatio: ratio }}
      className={`flex w-full flex-col items-center justify-center gap-2 rounded-card bg-moss-soft p-4 text-center text-moss-strong ${className ?? ""}`}
    >
      <CameraIcon width={32} height={32} className="text-moss" />
      <span className="text-small font-medium">Photo coming soon</span>
      <span className="sr-only">: {photo.alt}</span>
    </div>
  );
}

export function PhotoFrame({ photo, sizes, fit = "cover", priority = false, className }: PhotoFrameProps) {
  if (!photo.src) {
    const ratio = fit === "natural" ? `${photo.width} / ${photo.height}` : "4 / 3";
    return <PhotoPlaceholder photo={photo} ratio={ratio} className={className} />;
  }

  if (fit === "natural") {
    return (
      <Image
        src={photo.src}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        sizes={sizes}
        priority={priority}
        className={`h-auto w-full rounded-card ${className ?? ""}`}
      />
    );
  }

  return (
    <div className={`relative aspect-4/3 overflow-hidden rounded-card bg-moss-soft ${className ?? ""}`}>
      <Image src={photo.src} alt={photo.alt} fill sizes={sizes} priority={priority} className="object-cover" />
    </div>
  );
}

type PhotoCardProps = {
  photo: Photo;
  title: string;
  description?: string;
  href?: string;
  sizes?: string;
};

export function PhotoCard({
  photo,
  title,
  description,
  href,
  sizes = "(min-width: 1024px) 560px, 100vw",
}: PhotoCardProps) {
  const body = (
    <>
      <PhotoFrame photo={photo} sizes={sizes} />
      <div className="flex flex-col gap-1">
        <h3>{title}</h3>
        {description ? <p className="text-ink-muted">{description}</p> : null}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="group flex flex-col gap-4 rounded-card hover:[&_h3]:underline">
        {body}
      </Link>
    );
  }

  return <div className="flex flex-col gap-4">{body}</div>;
}
