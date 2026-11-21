import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BOOKING_TABS,
  EMAIL_KIND_LABELS,
  arrivingDates,
  bookingsHref,
  buildTimeline,
  emailRelevant,
  formatManilaDateTime,
  guestBreakdown,
  isUuid,
  needsResend,
  parseListParams,
  priceLines,
  searchFilter,
  staySummary,
  type EmailEntry,
} from "./admin.ts";
import { manilaToday, STATUSES, type BookingStatus } from "./rules.ts";

describe("searchFilter", () => {
  it("returns null for an empty or punctuation-only term", () => {
    assert.equal(searchFilter(""), null);
    assert.equal(searchFilter("   "), null);
    assert.equal(searchFilter(' ,()"*\\ '), null);
  });

  it("searches name, ref, email and mobile", () => {
    assert.equal(
      searchFilter("rio-ab"),
      "guest_name.ilike.%rio-ab%,ref.ilike.%rio-ab%,email.ilike.%rio-ab%,mobile.ilike.%rio-ab%",
    );
  });

  it("escapes LIKE wildcards so they match literally", () => {
    assert.equal(
      searchFilter("50%_off"),
      "guest_name.ilike.%50\\%\\_off%,ref.ilike.%50\\%\\_off%,email.ilike.%50\\%\\_off%,mobile.ilike.%50\\%\\_off%",
    );
  });

  it("removes characters that could break the or() filter", () => {
    const filter = searchFilter('a,b(c)"d*e\\f') ?? "";
    assert.equal(filter, "guest_name.ilike.%a b c d e f%,ref.ilike.%a b c d e f%,email.ilike.%a b c d e f%,mobile.ilike.%a b c d e f%");
    assert.equal(filter.split(",").length, 4);
  });

  it("adds the +63 form when a local mobile is typed", () => {
    const filter = searchFilter("0917 123 4567") ?? "";
    assert.ok(filter.endsWith(",mobile.ilike.%+639171234567%"));
  });

  it("adds the +63 form for a partial local mobile", () => {
    const filter = searchFilter("0917") ?? "";
    assert.ok(filter.endsWith(",mobile.ilike.%+63917%"));
  });

  it("normalizes a spaced international mobile and 63-prefixed digits", () => {
    assert.ok((searchFilter("+63 917 123 4567") ?? "").endsWith(",mobile.ilike.%+639171234567%"));
    assert.ok((searchFilter("63917") ?? "").endsWith(",mobile.ilike.%+63917%"));
  });

  it("does not add a mobile variant for names", () => {
    assert.equal((searchFilter("Maria Cruz") ?? "").split(",").length, 4);
  });

  it("caps the term length", () => {
    const filter = searchFilter("a".repeat(200)) ?? "";
    assert.equal(filter.split(",")[0], `guest_name.ilike.%${"a".repeat(80)}%`);
  });
});

describe("parseListParams and bookingsHref", () => {
  it("defaults to the All tab with no filters", () => {
    assert.deepEqual(parseListParams({}), { tab: "all", q: "", from: null, to: null });
  });

  it("keeps a known tab and ignores an unknown one", () => {
    assert.equal(parseListParams({ tab: "confirmed" }).tab, "confirmed");
    assert.equal(parseListParams({ tab: "drop table" }).tab, "all");
  });

  it("takes the first value of repeated params and trims the search", () => {
    assert.equal(parseListParams({ q: ["  Maria ", "x"] }).q, "Maria");
    assert.equal(parseListParams({ q: "a".repeat(200) }).q.length, 80);
  });

  it("accepts real dates only", () => {
    assert.equal(parseListParams({ from: "2026-11-21", to: "2026-02-31" }).from, "2026-11-21");
    assert.equal(parseListParams({ from: "2026-11-21", to: "2026-02-31" }).to, null);
    assert.equal(parseListParams({ from: "tomorrow" }).from, null);
  });

  it("builds a clean href and drops empty values", () => {
    assert.equal(bookingsHref({}), "/admin/bookings");
    assert.equal(bookingsHref({ tab: "all", q: "" }), "/admin/bookings");
    assert.equal(
      bookingsHref({ tab: "review", q: "a b", from: "2026-11-01", to: null }),
      "/admin/bookings?tab=review&q=a+b&from=2026-11-01",
    );
  });
});

describe("BOOKING_TABS", () => {
  it("has unique ids and only real statuses", () => {
    const ids = BOOKING_TABS.map((tab) => tab.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const tab of BOOKING_TABS) {
      for (const status of tab.filter.statuses ?? []) {
        assert.ok(STATUSES.includes(status), status);
      }
    }
  });

  it("starts with All and groups expired and rejected", () => {
    assert.deepEqual(BOOKING_TABS[0], { id: "all", label: "All", filter: {} });
    assert.deepEqual(BOOKING_TABS.find((tab) => tab.id === "expired-rejected")?.filter.statuses, ["expired", "rejected"]);
  });

  it("has a Refunds due tab that filters on refund status, not booking status", () => {
    assert.deepEqual(BOOKING_TABS.find((tab) => tab.id === "refunds"), {
      id: "refunds",
      label: "Refunds due",
      filter: { refundStatus: "due" },
    });
    assert.equal(parseListParams({ tab: "refunds" }).tab, "refunds");
  });
});

describe("arrivingDates", () => {
  it("is today and the next day", () => {
    assert.deepEqual(arrivingDates("2026-11-20"), ["2026-11-20", "2026-11-21"]);
  });

  it("rolls over month and year ends", () => {
    assert.deepEqual(arrivingDates("2026-12-31"), ["2026-12-31", "2027-01-01"]);
  });

  it("follows Manila time, not UTC", () => {
    const lateUtc = new Date("2026-11-19T17:30:00Z");
    assert.deepEqual(arrivingDates(manilaToday(lateUtc)), ["2026-11-20", "2026-11-21"]);
    const earlyUtc = new Date("2026-11-19T15:59:00Z");
    assert.deepEqual(arrivingDates(manilaToday(earlyUtc)), ["2026-11-19", "2026-11-20"]);
  });
});

describe("formatManilaDateTime", () => {
  it("converts UTC to Manila time with a 12-hour clock", () => {
    assert.equal(formatManilaDateTime("2026-11-19T16:05:00Z"), "Nov 20, 2026, 12:05 AM");
    assert.equal(formatManilaDateTime("2026-11-20T04:30:00+00:00"), "Nov 20, 2026, 12:30 PM");
    assert.equal(formatManilaDateTime("2026-11-20T10:09:00.123456+00:00"), "Nov 20, 2026, 6:09 PM");
  });
});

describe("guestBreakdown", () => {
  it("lists only non-zero groups with singular and plural words", () => {
    assert.equal(guestBreakdown({ adults: 2, seniors: 1, kids: 3, infants: 1 }), "2 adults, 1 senior, 3 kids, 1 infant");
    assert.equal(guestBreakdown({ adults: 1, seniors: 0, kids: 0, infants: 0 }), "1 adult");
    assert.equal(guestBreakdown({ adults: 0, seniors: 0, kids: 0, infants: 2 }), "2 infants");
  });
});

describe("staySummary", () => {
  it("describes an overnight stay with its nights", () => {
    assert.equal(
      staySummary({ kind: "overnight", check_in: "2026-11-21", check_out: "2026-11-23", nights: 2 }),
      "Sat, Nov 21, 2026 to Mon, Nov 23, 2026 (2 nights)",
    );
    assert.ok(staySummary({ kind: "overnight", check_in: "2026-11-21", check_out: "2026-11-22", nights: 1 }).endsWith("(1 night)"));
  });

  it("describes a day tour", () => {
    assert.equal(
      staySummary({ kind: "day_tour", check_in: "2026-11-21", check_out: "2026-11-21", nights: 0 }),
      "Day tour on Sat, Nov 21, 2026",
    );
  });
});

describe("priceLines", () => {
  it("uses the rates saved on the booking, not today's settings", () => {
    const lines = priceLines({
      kind: "overnight",
      nights: 2,
      adults: 2,
      seniors: 0,
      kids: 1,
      infants: 1,
      tents: 1,
      adult_rate: 600,
      reduced_rate: 400,
      tent_rate: 250,
    });
    assert.deepEqual(
      lines.map((line) => [line.quantity, line.unitPrice, line.amount]),
      [
        [2, 1200, 2400],
        [1, 800, 800],
        [1, 500, 500],
      ],
    );
  });

  it("charges a day tour once and its tents once", () => {
    const lines = priceLines({
      kind: "day_tour",
      nights: 0,
      adults: 2,
      seniors: 0,
      kids: 0,
      infants: 0,
      tents: 2,
      adult_rate: 300,
      reduced_rate: 200,
      tent_rate: 500,
    });
    assert.deepEqual(
      lines.map((line) => [line.label, line.quantity, line.unitPrice, line.amount]),
      [
        ["Adults", 2, 300, 600],
        ["Tents", 2, 500, 1000],
      ],
    );
  });

  it("charges a day tour once and no tents when none are rented", () => {
    const lines = priceLines({
      kind: "day_tour",
      nights: 0,
      adults: 3,
      seniors: 1,
      kids: 0,
      infants: 0,
      tents: 0,
      adult_rate: 300,
      reduced_rate: 200,
      tent_rate: 0,
    });
    assert.equal(
      lines.reduce((sum, line) => sum + line.amount, 0),
      1100,
    );
  });
});

describe("buildTimeline", () => {
  const base = {
    status: "confirmed" as const,
    created_at: "2026-11-19T01:00:00Z",
    hold_expires_at: null,
    proof_submitted_at: null,
    contract_path: null,
    decided_at: null,
    decided_by: null,
    reject_reason: null,
    checked_in_at: null,
    cancelled_at: null,
    cancelled_by: null,
    refunded_at: null,
  };

  it("starts with the creation time", () => {
    assert.deepEqual(buildTimeline({ ...base, status: "awaiting_payment" }), [
      { label: "Booking created", at: "2026-11-19T01:00:00Z" },
    ]);
  });

  it("lists every recorded step in time order", () => {
    const timeline = buildTimeline({
      ...base,
      status: "cancelled",
      proof_submitted_at: "2026-11-19T01:20:00Z",
      decided_at: "2026-11-19T03:00:00Z",
      decided_by: "owner@example.com",
      cancelled_at: "2026-11-20T03:00:00Z",
      cancelled_by: "guest",
      refunded_at: "2026-11-21T03:00:00Z",
    });
    assert.deepEqual(
      timeline.map((entry) => entry.label),
      [
        "Booking created",
        "Payment proof sent",
        "Payment confirmed by owner@example.com",
        "Cancelled by guest",
        "Refund sent",
      ],
    );
  });

  it("sorts by time even when columns are filled out of order", () => {
    const timeline = buildTimeline({
      ...base,
      checked_in_at: "2026-11-19T02:00:00Z",
      proof_submitted_at: "2026-11-19T01:30:00Z",
    });
    assert.deepEqual(
      timeline.map((entry) => entry.label),
      ["Booking created", "Payment proof sent", "Checked in"],
    );
  });

  it("labels a decision with a reason as a rejection", () => {
    const timeline = buildTimeline({
      ...base,
      status: "rejected",
      decided_at: "2026-11-19T03:00:00Z",
      reject_reason: "Amount did not match",
    });
    assert.equal(timeline[1].label, "Payment rejected");
  });

  it("shows when an expired hold ran out", () => {
    const timeline = buildTimeline({ ...base, status: "expired", hold_expires_at: "2026-11-19T01:30:00Z" });
    assert.equal(timeline[1].label, "Hold expired");
  });
});

describe("isUuid", () => {
  it("accepts a uuid and refuses everything else", () => {
    assert.equal(isUuid("3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c"), true);
    assert.equal(isUuid("3F2B8C1E-9A4D-4E7B-8C2A-1D5E6F7A8B9C"), true);
    assert.equal(isUuid("not-a-uuid"), false);
    assert.equal(isUuid(""), false);
    assert.equal(isUuid(null), false);
    assert.equal(isUuid(["3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c"]), false);
  });
});

describe("EMAIL_KIND_LABELS", () => {
  it("has a label for every email kind in the log", () => {
    assert.equal(Object.keys(EMAIL_KIND_LABELS).length, 8);
  });
});

describe("needsResend", () => {
  const failed: EmailEntry = {
    kind: "confirmed",
    booking_id: "b1",
    inquiry_id: null,
    recipient: "guest@example.com",
    status: "failed",
    created_at: "2026-11-20T01:00:00Z",
  };
  const later = (patch: Partial<EmailEntry>): EmailEntry => ({ ...failed, status: "resent", created_at: "2026-11-20T02:00:00Z", ...patch });

  it("is true for a failed row with nothing after it", () => {
    assert.equal(needsResend(failed, [failed]), true);
  });

  it("is false for a row that did not fail", () => {
    assert.equal(needsResend(later({}), [later({})]), false);
    assert.equal(needsResend(later({ status: "sent" }), []), false);
  });

  it("is false once a later sent or resent copy exists", () => {
    assert.equal(needsResend(failed, [failed, later({})]), false);
    assert.equal(needsResend(failed, [failed, later({ status: "sent" })]), false);
  });

  it("stays true when the later copy failed too", () => {
    assert.equal(needsResend(failed, [failed, later({ status: "failed" })]), true);
  });

  it("ignores earlier copies and other kinds, recipients and bookings", () => {
    assert.equal(needsResend(failed, [later({ created_at: "2026-11-20T00:00:00Z" })]), true);
    assert.equal(needsResend(failed, [later({ kind: "rejected" })]), true);
    assert.equal(needsResend(failed, [later({ recipient: "other@example.com" })]), true);
    assert.equal(needsResend(failed, [later({ booking_id: "b2" })]), true);
    assert.equal(needsResend(failed, [later({ booking_id: null })]), true);
  });

  it("matches inquiry emails by inquiry id", () => {
    const inquiry: EmailEntry = { ...failed, kind: "admin_inquiry", booking_id: null, inquiry_id: "7" };
    assert.equal(needsResend(inquiry, [inquiry, { ...inquiry, status: "resent", created_at: "2026-11-20T02:00:00Z" }]), false);
    assert.equal(needsResend(inquiry, [{ ...inquiry, status: "resent", inquiry_id: "8", created_at: "2026-11-20T02:00:00Z" }]), true);
  });

  it("compares timestamps as instants, not text", () => {
    const withOffset = later({ created_at: "2026-11-20T09:30:00+08:00" });
    assert.equal(needsResend(failed, [withOffset]), false);
  });
});

describe("emailRelevant", () => {
  const status = (value: BookingStatus, refund: "none" | "due" | "sent" = "none") => ({ status: value, refund_status: refund });

  it("always allows a row with no booking", () => {
    assert.equal(emailRelevant("confirmed", null), true);
  });

  it("allows confirmed only while the stay is on", () => {
    for (const ok of ["confirmed", "checked_in", "completed"] as const) {
      assert.equal(emailRelevant("confirmed", status(ok)), true, ok);
    }
    for (const no of ["payment_review", "cancelled", "rejected", "no_show", "expired"] as const) {
      assert.equal(emailRelevant("confirmed", status(no)), false, no);
    }
  });

  it("allows cancelled and rejected only for those statuses", () => {
    assert.equal(emailRelevant("cancelled", status("cancelled")), true);
    assert.equal(emailRelevant("cancelled", status("confirmed")), false);
    assert.equal(emailRelevant("rejected", status("rejected")), true);
    assert.equal(emailRelevant("rejected", status("confirmed")), false);
  });

  it("drops proof emails once the booking has ended", () => {
    for (const kind of ["proof_received", "admin_new_proof"] as const) {
      assert.equal(emailRelevant(kind, status("payment_review")), true, kind);
      assert.equal(emailRelevant(kind, status("confirmed")), true, kind);
      for (const no of ["cancelled", "rejected", "expired"] as const) {
        assert.equal(emailRelevant(kind, status(no)), false, `${kind} ${no}`);
      }
    }
  });

  it("allows refund_sent only when the refund was recorded as sent", () => {
    assert.equal(emailRelevant("refund_sent", status("cancelled", "sent")), true);
    assert.equal(emailRelevant("refund_sent", status("cancelled", "due")), false);
    assert.equal(emailRelevant("refund_sent", status("cancelled", "none")), false);
  });

  it("does not restrict admin notices", () => {
    assert.equal(emailRelevant("admin_inquiry", status("cancelled")), true);
    assert.equal(emailRelevant("admin_guest_cancelled", status("cancelled")), true);
  });
});
