const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/muralia');
    const board = await mongoose.connection.db.collection('tableros').findOne({ _id: 'tablero_1767958885535_m4r' });
    console.log('BOARD_DATA:', JSON.stringify(board, null, 2));
    process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
