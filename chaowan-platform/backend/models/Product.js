const mongoose = require('mongoose');

const skuSchema = new mongoose.Schema({
  id: { type: String, required: true }, // 唯一标识，如 "color-red-size-l"
  name: { type: String, required: true }, // 规格名称，如 "红色/L码"
  pricePoints: { type: Number, default: 0 }, // 积分价格
  priceCash: { type: Number, default: 0 },   // 现金价格
  stock: { type: Number, required: true, default: 0 }, // 该规格库存
  attributes: { type: Map, of: String }, // 动态属性：{ "颜色": "红", "尺码": "L" }
  isActive: { type: Boolean, default: true }
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  images: [String], // 图片URL数组
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' }, // 所属分类
  tags: [String], // 版块标签: ['newbie_special', 'flash_sale']
  skus: [skuSchema], // 多规格列表
  totalStock: { type: Number, default: 0 }, // 冗余总库存，方便排序
  salesCount: { type: Number, default: 0 }, // 销量
  isActive: { type: Boolean, default: true }, // 是否上架
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// 保存前自动计算总库存
productSchema.pre('save', function(next) {
  this.totalStock = this.skus.reduce((sum, sku) => sum + (sku.isActive ? sku.stock : 0), 0);
  next();
});

module.exports = mongoose.model('Product', productSchema);
