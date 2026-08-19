import test from "node:test";
import assert from "node:assert/strict";
import { geocodePin } from "../helper.js";

test("geocodePin preserves successful coordinates and supplies an abort signal", async () => {
  let requestedUrl;
  let suppliedSignal;
  const pin = await geocodePin("251 W 30th St", {
    fetchImpl: async (url, { signal }) => {
      requestedUrl = url;
      suppliedSignal = signal;
      return {
        ok: true,
        json: async () => ({ features: [{ center: [-73.99, 40.75] }] }),
      };
    },
  });

  assert.match(requestedUrl, /251%20W%2030th%20St/);
  assert.equal(suppliedSignal instanceof AbortSignal, true);
  assert.deepEqual(pin, { lng: -73.99, lat: 40.75 });
});

test("geocodePin returns no pin when the request fails or times out", async () => {
  const failed = await geocodePin("251 W 30th St", {
    fetchImpl: async () => {
      throw new Error("network unavailable");
    },
  });
  assert.equal(failed, undefined);

  const timedOut = await geocodePin("251 W 30th St", {
    timeoutMs: 5,
    fetchImpl: async (url, { signal }) =>
      new Promise((resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      }),
  });
  assert.equal(timedOut, undefined);
});
