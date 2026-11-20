import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canTransition,
  countNew,
  inquiryStatusLabel,
  isInquiryStatus,
  mailtoLink,
  manilaDayRange,
  nextStatuses,
  replyBody,
  smsLink,
  sortInquiries,
} from "./inquiries.ts";
import { manilaToday } from "./rules.ts";

const ana = { name: "Ana Maria Reyes", email: "ana+rio@example.com", mobile: "+639171234567", type: "Prenup shoot" as const };

describe("sortInquiries", () => {
  it("puts New first, then Replied, then Closed, newest first within each", () => {
    const rows = [
      { id: "a", status: "closed" as const, created_at: "2026-11-20T01:00:00Z" },
      { id: "b", status: "new" as const, created_at: "2026-11-18T01:00:00Z" },
      { id: "c", status: "replied" as const, created_at: "2026-11-19T01:00:00Z" },
      { id: "d", status: "new" as const, created_at: "2026-11-19T01:00:00Z" },
      { id: "e", status: "replied" as const, created_at: "2026-11-17T01:00:00Z" },
      { id: "f", status: "closed" as const, created_at: "2026-11-21T01:00:00Z" },
    ];
    assert.deepEqual(
      sortInquiries(rows).map((row) => row.id),
      ["d", "b", "c", "e", "f", "a"],
    );
  });

  it("does not change the input and handles an empty list", () => {
    const rows = [
      { status: "closed" as const, created_at: "2026-11-20T01:00:00Z" },
      { status: "new" as const, created_at: "2026-11-20T01:00:00Z" },
    ];
    sortInquiries(rows);
    assert.equal(rows[0].status, "closed");
    assert.deepEqual(sortInquiries([]), []);
  });
});

describe("status helpers", () => {
  it("labels and recognizes the three statuses", () => {
    assert.equal(inquiryStatusLabel("new"), "New");
    assert.equal(inquiryStatusLabel("replied"), "Replied");
    assert.equal(inquiryStatusLabel("closed"), "Closed");
    assert.equal(isInquiryStatus("replied"), true);
    assert.equal(isInquiryStatus("archived"), false);
    assert.equal(isInquiryStatus(null), false);
  });

  it("counts new inquiries", () => {
    assert.equal(countNew([{ status: "new" }, { status: "closed" }, { status: "new" }]), 2);
    assert.equal(countNew([]), 0);
  });
});

describe("status transitions", () => {
  it("allows Mark replied and Close from new, Close and Reopen from replied, Reopen from closed", () => {
    assert.deepEqual([...nextStatuses("new")], ["replied", "closed"]);
    assert.deepEqual([...nextStatuses("replied")], ["closed", "new"]);
    assert.deepEqual([...nextStatuses("closed")], ["new"]);
  });

  it("refuses staying in the same status and jumping from closed to replied", () => {
    assert.equal(canTransition("new", "new"), false);
    assert.equal(canTransition("closed", "replied"), false);
    assert.equal(canTransition("new", "replied"), true);
  });
});

describe("manilaDayRange", () => {
  it("runs from Manila midnight to the next Manila midnight", () => {
    assert.deepEqual(manilaDayRange("2026-11-20"), { start: "2026-11-20T00:00:00+08:00", end: "2026-11-21T00:00:00+08:00" });
  });

  it("rolls over month and year ends", () => {
    assert.equal(manilaDayRange("2026-12-31").end, "2027-01-01T00:00:00+08:00");
    assert.equal(manilaDayRange("2028-02-28").end, "2028-02-29T00:00:00+08:00");
  });

  it("puts 11:30 PM Manila on today and 12:30 AM Manila on the next day", () => {
    const late = new Date("2026-11-20T15:30:00Z");
    const early = new Date("2026-11-20T16:30:00Z");
    const { start, end } = manilaDayRange("2026-11-20");
    assert.equal(manilaToday(late), "2026-11-20");
    assert.ok(late >= new Date(start) && late < new Date(end));
    assert.equal(manilaToday(early), "2026-11-21");
    assert.ok(!(early >= new Date(start) && early < new Date(end)));
  });
});

describe("reply links", () => {
  it("builds a prefilled mailto link", () => {
    const link = mailtoLink(ana);
    assert.ok(link.startsWith("mailto:ana%2Brio@example.com?subject="));
    const query = new URLSearchParams(link.slice(link.indexOf("?") + 1));
    assert.equal(query.get("subject"), "Your inquiry to The Rio At Magdalena");
    assert.equal(query.get("body"), replyBody(ana));
    assert.ok(replyBody(ana).startsWith("Hi Ana,"));
    assert.ok(replyBody(ana).includes("your prenup shoot inquiry"));
  });

  it("uses plain wording for the Other type", () => {
    assert.ok(replyBody({ name: "Ben", type: "Other" }).includes("Thank you for your inquiry at"));
  });

  it("builds a prefilled sms link with only digits and a leading plus", () => {
    const link = smsLink({ ...ana, mobile: "+63 917-123 4567" });
    assert.ok(link.startsWith("sms:+639171234567?body="));
    assert.ok(decodeURIComponent(link).includes("Hi Ana, this is The Rio At Magdalena."));
  });

  it("escapes characters that would break the link", () => {
    const link = mailtoLink({ ...ana, name: "Ana & Co?", email: "a?b@example.com" });
    assert.ok(!link.slice(link.indexOf("?") + 1).includes(" "));
    assert.ok(link.startsWith("mailto:a%3Fb@example.com?"));
  });
});
