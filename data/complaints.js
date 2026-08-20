import { ObjectId } from "mongodb";
import { complaints, users, nyc311cache } from "../config/mongoCollections.js";
import { upsertHotspot } from "./hotspots.js";
import {
  COMPLAINT_CATEGORIES,
  escapeRegex,
  normalizeAddress,
  parseDateFilter,
  sanitizePlainText,
} from "../helper.js";

const BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];
const MAX_BROWSE_RESULTS = 1000;

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
  if (
    typeof address !== "string" ||
    typeof borough !== "string" ||
    typeof complaintType !== "string" ||
    (description !== undefined && typeof description !== "string")
  )
    throw "Complaint fields must be valid text";
  if (!ObjectId.isValid(userId)) throw "Invalid user ID";
  address = sanitizePlainText(address);
  borough = borough.trim();
  description = sanitizePlainText(description || "");
  if (
    address.length < 5 ||
    address.length > 120 ||
    !/\d/.test(address) ||
    !/[a-z]/i.test(address)
  )
    throw "Enter a valid address with a street number and name";
  if (!BOROUGHS.includes(borough)) throw "Invalid borough";
  if (!COMPLAINT_CATEGORIES.includes(complaintType))
    throw "Invalid complaint type";
  if (description && description.length > 500)
    throw "Description cannot exceed 500 characters";

  const col = await complaints();
  const normalizedAddress = normalizeAddress(address);

  const newComplaint = {
    userId: new ObjectId(userId),
    incidentAddress: normalizedAddress,
    normalizedAddress,
    borough: borough.toUpperCase(),
    complaintType,
    complaintCategory: complaintType,
    resolutionDescription: description,
    status: "open",
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
  await upsertHotspot(normalizedAddress, borough);

  return { _id: result.insertedId, ...newComplaint };
};

//Get User and NYC311 complaints to display on browse and search page
export const getAllComplaints = async ({
  borough,
  complaintType,
  from,
  to,
  search,
  status,
} = {}) => {
  const complaintList = await complaints();
  const filter = {};

  for (const value of [borough, complaintType, from, to, search, status]) {
    if (value !== undefined && typeof value !== "string")
      throw "Invalid filter";
  }
  if (search && search.trim().length > 100)
    throw "Search cannot exceed 100 characters";

  const normalizedBorough = borough?.trim().toUpperCase();
  if (
    normalizedBorough &&
    !BOROUGHS.some((item) => item.toUpperCase() === normalizedBorough)
  )
    throw "Invalid borough";
  if (complaintType && !COMPLAINT_CATEGORIES.includes(complaintType.trim()))
    throw "Invalid complaint type";
  const parsedFrom = from ? parseDateFilter(from, "start") : null;
  const parsedTo = to ? parseDateFilter(to, "end", true) : null;
  if (parsedFrom && parsedTo && parsedFrom > parsedTo)
    throw "The end date must be on or after the start date";

  if (status && status !== "open" && status !== "resolved")
    throw "Invalid status option";

  if (borough) filter.borough = normalizedBorough;

  if (complaintType) filter.complaintType = complaintType.trim();

  if (search) {
    const regex = { $regex: escapeRegex(search.trim()), $options: "i" };
    filter.$or = [
      { incidentAddress: regex },
      { complaintType: regex },
      { resolutionDescription: regex },
      { borough: regex },
    ];
  }

  if (from || to) {
    filter.createdDate = {};
    if (parsedFrom) filter.createdDate.$gte = parsedFrom;
    if (parsedTo) filter.createdDate.$lte = parsedTo;
  }

  if (status) {
    filter.status = status.trim();
  } else if (!status || status === "") {
    filter.status = "open";
  }

  const results = await complaintList
    .find(filter)
    .sort({ createdDate: -1 })
    .limit(MAX_BROWSE_RESULTS)
    .toArray();

  return results;
};

export const aggregateComplaintType = async () => {
  const nyc311Data = await nyc311cache();
  const complaintList = await complaints();

  const nyc311result = await nyc311Data
    .aggregate([
      {
        $group: {
          _id: { $ifNull: ["$complaintCategory", "$complaintType"] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ])
    .toArray();

  const complaintresult = await complaintList
    .aggregate([
      {
        $group: {
          _id: { $ifNull: ["$complaintCategory", "$complaintType"] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ])
    .toArray();

  complaintresult.forEach((x) => {
    for (let y of nyc311result) {
      if (x._id === y._id) {
        y.count = y.count + x.count;
      }
    }
  });

  nyc311result.sort((x, y) => {
    return y.count - x.count;
  });

  let count = 1;
  nyc311result.forEach((x) => {
    x.rank = count;
    count++;
  });

  return nyc311result;
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

// Fetches a single complaint by its id, checking both user complaints and the 311 cache
export const getComplaintById = async (complaintId) => {
  if (!complaintId) throw "Complaint ID is required";
  if (!ObjectId.isValid(complaintId)) throw "Invalid complaint ID";

  const col = await complaints();
  const userComplaint = await col.findOne({ _id: new ObjectId(complaintId) });
  if (userComplaint) return { ...userComplaint, source: "user" };

  const nyc311Col = await nyc311cache();
  const nyc311Complaint = await nyc311Col.findOne({
    _id: new ObjectId(complaintId),
  });
  if (nyc311Complaint) return { ...nyc311Complaint, source: "311" };

  throw "Complaint not found";
};

// Marks a complaint resolved (owner or admin only) and re-runs the hotspot upsert
export const resolveComplaint = async (complaintId, userId, role) => {
  if (!complaintId) throw "Complaint ID is required";
  if (!ObjectId.isValid(complaintId)) throw "Invalid complaint ID";
  if (!userId) throw "User ID is required";

  const col = await complaints();
  const complaint = await col.findOne({ _id: new ObjectId(complaintId) });
  if (!complaint) throw "Complaint not found";

  const isOwner = complaint.userId?.toString() === userId.toString();
  const isAdmin = role === "admin";
  if (!isOwner && !isAdmin) throw "Not authorized to resolve this complaint";

  await col.updateOne(
    { _id: new ObjectId(complaintId) },
    { $set: { status: "resolved" } },
  );

  // Status changes don't affect the count, but keep the hotspot record fresh
  await upsertHotspot(complaint.incidentAddress, complaint.borough);

  return { _id: complaintId, status: "resolved" };
};
