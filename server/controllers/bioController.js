const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Credential = require('../models/Credential');
const User = require('../models/User');
const { getSettings } = require('../utils/settings');
const { logEvent } = require('../utils/audit');
const { siteHost } = require('../middleware/bio');
const { b64u, fromB64u, verifyRegistration, verifyAuthentication } = require('../utils/webauthn');

const CHALLENGE_MS = 2 * 60 * 1000;
const PROOF_SECONDS = 120;

// Ek baar use hone wale challenge (server memory me)
const challenges = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of challenges) if (v.expires < now) challenges.delete(k);
}, 60 * 1000).unref();

function newChallenge(userId, purpose, extra) {
  const challenge = b64u(crypto.randomBytes(32));
  challenges.set(challenge, { user: String(userId), purpose, expires: Date.now() + CHALLENGE_MS, ...extra });
  return challenge;
}

function takeChallenge(challenge, userId, purpose) {
  const c = challenges.get(challenge);
  challenges.delete(challenge);
  if (!c || c.expires < Date.now() || c.user !== String(userId) || c.purpose !== purpose) return null;
  return c;
}

const who = (u) => u.name + ' (roll ' + (u.rollNo || '-') + ')';

// GET /api/bio/status   (student)
exports.getStatus = async (req, res) => {
  try {
    const host = siteHost(req);
    const [settings, here, total] = await Promise.all([
      getSettings(),
      Credential.countDocuments({ user: req.user._id, rpId: host }),
      Credential.countDocuments({ user: req.user._id }),
    ]);
    res.json({ enrolled: here > 0, otherSite: here === 0 && total > 0, required: settings.bioRequired });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/bio/register-options   (student)
exports.registerOptions = async (req, res) => {
  try {
    const rpId = siteHost(req);
    if ((await Credential.countDocuments({ user: req.user._id, rpId })) > 0) {
      return res.status(400).json({
        message: 'Is account par pehle se lock laga hai. Naya phone ho to admin se reset karwao',
      });
    }
    if ((await Credential.countDocuments({ user: req.user._id })) >= 4) {
      return res.status(400).json({ message: 'Bahut saare lock lag chuke hai. Admin se reset karwao' });
    }
    const challenge = newChallenge(req.user._id, 'reg', { rpId });
    res.json({
      challenge,
      rp: { name: 'Smart Attendance', id: rpId },
      user: {
        id: b64u(Buffer.from(String(req.user._id))),
        name: req.user.email,
        displayName: req.user.name,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'discouraged',
      },
      attestation: 'none',
      timeout: 60000,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/bio/register   body: { challenge, clientDataJSON, attestationObject, transports }   (student)
exports.register = async (req, res) => {
  try {
    const b = req.body || {};
    if (typeof b.clientDataJSON !== 'string' || typeof b.attestationObject !== 'string') {
      return res.status(400).json({ message: 'Lock ka data sahi nahi hai' });
    }
    // clientDataJSON se challenge nikaal kar server ke yaad kiye challenge se milao
    let given;
    try {
      given = JSON.parse(fromB64u(b.clientDataJSON).toString('utf8')).challenge;
    } catch {
      return res.status(400).json({ message: 'Lock ka data sahi nahi hai' });
    }
    const c = takeChallenge(given, req.user._id, 'reg');
    if (!c) return res.status(400).json({ message: 'Time khatam ho gaya. Dobara koshish karo' });
    if (c.rpId !== siteHost(req)) {
      return res.status(400).json({ message: 'Site ka address badal gaya. Dobara koshish karo' });
    }
    if ((await Credential.countDocuments({ user: req.user._id, rpId: c.rpId })) > 0) {
      return res.status(400).json({ message: 'Is account par pehle se lock laga hai' });
    }

    let reg;
    try {
      reg = verifyRegistration({
        clientDataJSON: fromB64u(b.clientDataJSON),
        attestationObject: fromB64u(b.attestationObject),
        challenge: given,
        rpId: c.rpId,
      });
    } catch (e) {
      logEvent('bio_failed', who(req.user) + ' failed to set up the fingerprint/face lock: ' + e.message, {
        level: 'warn',
        req,
      });
      return res.status(400).json({ message: 'Lock set nahi ho paya: ' + e.message });
    }

    if (await Credential.exists({ credentialId: reg.credentialId })) {
      return res.status(400).json({ message: 'Ye lock pehle se kisi aur account par laga hai' });
    }

    await Credential.create({
      user: req.user._id,
      credentialId: reg.credentialId,
      publicKeyJwk: reg.publicKeyJwk,
      alg: reg.alg,
      signCount: reg.signCount,
      rpId: c.rpId,
      transports: Array.isArray(b.transports) ? b.transports.filter((t) => typeof t === 'string').slice(0, 5) : [],
    });
    logEvent('bio_enroll', who(req.user) + ' turned on the fingerprint/face lock', { req });
    res.status(201).json({ message: 'Fingerprint/face lock ON ho gaya' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/bio/auth-options   (student)
exports.authOptions = async (req, res) => {
  try {
    const rpId = siteHost(req);
    const creds = await Credential.find({ user: req.user._id, rpId }).lean();
    if (creds.length === 0) {
      return res.status(400).json({
        message: 'Is site/app par lock ON nahi hai. Dashboard ki Settings me jaakar lock ON karo',
      });
    }
    const challenge = newChallenge(req.user._id, 'auth');
    res.json({
      challenge,
      rpId,
      timeout: 60000,
      userVerification: 'required',
      allowCredentials: creds.map((c) => ({ type: 'public-key', id: c.credentialId, transports: c.transports })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/bio/verify   body: { id, clientDataJSON, authenticatorData, signature }   (student)
exports.verify = async (req, res) => {
  try {
    const b = req.body || {};
    if (
      typeof b.id !== 'string' ||
      typeof b.clientDataJSON !== 'string' ||
      typeof b.authenticatorData !== 'string' ||
      typeof b.signature !== 'string'
    ) {
      return res.status(400).json({ message: 'Verify ka data sahi nahi hai' });
    }

    let given;
    try {
      given = JSON.parse(fromB64u(b.clientDataJSON).toString('utf8')).challenge;
    } catch {
      return res.status(400).json({ message: 'Verify ka data sahi nahi hai' });
    }
    const c = takeChallenge(given, req.user._id, 'auth');
    if (!c) return res.status(400).json({ message: 'Time khatam ho gaya. Dobara verify karo' });

    const cred = await Credential.findOne({ user: req.user._id, credentialId: b.id });
    if (!cred) return res.status(400).json({ message: 'Ye lock tumhare account ka nahi hai' });

    let result;
    try {
      result = verifyAuthentication({
        clientDataJSON: fromB64u(b.clientDataJSON),
        authenticatorData: fromB64u(b.authenticatorData),
        signature: fromB64u(b.signature),
        challenge: given,
        credential: cred,
      });
    } catch (e) {
      logEvent('bio_failed', who(req.user) + ' failed the fingerprint/face check: ' + e.message, {
        level: 'warn',
        req,
      });
      return res.status(400).json({ message: 'Fingerprint/face verify nahi hua' });
    }

    cred.signCount = result.signCount;
    cred.lastUsedAt = new Date();
    await cred.save();

    const proof = jwt.sign({ sub: String(req.user._id), purpose: 'bio' }, process.env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: PROOF_SECONDS,
    });
    res.json({ proof });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/bio/reset   body: { email }   (admin)
// Student ka phone badla ho ya lock kharab ho to uska lock hata do
exports.resetUser = async (req, res) => {
  try {
    const email = String((req.body && req.body.email) || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ message: 'Student ka email daalo' });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Is email ka user nahi mila' });
    const r = await Credential.deleteMany({ user: user._id });
    logEvent('bio_reset', req.user.name + ' reset the fingerprint/face lock of ' + user.name + ' (' + user.email + ')', {
      req,
    });
    res.json({
      message:
        r.deletedCount > 0
          ? user.name + ' ka lock hata diya. Wo dobara ON kar sakta hai'
          : user.name + ' ne abhi lock ON nahi kiya tha',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};