const PushSub = require('../models/PushSub');
const VapidKey = require('../models/VapidKey');
const User = require('../models/User');

// web-push package install na ho to bhi server chalta rahega, bas notification band rahegi
let webpush = null;
try {
  webpush = require('web-push');
} catch {
  console.warn('web-push install nahi hai, isliye notification band hai. Server folder me: npm install web-push');
}

let ready = null;

// Chabhi (VAPID) taiyaar karta hai. Pehle env dekhta hai, nahi mile to database me banata/padhta hai
function init() {
  if (!webpush) return Promise.resolve(null);
  if (ready) return ready;
  ready = (async () => {
    let publicKey = process.env.VAPID_PUBLIC_KEY;
    let privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) {
      let doc = await VapidKey.findOne({ key: 'main' }).lean();
      if (!doc) {
        const k = webpush.generateVAPIDKeys();
        try {
          doc = await VapidKey.create({ key: 'main', publicKey: k.publicKey, privateKey: k.privateKey });
        } catch {
          // dusre server ne pehle bana di
          doc = await VapidKey.findOne({ key: 'main' }).lean();
        }
      }
      publicKey = doc.publicKey;
      privateKey = doc.privateKey;
    }
    const client = process.env.CLIENT_URL || '';
    const subject = process.env.VAPID_SUBJECT || (client.startsWith('https://') ? client : 'mailto:attendance@example.com');
    webpush.setVapidDetails(subject, publicKey, privateKey);
    return { publicKey };
  })().catch((err) => {
    ready = null;
    console.error('Push setup fail:', err.message);
    return null;
  });
  return ready;
}

// Sirf asli browser push services ke address chalenge (koi bhi URL daal kar server se request nahi karwa sakta)
const HOSTS = [
  /(^|\.)fcm\.googleapis\.com$/,
  /(^|\.)android\.googleapis\.com$/,
  /(^|\.)push\.services\.mozilla\.com$/,
  /(^|\.)notify\.windows\.com$/,
  /(^|\.)push\.apple\.com$/,
];
function validEndpoint(endpoint) {
  try {
    const u = new URL(String(endpoint));
    return u.protocol === 'https:' && endpoint.length <= 1200 && HOSTS.some((re) => re.test(u.hostname));
  } catch {
    return false;
  }
}

// Kuch users ko notification bhejta hai. Jawab ka intezaar nahi karna, ye piche chalta hai
async function notifyUsers(userIds, payload) {
  const result = { sent: 0, failed: 0 };
  try {
    if (!userIds || userIds.length === 0) return result;
    const cfg = await init();
    if (!cfg) return result;

    const subs = await PushSub.find({ user: { $in: userIds } }).lean();
    const body = JSON.stringify({
      title: String(payload.title || 'Smart Attendance').slice(0, 80),
      body: String(payload.body || '').slice(0, 200),
      url: payload.url || '/',
      tag: payload.tag,
    });
    const options = { TTL: payload.ttl || 300, urgency: 'high' };
    const dead = [];

    for (let i = 0; i < subs.length; i += 20) {
      const chunk = subs.slice(i, i + 20);
      await Promise.all(
        chunk.map(async (s) => {
          try {
            await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, body, options);
            result.sent += 1;
          } catch (err) {
            result.failed += 1;
            if (err && (err.statusCode === 404 || err.statusCode === 410)) dead.push(s._id);
          }
        })
      );
    }
    if (dead.length) await PushSub.deleteMany({ _id: { $in: dead } });
  } catch (err) {
    console.error('Push bhejne me dikkat:', err.message);
  }
  return result;
}

// Kisi class (department + semester) ke saare students ko
async function notifyClass(department, semester, payload) {
  try {
    const students = await User.find({ role: 'student', department, semester }).select('_id').lean();
    return await notifyUsers(students.map((s) => s._id), payload);
  } catch {
    return { sent: 0, failed: 0 };
  }
}

module.exports = { init, validEndpoint, notifyUsers, notifyClass, pushAvailable: () => !!webpush };