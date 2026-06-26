import { ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import { users } from '../config/mongoCollections.js';
import { complaints as complaintsCollection } from '../config/mongoCollections.js';

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

  const user = await userCol.findOne({ _id: new ObjectId(userId) });
  if (!user) throw 'User not found';

  // Get complaints this user submitted
  const submittedComplaints = await complaintCol
    .find({ userId: new ObjectId(userId) })
    .sort({ createdDate: -1 })
    .toArray();

  // Get complaints this user has bookmarked
  const bookmarks = user.bookmarks?.length
    ? await complaintCol
        .find({ _id: { $in: user.bookmarks } })
        .sort({ createdDate: -1 })
        .toArray()
    : [];

  return { submittedComplaints, bookmarks };
};