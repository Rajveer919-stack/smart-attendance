// Login ka doosra pakka backup (cookie).
// Phone kabhi kabhi app ka saved data (localStorage) mita deta hai (cleaner app, storage kam padna).
// Cookie alag jagah rehti hai, to app khulte hi isse login wapas mil jata hai.
//  - sa_login : asli token. HttpOnly (JavaScript padh nahi sakta), sirf /api/auth par jaati hai
//  - sa_has   : sirf "login saved hai" ka nishan (token nahi), taaki app bekaar request na kare

const LOGIN = 'sa_login';
const MARK = 'sa_has';
const YEAR = 365 * 24 * 60 * 60; // seconds

function readCookie(req, name) {
  const raw = String((req.headers && req.headers.cookie) || '');
  const parts = raw.split(';');
  for (let i = 0; i < parts.length; i += 1) {
    const p = parts[i].trim();
    const eq = p.indexOf('=');
    if (eq > 0 && p.slice(0, eq) === name) {
      try {
        return decodeURIComponent(p.slice(eq + 1));
      } catch {
        return '';
      }
    }
  }
  return '';
}

function addCookies(res, list) {
  const old = res.getHeader('Set-Cookie');
  const base = old ? (Array.isArray(old) ? old : [String(old)]) : [];
  res.setHeader('Set-Cookie', base.concat(list));
}

function secureFlag(req) {
  return req.secure || String((req.headers && req.headers['x-forwarded-proto']) || '').split(',')[0].trim() === 'https'
    ? '; Secure'
    : '';
}

function setLoginCookie(req, res, token) {
  const sec = secureFlag(req);
  addCookies(res, [
    LOGIN + '=' + encodeURIComponent(token) + '; Max-Age=' + YEAR + '; Path=/api/auth; HttpOnly; SameSite=Strict' + sec,
    MARK + '=1; Max-Age=' + YEAR + '; Path=/; SameSite=Strict' + sec,
  ]);
}

function clearLoginCookie(req, res) {
  const sec = secureFlag(req);
  addCookies(res, [
    LOGIN + '=; Max-Age=0; Path=/api/auth; HttpOnly; SameSite=Strict' + sec,
    MARK + '=; Max-Age=0; Path=/; SameSite=Strict' + sec,
  ]);
}

// Login / register ke jawab me token jaye to uski cookie bhi laga do (controller badalne ki zarurat nahi)
function cookieOnToken(req, res, next) {
  const orig = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode < 400 && body && typeof body.token === 'string') setLoginCookie(req, res, body.token);
    return orig(body);
  };
  next();
}

// Saved cookie se token nikaal kar "Bearer" header bana do, phir normal protect chalega
function fromCookie(req, res, next) {
  const token = readCookie(req, LOGIN);
  if (!token) {
    clearLoginCookie(req, res);
    return res.status(401).json({ message: 'Saved login nahi mila' });
  }
  req.headers.authorization = 'Bearer ' + token;
  req.restoredToken = token;
  const orig = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode === 401) clearLoginCookie(req, res); // kharab/purana token: cookie hata do
    return orig(body);
  };
  next();
}

// Pehle se login log (jinke paas cookie nahi hai): /me par unke token ki cookie bhi laga do.
// protect ke baad lagta hai, to token pakka sahi hota hai.
function backupCookie(req, res, next) {
  if (readCookie(req, MARK) !== '1') {
    const h = String(req.headers.authorization || '');
    if (h.startsWith('Bearer ')) setLoginCookie(req, res, h.slice(7).trim());
  }
  next();
}

module.exports = { readCookie, setLoginCookie, clearLoginCookie, cookieOnToken, fromCookie, backupCookie };