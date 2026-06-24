import { ObjectId } from 'mongodb';
import { complaints, users } from '../config/mongoCollections.js';
import { upsertHotspot } from './hotspots.js';

const VALID_TYPES = [
  'Loud Music/Party', 'Construction', 'Barking Dog',
  'Vehicle Idling', 'Loud Talking', 'Other'
];

// Normalizes an address string to use as a consistent hotspot key
const normalizeAddress = (address) =>
  address.toLowerCase().replace(/[.,#]/g, '').trim();

// Inserts a new user complaint and updates the hotspot layer
export const submitComplaint = async (userId, address, borough, complaintType, description) => {
  if (!userId || !address || !borough || !complaintType) throw 'All required fields must be provided';
  address = address.trim();
  borough = borough.trim();
  if (!VALID_TYPES.includes(complaintType)) throw 'Invalid complaint type';
  if (description && description.length > 500) throw 'Description cannot exceed 500 characters';

  const col = await complaints();

  const newComplaint = {
    userId: new ObjectId(userId),
    address: normalizeAddress(address),
    borough,
    complaintType,
    description: description?.trim() || '',
    status: 'open',
    createdAt: new Date()
  };

  const result = await col.insertOne(newComplaint);

  // Add complaint reference to user's submittedComplaints array
  const userCol = await users();
  await userCol.updateOne(
    { _id: new ObjectId(userId) },
    { $push: { submittedComplaints: result.insertedId } }
  );

  // Update hotspot counts for this address
  await upsertHotspot(normalizeAddress(address), borough);

  return { _id: result.insertedId, ...newComplaint };
};