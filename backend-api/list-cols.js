const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/muralia');
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('COLLECTIONS:', collections.map(c => c.name));
    process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
