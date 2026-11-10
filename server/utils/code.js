const crypto = require('crypto');

// Class ka 4 digit code. Har 15 second me badal jata hai.
// Ye session ke secret se banta hai, isliye sirf server hi sahi code bata sakta hai.
const STEP_MS = 15 * 1000;

const windowOf = (now) => Math.floor(now / STEP_MS);

function codeForWindow(secret, win) {
  const h = crypto.createHmac('sha256', String(secret)).update('code:' + win).digest();
  const n = h.readUInt32BE(0) % 10000;
  return String(n).padStart(4, '0');
}

// Abhi ka code + kitne second me badlega
function currentCode(secret, now) {
  const t = now === undefined ? Date.now() : now;
  const win = windowOf(t);
  return {
    code: codeForWindow(secret, win),
    secondsLeft: Math.max(1, Math.ceil(((win + 1) * STEP_MS - t) / 1000)),
    stepSeconds: STEP_MS / 1000,
  };
}

// Student ne jo code dala wo sahi hai? Abhi ka ya pichhla (internet ki deri ke liye) chalta hai
function codeMatches(secret, input, now) {
  const given = String(input || '');
  if (!/^\d{4}$/.test(given)) return false;
  const win = windowOf(now === undefined ? Date.now() : now);
  const a = Buffer.from(given);
  return [win, win - 1].some((w) => {
    const b = Buffer.from(codeForWindow(secret, w));
    return crypto.timingSafeEqual(a, b);
  });
}

module.exports = { currentCode, codeMatches, STEP_MS };