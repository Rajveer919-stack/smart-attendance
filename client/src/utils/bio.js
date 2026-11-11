import api from '../api/axios';

// Phone ka fingerprint / face / screen-lock (WebAuthn). Asli fingerprint kahin nahi jaata,
// phone sirf "haan, wahi insaan hai" ka signature deta hai.

const toBytes = (b64u) => {
  const pad = '='.repeat((4 - (b64u.length % 4)) % 4);
  const bin = atob((b64u + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
};

const toB64u = (buf) => {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

// Is browser me ye chal sakta hai? (HTTPS ya localhost zaroori)
export const bioSupported = () =>
  typeof window !== 'undefined' &&
  !!window.PublicKeyCredential &&
  !!navigator.credentials &&
  window.isSecureContext;

// Phone me fingerprint/face/PIN lagi hui hai?
export async function bioAvailable() {
  try {
    if (!bioSupported()) return false;
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

// Browser/phone ke error ko saaf Hinglish me badalta hai
export function bioErrorMessage(err) {
  const serverMsg = err && err.response && err.response.data && err.response.data.message;
  if (serverMsg) return serverMsg;
  const name = err && err.name;
  if (name === 'NotAllowedError') return 'Fingerprint/face cancel ho gaya ya time khatam ho gaya. Dobara koshish karo';
  if (name === 'InvalidStateError') return 'Is phone par ye lock pehle se laga hai';
  if (name === 'SecurityError') return 'Is site ke address par lock nahi chal sakta. Asli site kholo';
  if (name === 'NotSupportedError') return 'Is phone me fingerprint/face/screen lock nahi mila';
  return 'Fingerprint/face lock nahi chal paya. Dobara koshish karo';
}

// Lock ON karna (ek baar)
export async function enrollBio() {
  const { data: o } = await api.post('/bio/register-options');
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: toBytes(o.challenge),
      rp: o.rp,
      user: { id: toBytes(o.user.id), name: o.user.name, displayName: o.user.displayName },
      pubKeyCredParams: o.pubKeyCredParams,
      authenticatorSelection: o.authenticatorSelection,
      attestation: 'none',
      timeout: o.timeout,
    },
  });
  const r = cred.response;
  await api.post('/bio/register', {
    clientDataJSON: toB64u(r.clientDataJSON),
    attestationObject: toB64u(r.attestationObject),
    transports: typeof r.getTransports === 'function' ? r.getTransports() : [],
  });
}

// Attendance se pehle taaza fingerprint/face. 2 minute chalne wala "proof" milta hai
export async function getBioProof() {
  const { data: o } = await api.post('/bio/auth-options');
  const cred = await navigator.credentials.get({
    publicKey: {
      challenge: toBytes(o.challenge),
      rpId: o.rpId,
      timeout: o.timeout,
      userVerification: 'required',
      allowCredentials: o.allowCredentials.map((c) => ({
        type: 'public-key',
        id: toBytes(c.id),
        ...(c.transports && c.transports.length ? { transports: c.transports } : {}),
      })),
    },
  });
  const r = cred.response;
  const { data } = await api.post('/bio/verify', {
    id: toB64u(cred.rawId),
    clientDataJSON: toB64u(r.clientDataJSON),
    authenticatorData: toB64u(r.authenticatorData),
    signature: toB64u(r.signature),
  });
  return data.proof;
}

// Attendance lagana. Server bole "pehle fingerprint/face" to wo karwa kar dobara bhejta hai.
// Error hamesha err.response.data.message ke roop me aata hai, taaki purana error code hi chale.
export async function markWithBio(path, body, onBio) {
  try {
    return await api.post(path, body);
  } catch (err) {
    const code = err.response && err.response.data && err.response.data.code;
    if (code !== 'BIO_REQUIRED') throw err;

    let bioProof;
    try {
      if (onBio) onBio();
      bioProof = await getBioProof();
    } catch (bioErr) {
      throw { response: { data: { message: bioErrorMessage(bioErr) } } };
    }
    return api.post(path, { ...body, bioProof });
  }
}