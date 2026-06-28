// Mounts all route files onto the Express app
import usersRoutes from './users.js';
import complaintsRoutes from './complaints.js';
import adminRoutes from './admin.js';
import { getCached311 } from '../data/nyc311.js';
import { hotspots } from '../config/mongoCollections.js';

const constructorMethod = (app) => {
  app.use('/users', usersRoutes);
  app.use('/complaints', complaintsRoutes);
  app.use('/admin', adminRoutes);

  // Home page
  app.get('/', async (req, res) => {
    try {
      const recentComplaints = await getCached311({ page: 1 });
      const hotspotCol = await hotspots();
      const hotspotCount = await hotspotCol.countDocuments({ confirmedHotspot: true });
      return res.render('home', {
        title: 'Home',
        recentComplaints: recentComplaints.slice(0, 5),
        totalCount: '1,000+',
        hotspotCount
      });
    } catch (e) {
      return res.render('home', { title: 'Home', recentComplaints: [], totalCount: 0, hotspotCount: 0 });
    }
  });

  // Catch-all 404
  app.use('*', (req, res) => {
    return res.status(404).render('error', { message: 'Page not found' });
  });
};

export default constructorMethod;