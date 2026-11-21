import type { FieldErrors } from "./rules.ts";
import { db, type Booking } from "./supabase.ts";

export const PROOF_BUCKET = "payment-proofs";
export const CONTRACT_BUCKET = "signed-contracts";
export const QR_BUCKET = "site";
export const MAX_PROOF_BYTES = 5 * 1024 * 1024;
export const MAX_CONTRACT_BYTES = 5 * 1024 * 1024;
export const MAX_UPLOAD_TOTAL_BYTES = 5.5 * 1024 * 1024;

const QR_URL_SECONDS = 60 * 60;
export const PROOF_URL_SECONDS = 10 * 60;

export type ProofImage = { ext: "jpg" | "png" | "webp"; contentType: string };

export type ProofCheck = { ok: true; image: ProofImage } | { ok: false; error: string };

export type ContractFile = { ext: "pdf" | "jpg" | "png" | "webp"; contentType: string };

export type ContractCheck = { ok: true; file: ContractFile } | { ok: false; error: string };

export type ProofState = {
  errors: FieldErrors;
  message: string | null;
};

export type MarkResult = { kind: "submitted"; booking: Booking } | { kind: "stale" } | { kind: "error" };

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP = [0x57, 0x45, 0x42, 0x50];
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d];

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return bytes.length >= offset + signature.length && signature.every((value, index) => bytes[offset + index] === value);
}

export function sniffImage(bytes: Uint8Array): ProofImage | null {
  if (startsWith(bytes, JPEG_SIGNATURE)) {
    return { ext: "jpg", contentType: "image/jpeg" };
  }
  if (startsWith(bytes, PNG_SIGNATURE)) {
    return { ext: "png", contentType: "image/png" };
  }
  if (startsWith(bytes, RIFF) && startsWith(bytes, WEBP, 8)) {
    return { ext: "webp", contentType: "image/webp" };
  }
  return null;
}

export function checkProofBytes(bytes: Uint8Array): ProofCheck {
  if (bytes.length === 0) {
    return { ok: false, error: "Choose your GCash screenshot to upload." };
  }
  if (bytes.length > MAX_PROOF_BYTES) {
    return { ok: false, error: "That image is over 5 MB. Choose a smaller screenshot." };
  }
  const image = sniffImage(bytes);
  if (!image) {
    return { ok: false, error: "Upload a JPG, PNG or WebP image." };
  }
  return { ok: true, image };
}

export function sniffContract(bytes: Uint8Array): ContractFile | null {
  if (startsWith(bytes, PDF_SIGNATURE)) {
    return { ext: "pdf", contentType: "application/pdf" };
  }
  return sniffImage(bytes);
}

export function checkContractBytes(bytes: Uint8Array): ContractCheck {
  if (bytes.length === 0) {
    return { ok: false, error: "Choose your signed contract to upload." };
  }
  if (bytes.length > MAX_CONTRACT_BYTES) {
    return { ok: false, error: "That file is over 5 MB. Choose a smaller file." };
  }
  const file = sniffContract(bytes);
  if (!file) {
    return { ok: false, error: "Upload a PDF, JPG, PNG or WebP file." };
  }
  return { ok: true, file };
}

export function checkUploadTotal(proofBytes: number, contractBytes: number): string | null {
  return proofBytes + contractBytes > MAX_UPLOAD_TOTAL_BYTES
    ? "Your two files are over 5.5 MB together. Choose smaller files."
    : null;
}

export function holdIsOpen(booking: Pick<Booking, "status" | "hold_expires_at">, now: Date = new Date()): boolean {
  return (
    booking.status === "awaiting_payment" &&
    booking.hold_expires_at !== null &&
    Date.parse(booking.hold_expires_at) > now.getTime()
  );
}

export async function uploadProof(bookingId: string, bytes: Uint8Array, image: ProofImage): Promise<string | null> {
  const path = `${bookingId}/${Date.now()}.${image.ext}`;
  const { error } = await db().storage.from(PROOF_BUCKET).upload(path, bytes, { contentType: image.contentType });
  return error ? null : path;
}

export async function removeProof(path: string): Promise<void> {
  await db().storage.from(PROOF_BUCKET).remove([path]);
}

export async function uploadContract(bookingId: string, bytes: Uint8Array, file: ContractFile): Promise<string | null> {
  const path = `${bookingId}/${Date.now()}.${file.ext}`;
  const { error } = await db().storage.from(CONTRACT_BUCKET).upload(path, bytes, { contentType: file.contentType });
  return error ? null : path;
}

export async function removeContract(path: string): Promise<void> {
  await db().storage.from(CONTRACT_BUCKET).remove([path]);
}

export async function markPaymentReview(bookingId: string, proofPath: string, contractPath: string): Promise<MarkResult> {
  const nowIso = new Date().toISOString();
  const { data, error } = await db()
    .from("bookings")
    .update({
      status: "payment_review",
      proof_path: proofPath,
      contract_path: contractPath,
      proof_submitted_at: nowIso,
      hold_expires_at: null,
    })
    .eq("id", bookingId)
    .eq("status", "awaiting_payment")
    .gt("hold_expires_at", nowIso)
    .select("*");
  if (error) {
    return { kind: "error" };
  }
  const rows = (data ?? []) as Booking[];
  return rows.length === 1 ? { kind: "submitted", booking: rows[0] } : { kind: "stale" };
}

export async function expireStaleHolds(): Promise<void> {
  await db().rpc("expire_stale_holds");
}

export async function signedQrUrl(path: string): Promise<string | null> {
  const { data, error } = await db().storage.from(QR_BUCKET).createSignedUrl(path, QR_URL_SECONDS);
  return error ? null : data.signedUrl;
}

export async function signedProofUrl(path: string): Promise<string | null> {
  const { data, error } = await db().storage.from(PROOF_BUCKET).createSignedUrl(path, PROOF_URL_SECONDS);
  return error ? null : data.signedUrl;
}

export async function signedContractUrl(path: string): Promise<string | null> {
  const { data, error } = await db().storage.from(CONTRACT_BUCKET).createSignedUrl(path, PROOF_URL_SECONDS);
  return error ? null : data.signedUrl;
}
