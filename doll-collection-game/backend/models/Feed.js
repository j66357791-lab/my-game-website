const mongoose = require('mongoose');

const feedSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    growthValue: {
        type: Number,
        required: true,
        min: 0
    },
    description: {
        type: String,
        trim: true
    },
    isSpecial: {
        type: Boolean,
        default: false
    },
    minGrowth: {
        type: Number,
        default: 0
    },
    maxGrowth: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// 特殊饲料的随机成长值
feedSchema.methods.getRandomGrowth = function() {
    if (!this.isSpecial) {
        return this.growthValue;
    }
    
    return Math.floor(Math.random() * (this.maxGrowth - this.minGrowth + 1)) + this.minGrowth;
};

module.exports = mongoose.model('Feed', feedSchema);