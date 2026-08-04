import {
  complaints,
  hotspots,
  nyc311cache,
} from "../config/mongoCollections.js";
import { normalizeAddress, resolveComplaintCategory } from "../helper.js";

const VALID_BOROUGHS = new Set([
  "MANHATTAN",
  "BROOKLYN",
  "QUEENS",
  "BRONX",
  "STATEN ISLAND",
]);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getTimestamp = (value) => {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const formatBorough = (borough) =>
  borough
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export const buildComplaintTypeBreakdown = (records = []) => {
  const counts = new Map();

  for (const record of records) {
    const complaintType =
      typeof record.complaintType === "string" && record.complaintType.trim()
        ? record.complaintType.trim()
        : "Unknown";
    const complaintTypeKey = complaintType.toLocaleLowerCase();
    const existingCount = counts.get(complaintTypeKey);

    counts.set(complaintTypeKey, {
      complaintType: existingCount?.complaintType || complaintType,
      count: (existingCount?.count || 0) + 1,
    });
  }

  return [...counts.values()].sort(
    (first, second) =>
      second.count - first.count ||
      first.complaintType.localeCompare(second.complaintType),
  );
};

export const filterComplaintsByType = (records = [], complaintType = "") => {
  if (typeof complaintType !== "string" || !complaintType.trim()) {
    return records;
  }

  const normalizedType = complaintType.trim().toLocaleLowerCase();
  return records.filter(
    (record) =>
      typeof record.complaintType === "string" &&
      record.complaintType.trim().toLocaleLowerCase() === normalizedType,
  );
};

export const formatAddressHistoryComplaint = (record, source) => {
  const formattedRecord = {
    ...record,
    complaintType: resolveComplaintCategory(record),
    source,
  };

  if (source === "311") {
    formattedRecord.nycComplaintType = record.complaintType;
  }

  return formattedRecord;
};

const buildAddressFilter = (query, normalizedAddress, borough) => {
  const addressFilter = {
    $or: [
      { normalizedAddress },
      { incidentAddress: normalizedAddress },
      {
        incidentAddress: {
          $regex: `^${escapeRegex(query.trim())}$`,
          $options: "i",
        },
      },
    ],
  };

  if (borough) {
    addressFilter.borough = borough;
  }

  return addressFilter;
};

const findAddressRecords = async (
  collection,
  query,
  normalizedAddress,
  borough,
) => {
  const addressFilter = buildAddressFilter(
    query,
    normalizedAddress,
    borough,
  );
  const legacyFilter = { normalizedAddress: { $exists: false } };

  if (borough) {
    legacyFilter.borough = borough;
  }

  const [indexedRecords, legacyRecords] = await Promise.all([
    collection.find(addressFilter).toArray(),
    collection.find(legacyFilter).toArray(),
  ]);
  const matchingLegacyRecords = legacyRecords.filter(
    (record) => normalizeAddress(record.incidentAddress) === normalizedAddress,
  );
  const uniqueRecords = new Map();

  for (const record of [...indexedRecords, ...matchingLegacyRecords]) {
    uniqueRecords.set(record._id.toString(), record);
  }

  return [...uniqueRecords.values()];
};

// Returns complaints from both sources for a given address and optional type.
export const getAddressHistory = async (
  query,
  borough = "",
  complaintType = "",
) => {
  if (typeof query !== "string" || query.trim().length === 0) {
    throw "Address is required";
  }

  if (query.trim().length > 150) {
    throw "Address cannot exceed 150 characters";
  }

  const normalized = normalizeAddress(query);
  const normalizedBorough =
    typeof borough === "string" ? borough.trim().toUpperCase() : "";

  if (normalizedBorough && !VALID_BOROUGHS.has(normalizedBorough)) {
    throw "Invalid borough";
  }

  if (typeof complaintType !== "string" || complaintType.trim().length > 150) {
    throw "Invalid complaint type";
  }

  const complaintCol = await complaints();
  const cacheCol = await nyc311cache();
  const hotspotCol = await hotspots();

  const hotspotFilter = { address: normalized };
  if (normalizedBorough) {
    hotspotFilter.borough = normalizedBorough;
  }

  const [userComplaints, nycComplaints, hotspot] = await Promise.all([
    findAddressRecords(complaintCol, query, normalized, normalizedBorough),
    findAddressRecords(cacheCol, query, normalized, normalizedBorough),
    hotspotCol.findOne(hotspotFilter),
  ]);

  // Tag each record with its source
  const tagged311 = nycComplaints.map((complaint) =>
    formatAddressHistoryComplaint(complaint, "311"),
  );
  const taggedUser = userComplaints.map((complaint) =>
    formatAddressHistoryComplaint(complaint, "user"),
  );

  // Merge and sort by date
  const combined = [...tagged311, ...taggedUser].sort(
    (first, second) =>
      getTimestamp(second.createdDate) - getTimestamp(first.createdDate),
  );
  const typeBreakdown = buildComplaintTypeBreakdown(combined);
  const requestedType = complaintType.trim();
  const selectedType = requestedType
    ? typeBreakdown.find(
        (item) =>
          item.complaintType.toLocaleLowerCase() ===
          requestedType.toLocaleLowerCase(),
      )?.complaintType
    : "";

  if (requestedType && !selectedType) {
    throw "Complaint type not found for this address";
  }

  const visibleResults = filterComplaintsByType(combined, selectedType);

  return {
    query: query.trim(),
    borough: normalizedBorough ? formatBorough(normalizedBorough) : "",
    results: visibleResults,
    hasSearched: true,
    hasResults: visibleResults.length > 0,
    totalCount: combined.length,
    visibleCount: visibleResults.length,
    nycCount: tagged311.length,
    userCount: taggedUser.length,
    typeBreakdown,
    hasTypeBreakdown: typeBreakdown.length > 0,
    selectedComplaintType: selectedType,
    isFiltered: Boolean(selectedType),
    topComplaintType: typeBreakdown[0]?.complaintType || null,
    isHotspot: taggedUser.length >= 3 || hotspot?.confirmedHotspot || false,
  };
};
