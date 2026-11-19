import assert from "node:assert/strict";
import { test } from "node:test";
import { isCronAuthorized } from "./cron.ts";
import { checkProofBytes, holdIsOpen, MAX_PROOF_BYTES, sniffImage } from "./proofs.ts";
import { normalizeGcashRef } from "./rules.ts";

const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46]);
const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const webp = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50]);
const pdf = new TextEncoder().encode("%PDF-1.7\n");
const text = new TextEncoder().encode("this is not really a jpg");

function padded(header: Uint8Array, size: number): Uint8Array {
  const bytes = new Uint8Array(size);
  bytes.set(header);
  return bytes;
}

test("sniffImage accepts real jpeg, png and webp headers", () => {
  assert.deepEqual(sniffImage(jpeg), { ext: "jpg", contentType: "image/jpeg" });
  assert.deepEqual(sniffImage(png), { ext: "png", contentType: "image/png" });
  assert.deepEqual(sniffImage(webp), { ext: "webp", contentType: "image/webp" });
});

test("sniffImage refuses text, pdf, truncated and RIFF-but-not-webp bytes", () => {
  assert.equal(sniffImage(text), null);
  assert.equal(sniffImage(pdf), null);
  assert.equal(sniffImage(Uint8Array.from([0xff, 0xd8])), null);
  assert.equal(sniffImage(Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45])), null);
});

test("checkProofBytes accepts an image within 5 MB", () => {
  const result = checkProofBytes(padded(jpeg, 1024));
  assert.equal(result.ok, true);
  assert.equal(checkProofBytes(padded(jpeg, MAX_PROOF_BYTES)).ok, true);
});

test("checkProofBytes refuses empty, oversize, text and pdf", () => {
  assert.equal(checkProofBytes(new Uint8Array()).ok, false);
  assert.equal(checkProofBytes(padded(jpeg, MAX_PROOF_BYTES + 1)).ok, false);
  assert.equal(checkProofBytes(text).ok, false);
  assert.equal(checkProofBytes(pdf).ok, false);
});

test("a 13-digit ref is accepted and a 12-digit ref is refused", () => {
  assert.equal(normalizeGcashRef("1234 5678 9012 3"), "1234567890123");
  assert.equal(normalizeGcashRef("123456789012"), null);
});

test("holdIsOpen needs awaiting_payment and a future expiry", () => {
  const now = new Date("2026-11-19T10:00:00Z");
  assert.equal(holdIsOpen({ status: "awaiting_payment", hold_expires_at: "2026-11-19T10:00:01Z" }, now), true);
  assert.equal(holdIsOpen({ status: "awaiting_payment", hold_expires_at: "2026-11-19T10:00:00Z" }, now), false);
  assert.equal(holdIsOpen({ status: "awaiting_payment", hold_expires_at: null }, now), false);
  assert.equal(holdIsOpen({ status: "payment_review", hold_expires_at: "2026-11-19T11:00:00Z" }, now), false);
});

test("isCronAuthorized needs the exact bearer secret and never accepts an empty one", () => {
  assert.equal(isCronAuthorized("Bearer s3cret", "s3cret"), true);
  assert.equal(isCronAuthorized("Bearer wrong", "s3cret"), false);
  assert.equal(isCronAuthorized("s3cret", "s3cret"), false);
  assert.equal(isCronAuthorized(null, "s3cret"), false);
  assert.equal(isCronAuthorized("Bearer ", ""), false);
  assert.equal(isCronAuthorized("Bearer undefined", undefined), false);
  assert.equal(isCronAuthorized(null, undefined), false);
});
