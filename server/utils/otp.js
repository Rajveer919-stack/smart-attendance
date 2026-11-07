const crypto = require('crypto');
const Otp = require('../models/Otp');

const OTP_VALID_MINUTES = 10;
const RESEND_WAIT_SECONDS = 60;
const MAX_WRONG_TRIES = 5;

const generateCode = () => String(crypto.randomInt(100000, 1000000));

const hashCode = (email, code) =>
  crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'dev-secret')
    .update(email + ':' + code)
    .digest('hex');

const safeEqual = (a, b) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// Naya OTP banata hai (purana ho to badal deta hai). Code wapas deta hai.
// Agar 60 second ke andar pehle bheja ja chuka hai to tooSoon deta hai.
async function issueOtp(email, purpose, payload) {
  const existing = await Otp.findOne({ email, purpose }).select('lastSentAt');
  if (existing && Date.now() - existing.lastSentAt.getTime() < RESEND_WAIT_SECONDS * 1000) {
    return { tooSoon: true };
  }
  const code = generateCode();
  await Otp.findOneAndUpdate(
    { email, purpose },
    {
      codeHash: hashCode(email, code),
      payload: payload || null,
      attempts: 0,
      lastSentAt: new Date(),
      expiresAt: new Date(Date.now() + OTP_VALID_MINUTES * 60 * 1000),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return { code };
}

// OTP check karta hai. Sahi ho to record wapas deta hai, galat ho to { error } deta hai.
async function checkOtp(email, purpose, code) {
  const doc = await Otp.findOne({ email, purpose });
  if (!doc || doc.expiresAt.getTime() < Date.now()) {
    return { error: 'OTP expire ho gaya ya mila nahi. Naya OTP mangao' };
  }
  if (doc.attempts >= MAX_WRONG_TRIES) {
    await Otp.deleteOne({ _id: doc._id });
    return { error: 'Bahut galat try ho gaye. Naya OTP mangao' };
  }
  if (!safeEqual(doc.codeHash, hashCode(email, String(code || '').trim()))) {
    doc.attempts += 1;
    await doc.save();
    return { error: 'OTP galat hai' };
  }
  return { doc };
}

module.exports = { issueOtp, checkOtp, OTP_VALID_MINUTES };