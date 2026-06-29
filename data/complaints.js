import { ObjectId } from "mongodb";
import { complaints, users, nyc311cache } from "../config/mongoCollections.js";
import { upsertHotspot } from "./hotspots.js";

const VALID_TYPES = [
  "Loud Music/Party",
  "Construction",
  "Barking Dog",
  "Vehicle Idling",
  "Loud Talking",
  "Other",
];

// Normalizes an address string to use as a consistent hotspot key
const normalizeAddress = (address) =>
  address.toLowerCase().replace(/[.,#]/g, "").trim();

// Inserts a new user complaint and updates the hotspot layer
export const submitComplaint = async (
  userId,
  address,
  borough,
  complaintType,
  description,
) => {
  if (!userId || !address || !borough || !complaintType)
    throw "All required fields must be provided";
  address = address.trim();
  borough = borough.trim();
  if (!VALID_TYPES.includes(complaintType)) throw "Invalid complaint type";
  if (description && description.length > 500)
    throw "Description cannot exceed 500 characters";

  const col = await complaints();

  const newComplaint = {
    userId: new ObjectId(userId),
    incidentAddress: normalizeAddress(address),
    borough: borough.toUpperCase(),
    complaintType,
    resolutionDescription: description?.trim() || "",
    status: "In Progress",
    createdDate: new Date(),
  };

  const result = await col.insertOne(newComplaint);

  // Add complaint reference to user's submittedComplaints array
  const userCol = await users();
  await userCol.updateOne(
    { _id: new ObjectId(userId) },
    { $push: { submittedComplaints: result.insertedId } },
  );

  // Update hotspot counts for this address
  await upsertHotspot(normalizeAddress(address), borough);

  return { _id: result.insertedId, ...newComplaint };
};

//Get User and NYC311 complaints to display on browse and search page
export const getAllComplaints = async ({
  borough,
  complaintType,
  from,
  to,
  search,
} = {}) => {
  const complaintList = await complaints();
  const filter = {};

  if (borough) filter.borough = borough.trim().toUpperCase();

  if (complaintType)
    filter.complaintType = { $regex: complaintType, $options: "i" };

  if (search) {
    const regex = { $regex: search.trim(), $options: "i" };
    filter.$or = [
      { incidentAddress: regex },
      { complaintType: regex },
      { resolutionDescription: regex },
      { borough: regex },
    ];
  }

  if (from || to) {
    filter.createdDate = {};
    if (from) filter.createdDate.$gte = new Date(from);
    if (to) filter.createdDate.$lte = new Date(to);
  }

  const results = await complaintList
    .find(filter)
    .sort({ createdDate: -1 })
    .toArray();

  return results;
};

export const aggregateComplaintType = async () => {
  const nyc311Data = await nyc311cache();
  const complaintList = await complaints();

  const nyc311result = await nyc311Data
    .aggregate([
      { $group: { _id: "$complaintType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])
    .toArray();

  const complaintresult = await complaintList
    .aggregate([
      { $group: { _id: "$complaintType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])
    .toArray();

  let combined_data = nyc311result.concat(complaintresult);

  combined_data.sort((x, y) => {
    return y.count - x.count;
  });

  let count = 1;
  combined_data.forEach((x) => {
    x.rank = count;
    count++;
  });

  return combined_data;
};

export const sortDate = async (arr, bool) => {
  if (bool === 0) {
    arr.sort((x, y) => {
      return new Date(x.createdDate) - new Date(y.createdDate);
    });
  } else if (bool === 1) {
    arr.sort((x, y) => {
      return new Date(y.createdDate) - new Date(x.createdDate);
    });
  }

  return arr;
};

export const shuffleComplaints = async (array) => {
  for (let x = 0; x < array.length; x++) {
    let y = Math.floor(Math.random() * (x + 1));
    [array[x], array[y]] = [array[y], array[x]];
  }

  return array;
};
