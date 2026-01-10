const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/muralia');
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'usuarios' }));
    const users = await User.find({}).limit(5);
    console.log('USERS_IN_DB:', JSON.stringify(users, null, 2));
    process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
