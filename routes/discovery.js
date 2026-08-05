import { Router } from "express";
import { appConfig } from "../config/settings.js";
import { buildLlmsTxt, buildRobotsTxt, buildSitemapXml } from "../seo.js";

const router = Router();
const CACHE_CONTROL = "public, max-age=3600";

router.get("/robots.txt", (req, res) => {
  return res
    .type("text/plain")
    .set("Cache-Control", CACHE_CONTROL)
    .send(buildRobotsTxt(appConfig.siteUrl));
});

router.get("/sitemap.xml", (req, res) => {
  return res
    .type("application/xml")
    .set("Cache-Control", CACHE_CONTROL)
    .send(buildSitemapXml(appConfig.siteUrl));
});

router.get("/llms.txt", (req, res) => {
  return res
    .type("text/plain")
    .set("Cache-Control", CACHE_CONTROL)
    .send(buildLlmsTxt(appConfig.siteUrl));
});

export default router;
