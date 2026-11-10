// Website ko hack hone se bachane ke liye: headers, gande data ki safai, aur zyada requests par roak.
// Koi extra package nahi chahiye.

const isProd = process.env.NODE_ENV === 'production';

// Browser ko batata hai ki kya-kya allow hai (doosri site ka script nahi chalega)
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), geolocation=(self), microphone=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  if (isProd) {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
    // Kuch toot jaye to Render me CSP_OFF=1 daal do (neeche padho)
    if (process.env.CSP_OFF !== '1') res.setHeader('Content-Security-Policy', CSP);
  }
  // API ke jawab kabhi cache na ho (attendance ka data hamesha taaza)
  if (req.path.startsWith('/api')) res.setHeader('Cache-Control', 'no-store');
  next();
}

// MongoDB injection roakne ke liye: {"$gt": ""} jaise keys hata deta hai
function clean(value, depth) {
  if (depth > 8) return value;
  if (Array.isArray(value)) return value.map((v) => clean(v, depth + 1));
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out = {};
    Object.keys(value).forEach((k) => {
      if (k.startsWith('$') || k.includes('.') || k === '__proto__' || k === 'constructor' || k === 'prototype') return;
      out[k] = clean(value[k], depth + 1);
    });
    return out;
  }
  return value;
}

function sanitize(req, res, next) {
  if (req.body && typeof req.body === 'object') req.body = clean(req.body, 0);
  if (req.query && typeof req.query === 'object') {
    const cleaned = clean(req.query, 0);
    Object.keys(req.query).forEach((k) => delete req.query[k]);
    Object.assign(req.query, cleaned);
  }
  next();
}

// Ek IP se bahut zyada requests aayein to roko. keyFn se key badal sakte ho
function limiter({ windowMs, max, message, keyFn }) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.resetAt < now) hits.delete(k);
  }, 60 * 1000).unref();

  return (req, res, next) => {
    const key = keyFn ? keyFn(req) : req.ip;
    const now = Date.now();
    let e = hits.get(key);
    if (!e || e.resetAt < now) {
      e = { count: 0, resetAt: now + windowMs };
      hits.set(key, e);
    }
    e.count += 1;
    if (e.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((e.resetAt - now) / 1000)));
      return res.status(429).json({ message: message || 'Bahut zyada requests. Thodi der baad try karo' });
    }
    next();
  };
}

// Poore /api par: ek IP se 5 minute me 1500 tak (college WiFi par sab ka IP ek hota hai, isliye zyada rakha)
const apiLimiter = limiter({ windowMs: 5 * 60 * 1000, max: 1500 });

// Attendance lagane par: ek student 1 minute me 25 baar se zyada nahi
const markLimiter = limiter({
  windowMs: 60 * 1000,
  max: 25,
  message: 'Bahut zyada koshish. 1 minute baad try karo',
  keyFn: (req) => 'u:' + (req.user ? req.user._id : req.ip),
});

// JWT_SECRET kamzor ho to chetavni
function checkEnv() {
  const s = process.env.JWT_SECRET || '';
  if (isProd && s.length < 32) {
    console.warn('CHETAVNI: JWT_SECRET chhota hai. Render me kam se kam 32 akshar ka lamba random secret rakho.');
  }
}

module.exports = { securityHeaders, sanitize, limiter, apiLimiter, markLimiter, checkEnv, clean };