import { complaints, hotspots } from "../config/mongoCollections.js";

const MAX_HOTSPOT_RESULTS = 1000;
const BOROUGHS = ["MANHATTAN", "BROOKLYN", "QUEENS", "BRONX", "STATEN ISLAND"];

// Recalculates complaint count for an address and upserts the hotspot record
export const upsertHotspot = async (normalizedAddress, borough) => {
  const complaintCol = await complaints();
  const hotspotCol = await hotspots();

  // Count all complaints at this address
  const count = await complaintCol.countDocuments({
    incidentAddress: normalizedAddress,
  });

  // Find the most common complaint type at this address
  const [top] = await complaintCol
    .aggregate([
      { $match: { incidentAddress: normalizedAddress } },
      {
        $group: {
          _id: { $ifNull: ["$complaintCategory", "$complaintType"] },
          n: { $sum: 1 },
        },
      },
      { $sort: { n: -1 } },
      { $limit: 1 },
    ])
    .toArray();

  await hotspotCol.updateOne(
    { address: normalizedAddress },
    {
      $set: {
        borough: borough.toUpperCase(),
        count,
        confirmedHotspot: count >= 3,
        topComplaintType: top?._id ?? "Unknown",
        lastReported: new Date(),
      },
    },
    { upsert: true },
  );
};

export const getAllHotspots = async ({ borough } = {}) => {
  const hotspotList = await hotspots();
  const filter = {};

  if (borough !== undefined && typeof borough !== "string") throw "Invalid borough";
  const normalizedBorough = borough?.trim().toUpperCase();
  if (normalizedBorough && !BOROUGHS.includes(normalizedBorough)) throw "Invalid borough";
  if (borough) filter.borough = normalizedBorough;
  filter.count = { $gt: 2 };

  const results = await hotspotList
    .find(filter)
    .sort({ count: -1 })
    .limit(MAX_HOTSPOT_RESULTS)
    .toArray();

  return results;
};

// Returns the hotspot doc for a single address, if one exists
export const getHotspotByAddress = async (address) => {
  if (!address) return null;
  const hotspotCol = await hotspots();
  return await hotspotCol.findOne({ address: address.trim() });
};
