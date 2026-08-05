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
- Public address history search combining matching NYC 311 and user-submitted complaints
- Clickable complaint-type breakdown with single-type filtering for each searched address
- Shared complaint categories across NYC 311 descriptors and user submissions while preserving the original 311 fields
- Route-specific titles, descriptions, canonical URLs, Open Graph tags, and Twitter card metadata
- Schema.org JSON-LD for the website, web application, public collection pages, breadcrumbs, and complaint dataset
- Search and AI discovery endpoints at `/robots.txt`, `/sitemap.xml`, and `/llms.txt`
- Privacy-conscious indexing rules for account pages, filtered listings, and address-history results

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
SITE_URL=http://localhost:3000
```

Set `SITE_URL` to the public HTTPS origin before deploying, for example
`https://street-noise.example`. Canonical URLs, structured data, social metadata,
the sitemap, and crawler files all use this value. Do not include a route or
query string.

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

### 8. Run the tests

```
npm test
```

---

## Search and AI discovery

The application generates discovery files from `SITE_URL`:

- `/robots.txt` allows public search crawling, allows `OAI-SearchBot` on public
  pages, and disables `GPTBot` training crawl by default.
- `/sitemap.xml` contains only canonical public landing pages. It excludes
  private routes, filtered URLs, and address-history query results.
- `/llms.txt` provides a concise, machine-readable overview of the app, its
  public pages, data provenance, known limitations, and indexing boundaries.

Public landing pages include server-rendered canonical, Open Graph, Twitter,
and Schema.org JSON-LD metadata. Filtered listing URLs and address-history
results use `noindex` to avoid creating thin duplicate pages or publishing
residential-address result URLs in search indexes.

The crawler policy follows the published
[OpenAI crawler controls](https://developers.openai.com/api/docs/bots). Search
engine indexing controls follow the
[Google Search Central robots guidance](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag).

### Social and icon assets

The project includes these brand assets for large social previews and browser
icons:

```
public/images/social-preview.png  # 1200 x 630
public/favicon.svg
public/apple-touch-icon.png       # 180 x 180
```

The app checks for the files at startup. You can replace them in place with
future brand revisions. Restart the server after changing an asset so the
metadata availability check runs again.

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
    addressHistory.js     - combined 311 and user complaint history by address
    hotspots.js           - hotspot upsert logic
    nyc311.js             - 311 API fetch and cache
  routes/
    index.js              - mounts all routes
    discovery.js          - robots.txt, sitemap.xml, and llms.txt
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
      address.handlebars  - address history search and complaint type breakdown
    home.handlebars
    error.handlebars
  tasks/
    seed.js               - seeds nyc311cache and creates indexes
  test/
    addressHistory.test.js - address history and complaint category tests
    seo.test.js            - metadata, crawler policy, sitemap, and JSON-LD tests
  app.js                  - Express app entry point
  seo.js                  - centralized SEO, structured data, and crawler helpers
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
