import { complaints } from '../config/mongoCollections.js';
import { nyc311cache, hotspots } from '../config/mongoCollections.js';

// Normalizes address for consistent lookup
const normalizeAddress = (address) =>
  address.toLowerCase().replace(/[.,#]/g, '').trim();

// Returns all complaints from both sources for a given address
export const getAddressHistory = async (query) => {
  if (!query || query.trim().length === 0) throw 'Address is required';

  const normalized = normalizeAddress(query);
  const regex = { $regex: normalized, $options: 'i' };

  const complaintCol = await complaints();
  const cacheCol = await nyc311cache();
  const hotspotCol = await hotspots();

  // Fetch user complaints matching address
  const userComplaints = await complaintCol
    .find({ incidentAddress: regex })
    .sort({ createdDate: -1 })
    .toArray();

  // Fetch 311 records matching address
  const nycComplaints = await cacheCol
    .find({ incidentAddress: regex })
    .sort({ createdDate: -1 })
    .toArray();

  // Tag each record with its source
  const tagged311 = nycComplaints.map((c) => ({ ...c, source: '311' }));
  const taggedUser = userComplaints.map((c) => ({ ...c, source: 'user' }));

  // Merge and sort by date
  const combined = [...tagged311, ...taggedUser].sort(
    (a, b) => new Date(b.createdDate) - new Date(a.createdDate)
  );

  // Check if this address is a confirmed hotspot
  const hotspot = await hotspotCol.findOne({ address: normalized });

  return {
    query,
    results: combined,
    totalCount: combined.length,
    nycCount: tagged311.length,
    userCount: taggedUser.length,
    topComplaintType: hotspot?.topComplaintType || null,
    isHotspot: hotspot?.confirmedHotspot || false
  };
};