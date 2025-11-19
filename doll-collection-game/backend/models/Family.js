const mongoose = require('mongoose');

const familySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    level: {
        type: Number,
        default: 1,
        enum: [1, 2, 3]
    },
    maxChickens: {
        type: Number,
        default: 2
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// 根据等级设置最大小鸡数量
familySchema.methods.updateMaxChickens = function() {
    const maxChickensMap = {
        1: 2,
        2: 10,
        3: 25
    };
    this.maxChickens = maxChickensMap[this.level] || 2;
    return this.save();
};

module.exports = mongoose.model('Family', familySchema);
