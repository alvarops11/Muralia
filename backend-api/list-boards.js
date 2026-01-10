const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/muralia');
    const boards = await mongoose.connection.db.collection('tableros').find({}).toArray();
    console.log('BOARDS:', boards.map(b => ({ id: b._id, title: b.titulo })));
    process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
