import { ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import { users } from '../config/mongoCollections.js';
import { complaints as complaintsCollection } from '../config/mongoCollections.js';
import { nyc311cache as nyc311Collection } from '../config/mongoCollections.js';

const SALT_ROUNDS = 12;

// Creates a new user account with a hashed password
export const registerUser = async (username, email, password) => {
  if (!username || !email || !password) throw 'All fields are required';
  username = username.trim().toLowerCase();
  email = email.trim().toLowerCase();
  if (username.length < 3 || username.length > 20) throw 'Username must be 3-20 characters';
  if (!email.includes('@')) throw 'Invalid email address';
  if (password.length < 8) throw 'Password must be at least 8 characters';

  const col = await users();

  // Check for duplicate username or email
  const existing = await col.findOne({ $or: [{ username }, { email }] });
  if (existing) throw 'Username or email already taken';

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const newUser = {
    username,
    email,
    hashedPassword,
    role: 'user',
    submittedComplaints: [],
    bookmarks: [],
    createdAt: new Date()
  };

  const result = await col.insertOne(newUser);
  return { _id: result.insertedId, username, email };
};

// Verifies credentials and returns the user if valid
export const loginUser = async (email, password) => {
  if (!email || !password) throw 'Email and password are required';
  email = email.trim().toLowerCase();

  const col = await users();
  const user = await col.findOne({ email });
  if (!user) throw 'Invalid email or password';

  const match = await bcrypt.compare(password, user.hashedPassword);
  if (!match) throw 'Invalid email or password';

  return { _id: user._id, username: user.username, email: user.email, role: user.role };
};


// Gets all complaints submitted by a user and their bookmarked complaints
export const getUserDashboard = async (userId) => {
  if (!userId) throw 'User ID is required';

  const userCol = await users();
  const complaintCol = await complaintsCollection();
  const nyc311Col = await nyc311Collection();

  const user = await userCol.findOne({ _id: new ObjectId(userId) });
  if (!user) throw 'User not found';

  // Get complaints this user submitted
  const submittedComplaints = await complaintCol
    .find({ userId: new ObjectId(userId) })
    .sort({ createdDate: -1 })
    .toArray();

  // Get complaints this user has bookmarked, from both user complaints and the 311 cache
  let bookmarks = [];
  if (user.bookmarks?.length) {
    const userBookmarks = await complaintCol
      .find({ _id: { $in: user.bookmarks } })
      .toArray();
    const nyc311Bookmarks = await nyc311Col
      .find({ _id: { $in: user.bookmarks } })
      .toArray();
    bookmarks = userBookmarks
      .concat(nyc311Bookmarks)
      .sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
  }

  return { submittedComplaints, bookmarks };
};

// Gets platform-wide stats for the admin dashboard
export const getAdminStats = async () => {
  const complaintCol = await complaintsCollection();
  const userCol = await users();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Total user submitted complaints
  const totalComplaints = await complaintCol.countDocuments();

  // Top addresses in last 30 days
  const topAddresses = await complaintCol.aggregate([
    { $match: { createdDate: { $gte: thirtyDaysAgo } } },
    { $group: { _id: '$incidentAddress', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]).toArray();

  // Most active users
  const topUsers = await complaintCol.aggregate([
    { $group: { _id: '$userId', total: { $sum: 1 } } },
    { $sort: { total: -1 } },
    { $limit: 5 },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' }
  ]).toArray();

  // All complaints for the table
  const allComplaints = await complaintCol
    .find({})
    .sort({ createdDate: -1 })
    .limit(50)
    .toArray();

  return { totalComplaints, topAddresses, topUsers, allComplaints };
};
// Deletes a complaint and re-runs hotspot upsert
export const deleteComplaint = async (complaintId) => {
  if (!complaintId) throw 'Complaint ID is required';
  const col = await complaintsCollection();
  const complaint = await col.findOne({ _id: new ObjectId(complaintId) });
  if (!complaint) throw 'Complaint not found';
  await col.deleteOne({ _id: new ObjectId(complaintId) });
  const { upsertHotspot } = await import('./hotspots.js');
  await upsertHotspot(complaint.incidentAddress, complaint.borough);
};

// Adds a complaint to a user's bookmarks (no-op if already bookmarked)
export const addBookmark = async (userId, complaintId) => {
  if (!userId) throw 'User ID is required';
  if (!complaintId || !ObjectId.isValid(complaintId)) throw 'Valid complaint ID is required';

  const complaintCol = await complaintsCollection();
  let complaint = await complaintCol.findOne({ _id: new ObjectId(complaintId) });
  if (!complaint) {
    const nyc311Col = await nyc311Collection();
    complaint = await nyc311Col.findOne({ _id: new ObjectId(complaintId) });
  }
  if (!complaint) throw 'Complaint not found';

  const userCol = await users();
  await userCol.updateOne(
    { _id: new ObjectId(userId) },
    { $addToSet: { bookmarks: new ObjectId(complaintId) } }
  );
};

// Removes a complaint from a user's bookmarks
export const removeBookmark = async (userId, complaintId) => {
  if (!userId) throw 'User ID is required';
  if (!complaintId || !ObjectId.isValid(complaintId)) throw 'Valid complaint ID is required';

  const userCol = await users();
  await userCol.updateOne(
    { _id: new ObjectId(userId) },
    { $pull: { bookmarks: new ObjectId(complaintId) } }
  );
};

// Checks whether a user has a given complaint bookmarked
export const isBookmarked = async (userId, complaintId) => {
  if (!userId || !complaintId) return false;
  const userCol = await users();
  const user = await userCol.findOne({ _id: new ObjectId(userId) });
  if (!user?.bookmarks?.length) return false;
  return user.bookmarks.some((b) => b.toString() === complaintId.toString());
};