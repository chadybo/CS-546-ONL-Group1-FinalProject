export const geocodePin = async (address) => {
  const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(address)}.json?key=${process.env.MAPTILER_API_KEY}&limit=1`;
  const response = await fetch(url);
  const data = await response.json();

  if (!data) return;

  const lng = data.features[0].center[0];
  const lat = data.features[0].center[1];

  return { lng: lng, lat: lat };
};
