import xss from "xss";

const ADDRESS_TOKEN_ALIASES = new Map([
  ["avenue", "ave"],
  ["boulevard", "blvd"],
  ["circle", "cir"],
  ["court", "ct"],
  ["drive", "dr"],
  ["east", "e"],
  ["highway", "hwy"],
  ["lane", "ln"],
  ["northeast", "ne"],
  ["northwest", "nw"],
  ["north", "n"],
  ["parkway", "pkwy"],
  ["place", "pl"],
  ["road", "rd"],
  ["saint", "st"],
  ["southeast", "se"],
  ["southwest", "sw"],
  ["south", "s"],
  ["square", "sq"],
  ["street", "st"],
  ["terrace", "ter"],
  ["west", "w"],
]);

export const COMPLAINT_CATEGORIES = Object.freeze([
  "Loud Music/Party",
  "Construction",
  "Barking Dog",
  "Vehicle Idling",
  "Loud Talking",
  "Other",
]);

const COMPLAINT_CATEGORY_LOOKUP = new Map(
  COMPLAINT_CATEGORIES.map((category) => [
    category.toLocaleLowerCase(),
    category,
  ]),
);

const getCanonicalComplaintCategory = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return COMPLAINT_CATEGORY_LOOKUP.get(value.trim().toLocaleLowerCase()) || "";
};

// Maps NYC 311 descriptors and community complaint types into one shared taxonomy.
export const deriveComplaintCategory = (
  descriptor = "",
  sourceComplaintType = "",
) => {
  const canonicalDescriptor = getCanonicalComplaintCategory(descriptor);
  if (canonicalDescriptor) {
    return canonicalDescriptor;
  }

  const canonicalSourceType =
    getCanonicalComplaintCategory(sourceComplaintType);
  if (canonicalSourceType) {
    return canonicalSourceType;
  }

  const details = [descriptor, sourceComplaintType]
    .filter((value) => typeof value === "string" && value.trim())
    .join(" ")
    .toLocaleLowerCase();

  if (
    details.includes("construction") ||
    details.includes("jack hammer") ||
    details.includes("jackhammer") ||
    details.includes("pile driving")
  ) {
    return "Construction";
  }

  if (details.includes("bark") || details.includes("barking dog")) {
    return "Barking Dog";
  }

  if (details.includes("idling")) {
    return "Vehicle Idling";
  }

  if (details.includes("loud talking")) {
    return "Loud Talking";
  }

  if (details.includes("music") || details.includes("party")) {
    return "Loud Music/Party";
  }

  return "Other";
};

// Uses a stored category when available and derives one for legacy records.
export const resolveComplaintCategory = (record = {}) => {
  const storedCategory = getCanonicalComplaintCategory(
    record.complaintCategory,
  );

  return (
    storedCategory ||
    deriveComplaintCategory(record.descriptor, record.complaintType)
  );
};

// Produces the shared lookup key used by imported and user-submitted addresses.
export const normalizeAddress = (address) => {
  if (typeof address !== "string") {
    return "";
  }

  return address
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[.,#]/g, "")
    .replace(/\b(\d+)(st|nd|rd|th)\b/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((token) => ADDRESS_TOKEN_ALIASES.get(token) || token)
    .join(" ");
};

export const normalizeStatus = (status) => {
  if (typeof status !== "string") return "";

  if (
    status.toLowerCase() === "open" ||
    status.toLowerCase() === "in progress"
  ) {
    return "open";
  }

  if (
    status.toLowerCase() === "resolved" ||
    status.toLowerCase() === "closed"
  ) {
    return "resolved";
  }

  return status;
};

export const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const parseDateFilter = (value, label, endOfDay = false) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw `Invalid ${label} date`;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw `Invalid ${label} date`;
  }
  if (endOfDay) date.setUTCHours(23, 59, 59, 999);
  return date;
};

const PLAIN_TEXT_XSS_OPTIONS = Object.freeze({
  whiteList: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: ["script", "style"],
});

// Removes markup from user-authored fields that are stored and displayed as text.
export const sanitizePlainText = (value) => {
  if (typeof value !== "string") return "";
  return xss(value.normalize("NFKC"), PLAIN_TEXT_XSS_OPTIONS).trim();
};

const GEOCODE_TIMEOUT_MS = 5000;

export const geocodePin = async (
  address,
  { fetchImpl = fetch, timeoutMs = GEOCODE_TIMEOUT_MS } = {},
) => {
  try {
    const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(address)}.json?key=${process.env.MAPTILER_API_KEY}&limit=1`;
    const response = await fetchImpl(url, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return;
    const data = await response.json();

    if (!data?.features?.length) return;

    const lng = data.features[0].center[0];
    const lat = data.features[0].center[1];

    return { lng: lng, lat: lat };
  } catch {
    return;
  }
};
