const mongoose = require('mongoose');
require('dotenv').config();
require('../config/db');

const StarOrder = require('../models/StarOrder');
const Trade = require('../models/Trade');
const User = require('../models/User');
const StarKline = require('../models/StarKline');
const MarketWS = require('../websocket/marketWebSocket');

// ⚠️ 注意：请手动去数据库找你的管理员 User 的 _id，填在这里
// 或者你可以创建一个专门的系统用户
const SYSTEM_USER_ID = '693132ee830c134e00d618ac'; 

let currentPrice = 0.5; // 初始发行价 0.5

async function runBot() {
  console.log(`🤖 做市商机器人启动，初始价格: ${currentPrice}`);

  // 初始化第一根K线
  await StarKline.findOneAndUpdate(
    { period: '1m', time: new Date(new Date().setSeconds(0,0)) },
    { 
      period: '1m', 
      time: new Date(new Date().setSeconds(0,0)),
      open: currentPrice, high: currentPrice, low: currentPrice, close: currentPrice, volume: 0, amount: 0 
    },
    { upsert: true, new: true }
  );

  setInterval(async () => {
    try {
      // 1. 价格微调 (随机波动)
      const change = (Math.random() - 0.5) * 0.05; 
      let targetPrice = currentPrice + change;
      if(targetPrice < 0.1) targetPrice = 0.1; // 地板价

      // 2. 检查并补单 (提供流动性)
      // 卖单
      const sellExists = await StarOrder.findOne({ userId: SYSTEM_USER_ID, type: 'sell', price: { $gte: targetPrice - 0.01, $lte: targetPrice + 0.01 } });
      if (!sellExists) {
         const order = await StarOrder.create({ userId: SYSTEM_USER_ID, type: 'sell', price: Number(targetPrice.toFixed(4)), amount: 100 });
         console.log(`[Bot] 系统挂卖单: ${targetPrice.toFixed(4)}`);
      }

      // 买单
      const buyExists = await StarOrder.findOne({ userId: SYSTEM_USER_ID, type: 'buy', price: { $gte: targetPrice - 0.01, $lte: targetPrice + 0.01 } });
      if (!buyExists) {
         const order = await StarOrder.create({ userId: SYSTEM_USER_ID, type: 'buy', price: Number(targetPrice.toFixed(4)), amount: 100 });
         console.log(`[Bot] 系统挂买单: ${targetPrice.toFixed(4)}`);
      }

      // 3. 更新价格引用
      const lastTrade = await Trade.findOne().sort({ createdAt: -1 });
      if (lastTrade) currentPrice = lastTrade.price;

    } catch (e) {
      console.error("Bot Error:", e.message);
    }
  }, 5000);
}

runBot();
