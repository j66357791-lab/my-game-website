const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true }, // URL友好标识
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null }, // 父级ID，null为顶级
  icon: { type: String, default: '' }, // 图标URL
  sort: { type: Number, default: 0 }, // 排序权重
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
