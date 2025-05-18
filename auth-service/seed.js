const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const User = require('./models/userModel');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const seedAdmin = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const existingAdmin = await User.findOne({ email: 'admin@gmail.com' });
    if (existingAdmin) {
      console.log('Admin already exists.');
      return process.exit(0);
    }

    const hashedPassword = await bcrypt.hash('123456', 10);

    const adminUser = new User({
      fullName: 'Admin',
      email: 'admin@gmail.com',
      passwordHash: '123456',
      role: 'admin',
      addresses: [
        {
          title: 'Admin Home',
          address: 'admin address',
        }
      ]
    });

    const savedUser = await adminUser.save();

    // Set default address
    savedUser.defaultAddress = savedUser.addresses[0]._id;
    await savedUser.save();

    console.log('Admin user seeded successfully.');
  } catch (err) {
    console.error('Error seeding admin user:', err);
  } finally {
    await mongoose.disconnect();
  }
};

seedAdmin();