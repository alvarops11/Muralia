const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/muralia');
    const UserCreds = mongoose.model('UserCreds', new mongoose.Schema({}, { strict: false, collection: 'usuariosContrasena' }));
    const creds = await UserCreds.find({}).limit(5);
    console.log('CREDS_IN_DB:', JSON.stringify(creds, null, 2));
    process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
