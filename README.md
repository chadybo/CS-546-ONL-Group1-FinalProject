# Street Noise NYC

A community-driven noise complaint tracker for New York City. The app pulls real complaint data from the NYC 311 Open Data API and lets residents browse, search, and submit their own noise complaints. When multiple users report issues at the same address, the app automatically flags it as a confirmed hotspot..

Built for CS 546 Web Programming I at Stevens Institute of Technology.

---

## What is built so far

- Express app with Handlebars templating and session-based auth
- MongoDB connection with four collections: users, complaints, hotspots, nyc311cache
- NYC 311 Socrata API integration.. fetches 1000 recent noise complaints on startup and caches them locally
- User registration and login with bcrypt password hashing
- User dashboard
- Submit a noise complaint form with address normalization and hotspot upsert logic
- Automatic hotspot detection: any address with 3 or more user complaints is flagged as a confirmed hotspot

---

## Tech stack

- Node.js + Express
- MongoDB (local or Atlas)
- Handlebars (express-handlebars)
- express-session + connect-mongo
- bcrypt
- node-fetch
- dotenv

---

## Local setup

### 1. Prerequisites

Make sure you have the following installed:

- Node.js v16 or higher
- MongoDB Community Edition running locally

To start MongoDB on Mac:
```
brew services start mongodb-community
```

### 2. Clone the repo

```
git clone https://github.com/chadybo/CS-546-ONL-Group1-FinalProject.git
cd CS-546-ONL-Group1-FinalProject
```

### 3. Create your branch

```
git checkout -b yourname/your-feature
```

### 4. Install dependencies

```
npm install
```

### 5. Create a .env file

Create a file called `.env` in the project root with the following:

```
MONGO_URI=mongodb://localhost:27017/
DB_NAME=street_noise
SESSION_SECRET=street-noise-secret-key
PORT=3000
```

### 6. Seed the database

This creates all indexes and pulls 1000 noise complaints from NYC Open Data into your local MongoDB:

```
npm run seed
```

### 7. Start the app

```
npm start
```

Visit `http://localhost:3000` in your browser.

---

## Folder structure

```
street-noise/
  config/
    mongoConnection.js    - singleton MongoDB connection
    mongoCollections.js   - collection references
    settings.js           - reads from .env
  data/
    users.js              - register and login logic
    complaints.js         - submit complaint logic
    hotspots.js           - hotspot upsert logic
    nyc311.js             - 311 API fetch and cache
  routes/
    index.js              - mounts all routes
    users.js              - register, login, logout, dashboard
    complaints.js         - submit complaint
  public/
    css/
      style.css
  views/
    layouts/
      main.handlebars     - base layout with nav
    users/
      register.handlebars
      login.handlebars
      dashboard.handlebars
    complaints/
      submit.handlebars
    home.handlebars
    error.handlebars
  tasks/
    seed.js               - seeds nyc311cache and creates indexes
  app.js                  - Express app entry point
  package.json
  .env                    - not committed, create locally
```

---

## Team

- Aditya Pradeep
- Adrian Wong
- Kofwana Lawson
- Peter Staker
- Richard Swah