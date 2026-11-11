const Announcement = require('../models/Announcement');
const Subject = require('../models/Subject');
const { notifyClass } = require('../utils/push');
const { logEvent } = require('../utils/audit');

const clean = (v, max) => String(v === undefined || v === null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
// Message me nayi line rehne deti hai, par bahut zyada khali lines nahi
const cleanMessage = (v) =>
  String(v === undefined || v === null ? '' : v)
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 600);

const view = (a) => ({
  id: a._id,
  title: a.title,
  message: a.message,
  subject: a.subjectName,
  teacher: a.teacherName,
  department: a.department,
  semester: a.semester,
  createdAt: a.createdAt,
});

// POST /api/announcements   body: { subjectId, title, message }   (teacher)
exports.createAnnouncement = async (req, res) => {
  try {
    const title = clean(req.body.title, 80);
    const message = cleanMessage(req.body.message);
    if (!req.body.subjectId || typeof req.body.subjectId !== 'string') {
      return res.status(400).json({ message: 'Subject chuno' });
    }
    if (title.length < 2) return res.status(400).json({ message: 'Title likho (kam se kam 2 akshar)' });
    if (message.length < 2) return res.status(400).json({ message: 'Message likho' });

    const subject = await Subject.findById(req.body.subjectId);
    if (!subject) return res.status(404).json({ message: 'Subject nahi mila' });
    if (String(subject.teacher) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Ye subject tumhara nahi hai' });
    }

    const a = await Announcement.create({
      teacher: req.user._id,
      teacherName: req.user.name,
      subject: subject._id,
      subjectName: subject.name,
      department: subject.department,
      semester: subject.semester,
      title,
      message,
    });

    // Students ke phone par notification (piche chalta hai)
    notifyClass(subject.department, subject.semester, {
      title: subject.name + ': ' + title,
      body: message.replace(/\n/g, ' '),
      url: '/student',
      tag: 'ann-' + a._id,
      ttl: 24 * 60 * 60,
    }).catch(() => {});

    logEvent('announcement', req.user.name + ' posted an announcement for ' + subject.name + ': ' + title, { req });
    res.status(201).json({ message: 'Announcement bhej di', announcement: view(a) });
  } catch (err) {
    res.status(400).json({ message: 'Subject ID sahi nahi hai' });
  }
};

// GET /api/announcements/mine   (teacher) -> apne bheje hue
exports.getMine = async (req, res) => {
  try {
    const rows = await Announcement.find({ teacher: req.user._id }).sort({ createdAt: -1 }).limit(20).lean();
    res.json({ announcements: rows.map(view) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/announcements/:id   (teacher)
exports.deleteAnnouncement = async (req, res) => {
  try {
    const r = await Announcement.deleteOne({ _id: req.params.id, teacher: req.user._id });
    if (r.deletedCount === 0) return res.status(404).json({ message: 'Announcement nahi mili' });
    res.json({ message: 'Announcement hata di' });
  } catch (err) {
    res.status(400).json({ message: 'ID sahi nahi hai' });
  }
};

// GET /api/announcements   (student) -> apni class ke
exports.getForStudent = async (req, res) => {
  try {
    const rows = await Announcement.find({
      department: req.user.department,
      semester: req.user.semester,
    })
      .sort({ createdAt: -1 })
      .limit(15)
      .lean();
    res.json({ announcements: rows.map(view) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};