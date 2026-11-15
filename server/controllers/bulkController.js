const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { DEPARTMENTS, parseRoll, parseSemester } = require('../config/classes');
const { checkFormat } = require('../utils/emailCheck');
const { logEvent } = require('../utils/audit');

// Ek baar me kitne student (server chhota hai, isliye seema)
const MAX_ROWS = 200;

// Aise akshar jo aapas me confuse na hon (0/O, 1/l/I nahi)
const PW_CHARS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
function makePassword() {
  let out = '';
  for (let i = 0; i < 8; i += 1) out += PW_CHARS[crypto.randomInt(PW_CHARS.length)];
  return out;
}

const deptByLower = new Map(DEPARTMENTS.map((d) => [d.toLowerCase(), d]));

// POST /api/users/bulk   (sirf admin)
// body: { rows: [{ name, email, rollNo, department, semester, password? }], dryRun?: true }
// dryRun = sirf check karo, kuch banao mat
exports.bulkCreateStudents = async (req, res) => {
  try {
    const rows = Array.isArray(req.body.rows) ? req.body.rows : null;
    const dryRun = !!req.body.dryRun;
    if (!rows || rows.length === 0) return res.status(400).json({ message: 'Koi student row nahi mili' });
    if (rows.length > MAX_ROWS) {
      return res.status(400).json({ message: 'Ek baar me ' + MAX_ROWS + ' se zyada student nahi. File ko hisso me baant do' });
    }

    // ---- 1) Har row ko saaf karke jaancho ----
    const items = rows.map((raw, i) => {
      const r = raw && typeof raw === 'object' ? raw : {};
      const item = { line: i + 2, errors: [] }; // line 1 header hai
      item.name = String(r.name || '').trim().replace(/\s+/g, ' ');
      if (!item.name) item.errors.push('Naam khali hai');
      else if (item.name.length > 60) item.errors.push('Naam bahut lamba hai');

      const mail = checkFormat(r.email);
      if (!mail.ok) item.errors.push(mail.message);
      item.email = mail.ok ? mail.email : String(r.email || '').trim().toLowerCase();

      const dept = deptByLower.get(String(r.department || '').trim().toLowerCase());
      if (!dept) item.errors.push('Department sahi nahi (' + (r.department || 'khali') + ')');
      item.department = dept;

      const sem = parseSemester(r.semester);
      if (!sem) item.errors.push('Semester 1 se 8 hona chahiye');
      item.semester = sem;

      const roll = parseRoll(r.rollNo);
      if (!roll) item.errors.push('Roll number 1 se 300 ke beech hona chahiye');
      item.rollNo = roll;

      const pw = String(r.password || '').trim();
      if (pw && pw.length < 6) item.errors.push('Password kam se kam 6 akshar ka ho');
      item.password = pw;
      return item;
    });

    // ---- 2) File ke andar dohrav ----
    const seenEmail = new Map();
    const seenRoll = new Map();
    items.forEach((it) => {
      if (it.errors.length) return;
      const ek = it.email;
      const rk = it.department + '|' + it.semester + '|' + it.rollNo;
      if (seenEmail.has(ek)) it.errors.push('Ye email file me line ' + seenEmail.get(ek) + ' par bhi hai');
      else seenEmail.set(ek, it.line);
      if (seenRoll.has(rk)) it.errors.push('Is class me ye roll number file me line ' + seenRoll.get(rk) + ' par bhi hai');
      else seenRoll.set(rk, it.line);
    });

    // ---- 3) Database me pehle se maujood ----
    const good = items.filter((it) => it.errors.length === 0);
    if (good.length > 0) {
      const existingEmails = await User.find({ email: { $in: good.map((g) => g.email) } })
        .select('email')
        .lean();
      const emailSet = new Set(existingEmails.map((u) => u.email));
      const existingRolls = await User.find({
        role: 'student',
        $or: good.map((g) => ({ department: g.department, semester: g.semester, rollNo: g.rollNo })),
      })
        .select('department semester rollNo')
        .lean();
      const rollSet = new Set(existingRolls.map((u) => u.department + '|' + u.semester + '|' + u.rollNo));
      good.forEach((g) => {
        if (emailSet.has(g.email)) g.errors.push('Ye email pehle se registered hai');
        if (rollSet.has(g.department + '|' + g.semester + '|' + g.rollNo)) {
          g.errors.push('Is class me ye roll number pehle se kisi ka hai');
        }
      });
    }

    const valid = items.filter((it) => it.errors.length === 0);
    const failed = items
      .filter((it) => it.errors.length > 0)
      .map((it) => ({ line: it.line, name: it.name, email: it.email, reason: it.errors.join('; ') }));

    if (dryRun) {
      return res.json({ dryRun: true, total: items.length, valid: valid.length, failed });
    }

    // ---- 4) Account banao (4-4 ek sath, taaki bcrypt server ko na atkaye) ----
    const created = [];
    for (let i = 0; i < valid.length; i += 4) {
      const chunk = valid.slice(i, i + 4);
      // eslint-disable-next-line no-await-in-loop
      await Promise.all(
        chunk.map(async (it) => {
          const plain = it.password || makePassword();
          try {
            const doc = new User({
              name: it.name,
              email: it.email,
              password: await bcrypt.hash(plain, 10),
              role: 'student',
              department: it.department,
              semester: it.semester,
              rollNo: it.rollNo,
            });
            // Password upar hash ho chuka hai, dobara hash nahi karna
            doc.$locals.skipHash = true;
            await doc.save();
            created.push({
              name: it.name,
              email: it.email,
              rollNo: it.rollNo,
              department: it.department,
              semester: it.semester,
              password: plain,
            });
          } catch (err) {
            failed.push({
              line: it.line,
              name: it.name,
              email: it.email,
              reason: err && err.code === 11000 ? 'Email ya roll number pehle se maujood hai' : 'Save nahi ho paya',
            });
          }
        })
      );
    }

    logEvent('bulk_students', req.user.name + ' uploaded students in bulk: ' + created.length + ' created, ' + failed.length + ' failed', {
      req,
      meta: { created: created.length, failed: failed.length },
    });

    created.sort((a, b) => a.department.localeCompare(b.department) || a.semester - b.semester || a.rollNo - b.rollNo);
    failed.sort((a, b) => a.line - b.line);
    res.status(created.length > 0 ? 201 : 200).json({ total: items.length, createdCount: created.length, created, failed });
  } catch (err) {
    res.status(500).json({ message: 'Bulk upload me dikkat aayi. Thodi der baad try karo' });
  }
};