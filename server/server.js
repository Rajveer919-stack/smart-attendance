require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
app.set('trust proxy', 1);
const isProd = process.env.NODE_ENV === 'production';
const clientDist = path.join(__dirname, '..', 'client', 'dist');

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

// Deploy hone par built frontend yahin se dikhega
if (isProd) {
  app.use(express.static(clientDist));
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

// /api ke alawa baaki saare links frontend (React) ko jayenge
if (isProd) {
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});