const mongoose = require('mongoose');

const eggSchema = new mongoose.Schema({
    familyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Family',
        required: true
    },
    chickenId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chicken',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    collected: {
        type: Boolean,
        default: false
    },
    collectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    collectedAt: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Egg', eggSchema);
