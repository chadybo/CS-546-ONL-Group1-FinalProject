import { FilterXSS } from 'xss';

// Strict mode: strip ALL HTML tags, not just dangerous ones.
// Swap this for the default `xss()` export if you want to allow
// a safe subset of formatting tags (b, i, em, strong, etc.) instead.
const filter = new FilterXSS({
  whiteList: {},        // no tags allowed at all
  stripIgnoreTag: true, // remove disallowed tags entirely
  stripIgnoreTagBody: ['script'] // also remove script tag content, not just the tags
});

const sanitizeObject = (obj) => {
  if (typeof obj === 'string') return filter.process(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (obj && typeof obj === 'object') {
    for (const key in obj) {
      obj[key] = sanitizeObject(obj[key]);
    }
    return obj;
  }
  return obj;
};

export const sanitizeBody = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  next();
};