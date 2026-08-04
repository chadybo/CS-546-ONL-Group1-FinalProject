import assert from "node:assert/strict";
import test from "node:test";
import { buildComplaintTypeBreakdown } from "../data/addressHistory.js";
import { normalizeAddress } from "../helper.js";

test("normalizeAddress creates a stable lookup key", () => {
  assert.equal(normalizeAddress("  251 W. 30th St., #4  "), "251 w 30 st 4");
  assert.equal(normalizeAddress("251   W 30th St"), "251 w 30 st");
  assert.equal(
    normalizeAddress("251 West 30 Street"),
    normalizeAddress("251 W 30th St."),
  );
  assert.equal(normalizeAddress(null), "");
});

test("buildComplaintTypeBreakdown combines and ranks all complaint sources", () => {
  const records = [
    { complaintType: "Construction", source: "311" },
    { complaintType: "Loud Music/Party", source: "user" },
    { complaintType: "Construction", source: "user" },
    { complaintType: "construction", source: "311" },
    { complaintType: "Loud Music/Party", source: "311" },
    { complaintType: "Loud Music/Party", source: "311" },
    { complaintType: "Loud Music/Party", source: "user" },
  ];

  assert.deepEqual(buildComplaintTypeBreakdown(records), [
    { complaintType: "Loud Music/Party", count: 4 },
    { complaintType: "Construction", count: 3 },
  ]);
});

test("buildComplaintTypeBreakdown handles missing types and stable ties", () => {
  const records = [
    { complaintType: "Barking Dog" },
    { complaintType: "Construction" },
    { complaintType: " " },
  ];

  assert.deepEqual(buildComplaintTypeBreakdown(records), [
    { complaintType: "Barking Dog", count: 1 },
    { complaintType: "Construction", count: 1 },
    { complaintType: "Unknown", count: 1 },
  ]);
  assert.deepEqual(buildComplaintTypeBreakdown(), []);
});
