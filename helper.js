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

export const geocodePin = async (address) => {
  const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(address)}.json?key=${process.env.MAPTILER_API_KEY}&limit=1`;
  const response = await fetch(url);
  const data = await response.json();

  if (!data) return;

  const lng = data.features[0].center[0];
  const lat = data.features[0].center[1];

  return { lng: lng, lat: lat };
};
