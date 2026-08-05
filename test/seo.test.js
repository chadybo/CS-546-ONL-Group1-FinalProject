import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import {
  absoluteUrl,
  buildLlmsTxt,
  buildRobotsTxt,
  buildSeoForRequest,
  buildSitemapXml,
  detectSeoAssets,
  normalizeSiteUrl,
  serializeJsonLd,
} from "../seo.js";

const siteUrl = "https://street-noise.example";

test("normalizeSiteUrl produces a stable origin and safe local fallback", () => {
  assert.equal(normalizeSiteUrl("https://street-noise.example/"), siteUrl);
  assert.equal(normalizeSiteUrl("javascript:alert(1)", 4321), "http://localhost:4321");
  assert.equal(normalizeSiteUrl("", 4321), "http://localhost:4321");
});

test("absoluteUrl builds origin-relative URLs", () => {
  assert.equal(
    absoluteUrl(`${siteUrl}/`, "/complaints/browse"),
    `${siteUrl}/complaints/browse`,
  );
});

test("public landing pages get canonical metadata and JSON-LD", () => {
  const seo = buildSeoForRequest({
    siteUrl,
    pathname: "/complaints/browse",
  });

  assert.equal(seo.canonicalUrl, `${siteUrl}/complaints/browse`);
  assert.match(seo.robots, /^index,follow/);
  assert.match(seo.jsonLd, /"@type":"Dataset"/);
  assert.match(seo.jsonLd, /"@type":"BreadcrumbList"/);
});

test("brand assets are detected and included in social metadata", () => {
  const publicDirectory = fileURLToPath(new URL("../public", import.meta.url));
  const assets = detectSeoAssets(publicDirectory, siteUrl);
  const seo = buildSeoForRequest({
    siteUrl,
    pathname: "/",
    assets,
  });

  assert.equal(
    assets.socialImageUrl,
    `${siteUrl}/public/images/social-preview.png`,
  );
  assert.equal(assets.faviconUrl, `${siteUrl}/public/favicon.svg`);
  assert.equal(
    assets.appleTouchIconUrl,
    `${siteUrl}/public/apple-touch-icon.png`,
  );
  assert.equal(seo.twitterCard, "summary_large_image");
  assert.match(seo.jsonLd, /"@type":"ImageObject"/);
});

test("faceted listing URLs canonicalize to the main page and stay out of the index", () => {
  const seo = buildSeoForRequest({
    siteUrl,
    pathname: "/complaints/browse",
    queryKeys: ["borough", "page"],
  });

  assert.equal(seo.canonicalUrl, `${siteUrl}/complaints/browse`);
  assert.equal(seo.robots, "noindex,follow");
  assert.equal(seo.jsonLd, null);
});

test("query-driven address histories are noindex but may pass link discovery", () => {
  const seo = buildSeoForRequest({
    siteUrl,
    pathname: "/complaints/address",
    queryKeys: ["q", "borough", "type"],
  });

  assert.equal(seo.canonicalUrl, `${siteUrl}/complaints/address`);
  assert.equal(seo.robots, "noindex,follow");
  assert.equal(seo.jsonLd, null);
});

test("private and unknown routes are noindex and nofollow", () => {
  const dashboardSeo = buildSeoForRequest({
    siteUrl,
    pathname: "/users/dashboard",
  });
  const missingSeo = buildSeoForRequest({
    siteUrl,
    pathname: "/does-not-exist",
  });

  assert.equal(dashboardSeo.robots, "noindex,nofollow");
  assert.equal(missingSeo.robots, "noindex,nofollow");
  assert.equal(missingSeo.canonicalUrl, null);
});

test("serializeJsonLd neutralizes script-breaking characters", () => {
  const serialized = serializeJsonLd({ value: "</script><script>&\u2028" });

  assert.doesNotMatch(serialized, /<\/script>/);
  assert.match(serialized, /\\u003c\/script\\u003e/);
  assert.match(serialized, /\\u0026/);
  assert.match(serialized, /\\u2028/);
});

test("robots.txt enables public discovery while disabling GPTBot training crawl", () => {
  const robots = buildRobotsTxt(siteUrl);

  assert.match(robots, /User-agent: OAI-SearchBot\nAllow: \//);
  assert.match(robots, /User-agent: GPTBot\nDisallow: \//);
  assert.match(robots, /Disallow: \/users\/dashboard/);
  assert.doesNotMatch(robots, /Disallow: \/users\n/);
  assert.match(robots, new RegExp(`Sitemap: ${siteUrl}/sitemap\\.xml`));
});

test("sitemap contains only canonical public landing pages", () => {
  const sitemap = buildSitemapXml(siteUrl);

  assert.match(sitemap, /<loc>https:\/\/street-noise\.example\/complaints\/browse<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/street-noise\.example\/complaints\/hotspots<\/loc>/);
  assert.doesNotMatch(sitemap, /users\/dashboard/);
  assert.doesNotMatch(sitemap, /complaints\/address/);
  assert.doesNotMatch(sitemap, /\?page=/);
});

test("llms.txt explains public routes, data provenance, and indexing boundaries", () => {
  const llms = buildLlmsTxt(siteUrl);

  assert.match(llms, /## Public pages/);
  assert.match(llms, /NYC 311 Open Data/);
  assert.match(llms, /Address-history results are query-driven and marked noindex/);
  assert.match(llms, /OAI-SearchBot may crawl public pages/);
});
