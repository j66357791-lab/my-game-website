// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    points: {
        type: Number,
        default: 1000
    },
    role: {
        type: String,
        enum: ['user', 'merchant', 'admin'], // 🔧 关键修复：添加 merchant 角色
        default: 'user'
    },
    active: {
        type: Boolean,
        default: true
    },
    merchantData: { // 🔧 关键修复：添加商人数据字段
        appointedAt: { type: Date },
        appointedBy: { type: String },
        totalEarned: { type: Number, default: 0 },
        totalTransfers: { type: Number, default: 0 }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// 密码加密中间件
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// 密码比较方法
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
