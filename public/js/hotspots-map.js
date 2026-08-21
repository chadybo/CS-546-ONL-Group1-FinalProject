const mapElement = document.getElementById("map");

if (mapElement && globalThis.maptilersdk) {
  let coordinates = [];
  try {
    coordinates = JSON.parse(mapElement.dataset.coordinates || "[]");
  } catch {
    mapElement.textContent = "The map could not be loaded.";
  }

  maptilersdk.config.apiKey = mapElement.dataset.maptilerKey;
  const map = new maptilersdk.Map({
    container: "map",
    style: maptilersdk.MapStyle.STREETS,
    center: [-73.8819, 40.77878],
    zoom: 8.5,
  });

  map.on("load", () => {
    coordinates
      .filter(
        (point) => Number.isFinite(point?.lng) && Number.isFinite(point?.lat),
      )
      .forEach((point) => {
        new maptilersdk.Marker({ color: "red" })
          .setLngLat([point.lng, point.lat])
          .addTo(map);
      });
  });
}
