import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { houseRules, site } from "./content.ts";
import {
  composeAdminGuestCancelled,
  composeAdminInquiry,
  composeAdminNewProof,
  composeCancelled,
  composeConfirmed,
  composeProofReceived,
  composeRefundSent,
  composeRejected,
  formatDate,
  type EmailContext,
} from "./email-templates.ts";
import { formatPeso } from "./rules.ts";
import type { Booking } from "./supabase.ts";

const booking: Booking = {
  id: "11111111-2222-3333-4444-555555555555",
  ref: "RIO-7K3QX9",
  access_token: "tok_abc123",
  kind: "overnight",
  check_in: "2026-12-12",
  nights: 2,
  check_out: "2026-12-14",
  guest_name: "Juan Dela Cruz",
  email: "juan@example.com",
  mobile: "09171234567",
  notes: "",
  adults: 3,
  seniors: 0,
  kids: 1,
  infants: 0,
  guests: 4,
  tents: 1,
  slot_ids: [2],
  adult_rate: 500,
  reduced_rate: 350,
  tent_rate: 500,
  total: 4400,
  downpayment: 2200,
  balance: 2200,
  status: "confirmed",
  hold_expires_at: null,
  gcash_ref: "1234567890123",
  proof_path: "proofs/x.jpg",
  proof_submitted_at: "2026-11-19T01:00:00Z",
  contract_path: null,
  decided_at: null,
  decided_by: null,
  reject_reason: "Amount did not match",
  checked_in_at: null,
  balance_collected: null,
  deposit_amount: null,
  deposit_returned: null,
  cancelled_at: null,
  cancelled_by: "guest",
  cancel_reason: null,
  refund_status: "due",
  refund_ref: "GC-REFUND-1",
  refunded_at: null,
  created_at: "2026-11-19T00:00:00Z",
};

const ctx: EmailContext = {
  siteUrl: "https://rio.example.com",
  slotLabels: ["Camp 1 Slot B", "Camp 1 Slot C"],
  depositNote: "Amount confirmed at check-in",
};

const guestEmails = {
  proofReceived: composeProofReceived(booking, ctx),
  confirmed: composeConfirmed(booking, ctx),
  rejected: composeRejected(booking, ctx),
  cancelled: composeCancelled(booking, ctx),
  refundSent: composeRefundSent(booking, ctx),
};

const adminEmails = {
  newProof: composeAdminNewProof(booking, ctx),
  guestCancelled: composeAdminGuestCancelled(booking, ctx),
  inquiry: composeAdminInquiry({ name: "Ana", email: "ana@example.com", message: "Prenup shoot?" }, ctx.siteUrl),
};

describe("formatDate", () => {
  it("formats like Sat, Dec 12, 2026", () => {
    assert.equal(formatDate("2026-12-12"), "Sat, Dec 12, 2026");
  });
});

describe("confirmed email", () => {
  const { subject, body } = guestEmails.confirmed;

  it("has ref, dates, slots, guests, tents and money", () => {
    assert.ok(subject.includes(booking.ref));
    assert.ok(body.includes(booking.ref));
    assert.ok(body.includes("Sat, Dec 12, 2026"));
    assert.ok(body.includes("Mon, Dec 14, 2026"));
    assert.ok(body.includes("Camp 1 Slot B, Camp 1 Slot C"));
    assert.ok(body.includes("Guests: 4"));
    assert.ok(body.includes("Rented tents: 1"));
    assert.ok(body.includes(`Downpayment paid: ${formatPeso(2200)}`));
    assert.ok(body.includes(`Balance due a day before arrival: ${formatPeso(2200)}`));
  });

  it("has check-in and check-out times, deposit note, map and cancel policy", () => {
    assert.ok(body.includes("2:00 PM"));
    assert.ok(body.includes("11:00 AM"));
    assert.ok(body.includes("Security deposit: Amount confirmed at check-in"));
    assert.ok(body.includes(site.mapUrl));
    assert.ok(body.includes("11:59 PM the day before check-in"));
    assert.ok(body.includes("What to bring:"));
  });

  it("has all six house rules", () => {
    assert.equal(houseRules.length, 6);
    for (const rule of houseRules) {
      assert.ok(body.includes(rule.title), rule.title);
    }
  });

  it("has the booking link", () => {
    assert.ok(body.includes("https://rio.example.com/b/tok_abc123"));
  });

  it("leaves out slots, tents and check-in times for a day tour", () => {
    const day: Booking = { ...booking, kind: "day_tour", nights: 0, tents: 0, slot_ids: [], check_out: booking.check_in };
    const email = composeConfirmed(day, { ...ctx, slotLabels: [] });
    assert.ok(email.body.includes("8:00 AM to 6:00 PM"));
    assert.ok(!email.body.includes("Slots:"));
    assert.ok(!email.body.includes("Rented tents"));
    assert.ok(!email.body.includes("Check-in: 2:00 PM"));
  });
});

describe("guest emails", () => {
  for (const [name, email] of Object.entries(guestEmails)) {
    it(`${name} ends with booking link, Facebook and address`, () => {
      const lines = email.body.trimEnd().split("\n");
      assert.equal(lines.at(-1), "The Rio At Magdalena · 6FF6+M8, Magdalena, Laguna");
      assert.ok(email.body.includes(`Your booking: https://rio.example.com/b/${booking.access_token}`));
      assert.ok(email.body.includes(site.facebookUrl));
      assert.ok(email.body.startsWith("Hi Juan Dela Cruz,"));
    });
  }

  it("rejected carries the reason", () => {
    assert.ok(guestEmails.rejected.body.includes("Reason: Amount did not match"));
  });

  it("cancelled mentions the refund only when one is due", () => {
    assert.ok(guestEmails.cancelled.body.includes(`refund of ${formatPeso(2200)}`));
    const unpaid = composeCancelled({ ...booking, refund_status: "none" }, ctx);
    assert.ok(unpaid.body.includes("nothing to refund"));
  });

  it("refund sent carries the amount and GCash reference", () => {
    assert.ok(guestEmails.refundSent.body.includes(formatPeso(2200)));
    assert.ok(guestEmails.refundSent.body.includes("GC-REFUND-1"));
  });

  it("shows contact details above the footer when given", () => {
    const email = composeProofReceived(booking, { ...ctx, contact: ["0917 000 0000", "rio@example.com"] });
    assert.ok(email.body.includes("Questions? 0917 000 0000 or rio@example.com"));
  });
});

describe("admin emails", () => {
  it("subjects carry the ref and no guest data", () => {
    for (const email of [adminEmails.newProof, adminEmails.guestCancelled]) {
      assert.ok(email.subject.includes(booking.ref));
      assert.ok(!email.subject.includes(booking.guest_name));
      assert.ok(!email.subject.includes(booking.email));
      assert.ok(!email.subject.includes(booking.mobile));
    }
    assert.ok(!adminEmails.inquiry.subject.includes("Ana"));
    assert.ok(!adminEmails.inquiry.subject.includes("ana@example.com"));
  });

  it("link to the admin booking page", () => {
    const url = `https://rio.example.com/admin/bookings/${booking.id}`;
    assert.ok(adminEmails.newProof.body.includes(url));
    assert.ok(adminEmails.guestCancelled.body.includes(url));
  });

  it("bodies leave out the guest name, email and mobile", () => {
    for (const email of [adminEmails.newProof, adminEmails.guestCancelled]) {
      assert.ok(!email.body.includes(booking.guest_name));
      assert.ok(!email.body.includes(booking.email));
      assert.ok(!email.body.includes(booking.mobile));
    }
  });

  it("inquiry body has the message and skips empty fields", () => {
    assert.ok(adminEmails.inquiry.body.includes("Prenup shoot?"));
    assert.ok(!adminEmails.inquiry.body.includes("Mobile:"));
    assert.ok(adminEmails.inquiry.body.includes("https://rio.example.com/admin/inquiries"));
  });

  it("guest cancelled says whether a refund is needed", () => {
    assert.ok(adminEmails.guestCancelled.body.includes(`Refund needed: ${formatPeso(2200)}`));
    const unpaid = composeAdminGuestCancelled({ ...booking, refund_status: "none" }, ctx);
    assert.ok(unpaid.body.includes("No refund needed"));
  });
});

describe("plain text", () => {
  it("has no HTML tags in any email", () => {
    const all = [...Object.values(guestEmails), ...Object.values(adminEmails)];
    for (const email of all) {
      assert.doesNotMatch(email.subject, /<[a-z/!]/i);
      assert.doesNotMatch(email.body, /<[a-z/!]/i);
    }
  });
});
