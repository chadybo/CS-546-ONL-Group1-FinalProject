import fetch from 'node-fetch';
import { dbConnection, closeConnection } from '../config/mongoConnection.js';

const SODA_URL = 'https://data.cityofnewyork.us/resource/erm2-nwe9.json';

// Fetches recent noise complaints from NYC Open Data and seeds the nyc311cache collection
const seed = async () => {
  const db = await dbConnection();

  // Create indexes for nyc311cache
  await db.collection('nyc311cache').createIndex({ uniqueKey: 1 }, { unique: true });
  await db.collection('nyc311cache').createIndex({ borough: 1 });
  await db.collection('nyc311cache').createIndex({ complaintType: 1 });
  await db.collection('nyc311cache').createIndex({ createdDate: -1 });
  await db.collection('nyc311cache').createIndex({ incidentAddress: 1 });

  // Create indexes for other collections
  await db.collection('users').createIndex({ username: 1 }, { unique: true });
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('complaints').createIndex({ address: 1 });
  await db.collection('complaints').createIndex({ borough: 1 });
  await db.collection('complaints').createIndex({ createdAt: -1 });
  await db.collection('hotspots').createIndex({ address: 1 }, { unique: true });
  await db.collection('hotspots').createIndex({ count: -1 });

  console.log('All indexes created.');

  // Fetch noise complaints from Socrata API
  const params = new URLSearchParams({
    $where: "complaint_type LIKE '%Noise%'",
    $order: 'created_date DESC',
    $limit: '1000'
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
          borough: r.borough,
          incidentAddress: r.incident_address,
          status: r.status,
          resolutionDescription: r.resolution_description || null,
          cachedAt: new Date()
        }
      },
      upsert: true
    }
  }));

  const result = await db.collection('nyc311cache').bulkWrite(ops);
  console.log(`Seeded ${result.upsertedCount} new records, updated ${result.modifiedCount}`);

  await closeConnection();
};

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});