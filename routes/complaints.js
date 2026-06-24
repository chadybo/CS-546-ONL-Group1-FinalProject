import { Router } from 'express';
import { submitComplaint } from '../data/complaints.js';

const router = Router();

const TYPES = [
  'Loud Music/Party', 'Construction', 'Barking Dog',
  'Vehicle Idling', 'Loud Talking', 'Other'
];

const BOROUGHS = ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'];

// Show submit complaint form — login required
router.get('/submit', (req, res) => {
  if (!req.session.userId) return res.redirect('/users/login');
  return res.render('complaints/submit', {
    title: 'Submit a Complaint',
    types: TYPES,
    boroughs: BOROUGHS
  });
});

// Handle complaint form submission
router.post('/submit', async (req, res) => {
  if (!req.session.userId) return res.redirect('/users/login');
  const { address, borough, complaintType, description } = req.body;
  try {
    const complaint = await submitComplaint(
      req.session.userId, address, borough, complaintType, description
    );
    return res.redirect(`/users/dashboard`);
  } catch (e) {
    return res.status(400).render('complaints/submit', {
      title: 'Submit a Complaint',
      error: e,
      types: TYPES,
      boroughs: BOROUGHS
    });
  }
});

export default router;