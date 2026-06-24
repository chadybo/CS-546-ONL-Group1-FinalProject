import { Router } from 'express';
import { registerUser, loginUser } from '../data/users.js';

const router = Router();

// Show register form
router.get('/register', (req, res) => {
  if (req.session.userId) return res.redirect('/');
  return res.render('users/register', { title: 'Register' });
});

// Handle register form submission
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const user = await registerUser(username, email, password);
    req.session.userId = user._id.toString();
    req.session.username = user.username;
    req.session.role = 'user';
    return res.redirect('/users/dashboard');
  } catch (e) {
    return res.status(400).render('users/register', { title: 'Register', error: e });
  }
});

// Show login form
router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/');
  return res.render('users/login', { title: 'Login' });
});

// Handle login form submission
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await loginUser(email, password);
    req.session.userId = user._id.toString();
    req.session.username = user.username;
    req.session.role = user.role;
    return res.redirect('/users/dashboard');
  } catch (e) {
    return res.status(400).render('users/login', { title: 'Login', error: e });
  }
});

// Destroy session and redirect home
router.get('/logout', (req, res) => {
  req.session.destroy();
  return res.redirect('/');
});

// User dashboard — requires login
router.get('/dashboard', async (req, res) => {
  if (!req.session.userId) return res.redirect('/users/login');
  return res.render('users/dashboard', {
    title: 'Dashboard',
    username: req.session.username
  });
});

export default router;