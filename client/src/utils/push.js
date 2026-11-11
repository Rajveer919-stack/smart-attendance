import api from '../api/axios';

// Phone par notification (class shuru, announcement). Ye sirf live site par chalta hai,
// kyunki localhost par service worker band rakha gaya hai.

const toKey = (b64u) => {
  const pad = '='.repeat((4 - (b64u.length % 4)) % 4);
  const bin = atob((b64u + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
};

const isLocal = () => location.hostname === 'localhost' || location.hostname === '127.0.0.1';

export const pushSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window &&
  window.isSecureContext &&
  !isLocal();

// iPhone par pehle app ko Home Screen par add karna padta hai
export const needsInstallOnIphone = () => {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  return ios && !standalone;
};

const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(null), ms))]);

async function getRegistration() {
  return withTimeout(navigator.serviceWorker.ready, 8000);
}

// 'unsupported' | 'blocked' | 'on' | 'off'
export async function getPushState() {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  if (Notification.permission !== 'granted') return 'off';
  try {
    const reg = await getRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    return sub ? 'on' : 'off';
  } catch {
    return 'off';
  }
}

// Is device ka notification address abhi login hue user ke naam par save karo
export async function syncPush() {
  try {
    const reg = await getRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (sub) await api.post('/push/subscribe', { subscription: sub.toJSON() });
  } catch {
    // koi baat nahi, agli baar
  }
}

export async function enablePush() {
  const { data: k } = await api.get('/push/key');
  if (!k.enabled) throw new Error('Server par notification abhi chalu nahi hai');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification ki permission nahi mili. Browser settings me allow karo');
  }

  const reg = await getRegistration();
  if (!reg) throw new Error('App abhi taiyaar nahi hai. Page refresh karke dobara koshish karo');

  const options = { userVisibleOnly: true, applicationServerKey: toKey(k.publicKey) };
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe(options);
    } catch (err) {
      if (err && err.name === 'InvalidStateError') {
        const old = await reg.pushManager.getSubscription();
        if (old) await old.unsubscribe();
        sub = await reg.pushManager.subscribe(options);
      } else {
        throw err;
      }
    }
  }
  await api.post('/push/subscribe', { subscription: sub.toJSON() });
}

export async function disablePush() {
  const reg = await getRegistration();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (sub) {
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    try {
      await api.post('/push/unsubscribe', { endpoint });
    } catch {
      // server par rehne do, agli push par apne aap hat jayega
    }
  }
}