import { createHash, timingSafeEqual } from "node:crypto";

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function isCronAuthorized(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header) {
    return false;
  }
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
}
