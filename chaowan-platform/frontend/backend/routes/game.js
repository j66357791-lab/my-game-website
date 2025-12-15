const express = require('express');
const router = express.Router();
const { getCurrentGame, placeBet, getHistory } = require('../controllers/gameController');
const { protect } = require('../middleware/auth');  // 🔧 修复：使用 { protect }

// 游戏路由
router.get('/current', protect, getCurrentGame);     // 🔧 修复：使用 protect
router.post('/bet', protect, placeBet);             // 🔧 修复：使用 protect
router.get('/history', protect, getHistory);        // 🔧 修复：使用 protect

// 游戏状态管理定时器
const GameSession = require('../models/GameSession');

// 启动游戏状态管理
function startGameManagement() {
  console.log('🎮 启动图标大乱斗游戏状态管理...');
  
  setInterval(async () => {
    try {
      // 查找需要状态更新的游戏
      const sessions = await GameSession.find({
        status: { $in: ['betting', 'locked', 'revealing'] }
      });

      for (const session of sessions) {
        const now = Date.now();
        const startTime = new Date(session.start_time).getTime();
        const elapsed = (now - startTime) / 1000;

        // 25秒后锁定
        if (session.status === 'betting' && elapsed >= 25) {
          await session.updateOne({ status: 'locked' });
          console.log(`🎲 游戏 ${session.session_id} 已锁定`);
        }
        // 30秒后展示
        else if (session.status === 'locked' && elapsed >= 30) {
          await session.updateOne({ status: 'revealing' });
          console.log(`🎲 游戏 ${session.session_id} 开始展示`);
          
          // 3秒后结算
          setTimeout(() => {
            const { settleGame } = require('../controllers/gameController');
            settleGame(session.session_id);
          }, 3000);
        }
      }
    } catch (error) {
      console.error('❌ 游戏状态管理错误:', error);
    }
  }, 1000);
}

// 启动游戏管理
startGameManagement();

module.exports = router;
