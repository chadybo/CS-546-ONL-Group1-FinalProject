import express from "express";
import { create } from "express-handlebars";
import session from "express-session";
import MongoStore from "connect-mongo";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import configRoutes from "./routes/index.js";
import discoveryRoutes from "./routes/discovery.js";
import { refreshCache } from "./data/nyc311.js";
import { appConfig } from "./config/settings.js";
import { buildSeoForRequest, detectSeoAssets } from "./seo.js";

dotenv.config();

// Refresh 311 cache on startup
refreshCache()
  .then(() => console.log("311 cache refreshed"))
  .catch(console.error);

const app = express();
const port = appConfig.port;
const publicDirectory = fileURLToPath(new URL("./public", import.meta.url));
const seoAssets = detectSeoAssets(publicDirectory, appConfig.siteUrl);

// Set up handlebars
const hbs = create({
  defaultLayout: "main",
  helpers: {
    eq: (a, b) => a === b,
    formatDate: (value) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return "Unknown";
      }

      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
    },
  },
});
app.engine("handlebars", hbs.engine);
app.set("view engine", "handlebars");
app.set("views", "./views");

// Parse request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use("/public", express.static("public"));

// Serve crawler discovery files without creating a database-backed session.
app.use(discoveryRoutes);

// Build safe, route-specific metadata before rendering any page.
app.use((req, res, next) => {
  const seo = buildSeoForRequest({
    siteUrl: appConfig.siteUrl,
    pathname: req.path,
    queryKeys: Object.keys(req.query),
    assets: seoAssets,
  });

  res.locals.seo = seo;

  if (seo.robots.startsWith("noindex")) {
    res.set("X-Robots-Tag", seo.robots);
  }

  next();
});

// Session setup with MongoDB store
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: `${process.env.MONGO_URI}${process.env.DB_NAME}`,
    }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 },
  }),
);

configRoutes(app);

app.listen(port, () => {
  console.log(`Street Noise running on http://localhost:${port}`);
});
