import fetch from "node-fetch";
import { dbConnection, closeConnection } from "../config/mongoConnection.js";
import { deriveComplaintCategory, normalizeAddress } from "../helper.js";
import { ObjectId } from "mongodb";
import { upsertHotspot } from "../data/hotspots.js";
import bcrypt from "bcrypt";

const SODA_URL = "https://data.cityofnewyork.us/resource/erm2-nwe9.json";

// Fetches recent noise complaints from NYC Open Data and seeds the nyc311cache collection
const seed = async () => {
  const db = await dbConnection();

  // Create indexes for nyc311cache
  await db
    .collection("nyc311cache")
    .createIndex({ uniqueKey: 1 }, { unique: true });
  await db.collection("nyc311cache").createIndex({ borough: 1 });
  await db.collection("nyc311cache").createIndex({ complaintType: 1 });
  await db.collection("nyc311cache").createIndex({ complaintCategory: 1 });
  await db.collection("nyc311cache").createIndex({ createdDate: -1 });
  await db.collection("nyc311cache").createIndex({ incidentAddress: 1 });
  await db.collection("nyc311cache").createIndex({ normalizedAddress: 1 });

  // Create indexes for other collections
  await db.collection("users").createIndex({ username: 1 }, { unique: true });
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("complaints").createIndex({ incidentAddress: 1 });
  await db.collection("complaints").createIndex({ normalizedAddress: 1 });
  await db.collection("complaints").createIndex({ borough: 1 });
  await db.collection("complaints").createIndex({ createdDate: -1 });
  await db.collection("hotspots").createIndex({ address: 1 }, { unique: true });
  await db.collection("hotspots").createIndex({ count: -1 });

  console.log("All indexes created.");

  // Fetch noise complaints from Socrata API
  const params = new URLSearchParams({
    $where: "complaint_type LIKE '%Noise%'",
    $order: "created_date DESC",
    $limit: "1000",
  });

  const res = await fetch(`${SODA_URL}?${params}`);
  if (!res.ok) throw `Failed to fetch 311 data: ${res.status}`;
  const records = await res.json();

  // Upsert each record using unique_key to avoid duplicates
  const ops = records.map((r) => ({
    updateOne: {
      filter: { uniqueKey: r.unique_key },
      update: {
        $set: {
          uniqueKey: r.unique_key,
          createdDate: new Date(r.created_date),
          complaintType: r.complaint_type,
          descriptor: r.descriptor || null,
          complaintCategory: deriveComplaintCategory(
            r.descriptor,
            r.complaint_type,
          ),
          borough: r.borough,
          incidentAddress: r.incident_address,
          normalizedAddress: normalizeAddress(r.incident_address),
          status: r.status,
          resolutionDescription: r.resolution_description || null,
          cachedAt: new Date(),
        },
      },
      upsert: true,
    },
  }));

  const seed_users = [
    {
      _id: new ObjectId(),
      username: "reguser",
      email: "reg@stevens.edu",
      hashedPassword: await bcrypt.hash("RegUser@1123", 12),
      role: "user",
      submittedComplaints: [],
      bookmarks: [],
      createdAt: new Date(),
    },
    {
      _id: new ObjectId(),
      username: "reguser2",
      email: "reg2@stevens.edu",
      hashedPassword: await bcrypt.hash("RegUser2@1123", 12),
      role: "user",
      submittedComplaints: [],
      bookmarks: [],
      createdAt: new Date(),
    },
    {
      _id: new ObjectId(),
      username: "adminuser",
      email: "admin@stevens.edu",
      hashedPassword: await bcrypt.hash("AdminUser@1123", 12),
      role: "admin",
      submittedComplaints: [],
      bookmarks: [],
      createdAt: new Date(),
    },
  ];

  await db.collection("users").drop();
  const user_result = await db.collection("users").insertMany(seed_users);

  console.log(`Seeded ${user_result.insertedCount} new user records`);

  const reguser = await db.collection("users").findOne({ username: "reguser" });
  const reguser2 = await db
    .collection("users")
    .findOne({ username: "reguser2" });

  await db.collection("complaints").drop();
  const seed_complaints = [
    {
      _id: new ObjectId(),
      userId: reguser._id,
      incidentAddress: normalizeAddress("209 joralemon st"),
      normalizedAddress: normalizeAddress("209 joralemon st"),
      borough: "BROOKLYN",
      complaintType: "Loud Music/Party",
      complaintCategory: "Loud Music/Party",
      resolutionDescription: "Really bad music.",
      status: "open",
      createdDate: new Date(),
    },
    {
      _id: new ObjectId(),
      userId: reguser._id,
      incidentAddress: normalizeAddress("209 joralemon st"),
      normalizedAddress: normalizeAddress("209 joralemon st"),
      borough: "BROOKLYN",
      complaintType: "Construction",
      complaintCategory: "Construction",
      resolutionDescription: "Now there is construction.",
      status: "open",
      createdDate: new Date(),
    },
    {
      _id: new ObjectId(),
      userId: reguser._id,
      incidentAddress: normalizeAddress("209 joralemon st"),
      normalizedAddress: normalizeAddress("209 joralemon st"),
      borough: "BROOKLYN",
      complaintType: "Barking Dog",
      complaintCategory: "Barking Dog",
      resolutionDescription: "Now a dog is barking.",
      status: "open",
      createdDate: new Date(),
    },
    {
      _id: new ObjectId(),
      userId: reguser._id,
      incidentAddress: normalizeAddress("209 joralemon st"),
      normalizedAddress: normalizeAddress("209 joralemon st"),
      borough: "BROOKLYN",
      complaintType: "Vehicle Idling",
      complaintCategory: "Vehicle Idling",
      resolutionDescription: "Someone has a really loud exhaust.",
      status: "open",
      createdDate: new Date(),
    },
    {
      _id: new ObjectId(),
      userId: reguser2._id,
      incidentAddress: normalizeAddress("636 Greenwich St"),
      normalizedAddress: normalizeAddress("636 Greenwich St"),
      borough: "QUEENS",
      complaintType: "Vehicle Idling",
      complaintCategory: "Vehicle Idling",
      resolutionDescription:
        "Someone has a really loud exhaust at the Greenwich Hotel.",
      status: "open",
      createdDate: new Date(),
    },
    {
      _id: new ObjectId(),
      userId: reguser2._id,
      incidentAddress: normalizeAddress("636 Greenwich St"),
      normalizedAddress: normalizeAddress("636 Greenwich St"),
      borough: "QUEENS",
      complaintType: "Dog Barking",
      complaintCategory: "Dog Barking",
      resolutionDescription:
        "Someone has an terribly loud dog at the Greenwich Hotel.",
      status: "open",
      createdDate: new Date(),
    },
    {
      _id: new ObjectId(),
      userId: reguser2._id,
      incidentAddress: normalizeAddress("636 Greenwich St"),
      normalizedAddress: normalizeAddress("636 Greenwich St"),
      borough: "QUEENS",
      complaintType: "Construction",
      complaintCategory: "Construction",
      resolutionDescription: "Non-stop construction at the Greenwich Hotel.",
      status: "open",
      createdDate: new Date(),
    },
  ];

  const complaint_result = await db
    .collection("complaints")
    .insertMany(seed_complaints);

  console.log(`Seeded ${complaint_result.insertedCount} new complaint records`);

  const complaints_reg1 = await db
    .collection("complaints")
    .find({ userId: reguser._id })
    .toArray();

  complaints_reg1.forEach((x) => {
    reguser.submittedComplaints.push(x._id);
  });

  await db.collection("users").updateOne(
    { _id: reguser._id },
    {
      $set: { submittedComplaints: reguser.submittedComplaints },
    },
  );

  const complaints_reg2 = await db
    .collection("complaints")
    .find({ userId: reguser2._id })
    .toArray();

  complaints_reg2.forEach((x) => {
    reguser2.submittedComplaints.push(x._id);
  });

  await db.collection("users").updateOne(
    { _id: reguser2._id },
    {
      $set: { submittedComplaints: reguser2.submittedComplaints },
    },
  );

  await db.collection("hotspots").drop();

  const normal_add1 = normalizeAddress("209 joralemon st");
  const normal_add2 = normalizeAddress("636 Greenwich St");

  await upsertHotspot(normal_add1, "BROOKLYN");
  await upsertHotspot(normal_add2, "QUEENS");

  const result = await db.collection("nyc311cache").bulkWrite(ops);
  console.log(
    `Seeded ${result.upsertedCount} new records, updated ${result.modifiedCount}`,
  );

  await closeConnection();
};

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
