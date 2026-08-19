import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeText,
  validateAddress,
  validateDescription,
  validateDateRange,
  validateEmail,
  validateLoginPasswordLength,
  validatePassword,
  validateUsername,
} from "../public/js/client-validation.js";

test("normalizeText safely normalizes and trims strings", () => {
  assert.equal(normalizeText("  Ｔest  "), "Test");
  assert.equal(normalizeText(null), "");
});

test("email validation rejects malformed input", () => {
  assert.equal(validateEmail("person@example.com"), "");
  assert.match(validateEmail("person@localhost"), /valid email/);
});

test("username validation enforces length and safe characters", () => {
  assert.equal(validateUsername("noise_user-1"), "");
  assert.match(validateUsername("no spaces"), /letters, numbers/);
});

test("password validation enforces the registration policy", () => {
  assert.equal(validatePassword("Street123"), "");
  assert.match(validatePassword("alllowercase"), /uppercase/);
  assert.match(validatePassword("A1short"), /at least 8/);
});

test("login password length validation supports existing accounts safely", () => {
  assert.equal(validateLoginPasswordLength("oldpassword"), "");
  assert.match(validateLoginPasswordLength(""), /required/);
  assert.match(validateLoginPasswordLength("x".repeat(73)), /72/);
});

test("complaint field validation enforces useful limits", () => {
  assert.equal(validateAddress("251 W 30th St"), "");
  assert.match(validateAddress("Broadway"), /street number/);
  assert.match(validateDescription("x".repeat(501)), /500/);
});

test("date range validation rejects an end date before the start date", () => {
  assert.equal(validateDateRange("2026-01-01", "2026-01-31"), "");
  assert.equal(validateDateRange("", "2026-01-31"), "");
  assert.match(validateDateRange("2026-02-01", "2026-01-31"), /end date/);
});
