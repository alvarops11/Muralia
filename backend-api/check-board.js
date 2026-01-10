const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/muralia');
    const Board = mongoose.model('Board', new mongoose.Schema({}, { strict: false, collection: 'tableros' }));
    const board = await Board.findOne({ _id: 'tablero_1767960632671_6rg' });
    console.log('BOARD_IN_DB:', JSON.stringify(board, null, 2));
    process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
