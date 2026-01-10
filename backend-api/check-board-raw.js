const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/muralia');
    const board = await mongoose.connection.db.collection('tableros').findOne({ _id: 'tablero_1767960632671_6rg' });
    console.log('BOARD_IN_DB:', JSON.stringify(board, null, 2));
    process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
