const StarOrder = require('../models/StarOrder');
const Trade = require('../models/Trade');
const StarKline = require('../models/StarKline');
const User = require('../models/User');

// 辅助：更新K线
async function updateKline(price, amount) {
  const now = new Date();
  const time = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0);
  
  const kline = await StarKline.findOne({ period: '1m', time });
  
  if (!kline) {
    await StarKline.create({
      period: '1m',
      time: time,
      open: price,
      high: price,
      low: price,
      close: price,
      volume: amount,
      amount: amount * price
    });
  } else {
    kline.close = price;
    kline.high = Math.max(kline.high, price);
    kline.low = Math.min(kline.low, price);
    kline.volume += amount;
    kline.amount += amount * price;
    await kline.save();
  }
}

// 核心：撮合引擎
async function matchOrder(newOrder) {
  const opponentType = newOrder.type === 'buy' ? 'sell' : 'buy';
  const sortDir = newOrder.type === 'buy' ? 1 : -1; 

  const matches = await StarOrder.find({
    type: opponentType,
    status: 'open',
    price: newOrder.type === 'buy' ? { $lte: newOrder.price } : { $gte: newOrder.price }
  }).sort({ price: sortDir, createdAt: 1 });

  for (let match of matches) {
    if (newOrder.filledAmount >= newOrder.amount) break;

    const tradeAmount = Math.min(newOrder.amount - newOrder.filledAmount, match.amount - match.filledAmount);
    const tradePrice = match.price; 

    if (tradeAmount > 0) {
      await Trade.create({
        buyOrderId: newOrder.type === 'buy' ? newOrder._id : match._id,
        sellOrderId: newOrder.type === 'sell' ? newOrder._id : match._id,
        price: tradePrice,
        amount: tradeAmount,
        total: tradeAmount * tradePrice
      });

      await StarOrder.findByIdAndUpdate(newOrder._id, { $inc: { filledAmount: tradeAmount } });
      await StarOrder.findByIdAndUpdate(match._id, { $inc: { filledAmount: tradeAmount } });

      // 资金处理
      const buyerId = newOrder.type === 'buy' ? newOrder.userId : match.userId;
      const sellerId = newOrder.type === 'sell' ? newOrder.userId : match.userId;
      
      const buyer = await User.findById(buyerId);
      const seller = await User.findById(sellerId);
      
      // 买方：解冻积分，得币
      const cost = tradeAmount * tradePrice;
      buyer.frozenPoints -= cost;
      buyer.starcoin += tradeAmount;
      
      // 卖方：解冻币，得积分（扣5%手续费）
      const income = cost * 0.95; 
      seller.frozenStarCoin -= tradeAmount;
      seller.points += income;
      
      await buyer.save();
      await seller.save();

      // 更新K线
      await updateKline(tradePrice, tradeAmount);
    }
  }
  
  // 检查状态
  const updatedOrder = await StarOrder.findById(newOrder._id);
  if (updatedOrder.filledAmount >= updatedOrder.amount) {
    updatedOrder.status = 'filled';
  } else if (updatedOrder.filledAmount > 0) {
    updatedOrder.status = 'partial';
  }
  await updatedOrder.save();
  
  return updatedOrder;
}

exports.placeOrder = async (req, res) => {
  try {
    const { type, price, amount } = req.body;
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (type === 'buy') {
      const cost = price * amount;
      if (user.points < cost) return res.status(400).json({ msg: '积分不足' });
      user.points -= cost;
      user.frozenPoints += cost;
    } else {
      if (user.starcoin < amount) return res.status(400).json({ msg: '星源币不足' });
      user.starcoin -= amount;
      user.frozenStarCoin += amount;
    }
    await user.save();

    const newOrder = await StarOrder.create({ userId, type, price: Number(price), amount: Number(amount) });
    
    const resultOrder = await matchOrder(newOrder);

    res.json({ success: true, order: resultOrder });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

exports.getKlines = async (req, res) => {
  try {
    const klines = await StarKline.find({ period: '1m' }).sort({ time: -1 }).limit(1000);
    const formatted = klines.reverse().map(k => ({
      time: Math.floor(new Date(k.time).getTime() / 1000),
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
      volume: k.volume
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

exports.getDepth = async (req, res) => {
  try {
    const sells = await StarOrder.find({ type: 'sell', status: 'open' }).sort({ price: 1, createdAt: 1 }).limit(20);
    const buys = await StarOrder.find({ type: 'buy', status: 'open' }).sort({ price: -1, createdAt: 1 }).limit(20);
    res.json({ sells, buys });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

exports.getTrades = async (req, res) => {
  try {
    const trades = await Trade.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('buyOrderId sellOrderId', 'price amount type');
    res.json(trades);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};