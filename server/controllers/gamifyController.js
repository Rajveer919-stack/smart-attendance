const Subject = require('../models/Subject');
const Session = require('../models/Session');
const Attendance = require('../models/Attendance');

const EARLY_MS = 5 * 60 * 1000; // class shuru hone ke 5 minute ke andar attendance = "samay ka paabandi"

// Badge ki list: metric ka naam aur kitna chahiye
const BADGES = [
  { key: 'first', title: 'Pehla Kadam', desc: 'Pehli class attend ki', metric: 'attended', target: 1 },
  { key: 'streak5', title: 'Lagatar 5', desc: 'Bina chhode 5 class', metric: 'best', target: 5 },
  { key: 'streak10', title: 'Lagatar 10', desc: 'Bina chhode 10 class', metric: 'best', target: 10 },
  { key: 'streak25', title: 'Lagatar 25', desc: 'Bina chhode 25 class', metric: 'best', target: 25 },
  { key: 'classes50', title: '50 Class', desc: 'Kul 50 class attend ki', metric: 'attended', target: 50 },
  { key: 'classes100', title: '100 Class', desc: 'Kul 100 class attend ki', metric: 'attended', target: 100 },
  { key: 'early10', title: 'Samay ke Paabandi', desc: '10 baar class shuru hote hi attendance', metric: 'early', target: 10 },
  { key: 'perfect', title: 'Pura Subject', desc: 'Kisi subject me 10+ class aur ek bhi miss nahi', metric: 'perfect', target: 1 },
  { key: 'ninety', title: '90% Club', desc: '20+ class me 90% ya zyada attendance', metric: 'ninety', target: 1 },
];

// sessions: [{ _id, subject, startTime, isActive }] purani se nayi
// present: Map(sessionId -> markedAt Date)
// Chal rahi class jo abhi marked nahi hai, use ginti me nahi lete (abhi lag sakti hai)
function computeGamify(sessions, present) {
  const list = sessions.filter((s) => !s.isActive || present.has(String(s._id)));
  let cur = 0;
  let best = 0;
  let attended = 0;
  let early = 0;
  const per = new Map();
  list.forEach((s) => {
    const id = String(s._id);
    const sub = String(s.subject);
    if (!per.has(sub)) per.set(sub, { total: 0, got: 0 });
    const p = per.get(sub);
    p.total += 1;
    if (present.has(id)) {
      cur += 1;
      attended += 1;
      p.got += 1;
      if (cur > best) best = cur;
      const at = new Date(present.get(id)).getTime();
      const st = new Date(s.startTime).getTime();
      if (at >= st && at - st <= EARLY_MS) early += 1;
    } else {
      cur = 0;
    }
  });
  const total = list.length;
  const percentage = total > 0 ? Math.round((attended / total) * 1000) / 10 : 0;
  let perfect = 0;
  per.forEach((p) => {
    if (p.total >= 10 && p.got === p.total) perfect += 1;
  });
  const ninety = total >= 20 && percentage >= 90 ? 1 : 0;

  const values = { attended, best, early, perfect, ninety };
  const badges = BADGES.map((b) => {
    const value = values[b.metric];
    return {
      key: b.key,
      title: b.title,
      desc: b.desc,
      earned: value >= b.target,
      value: Math.min(value, b.target),
      target: b.target,
    };
  });

  // Agla lakshya: jo badge sabse paas ho (90% club chhodkar, uska progress alag tarah ka hai)
  const open = badges.filter((b) => !b.earned && b.key !== 'ninety');
  open.sort((a, b) => b.value / b.target - a.value / a.target);
  const next = open[0] || null;

  return {
    stats: { current: cur, best, attended, total, percentage, early, perfect },
    badges,
    earnedCount: badges.filter((b) => b.earned).length,
    next,
  };
}

// GET /api/gamify/me   (student)
exports.getMyGamify = async (req, res) => {
  try {
    const u = req.user;
    const empty = computeGamify([], new Map());
    if (!u.department || !u.semester) return res.json(empty);

    const subjects = await Subject.find({ department: u.department, semester: u.semester }).select('_id').lean();
    const subjectIds = subjects.map((s) => s._id);
    if (subjectIds.length === 0) return res.json(empty);

    const sessions = await Session.find({ subject: { $in: subjectIds } })
      .select('_id subject startTime isActive')
      .sort({ startTime: 1 })
      .limit(5000)
      .lean();
    const rows = await Attendance.find({
      student: u._id,
      status: 'present',
      session: { $in: sessions.map((s) => s._id) },
    })
      .select('session markedAt')
      .lean();
    const present = new Map(rows.map((r) => [String(r.session), r.markedAt]));

    res.json(computeGamify(sessions, present));
  } catch (err) {
    res.status(500).json({ message: 'Badges load nahi hue' });
  }
};

exports.computeGamify = computeGamify;