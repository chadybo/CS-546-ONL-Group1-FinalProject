import { Router } from 'express';
import { getAdminStats, deleteComplaint } from '../data/users.js';
import { publicError } from '../middleware/security.js';

const router = Router();

// Redirect non-admins
const requireAdmin = (req, res, next) => {
  if (!req.session.userId) return res.redirect('/users/login');
  if (req.session.role !== 'admin') return res.status(403).render('error', { message: 'Access denied' });
  next();
};

// Admin dashboard
router.get('/', requireAdmin, async (req, res) => {
  try {
    const stats = await getAdminStats();
    return res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      ...stats
    });
  } catch (e) {
    return res.status(500).render('error', { message: publicError(e, 'Admin data is temporarily unavailable') });
  }
});

// Delete a complaint
router.post('/complaints/:id/delete', requireAdmin, async (req, res) => {
  try {
    await deleteComplaint(req.params.id);
    return res.redirect('/admin');
  } catch (e) {
    return res.status(typeof e === 'string' ? 400 : 500).render('error', { message: publicError(e) });
  }
});

export default router;
