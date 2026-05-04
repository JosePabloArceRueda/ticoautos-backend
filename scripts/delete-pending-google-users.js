const mongoose = require('mongoose');
const User = require('../src/models/User');

require('dotenv').config();

async function deletePendingGoogleUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const result = await User.deleteMany({
      authProvider: 'google',
      status: 'pending',
    });

    console.log(`✓ Deleted ${result.deletedCount} pending Google users`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

deletePendingGoogleUsers();
