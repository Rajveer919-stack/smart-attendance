// Email asli hai ya nahi, ye bhejne se PEHLE check karta hai (OTP tabhi jayega jab ye pass ho).
// 1) Sahi banavat  2) Fake / temporary email sites  3) Aam galtiyan (gmial.com)
// 4) Gmail ke apne niyam  5) Domain par email lene wala server (MX) sach me hai ya nahi
// Dhyan: kisi ka inbox sach me hai ya nahi, ye bina email bheje koi nahi bata sakta.
// Wo OTP se hi pakka hota hai (OTP na daale to account banta hi nahi).

const dns = require('dns').promises;

const DISPOSABLE = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamailblock.com',
  'sharklasers.com', 'grr.la', 'spam4.me', '10minutemail.com', '10minutemail.net', '20minutemail.com',
  'tempmail.com', 'temp-mail.org', 'temp-mail.io', 'tempmail.net', 'tempmailo.com', 'tempail.com',
  'throwawaymail.com', 'trashmail.com', 'trashmail.net', 'trashmail.de', 'yopmail.com', 'yopmail.fr',
  'yopmail.net', 'getnada.com', 'nada.email', 'maildrop.cc', 'mailnesia.com', 'mailcatch.com',
  'dispostable.com', 'fakeinbox.com', 'fakemail.net', 'fake-mail.net', 'emailondeck.com', 'mohmal.com',
  'moakt.com', 'mytemp.email', 'burnermail.io', 'mintemail.com', 'spamgourmet.com', 'tmail.ws',
  'tmpmail.org', 'tmpmail.net', 'inboxkitten.com', 'mailtemp.net', 'discard.email', 'discardmail.com',
  'dropmail.me', 'emailfake.com', 'email-fake.com', 'crazymailing.com', 'luxusmail.org', 'harakirimail.com',
  'jetable.org', 'getairmail.com', 'anonbox.net', 'mail.tm', 'tempinbox.com', 'owlymail.com', 'wegwerfmail.de',
  'byom.de', 'einrot.com', 'cuvox.de', 'gustr.com', 'armyspy.com', 'dayrep.com', 'rhyta.com', 'teleworm.us',
  'superrito.com', 'fleckens.hu', 'jourrapide.com', 'example.com', 'example.org', 'example.net',
]);

// Aam galat spelling -> sahi domain
const TYPOS = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com', 'gmaill.com': 'gmail.com', 'gmeil.com': 'gmail.com', 'gnail.com': 'gmail.com',
  'gmail.cm': 'gmail.com', 'gmail.om': 'gmail.com', 'gmali.com': 'gmail.com', 'gmil.com': 'gmail.com',
  'gmail.comm': 'gmail.com', 'gmail.in': 'gmail.com', 'ggmail.com': 'gmail.com', 'gmaul.com': 'gmail.com',
  'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'yahoo.co': 'yahoo.com', 'yahoo.con': 'yahoo.com',
  'yhoo.com': 'yahoo.com', 'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmail.con': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outlook.con': 'outlook.com', 'outllok.com': 'outlook.com',
  'iclod.com': 'icloud.com', 'icloud.con': 'icloud.com',
};

const LOCAL_RE = /^[a-z0-9]+([._%+-][a-z0-9]+)*$/; // . _ % + - ke beech me akshar/ank hone chahiye
const LABEL_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

// Sirf banavat dekhta hai (internet nahi). { ok } ya { ok:false, message }
function checkFormat(email) {
  const e = String(email || '').trim().toLowerCase();
  const bad = { ok: false, message: 'Sahi email daalo (jaise name@gmail.com)' };
  if (!e || e.length > 254 || /\s/.test(e)) return bad;
  const at = e.indexOf('@');
  if (at < 1 || at !== e.lastIndexOf('@')) return bad;
  const local = e.slice(0, at);
  const domain = e.slice(at + 1);
  if (local.length > 64 || !LOCAL_RE.test(local)) return bad;
  const labels = domain.split('.');
  if (labels.length < 2 || !labels.every((l) => LABEL_RE.test(l))) return bad;
  const tld = labels[labels.length - 1];
  if (!/^[a-z]{2,24}$/.test(tld)) return bad;

  if (DISPOSABLE.has(domain)) {
    return { ok: false, message: 'Temporary / fake email nahi chalega. Apna asli email daalo' };
  }
  if (TYPOS[domain]) {
    return { ok: false, message: 'Email me galti lag rahi hai. Kya tumhara matlab ' + local + '@' + TYPOS[domain] + ' hai?' };
  }
  // Gmail ka username 6 se 30 akshar, sirf a-z, 0-9 aur dot ho sakta hai (+ ke baad alias chalta hai)
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    const base = local.split('+')[0];
    if (!/^[a-z0-9.]{6,30}$/.test(base) || base.startsWith('.') || base.endsWith('.')) {
      return { ok: false, message: 'Ye Gmail address sahi nahi hai. Gmail ka naam 6 se 30 akshar ka hota hai (a-z, 0-9, dot)' };
    }
  }
  return { ok: true, email: e, domain };
}

// Domain ke paas email lene wala server hai ya nahi (DNS MX). Natija thodi der yaad rehta hai
const cache = new Map(); // domain -> { ok, until }
const withTimeout = (p, ms) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('timeout'), { code: 'ETIMEOUT' })), ms))]);

async function domainAcceptsMail(domain) {
  const hit = cache.get(domain);
  if (hit && hit.until > Date.now()) return hit.ok;

  let ok;
  try {
    const mx = await withTimeout(dns.resolveMx(domain), 4000);
    ok = Array.isArray(mx) && mx.some((m) => m.exchange && m.exchange !== '.'); // "." = ye domain email leta hi nahi
  } catch (err) {
    if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') {
      // MX nahi, to purane niyam ke hisaab se A record dekho
      try {
        const a = await withTimeout(dns.resolve4(domain), 4000);
        ok = Array.isArray(a) && a.length > 0;
      } catch (err2) {
        if (err2.code === 'ENOTFOUND' || err2.code === 'ENODATA') ok = false;
        else return true; // DNS me dikkat: andaza mat lagao, user ko mat roko
      }
    } else {
      return true; // DNS me dikkat (timeout, server down): user ko mat roko
    }
  }
  cache.set(domain, { ok, until: Date.now() + (ok ? 6 * 3600 * 1000 : 10 * 60 * 1000) });
  if (cache.size > 2000) cache.clear();
  return ok;
}

// Sab check ek saath. { ok:true, email } ya { ok:false, message }
async function checkEmail(email) {
  const f = checkFormat(email);
  if (!f.ok) return f;
  if (!(await domainAcceptsMail(f.domain))) {
    return { ok: false, message: 'Is email ka domain (' + f.domain + ') asli nahi lag raha. Email dobara check karo' };
  }
  return { ok: true, email: f.email };
}

module.exports = { checkEmail, checkFormat, domainAcceptsMail };