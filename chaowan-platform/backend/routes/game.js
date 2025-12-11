// backend/routes/game.js
const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const auth = require('../middleware/auth');

// 游戏路由
router.get('/current', auth, gameController.getCurrentGame);
router.post('/bet', auth, gameController.placeBet);
router.get('/history', auth, gameController.getHistory);

// 游戏状态管理定时器
const gameTimers = new Map();

// 启动游戏状态管理
function startGameManagement() {
  setInterval(async () => {
    try {
      // 查找需要状态更新的游戏
      const sessions = await GameSession.findAll({
        where: { 
          status: ['betting', 'locked', 'revealing']
        }
      });

      for (const session of sessions) {
        const now = Date.now();
        const startTime = new Date(session.start_time).getTime();
        const elapsed = (now - startTime) / 1000;

        // 25秒后锁定
        if (session.status === 'betting' && elapsed >= 25) {
          await session.update({ status: 'locked' });
          console.log(`游戏 ${session.session_id} 已锁定`);
        }
        // 30秒后展示
        else if (session.status === 'locked' && elapsed >= 30) {
          await session.update({ status: 'revealing' });
          console.log(`游戏 ${session.session_id} 开始展示`);
          
          // 3秒后结算
          setTimeout(() => {
            gameController.settleGame(session.session_id);
          }, 3000);
        }
      }
    } catch (error) {
      console.error('游戏状态管理错误:', error);
    }
  }, 1000);
}

// 启动游戏管理
startGameManagement();

module.exports = router;
