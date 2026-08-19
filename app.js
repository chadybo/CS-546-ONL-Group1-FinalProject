import express from "express";
import { create } from "express-handlebars";
import session from "express-session";
import MongoStore from "connect-mongo";
import flash from "connect-flash";
import dotenv from "dotenv";
import configRoutes from "./routes/index.js";
import { refreshCache } from "./data/nyc311.js";
import { securityHeaders } from "./middleware/security.js";

dotenv.config();

refreshCache()
  .then(() => console.log("311 cache refreshed"))
  .catch(console.error);

const app = express();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";

app.disable("x-powered-by");
// Production traffic reaches the app through exactly one TLS-terminating proxy.
// Keeping this at one lets Express honor that proxy's forwarded protocol without
// trusting an arbitrary chain of forwarding headers.
if (isProduction) app.set("trust proxy", 1);
app.use(securityHeaders);

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
app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: false, limit: "50kb" }));

// Serve static files
app.use("/public", express.static("public"));

app.use(
  session({
    name: "streetNoise.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: `${process.env.MONGO_URI}${process.env.DB_NAME}`,
    }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 1000 * 60 * 60 * 24,
    },
  }),
);

app.use(flash());

// Expose flash messages and the logged-in user to every view (nav login/logout state)
app.use((req, res, next) => {
  res.locals.successMessage = req.flash("success");
  res.locals.errorMessage = req.flash("error");
  res.locals.user = req.session.userId
    ? { username: req.session.username, role: req.session.role }
    : null;
  next();
});

configRoutes(app);

app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  return res.status(500).render("error", {
    title: "Server error",
    message: "Something went wrong. Please try again.",
  });
});

app.listen(port, () => {
  console.log(`Street Noise running on http://localhost:${port}`);
});
