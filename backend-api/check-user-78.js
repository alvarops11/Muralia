const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/muralia');
    const user = await mongoose.connection.db.collection('usuarios').findOne({ _id: 'user_78' });
    console.log('USER_78_DATA:', JSON.stringify(user, null, 2));
    process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
