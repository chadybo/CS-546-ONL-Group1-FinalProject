import { complaints, hotspots } from "../config/mongoCollections.js";

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
      { $group: { _id: "$complaintType", n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 1 },
    ])
    .toArray();

  await hotspotCol.updateOne(
    { address: normalizedAddress },
    {
      $set: {
        borough,
        count,
        confirmedHotspot: count >= 3,
        topComplaintType: top?._id ?? "Unknown",
        lastReported: new Date(),
      },
    },
    { upsert: true },
  );
};
