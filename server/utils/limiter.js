// Chhota sa rate limiter (koi extra package nahi chahiye).
// Key = IP + email, kyunki college ke WiFi par saare students ka IP ek jaisa ho sakta hai.
function rateLimit({ windowMs, max, message }) {
  const hits = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.resetAt < now) hits.delete(k);
  }, 60 * 1000).unref();

  return (req, res, next) => {
    const email = String((req.body && req.body.email) || '').toLowerCase();
    const key = req.ip + '|' + email;
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      return res
        .status(429)
        .json({ message: message || 'Bahut zyada try ho gaye. Thodi der baad aao' });
    }
    next();
  };
}

module.exports = { rateLimit };