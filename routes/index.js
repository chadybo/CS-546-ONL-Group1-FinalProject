// Mounts all route files onto the Express app
import usersRoutes from './users.js';
import complaintsRoutes from './complaints.js';

const constructorMethod = (app) => {
  app.use('/users', usersRoutes);
  app.use('/complaints', complaintsRoutes);

  // Home page
  app.get('/', async (req, res) => {
    return res.render('home', { title: 'Street Noise NYC' });
  });

  // Catch-all 404
  app.use('*', (req, res) => {
    return res.status(404).render('error', { message: 'Page not found' });
  });
};

export default constructorMethod;