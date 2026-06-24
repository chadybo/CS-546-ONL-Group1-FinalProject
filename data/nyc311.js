import fetch from 'node-fetch';
import { nyc311cache } from '../config/mongoCollections.js';

const SODA_URL = 'https://data.cityofnewyork.us/resource/erm2-nwe9.json';

// Fetches fresh noise complaints from NYC Open Data and upserts into the cache
export const refreshCache = async () => {
  const col = await nyc311cache();

  const params = new URLSearchParams({
    $where: "complaint_type LIKE '%Noise%'",
    $order: 'created_date DESC',
    $limit: '1000'
  });

  const res = await fetch(`${SODA_URL}?${params}`);
  if (!res.ok) throw `Failed to fetch 311 data: ${res.status}`;
  const records = await res.json();

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

  const result = await col.bulkWrite(ops);
  return result;
};

// Returns cached 311 complaints with optional filters
export const getCached311 = async ({ borough, complaintType, from, to, page = 1 } = {}) => {
  const col = await nyc311cache();
  const filter = {};

  if (borough) filter.borough = borough.trim().toUpperCase();
  if (complaintType) filter.complaintType = { $regex: complaintType, $options: 'i' };
  if (from || to) {
    filter.createdDate = {};
    if (from) filter.createdDate.$gte = new Date(from);
    if (to) filter.createdDate.$lte = new Date(to);
  }

  const limit = 20;
  const skip = (page - 1) * limit;

  const results = await col
    .find(filter)
    .sort({ createdDate: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  return results;
};