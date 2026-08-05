import { existsSync } from "node:fs";
import { join } from "node:path";

export const SITE_NAME = "Street Noise NYC";
export const DEFAULT_DESCRIPTION =
  "Explore NYC noise complaints from 311 data and community reports, discover recurring hotspots, and understand complaint trends across the five boroughs.";

const ROUTE_METADATA = {
  "/": {
    title: "NYC Noise Complaint Tracker | Street Noise NYC",
    pageName: "NYC Noise Complaint Tracker",
    description: DEFAULT_DESCRIPTION,
    indexable: true,
    schemaType: "WebPage",
  },
  "/complaints/browse": {
    title: "Browse NYC Noise Complaints | Street Noise NYC",
    pageName: "Browse NYC Noise Complaints",
    description:
      "Browse and filter recent NYC noise complaints from NYC 311 and Street Noise community submissions.",
    indexable: true,
    schemaType: "CollectionPage",
    includeDataset: true,
    faceted: true,
  },
  "/complaints/hotspots": {
    title: "NYC Noise Complaint Hotspots | Street Noise NYC",
    pageName: "NYC Noise Complaint Hotspots",
    description:
      "Explore New York City addresses that have been confirmed as recurring noise complaint hotspots by community reports.",
    indexable: true,
    schemaType: "CollectionPage",
    faceted: true,
  },
  "/complaints/trends": {
    title: "NYC Noise Complaint Trends | Street Noise NYC",
    pageName: "NYC Noise Complaint Trends",
    description:
      "See how NYC noise complaint volume changes over time and compare trends across the five boroughs.",
    indexable: true,
    schemaType: "CollectionPage",
    includeDataset: true,
    faceted: true,
  },
  "/complaints/common": {
    title: "Common NYC Noise Complaints | Street Noise NYC",
    pageName: "Common NYC Noise Complaints",
    description:
      "See which types of noise complaints are reported most often across New York City.",
    indexable: true,
    schemaType: "CollectionPage",
    includeDataset: true,
    faceted: true,
  },
  "/complaints/address": {
    title: "Search Address Complaint History | Street Noise NYC",
    pageName: "Search Address Complaint History",
    description:
      "Look up an NYC address to view matching noise complaint history from NYC 311 and community submissions.",
    indexable: false,
    followLinks: true,
  },
  "/complaints/submit": {
    title: "Submit a Noise Complaint | Street Noise NYC",
    pageName: "Submit a Noise Complaint",
    description: "Submit a community noise complaint to Street Noise NYC.",
    indexable: false,
    followLinks: false,
  },
  "/users/login": {
    title: "Log In | Street Noise NYC",
    pageName: "Log In",
    description: "Log in to your Street Noise NYC account.",
    indexable: false,
    followLinks: false,
  },
  "/users/register": {
    title: "Create an Account | Street Noise NYC",
    pageName: "Create an Account",
    description: "Create a Street Noise NYC account.",
    indexable: false,
    followLinks: false,
  },
  "/users/dashboard": {
    title: "Account Dashboard | Street Noise NYC",
    pageName: "Account Dashboard",
    description: "Manage your Street Noise NYC account and submissions.",
    indexable: false,
    followLinks: false,
  },
  "/admin": {
    title: "Admin Dashboard | Street Noise NYC",
    pageName: "Admin Dashboard",
    description: "Street Noise NYC administration.",
    indexable: false,
    followLinks: false,
  },
};

export const SITEMAP_PATHS = Object.entries(ROUTE_METADATA)
  .filter(([, metadata]) => metadata.indexable)
  .map(([path]) => path);

const PRIVATE_PREFIXES = ["/admin", "/users", "/complaints/submit"];

export const normalizeSiteUrl = (value, port = 3000) => {
  const fallback = `http://localhost:${port}`;
  const candidate = typeof value === "string" && value.trim() ? value.trim() : fallback;

  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
      return fallback;
    }

    parsed.hash = "";
    parsed.search = "";
    parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
};

export const absoluteUrl = (siteUrl, pathname = "/") =>
  new URL(pathname, `${normalizeSiteUrl(siteUrl)}/`).toString();

export const serializeJsonLd = (value) =>
  JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

const buildBreadcrumb = (siteUrl, canonicalUrl, pageName) => ({
  "@type": "BreadcrumbList",
  "@id": `${canonicalUrl}#breadcrumb`,
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: absoluteUrl(siteUrl, "/"),
    },
    {
      "@type": "ListItem",
      position: 2,
      name: pageName,
      item: canonicalUrl,
    },
  ],
});

const buildDataset = (siteUrl) => ({
  "@type": "Dataset",
  "@id": `${absoluteUrl(siteUrl, "/")}#noise-complaint-dataset`,
  name: "NYC Noise Complaint Records",
  description:
    "A browsable collection of recent NYC 311 noise complaints combined with community-submitted noise reports.",
  url: absoluteUrl(siteUrl, "/complaints/browse"),
  isAccessibleForFree: true,
  spatialCoverage: {
    "@type": "Place",
    name: "New York City",
  },
  measurementTechnique: ["NYC 311 Open Data API", "Community submissions"],
  variableMeasured: [
    "Complaint type",
    "Incident address",
    "Borough",
    "Creation date",
    "Complaint status",
  ],
});

export const buildStructuredData = ({
  siteUrl,
  canonicalUrl,
  pageName,
  description,
  schemaType = "WebPage",
  includeDataset = false,
  socialImageUrl,
}) => {
  const homeUrl = absoluteUrl(siteUrl, "/");
  const websiteId = `${homeUrl}#website`;
  const applicationId = `${homeUrl}#webapp`;
  const pageId = `${canonicalUrl}#webpage`;
  const graph = [
    {
      "@type": "WebSite",
      "@id": websiteId,
      url: homeUrl,
      name: SITE_NAME,
      description: DEFAULT_DESCRIPTION,
      inLanguage: "en-US",
    },
    {
      "@type": "WebApplication",
      "@id": applicationId,
      url: homeUrl,
      name: SITE_NAME,
      description: DEFAULT_DESCRIPTION,
      applicationCategory: "CivicApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires a modern web browser",
      isAccessibleForFree: true,
    },
    {
      "@type": schemaType,
      "@id": pageId,
      url: canonicalUrl,
      name: pageName,
      description,
      inLanguage: "en-US",
      isPartOf: { "@id": websiteId },
      breadcrumb:
        canonicalUrl === homeUrl
          ? undefined
          : { "@id": `${canonicalUrl}#breadcrumb` },
      primaryImageOfPage: socialImageUrl
        ? {
            "@type": "ImageObject",
            url: socialImageUrl,
            width: 1200,
            height: 630,
          }
        : undefined,
      mainEntity: includeDataset
        ? { "@id": `${homeUrl}#noise-complaint-dataset` }
        : { "@id": applicationId },
    },
  ];

  if (canonicalUrl !== homeUrl) {
    graph.push(buildBreadcrumb(siteUrl, canonicalUrl, pageName));
  }

  if (includeDataset) {
    graph.push(buildDataset(siteUrl));
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
};

const getRouteMetadata = (pathname) => {
  if (ROUTE_METADATA[pathname]) {
    return ROUTE_METADATA[pathname];
  }

  if (PRIVATE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return {
      title: `Private Page | ${SITE_NAME}`,
      pageName: "Private Page",
      description: "This page is not available in public search results.",
      indexable: false,
      followLinks: false,
    };
  }

  return {
    title: `Page Not Found | ${SITE_NAME}`,
    pageName: "Page Not Found",
    description: "The requested Street Noise NYC page could not be found.",
    indexable: false,
    followLinks: false,
    omitCanonical: true,
  };
};

export const buildSeoForRequest = ({
  siteUrl,
  pathname,
  queryKeys = [],
  assets = {},
}) => {
  const normalizedPath = pathname === "/" ? pathname : pathname.replace(/\/+$/, "");
  const metadata = getRouteMetadata(normalizedPath);
  const hasFacetQuery = metadata.faceted && queryKeys.length > 0;
  const indexable = metadata.indexable && !hasFacetQuery;
  const followLinks = metadata.followLinks !== false;
  const canonicalUrl = metadata.omitCanonical
    ? null
    : absoluteUrl(siteUrl, normalizedPath);
  const robots = indexable
    ? "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"
    : `noindex,${followLinks ? "follow" : "nofollow"}`;
  const socialImageUrl = assets.socialImageUrl || null;
  const structuredData =
    indexable && canonicalUrl
      ? buildStructuredData({
          siteUrl,
          canonicalUrl,
          pageName: metadata.pageName,
          description: metadata.description,
          schemaType: metadata.schemaType,
          includeDataset: metadata.includeDataset,
          socialImageUrl,
        })
      : null;

  return {
    title: metadata.title,
    description: metadata.description,
    canonicalUrl,
    robots,
    ogType: "website",
    ogTitle: metadata.title,
    ogDescription: metadata.description,
    ogUrl: canonicalUrl,
    siteName: SITE_NAME,
    twitterCard: socialImageUrl ? "summary_large_image" : "summary",
    socialImageUrl,
    socialImageAlt: socialImageUrl
      ? "Street Noise NYC noise complaint tracker preview"
      : null,
    faviconUrl: assets.faviconUrl || null,
    appleTouchIconUrl: assets.appleTouchIconUrl || null,
    jsonLd: structuredData ? serializeJsonLd(structuredData) : null,
  };
};

export const detectSeoAssets = (publicDirectory, siteUrl) => {
  const definitions = [
    ["socialImageUrl", join("images", "social-preview.png"), "/public/images/social-preview.png"],
    ["faviconUrl", "favicon.svg", "/public/favicon.svg"],
    ["appleTouchIconUrl", "apple-touch-icon.png", "/public/apple-touch-icon.png"],
  ];

  return Object.fromEntries(
    definitions
      .filter(([, relativePath]) => existsSync(join(publicDirectory, relativePath)))
      .map(([key, , publicPath]) => [key, absoluteUrl(siteUrl, publicPath)]),
  );
};

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export const buildSitemapXml = (siteUrl) => {
  const urls = SITEMAP_PATHS.map(
    (pathname) => `  <url>\n    <loc>${escapeXml(absoluteUrl(siteUrl, pathname))}</loc>\n  </url>`,
  ).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
};

export const buildRobotsTxt = (siteUrl) => {
  const restrictedPaths = [
    "/admin",
    "/users/dashboard",
    "/users/logout",
    "/complaints/submit",
  ];
  const publicCrawlerRules = restrictedPaths.map((path) => `Disallow: ${path}`);

  return [
    "User-agent: *",
    "Allow: /",
    ...publicCrawlerRules,
    "",
    "User-agent: OAI-SearchBot",
    "Allow: /",
    ...publicCrawlerRules,
    "",
    "User-agent: GPTBot",
    "Disallow: /",
    "",
    `Sitemap: ${absoluteUrl(siteUrl, "/sitemap.xml")}`,
    "",
  ].join("\n");
};

export const buildLlmsTxt = (siteUrl) => {
  const pageLinks = SITEMAP_PATHS.map((pathname) => {
    const metadata = ROUTE_METADATA[pathname];
    return `- [${metadata.pageName}](${absoluteUrl(siteUrl, pathname)}): ${metadata.description}`;
  }).join("\n");

  return `# ${SITE_NAME}\n\n> ${DEFAULT_DESCRIPTION}\n\n## Public pages\n\n${pageLinks}\n\n## Data and scope\n\n- The application combines a locally cached subset of NYC 311 Open Data noise complaints with reports submitted by Street Noise NYC users.\n- Data shown by the application may be delayed, incomplete, or unavailable while upstream services refresh.\n- Hotspots are confirmed after three or more community submissions for the same normalized address.\n\n## Indexing boundaries\n\n- Account and address-history pages are marked noindex. Administration, dashboard, logout, and complaint-submission routes are blocked from crawler access.\n- Address-history results are query-driven and marked noindex to avoid publishing residential-address result pages in search indexes.\n- OAI-SearchBot may crawl public pages for ChatGPT search. GPTBot training access is disabled by default.\n\n## Attribution\n\n- NYC 311 records originate from NYC Open Data.\n- Community submissions are identified separately from NYC 311 records.\n`;
};
