const mongoose = require('mongoose');

async function connectDatabase() {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/orbit';
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected');
}

module.exports = connectDatabase;
