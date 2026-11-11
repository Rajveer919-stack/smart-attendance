const crypto = require('crypto');

// Fingerprint / Face / Screen-lock (WebAuthn) ki jaanch. Koi extra package nahi chahiye.
// Sirf "platform" authenticator (phone ka apna fingerprint/face/PIN) maante hai, attestation: none.

const b64u = (buf) => Buffer.from(buf).toString('base64url');
const fromB64u = (s) => Buffer.from(String(s || ''), 'base64url');
const sha256 = (data) => crypto.createHash('sha256').update(data).digest();

// ---------- Chhota CBOR padhne wala (WebAuthn me jitna chahiye utna) ----------
function decodeCbor(buf, start) {
  let pos = start || 0;

  const readLen = (info) => {
    if (info < 24) return info;
    if (info === 24) {
      const v = buf[pos];
      pos += 1;
      return v;
    }
    if (info === 25) {
      const v = buf.readUInt16BE(pos);
      pos += 2;
      return v;
    }
    if (info === 26) {
      const v = buf.readUInt32BE(pos);
      pos += 4;
      return v;
    }
    throw new Error('CBOR: badi length');
  };

  const item = (depth) => {
    if (depth > 8 || pos >= buf.length) throw new Error('CBOR: kharab data');
    const first = buf[pos];
    pos += 1;
    const major = first >> 5;
    const info = first & 31;
    if (major === 0) return readLen(info);
    if (major === 1) return -1 - readLen(info);
    if (major === 2) {
      const n = readLen(info);
      if (pos + n > buf.length) throw new Error('CBOR: adhura data');
      const v = buf.subarray(pos, pos + n);
      pos += n;
      return v;
    }
    if (major === 3) {
      const n = readLen(info);
      if (pos + n > buf.length) throw new Error('CBOR: adhura data');
      const v = buf.toString('utf8', pos, pos + n);
      pos += n;
      return v;
    }
    if (major === 4) {
      const n = readLen(info);
      if (n > 64) throw new Error('CBOR: bahut bada array');
      const arr = [];
      for (let i = 0; i < n; i += 1) arr.push(item(depth + 1));
      return arr;
    }
    if (major === 5) {
      const n = readLen(info);
      if (n > 64) throw new Error('CBOR: bahut bada map');
      const map = new Map();
      for (let i = 0; i < n; i += 1) {
        const k = item(depth + 1);
        map.set(k, item(depth + 1));
      }
      return map;
    }
    if (major === 7) {
      if (info === 20) return false;
      if (info === 21) return true;
      if (info === 22 || info === 23) return null;
    }
    throw new Error('CBOR: ye type samajh nahi aaya');
  };

  const value = item(0);
  return { value, end: pos };
}

// ---------- authenticatorData ----------
function parseAuthData(authData, expectCredential) {
  if (authData.length < 37) throw new Error('authData chhota hai');
  const out = {
    rpIdHash: authData.subarray(0, 32),
    flags: authData[32],
    signCount: authData.readUInt32BE(33),
  };
  out.userPresent = !!(out.flags & 0x01);
  out.userVerified = !!(out.flags & 0x04);
  const hasCred = !!(out.flags & 0x40);

  if (expectCredential) {
    if (!hasCred || authData.length < 55) throw new Error('Credential data nahi mila');
    const idLen = authData.readUInt16BE(53);
    if (idLen < 16 || idLen > 1023 || 55 + idLen > authData.length) throw new Error('Credential ID sahi nahi hai');
    out.credentialId = authData.subarray(55, 55 + idLen);
    const cose = decodeCbor(authData, 55 + idLen);
    out.coseKey = cose.value;
  }
  return out;
}

// COSE public key -> Node ka JWK. Sirf ES256 (-7) aur RS256 (-257)
function coseToJwk(cose) {
  if (!(cose instanceof Map)) throw new Error('Public key sahi nahi hai');
  const kty = cose.get(1);
  const alg = cose.get(3);

  if (kty === 2 && alg === -7) {
    const crv = cose.get(-1);
    const x = cose.get(-2);
    const y = cose.get(-3);
    if (crv !== 1 || !Buffer.isBuffer(x) || !Buffer.isBuffer(y) || x.length !== 32 || y.length !== 32) {
      throw new Error('Public key sahi nahi hai');
    }
    return { jwk: { kty: 'EC', crv: 'P-256', x: b64u(x), y: b64u(y) }, alg: -7 };
  }
  if (kty === 3 && alg === -257) {
    const n = cose.get(-1);
    const e = cose.get(-2);
    if (!Buffer.isBuffer(n) || !Buffer.isBuffer(e) || n.length < 128) throw new Error('Public key sahi nahi hai');
    return { jwk: { kty: 'RSA', n: b64u(n), e: b64u(e) }, alg: -257 };
  }
  throw new Error('Is phone ka lock type abhi supported nahi hai');
}

function parseClientData(clientDataJSON, expectedType, expectedChallenge) {
  let cd;
  try {
    cd = JSON.parse(Buffer.from(clientDataJSON).toString('utf8'));
  } catch {
    throw new Error('clientData sahi nahi hai');
  }
  if (cd.type !== expectedType) throw new Error('Galat type');
  if (!cd.challenge || cd.challenge !== expectedChallenge) throw new Error('Challenge match nahi hua');
  let host;
  try {
    const u = new URL(cd.origin);
    host = u.hostname;
    const local = host === 'localhost' || host === '127.0.0.1';
    if (u.protocol !== 'https:' && !local) throw new Error('x');
  } catch {
    throw new Error('Origin sahi nahi hai');
  }
  return { origin: cd.origin, host };
}

// Naya lock jodte waqt: phone ne jo bheja use jaanchna
function verifyRegistration({ clientDataJSON, attestationObject, challenge, rpId }) {
  const cd = parseClientData(clientDataJSON, 'webauthn.create', challenge);
  if (cd.host !== rpId) throw new Error('Site ka naam match nahi hua');

  const att = decodeCbor(attestationObject, 0).value;
  if (!(att instanceof Map) || !Buffer.isBuffer(att.get('authData'))) throw new Error('attestation sahi nahi hai');

  const auth = parseAuthData(att.get('authData'), true);
  if (!auth.rpIdHash.equals(sha256(rpId))) throw new Error('Site ka naam match nahi hua');
  if (!auth.userPresent) throw new Error('Phone ne user ko check nahi kiya');
  if (!auth.userVerified) throw new Error('Fingerprint/face/PIN se verify nahi hua');

  const key = coseToJwk(auth.coseKey);
  return {
    credentialId: b64u(auth.credentialId),
    publicKeyJwk: key.jwk,
    alg: key.alg,
    signCount: auth.signCount,
  };
}

// Attendance se pehle: phone ne sach me fingerprint/face se confirm kiya?
function verifyAuthentication({ clientDataJSON, authenticatorData, signature, challenge, credential }) {
  const cd = parseClientData(clientDataJSON, 'webauthn.get', challenge);
  if (cd.host !== credential.rpId) throw new Error('Site ka naam match nahi hua');

  const authData = Buffer.from(authenticatorData);
  const auth = parseAuthData(authData, false);
  if (!auth.rpIdHash.equals(sha256(credential.rpId))) throw new Error('Site ka naam match nahi hua');
  if (!auth.userPresent || !auth.userVerified) throw new Error('Fingerprint/face/PIN se verify nahi hua');

  const signed = Buffer.concat([authData, sha256(Buffer.from(clientDataJSON))]);
  const key = crypto.createPublicKey({ key: credential.publicKeyJwk, format: 'jwk' });
  const ok = crypto.verify('sha256', signed, key, Buffer.from(signature));
  if (!ok) throw new Error('Signature match nahi hua');

  // Counter peeche gaya ho to phone ki copy bani ho sakti hai
  if ((credential.signCount || 0) > 0 && auth.signCount > 0 && auth.signCount <= credential.signCount) {
    throw new Error('Phone ka counter galat hai');
  }
  return { signCount: auth.signCount };
}

module.exports = { b64u, fromB64u, sha256, decodeCbor, verifyRegistration, verifyAuthentication };