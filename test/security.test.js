import test from "node:test";
import assert from "node:assert/strict";
import { authRateLimit, securityHeaders } from "../middleware/security.js";
import { escapeRegex, sanitizePlainText } from "../helper.js";

const createResponse = () => ({
  locals: {},
  headers: {},
  set(name, value) {
    if (typeof name === "object") Object.assign(this.headers, name);
    else this.headers[name] = value;
    return this;
  },
  status(code) {
    this.statusCode = code;
    return this;
  },
  render(view, data) {
    this.rendered = { view, data };
    return this;
  },
  json(data) {
    this.jsonBody = data;
    return this;
  },
});

test("security headers block framing and MIME sniffing", () => {
  const res = createResponse();
  let continued = false;
  securityHeaders({}, res, () => { continued = true; });
  assert.equal(continued, true);
  assert.equal(res.headers["X-Frame-Options"], "DENY");
  assert.equal(res.headers["X-Content-Type-Options"], "nosniff");
});

test("authentication rate limiting returns JSON to AJAX clients", () => {
  const req = {
    ip: "rate-limit-json-test",
    is: (type) => type === "application/json",
  };
  let response;
  for (let attempt = 0; attempt <= 10; attempt += 1) {
    response = createResponse();
    authRateLimit(req, response, () => {});
  }
  assert.equal(response.statusCode, 429);
  assert.match(response.jsonBody.error, /wait 15 minutes/);
});

test("escapeRegex makes search input literal", () => {
  const escaped = escapeRegex("(a+)+$");
  assert.equal(escaped, "\\(a\\+\\)\\+\\$");
  assert.equal(new RegExp(escaped).test("(a+)+$"), true);
});

test("sanitizePlainText removes executable markup from stored text", () => {
  assert.equal(sanitizePlainText("  Loud <b>music</b>  "), "Loud music");
  assert.equal(sanitizePlainText("Safe & sound"), "Safe & sound");
  assert.equal(sanitizePlainText('<script>alert("x")</script>Noise'), "Noise");
  assert.equal(sanitizePlainText(null), "");
});
