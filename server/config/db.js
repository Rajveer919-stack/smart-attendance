const mongoose = require('mongoose');

// Zyada students ek sath aaye to bhi database ke connections khatam na ho, aur atak jaye to jaldi error mile
const OPTIONS = {
  maxPoolSize: Number(process.env.DB_POOL_SIZE) || 20,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
};

let wired = false;

const connectDB = async () => {
  if (!wired) {
    wired = true;
    mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected (driver khud dobara jodega)'));
    mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected'));
    mongoose.connection.on('error', (e) => console.error('MongoDB error:', e.message));
  }
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, OPTIONS);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;