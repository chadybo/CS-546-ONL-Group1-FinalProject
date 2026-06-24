import express from 'express';
import { create } from 'express-handlebars';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import dotenv from 'dotenv';
import configRoutes from './routes/index.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Set up handlebars
const hbs = create({ defaultLayout: 'main' });
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
app.set('views', './views');

// Parse request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/public', express.static('public'));

// Session setup with MongoDB store
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: `${process.env.MONGO_URI}${process.env.DB_NAME}` }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

configRoutes(app);

app.listen(port, () => {
  console.log(`Street Noise running on http://localhost:${port}`);
});