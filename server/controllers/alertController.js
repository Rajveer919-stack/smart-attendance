const AlertLog = require('../models/AlertLog');
const { buildSubjectReport, loadSubject } = require('./analyticsController');
const { sendLowAttendanceMail } = require('../utils/mailer');
const { logEvent } = require('../utils/audit');
const { notifyUsers } = require('../utils/push');

// Ek student ko ek subject ki email 3 din me sirf ek baar jayegi
const COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;
// Itni class se pehle percentage ka matlab nahi hota, isliye alert nahi bhejte
const MIN_CLASSES = 3;
// Ek baar me zyada email nahi (Brevo free limit 300/din)
const MAX_PER_RUN = 100;

// Subject ke 75% se kam wale students ko email bhejta hai
async function sendAlertsForSubject(subject, opts) {
  const o = opts || {};
  const r = await buildSubjectReport(subject, null);
  const result = { sent: 0, skipped: 0, failed: 0, noEmail: 0, pushed: 0, atRisk: r.riskStudents.length, tooEarly: false };

  if (r.totalClasses < MIN_CLASSES) {
    result.tooEarly = true;
    return result;
  }

  const risk = r.riskStudents;
  const recent = await AlertLog.find({
    subject: subject._id,
    student: { $in: risk.map((s) => s.studentId) },
    sentAt: { $gte: new Date(Date.now() - COOLDOWN_MS) },
  })
    .select('student')
    .lean();
  const recentSet = new Set(recent.map((a) => String(a.student)));

  let processed = 0;
  for (const s of risk) {
    if (recentSet.has(String(s.studentId))) {
      result.skipped += 1;
      continue;
    }
    if (processed >= MAX_PER_RUN) {
      result.skipped += 1;
      continue;
    }
    processed += 1;
    const need = Math.max(1, 3 * s.totalClasses - 4 * s.attended);
    let handled = false;

    // 1) Email
    if (!s.email) {
      result.noEmail += 1;
    } else {
      try {
        await sendLowAttendanceMail(s.email, {
          name: s.name,
          subjectName: subject.name,
          code: subject.code,
          percentage: s.percentage,
          attended: s.attended,
          total: s.totalClasses,
          need,
        });
        result.sent += 1;
        handled = true;
      } catch (err) {
        result.failed += 1;
      }
    }

    // 2) Phone notification (email na jaye ya mail band ho tab bhi student ko khabar mil jaye)
    try {
      const p = await notifyUsers([s.studentId], {
        title: 'Attendance kam hai: ' + subject.name,
        body: s.percentage + '% hai. 75% ke liye lagatar ' + need + ' class aur attend karo.',
        url: '/student',
        tag: 'low-' + subject._id,
        ttl: 24 * 60 * 60,
      });
      if (p.sent > 0) {
        result.pushed += 1;
        handled = true;
      }
    } catch {
      // notification na gayi to koi baat nahi
    }

    // Cooldown tabhi lagao jab email ya notification me se kuch gaya
    if (handled) {
      await AlertLog.create({ student: s.studentId, subject: subject._id, percentage: s.percentage });
    }
  }

  // Auto alert me teacher ko bhi ek line ki khabar
  if (o.auto && (result.sent > 0 || result.pushed > 0)) {
    notifyUsers([subject.teacher], {
      title: subject.name + ': ' + result.atRisk + ' student 75% se kam',
      body: 'Unhe attendance alert bhej diya gaya hai. Report dekhne ke liye kholo.',
      url: '/teacher/report/' + subject._id,
      tag: 'risk-' + subject._id,
    }).catch(() => {});
  }

  if (result.sent > 0 || result.failed > 0 || result.pushed > 0) {
    logEvent(
      'alert_sent',
      (o.auto ? 'Automatic' : 'Manual') + ' low attendance alert for ' + subject.name + ': ' +
        result.sent + ' emails, ' + result.pushed + ' notifications, ' + result.failed + ' failed',
      { req: o.req, meta: result }
    );
  }
  return result;
}

// POST /api/analytics/subject/:subjectId/alert   (teacher ya admin)
exports.alertLowAttendance = async (req, res) => {
  try {
    const subject = await loadSubject(req, res);
    if (!subject) return;

    const r = await sendAlertsForSubject(subject, { req });

    let message;
    if (r.tooEarly) {
      message = 'Not enough classes yet (at least ' + MIN_CLASSES + ' classes are needed before alerts are sent).';
    } else if (r.atRisk === 0) {
      message = 'No student is below 75%, so no email was sent.';
    } else {
      message =
        'Emails sent: ' + r.sent + ', phone notifications: ' + r.pushed + ', skipped (alerted in the last 3 days): ' + r.skipped +
        ', failed: ' + r.failed + (r.noEmail ? ', no email: ' + r.noEmail : '');
    }
    res.json({ message, ...r });
  } catch (err) {
    res.status(400).json({ message: 'Subject ID sahi nahi hai' });
  }
};

exports.sendAlertsForSubject = sendAlertsForSubject;