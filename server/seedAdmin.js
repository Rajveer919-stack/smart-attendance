// Pehla admin account banane ke liye ek baar chalao:  node seedAdmin.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const email = 'admin@college.com';
    const exists = await User.findOne({ email });
    if (exists) {
      console.log('Admin pehle se bana hua hai:', email);
    } else {
      await User.create({
        name: 'Admin',
        email,
        password: 'admin123',
        role: 'admin',
      });
      console.log('Admin ban gaya -> email: admin@college.com, password: admin123');
      console.log('Login ke baad password zaroor badal dena.');
    }
  } catch (err) {
    console.error(err.message);
  } finally {
    await mongoose.disconnect();
  }
})();