import assert from "node:assert/strict";
import test from "node:test";
import {
  buildComplaintTypeBreakdown,
  filterComplaintsByType,
  formatAddressHistoryComplaint,
} from "../data/addressHistory.js";
import {
  deriveComplaintCategory,
  normalizeAddress,
  resolveComplaintCategory,
} from "../helper.js";

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

test("filterComplaintsByType applies one case-insensitive type filter", () => {
  const records = [
    { complaintType: "Construction", source: "311" },
    { complaintType: "construction", source: "user" },
    { complaintType: "Loud Music/Party", source: "user" },
  ];

  assert.deepEqual(filterComplaintsByType(records, "CONSTRUCTION"), [
    { complaintType: "Construction", source: "311" },
    { complaintType: "construction", source: "user" },
  ]);
  assert.equal(filterComplaintsByType(records, ""), records);
});

test("deriveComplaintCategory maps NYC descriptors into the shared taxonomy", () => {
  assert.equal(
    deriveComplaintCategory("Loud Music/Party", "Noise - Residential"),
    "Loud Music/Party",
  );
  assert.equal(
    deriveComplaintCategory("Construction Before/After Hours", "Noise"),
    "Construction",
  );
  assert.equal(
    deriveComplaintCategory("Barking Dog", "Noise - Residential"),
    "Barking Dog",
  );
  assert.equal(
    deriveComplaintCategory("Car/Truck Engine Idling", "Noise - Vehicle"),
    "Vehicle Idling",
  );
  assert.equal(
    deriveComplaintCategory("Loud Talking", "Noise - Street/Sidewalk"),
    "Loud Talking",
  );
  assert.equal(
    deriveComplaintCategory("Banging/Pounding", "Noise - Residential"),
    "Other",
  );
});

test("resolveComplaintCategory prefers stored categories and supports legacy records", () => {
  assert.equal(
    resolveComplaintCategory({
      complaintCategory: "Construction",
      descriptor: "Loud Music/Party",
      complaintType: "Noise - Residential",
    }),
    "Construction",
  );
  assert.equal(
    resolveComplaintCategory({
      descriptor: "Car/Truck Music",
      complaintType: "Noise - Vehicle",
    }),
    "Loud Music/Party",
  );
  assert.equal(
    resolveComplaintCategory({ complaintType: "Barking Dog" }),
    "Barking Dog",
  );
});

test("formatAddressHistoryComplaint exposes a shared category and preserves NYC type", () => {
  const formatted = formatAddressHistoryComplaint(
    {
      complaintType: "Noise - Residential",
      descriptor: "Loud Talking",
    },
    "311",
  );

  assert.equal(formatted.complaintType, "Loud Talking");
  assert.equal(formatted.nycComplaintType, "Noise - Residential");
  assert.equal(formatted.descriptor, "Loud Talking");
  assert.equal(formatted.source, "311");
});

test("NYC descriptors produce multiple address-history pill categories", () => {
  const records = [
    {
      complaintType: "Noise - Street/Sidewalk",
      descriptor: "Loud Music/Party",
    },
    {
      complaintType: "Noise - Vehicle",
      descriptor: "Car/Truck Music",
    },
    {
      complaintType: "Noise - Commercial",
      descriptor: "Banging/Pounding",
    },
  ].map((record) => formatAddressHistoryComplaint(record, "311"));

  assert.deepEqual(buildComplaintTypeBreakdown(records), [
    { complaintType: "Loud Music/Party", count: 2 },
    { complaintType: "Other", count: 1 },
  ]);
});
