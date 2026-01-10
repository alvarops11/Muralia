const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/muralia');
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'usuarios' }));
    const userWithName = await User.findOne({ $or: [{ nombre: { $exists: true } }, { name: { $exists: true } }] });
    console.log('USER_WITH_NAME:', JSON.stringify(userWithName, null, 2));
    process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
