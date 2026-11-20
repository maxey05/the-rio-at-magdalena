import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { isAdminEmail } from "./supabase.ts";

const original = process.env.ADMIN_EMAILS;

afterEach(() => {
  if (original === undefined) {
    delete process.env.ADMIN_EMAILS;
  } else {
    process.env.ADMIN_EMAILS = original;
  }
});

test("isAdminEmail matches a listed email", () => {
  process.env.ADMIN_EMAILS = "owner@example.com";
  assert.equal(isAdminEmail("owner@example.com"), true);
});

test("isAdminEmail ignores case and surrounding whitespace on both sides", () => {
  process.env.ADMIN_EMAILS = "  Owner@Example.com  ";
  assert.equal(isAdminEmail("OWNER@example.COM"), true);
  assert.equal(isAdminEmail("  owner@example.com "), true);
});

test("isAdminEmail checks every entry of a comma list", () => {
  process.env.ADMIN_EMAILS = "owner@example.com, manager@example.com ,,";
  assert.equal(isAdminEmail("owner@example.com"), true);
  assert.equal(isAdminEmail("manager@example.com"), true);
  assert.equal(isAdminEmail("guest@example.com"), false);
});

test("isAdminEmail refuses other emails, near matches and missing values", () => {
  process.env.ADMIN_EMAILS = "owner@example.com";
  assert.equal(isAdminEmail("other@example.com"), false);
  assert.equal(isAdminEmail("owner@example.com.evil.com"), false);
  assert.equal(isAdminEmail("xowner@example.com"), false);
  assert.equal(isAdminEmail(""), false);
  assert.equal(isAdminEmail(null), false);
  assert.equal(isAdminEmail(undefined), false);
});

test("isAdminEmail throws when ADMIN_EMAILS is unset", () => {
  delete process.env.ADMIN_EMAILS;
  assert.throws(() => isAdminEmail("owner@example.com"), /ADMIN_EMAILS/);
});

test("isAdminEmail throws when ADMIN_EMAILS is empty or only separators", () => {
  process.env.ADMIN_EMAILS = "";
  assert.throws(() => isAdminEmail("owner@example.com"), /ADMIN_EMAILS/);
  process.env.ADMIN_EMAILS = " , ,";
  assert.throws(() => isAdminEmail("owner@example.com"), /ADMIN_EMAILS/);
  assert.throws(() => isAdminEmail(""), /ADMIN_EMAILS/);
});
