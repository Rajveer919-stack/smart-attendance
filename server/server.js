require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { securityHeaders, sanitize, apiLimiter, checkEnv } = require('./middleware/security');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
const isProd = process.env.NODE_ENV === 'production';
const clientDist = path.join(__dirname, '..', 'client', 'dist');

checkEnv();

// Security headers sabse pehle (website aur API dono ke jawab par lagte hai)
app.use(securityHeaders);
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
// Bahut bada data bhej kar server girane ki koshish rokne ke liye limit
app.use(express.json({ limit: '100kb' }));
// MongoDB injection (jaise {"$gt": ""}) wale keys hata do
app.use(sanitize);
// Ek IP se bahut zyada requests par roak
app.use('/api', apiLimiter);

// Deploy hone par built frontend yahin se dikhega
if (isProd) {
  // dotfiles: allow, taki /.well-known/assetlinks.json (Play Store ke liye) bhi mil sake
  app.use(
    express.static(clientDist, {
      dotfiles: 'allow',
      setHeaders: (res, filePath) => {
        // Service worker aur manifest hamesha naye milne chahiye
        if (/(sw\.js|manifest\.webmanifest)$/.test(filePath)) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    })
  );
} else {
  app.get('/', (req, res) => {
    res.json({ message: 'Smart Attendance API chal raha hai' });
  });
}

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/subjects', require('./routes/subjectRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/sessions', require('./routes/sessionRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/security', require('./routes/securityRoutes'));
app.use('/api/announcements', require('./routes/announcementRoutes'));
app.use('/api/push', require('./routes/pushRoutes'));
app.use('/api/bio', require('./routes/bioRoutes'));

// Jo API exist nahi karti uska saaf jawab
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Ye API nahi mili' });
});

// /api ke alawa baaki saare links frontend (React) ko jayenge
if (isProd) {
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Koi bhi error ho, server ka andar ka raaz (stack) bahar nahi jata
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Data bahut bada hai' });
  }
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Data sahi format me nahi hai' });
  }
  console.error(err);
  res.status(500).json({ message: 'Server me kuch gadbad ho gayi. Thodi der baad try karo' });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});