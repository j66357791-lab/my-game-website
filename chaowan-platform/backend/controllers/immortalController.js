const ImmortalDoll = require('../models/ImmortalDoll');

// 获取娃娃（如果没创建则返回 null，前端根据 null 判断显示创建界面）
const getMyDoll = async (req, res) => {
  try {
    const doll = await ImmortalDoll.findOne({ userId: req.user._id });
    res.json({ success: true, data: { doll } });
  } catch (error) {
    console.error('获取娃娃失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

// 创建/转生娃娃（初始化属性）
const createDoll = async (req, res) => {
  try {
    const { faction, gender } = req.body;
    
    // 校验
    if (!['仙', '魔', '道'].includes(faction) || !['男', '女'].includes(gender)) {
      return res.status(400).json({ success: false, message: '参数错误' });
    }

    // 检查是否已存在
    const existing = await ImmortalDoll.findOne({ userId: req.user._id });
    if (existing) {
      return res.status(400).json({ success: false, message: '您已拥有娃娃，无法重复创建' });
    }

    // 根据需求设定初始属性
    let baseAttrs = { attack: 0, health: 0, defense: 0 };
    
    if (faction === '仙') {
      baseAttrs.attack = 1;
      baseAttrs.health = 30;
    } else if (faction === '魔') {
      baseAttrs.attack = 3;
      baseAttrs.health = 10;
    } else if (faction === '道') {
      baseAttrs.attack = 1;
      baseAttrs.health = 10;
      baseAttrs.defense = 1;
    }

    const newDoll = new ImmortalDoll({
      userId: req.user._id,
      faction,
      gender,
      baseAttributes: baseAttrs
    });

    await newDoll.save();
    console.log(`✅ 用户 ${req.user.username} 创建了 ${faction}${gender}娃娃`);

    res.json({
      success: true,
      message: '开修成功！',
      data: { doll: newDoll }
    });
  } catch (error) {
    console.error('创建娃娃失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

module.exports = {
  getMyDoll,
  createDoll
};
