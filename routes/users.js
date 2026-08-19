import { Router } from 'express';
import { registerUser, loginUser, getUserDashboard, addBookmark, removeBookmark } from '../data/users.js';
import { authRateLimit, publicError, regenerateSession } from '../middleware/security.js';

const router = Router();

// Show register form
router.get('/register', (req, res) => {
  if (req.session.userId) return res.redirect('/');
  return res.render('users/register', { title: 'Register' });
});

// Handle register form submission
router.post('/register', authRateLimit, async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const user = await registerUser(username, email, password);
    await regenerateSession(req);
    req.session.userId = user._id.toString();
    req.session.username = user.username;
    req.session.role = 'user';
    return res.redirect('/users/dashboard');
  } catch (e) {
    return res.status(400).render('users/register', { title: 'Register', error: publicError(e) });
  }
});

// Handle login form submission
router.post('/login', authRateLimit, async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await loginUser(email, password);
    await regenerateSession(req);
    req.session.userId = user._id.toString();
    req.session.username = user.username;
    req.session.role = user.role;
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(400).json({ error: publicError(e, 'Invalid email or password') });
  }
});

// Show login form
router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/');
  return res.render('users/login', { title: 'Login' });
});


// Destroy session via POST so another site cannot log the user out.
router.post('/logout', (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie('streetNoise.sid');
    return res.redirect('/');
  });
});


// Add a complaint to bookmarks — login required
router.post('/bookmark/:id', async (req, res) => {
  if (!req.session.userId) return res.redirect('/users/login');
  try {
    await addBookmark(req.session.userId, req.params.id);
    return res.redirect('/users/dashboard');
  } catch (e) {
    return res.status(400).render('error', { message: publicError(e) });
  }
});

// Remove a complaint from bookmarks — login required
router.delete('/bookmark/:id', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Login required' });
  try {
    await removeBookmark(req.session.userId, req.params.id);
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(400).json({ error: publicError(e) });
  }
});

// User dashboard — requires login
router.get('/dashboard', async (req, res) => {
  if (!req.session.userId) return res.redirect('/users/login');
  try {
    const { submittedComplaints, bookmarks } = await getUserDashboard(req.session.userId);
    return res.render('users/dashboard', {
      title: 'Dashboard',
      username: req.session.username,
      submittedComplaints,
      bookmarks
    });
  } catch (e) {
    return res.status(500).render('error', { message: publicError(e, 'Dashboard data is temporarily unavailable') });
  }
});

export default router;
