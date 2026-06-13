const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    title: String,
    location: String,
    date: String,
    description: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Post', postSchema);