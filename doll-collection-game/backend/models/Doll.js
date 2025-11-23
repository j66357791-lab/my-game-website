// backend/models/Doll.js
const mongoose = require('mongoose');

const dollSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    level: {
        type: Number,
        required: true,
        enum: [1, 2, 3]
    },
    price: {
        type: Number,
        required: true
    },
    purchaseDate: {
        type: Date,
        default: Date.now
    },
    lifespan: {
        type: Number,
        required: true
    },
    remainingDays: {
        type: Number,
        required: true
    },
    dailyIncome: {
        type: Number,
        required: true
    },
    active: {
        type: Boolean,
        default: true
    }
});

module.exports = mongoose.model('Doll', dollSchema);