const SecurityLog = require('../models/SecurityLog');

// Security / audit log likhta hai. Ye piche chalta hai, isliye kabhi request ko slow ya fail nahi karta.
// opts: { level: 'info' | 'warn', req, actor, meta }
function logEvent(type, message, opts) {
  try {
    const o = opts || {};
    const who = o.actor || (o.req && o.req.user) || null;
    SecurityLog.create({
      type,
      level: o.level || 'info',
      message,
      actor: who ? who._id : undefined,
      actorName: who ? who.name : undefined,
      actorRole: who ? who.role : undefined,
      ip: o.req ? o.req.ip : undefined,
      meta: o.meta,
    }).catch(() => {});
  } catch {
    // log na likh paye to koi baat nahi
  }
}

module.exports = { logEvent };