// frontend/src/pages/ProfilePage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { useUser } from '../contexts/UserContext';
import DailyEarningsButton from '../components/common/DailyEarningsButton';
import './ProfilePage.css';

// 安全的数字格式化函数
const safeToFixed = (value, decimals = 2) => {
  if (value === null || value === undefined || value === '') {
    return '0.00';
  }
  
  const num = parseFloat(value);
  
  if (isNaN(num)) {
    return '0.00';
  }
  
  return num.toFixed(decimals);
};

const ProfilePage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('personal');
  const [showLevelDetails, setShowLevelDetails] = useState(false);
  const [showBackpack, setShowBackpack] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showWithdrawHistory, setShowWithdrawHistory] = useState(false);
  const [pointsHistory, setPointsHistory] = useState([]);
  const [cashHistory, setCashHistory] = useState([]);
  const [withdrawHistory, setWithdrawHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alipayAccount, setAlipayAccount] = useState('');
  const [isAlipayBound, setIsAlipayBound] = useState(false);
  const [dollFilter, setDollFilter] = useState('all');
  const [selectedDoll, setSelectedDoll] = useState(null);
  const [showPointsDetails, setShowPointsDetails] = useState(false);
  const [showCashDetails, setShowCashDetails] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [transactionFilter, setTransactionFilter] = useState('all');

  // 使用全局状态
  const { 
    integral, // 使用 integral 替代 points
    cashBalance, 
    dolls, 
    loading: globalLoading,
    error: globalError,
    setError: setGlobalError,
    recycleDoll,
    updateCash,
    refreshData
  } = useUser();

  // 收益领取成功处理
  const handleEarningsClaimed = (data) => {
    console.log('✅ 收益领取成功:', data);
    if (data.newPoints !== undefined) {
      const updatedUser = {
        ...user,
        points: safeToFixed(data.newPoints),
        experience: safeToFixed(data.newExperience)
      };
      window.location.reload();
    }
  };

  // 等级配置数据
  const levelConfig = {
    1: { 
      name: '练气', 
      requiredExp: 0, 
      outputBonus: 0, 
      checkinBonus: 0, 
      canCheckin: false,
      description: '注册即Lv1练气'
    },
    2: { 
      name: '筑基', 
      requiredExp: 5000, 
      outputBonus: 0.1, 
      checkinBonus: 0, 
      canCheckin: true,
      description: '激活签到按钮，娃娃产出+0.1%'
    },
    3: { 
      name: '结丹', 
      requiredExp: 20000, 
      outputBonus: 0.2, 
      checkinBonus: 1, 
      canCheckin: true,
      description: '娃娃产出+0.2%，签到奖励+1%'
    },
    4: { 
      name: '元婴', 
      requiredExp: 50000, 
      outputBonus: 0.5, 
      checkinBonus: 1.5, 
      canCheckin: true,
      description: '娃娃产出+0.5%，签到奖励+1.5%'
    },
    5: { 
      name: '化神', 
      requiredExp: 100000, 
      outputBonus: 0.8, 
      checkinBonus: 2, 
      canCheckin: true,
      description: '娃娃产出+0.8%，签到奖励+2%'
    },
    6: { 
      name: '婴变', 
      requiredExp: 500000, 
      outputBonus: 1.2, 
      checkinBonus: 3, 
      canCheckin: true,
      description: '娃娃产出+1.2%，签到奖励+3%'
    },
    7: { 
      name: '问鼎', 
      requiredExp: 1000000, 
      outputBonus: 1.8, 
      checkinBonus: 5, 
      canCheckin: true,
      description: '娃娃产出+1.8%，签到奖励+5%'
    },
    8: { 
      name: '窥涅', 
      requiredExp: 5000000, 
      outputBonus: 3, 
      checkinBonus: 8, 
      canCheckin: true,
      description: '娃娃产出+3%，签到奖励+8%'
    },
    9: { 
      name: '净涅', 
      requiredExp: 20000000, 
      outputBonus: 6, 
      checkinBonus: 12, 
      canCheckin: true,
      description: '娃娃产出+6%，签到奖励+12%'
    },
    10: { 
      name: '碎涅', 
      requiredExp: 50000000, 
      outputBonus: 10, 
      checkinBonus: 16, 
      canCheckin: true,
      description: '娃娃产出+10%，签到奖励+16%'
    }
  };

  const currentLevelConfig = levelConfig[user.level] || levelConfig[1];
  const nextLevelConfig = levelConfig[user.level + 1];
  const expNeeded = nextLevelConfig ? nextLevelConfig.requiredExp - user.experience : 0;
  const expProgress = nextLevelConfig ? (user.experience / nextLevelConfig.requiredExp) * 100 : 100;

  // 获取积分历史 - 包含游戏交易
  const fetchPointsHistory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('未找到登录token');
      }

      const response = await fetch('https://tianchuang.onrender.com/api/points/history' , {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        const history = data.data.history.map(item => {
          let transactionIcon = '💰';
          let transactionColor = '#2196F3';
          
          // 根据交易类型设置图标和颜色
          switch (item.type) {
            case 'game_bet':
              transactionIcon = '🎲';
              transactionColor = '#f44336';
              break;
            case 'game_win':
              transactionIcon = '🏆';
              transactionColor = '#4CAF50';
              break;
            case 'game_lose':
              transactionIcon = '😔';
              transactionColor = '#f44336';
              break;
            case 'checkin':
              transactionIcon = '📅';
              transactionColor = '#4CAF50';
              break;
            case 'register':
              transactionIcon = '🎉';
              transactionColor = '#4CAF50';
              break;
            case 'admin_add':
              transactionIcon = '➕';
              transactionColor = '#4CAF50';
              break;
            case 'admin_deduct':
              transactionIcon = '➖';
              transactionColor = '#f44336';
              break;
            case 'purchase':
              transactionIcon = '🛍️';
              transactionColor = '#f44336';
              break;
            case 'recycle':
              transactionIcon = '♻️';
              transactionColor = '#4CAF50';
              break;
            case 'production':
              transactionIcon = '🧸';
              transactionColor = '#4CAF50';
              break;
            case 'level_up':
              transactionIcon = '⭐';
              transactionColor = '#4CAF50';
              break;
            case 'blind_box_draw':
              transactionIcon = '🎁';
              transactionColor = '#FF9800';
              break;
            case 'blind_box_exchange':
              transactionIcon = '🔄';
              transactionColor = '#FF9800';
              break;
            case 'refining_input':
              transactionIcon = '🔥';
              transactionColor = '#f44336';
              break;
            case 'refining_output':
              transactionIcon = '✨';
              transactionColor = '#4CAF50';
              break;
          }
          
          return {
            id: item._id,
            description: item.description,
            amount: Math.abs(parseFloat(item.amount || 0)),
            type: 'points',
            originalType: item.type,
            icon: transactionIcon,
            color: transactionColor,
            createdAt: new Date(item.createdAt).toLocaleDateString(),
            metadata: item.metadata || {}
          };
        });
        setPointsHistory(history);
        localStorage.setItem('pointsHistory', JSON.stringify(history));
      } else {
        // 备用模拟数据
        const mockPointsHistory = [
          { 
            id: 1, 
            description: '图标大乱斗下注 - 爱心', 
            amount: 50, 
            type: 'points',
            originalType: 'game_bet',
            icon: '🎲',
            color: '#f44336',
            createdAt: '2024-01-16',
            metadata: { sessionId: 'G123456', betDetails: { icon: 'heart', amount: 50 } }
          },
          { 
            id: 2, 
            description: '图标大乱斗获胜 - 奖励', 
            amount: 120, 
            type: 'points',
            originalType: 'game_win',
            icon: '🏆',
            color: '#4CAF50',
            createdAt: '2024-01-16',
            metadata: { sessionId: 'G123456', winningIcons: ['heart', 'burger'], rewardAmount: 120 }
          },
          { id: 3, description: '每日签到奖励', amount: 10, type: 'points', icon: '📅', color: '#4CAF50', createdAt: '2024-01-15' },
          { id: 4, description: '娃娃产出收益', amount: 5.2, type: 'points', icon: '🧸', color: '#4CAF50', createdAt: '2024-01-14' },
          { id: 5, description: '等级升级奖励', amount: 50, type: 'points', icon: '⭐', color: '#4CAF50', createdAt: '2024-01-13' }
        ];
        setPointsHistory(mockPointsHistory);
      }
    } catch (error) {
      console.error('❌ 获取积分历史失败:', error);
      const mockPointsHistory = [
        { id: 1, description: '每日签到奖励', amount: 10, type: 'points', icon: '📅', color: '#4CAF50', createdAt: '2024-01-16' }
      ];
      setPointsHistory(mockPointsHistory);
    } finally {
      setLoading(false);
    }
  };

  // 获取现金历史
  const fetchCashHistory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('未找到登录token');
      }

      const response = await fetch('https://tianchuang.onrender.com/api/transactions/cash', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        const history = data.data.transactions.map(item => ({
          id: item._id,
          description: item.description,
          amount: Math.abs(parseFloat(item.amount || 0)),
          type: 'cash',
          status: 'completed',
          createdAt: new Date(item.createdAt).toLocaleDateString()
        }));
        setCashHistory(history);
        localStorage.setItem('cashHistory', JSON.stringify(history));
      } else {
        const mockCashHistory = [
          { id: 1, description: '管理员增加现金', amount: 100, type: 'cash', status: 'completed', createdAt: '2024-01-15' },
          { id: 2, description: '积分兑换现金', amount: 50, type: 'cash', status: 'completed', createdAt: '2024-01-10' },
          { id: 3, description: '活动奖励', amount: 20, type: 'cash', status: 'completed', createdAt: '2024-01-05' }
        ];
        setCashHistory(mockCashHistory);
      }
    } catch (error) {
      console.error('❌ 获取现金历史失败:', error);
      const mockCashHistory = [
        { id: 1, description: '管理员增加现金', amount: 100, type: 'cash', status: 'completed', createdAt: '2024-01-15' }
      ];
      setCashHistory(mockCashHistory);
    } finally {
      setLoading(false);
    }
  };

  // 获取提现历史
  const fetchWithdrawHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('未找到登录token');
      }

      const response = await fetch('https://tianchuang.onrender.com/api/withdrawal/my', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setWithdrawHistory(data.data.withdrawals);
      } else {
        const mockWithdrawHistory = [
          { 
            _id: '1', 
            amount: 100, 
            status: 'approved', 
            createdAt: '2024-01-15T10:30:00Z', 
            processedAt: '2024-01-15T14:30:00Z',
            alipayAccount: '138****1234',
            remark: '已转账'
          },
          { 
            _id: '2', 
            amount: 50, 
            status: 'pending', 
            createdAt: '2024-01-16T09:15:00Z', 
            processedAt: null,
            alipayAccount: '138****1234',
            remark: ''
          },
          { 
            _id: '3', 
            amount: 30, 
            status: 'rejected', 
            createdAt: '2024-01-14T16:20:00Z', 
            processedAt: '2024-01-14T17:00:00Z',
            alipayAccount: '138****1234',
            reason: '余额不足'
          }
        ];
        setWithdrawHistory(mockWithdrawHistory);
      }
    } catch (error) {
      console.error('❌ 获取提现历史失败:', error);
      const mockWithdrawHistory = [
        { 
          _id: '1', 
          amount: 100, 
          status: 'approved', 
          createdAt: '2024-01-15T10:30:00Z', 
          processedAt: '2024-01-15T14:30:00Z',
          alipayAccount: '138****1234',
          remark: '已转账'
        }
      ];
      setWithdrawHistory(mockWithdrawHistory);
    }
  };

  // 绑定支付宝
  const handleBindAlipay = () => {
    const account = prompt('请输入支付宝账号：');
    if (account && account.trim()) {
      setAlipayAccount(account);
      setIsAlipayBound(true);
      alert('支付宝绑定成功！');
    }
  };

  // 提现功能
  const handleWithdraw = async (amount) => {
    if (!isAlipayBound) {
      alert('请先绑定支付宝账号！');
      return;
    }

    if (parseFloat(cashBalance || 0) < parseFloat(amount)) {
      alert('现金余额不足！');
      return;
    }

    const confirmMessage = `确认提现 ¥${safeToFixed(amount)} 到支付宝 ${alipayAccount}？\n\n提现流程：\n1. 提交申请\n2. 管理员审核\n3. 审批通过后打款`;
    if (window.confirm(confirmMessage)) {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        const response = await fetch('https://tianchuang.onrender.com/api/withdrawal/create', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: amount,
            alipayAccount: alipayAccount,
            realName: user.username
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          updateCash(-amount, `提现到支付宝 ${alipayAccount}`);
          alert('提现申请已提交！\n\n状态：待审核\n预计处理时间：24小时内\n请耐心等待管理员审批。');
          fetchWithdrawHistory();
        } else {
          alert('提现申请失败: ' + data.message);
        }
      } catch (error) {
        console.error('❌ 提现申请失败:', error);
        alert('网络错误，请重试');
      } finally {
        setLoading(false);
      }
    }
  };

  // 回收娃娃
  const handleRecycleDoll = async (doll) => {
    try {
      const result = await recycleDoll(doll.id);
      
      if (result.success) {
        alert(`娃娃"${doll.name}"回收成功！\n获得积分：${safeToFixed(result.recyclePoints)}`);
      } else {
        throw new Error(result.error || '回收失败');
      }
    } catch (error) {
      console.error('❌ 回收娃娃失败:', error);
      setGlobalError('回收娃娃失败: ' + error.message);
      alert('回收失败: ' + error.message);
    }
  };

  // 筛选交易记录
  const filteredTransactions = pointsHistory.filter(transaction => {
    if (transactionFilter === 'all') return true;
    if (transactionFilter === 'game') return transaction.originalType?.startsWith('game_');
    if (transactionFilter === 'income') return transaction.amount > 0;
    if (transactionFilter === 'expense') return transaction.amount < 0;
    return true;
  });

  useEffect(() => {
    fetchPointsHistory();
    fetchCashHistory();
    fetchWithdrawHistory();
  }, [points, cashBalance]);

  // 顶部标签栏配置
  const tabItems = [
    { id: 'personal', icon: '👤', label: '个人信息' },
    { id: 'wallet', icon: '💰', label: '钱包管理' },
    { id: 'dolls', icon: '🧸', label: '我的娃娃' },
    { id: 'settings', icon: '⚙️', label: '账户设置' }
  ];

  // 交易筛选选项
  const transactionFilters = [
    { id: 'all', label: '全部', icon: '📊' },
    { id: 'game', label: '游戏', icon: '🎮' },
    { id: 'income', label: '收入', icon: '💵' },
    { id: 'expense', label: '支出', icon: '💸' }
  ];

  // 使用全局娃娃数据进行筛选
  const filteredDolls = dolls.filter(doll => {
    if (dollFilter === 'all') return true;
    if (dollFilter === 'active') return doll.status === 'active';
    if (dollFilter === 'level1') return doll.level === 1;
    if (dollFilter === 'level2') return doll.level === 2;
    return true;
  });

  return (
    <div className="profile-page-mobile">
      {/* 顶部导航栏 */}
      <div className="top-nav">
        <button 
          className="back-btn"
          onClick={() => navigate('/')}
        >
          ← 返回
        </button>
        <h1 className="page-title">个人中心</h1>
        <div className="user-avatar-small">
          {user.username.charAt(0).toUpperCase()}
        </div>
      </div>

      {/* 顶部标签栏 */}
      <div className="tab-navigation">
        {tabItems.map((item) => (
          <button
            key={item.id}
            className={`tab-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <span className="tab-icon">{item.icon}</span>
            <span className="tab-label">{item.label}</span>
          </button>
        ))}
      </div>

      {/* 主内容区 */}
      <div className="main-content-mobile">
        {/* 个人信息 */}
        {activeTab === 'personal' && (
          <div className="content-section">
            <h2>👤 个人信息</h2>
              
            {/* 等级展示 */}
            <div className="level-card">
              <div className="level-header">
                <div className="level-info">
                  <h3>Lv.{user.level} {currentLevelConfig.name}</h3>
                  <p>当前经验: {safeToFixed(user.experience)}</p>
                </div>
                <button 
                  className="level-details-btn"
                  onClick={() => setShowLevelDetails(!showLevelDetails)}
                >
                  {showLevelDetails ? '收起' : '详情'} ›
                </button>
              </div>

              <div className="level-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${expProgress}%` }}
                  ></div>
                </div>
                <p className="progress-text">
                  {nextLevelConfig ? 
                    `距离下一级还需 ${expNeeded} 经验` : 
                    '已达到最高等级'
                  }
                </p>
              </div>

              {showLevelDetails && (
                <div className="level-details">
                  <h4>等级权益</h4>
                  <div className="level-perks">
                    <div className="perk-item">
                      <span className="perk-label">签到权限:</span>
                      <span className={`perk-value ${currentLevelConfig.canCheckin ? 'active' : 'inactive'}`}>
                        {currentLevelConfig.canCheckin ? '✅ 已激活' : '❌ 未激活'}
                      </span>
                    </div>
                    <div className="perk-item">
                      <span className="perk-label">产出加成:</span>
                      <span className="perk-value">+{currentLevelConfig.outputBonus}%</span>
                    </div>
                    <div className="perk-item">
                      <span className="perk-label">签到加成:</span>
                      <span className="perk-value">+{currentLevelConfig.checkinBonus}%</span>
                    </div>
                  </div>

                  <div className="level-table">
                    <h5>等级表</h5>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>等级</th>
                            <th>称号</th>
                            <th>所需经验</th>
                            <th>产出加成</th>
                            <th>签到加成</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(levelConfig).map(([level, config]) => (
                            <tr key={level} className={parseInt(level) === user.level ? 'current' : ''}>
                              <td>Lv.{level}</td>
                              <td>{config.name}</td>
                              <td>{config.requiredExp.toLocaleString()}</td>
                              <td>+{config.outputBonus}%</td>
                              <td>+{config.checkinBonus}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 基本信息 */}
            <div className="info-card">
              <h4>基本信息</h4>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">用户名:</span>
                  <span className="info-value">{user.username}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">邮箱:</span>
                  <span className="info-value">{user.email}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">注册时间:</span>
                  <span className="info-value">2024-01-01</span>
                </div>
                <div className="info-item">
                  <span className="info-label">最后登录:</span>
                  <span className="info-value">2024-01-16</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 钱包管理 */}
        {activeTab === 'wallet' && (
          <div className="content-section">
            <h2>💰 钱包管理</h2>
              
            {/* 收益领取区域 */}
            <div className="earnings-section">
              <h3>🧸 娃娃收益</h3>
              <DailyEarningsButton onEarningsClaimed={handleEarningsClaimed} />
            </div>
            
            {/* 积分板块 */}
            <div className="wallet-section">
              <div className="points-card">
                <div className="wallet-header">
                  <div className="wallet-title">
                    <span className="wallet-icon">💎</span>
                    <h3>积分余额</h3>
                  </div>
                  <button 
                    className="details-btn"
                    onClick={() => setShowPointsDetails(!showPointsDetails)}
                  >
                    明细 ›
                  </button>
                </div>
                <div className="balance-amount">
                  <span className="amount">{safeToFixed(integral)}</span> {/* 使用 integral */}
                  <span className="unit">积分</span>
                </div>
                <div className="wallet-actions">
                  <button className="convert-btn" onClick={() => alert('积分兑换功能开发中...')}>
                    🔄 兑换现金
                  </button>
                  <button className="earn-btn" onClick={() => navigate('/game-center')}>
                    🎮 赚取积分
                  </button>
                </div>
              </div>

              {/* 积分明细 - 包含游戏交易筛选 */}
              {showPointsDetails && (
                <div className="history-card">
                  <div className="history-header">
                    <h4>积分明细</h4>
                    {/* 新增交易筛选 */}
                    <div className="transaction-filters">
                      {transactionFilters.map((filter) => (
                        <button
                          key={filter.id}
                          className={`filter-chip ${transactionFilter === filter.id ? 'active' : ''}`}
                          onClick={() => setTransactionFilter(filter.id)}
                        >
                          <span>{filter.icon}</span>
                          <span>{filter.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="history-list">
                    {loading ? (
                      <div className="loading">
                        <div className="loading-spinner"></div>
                        <p>加载中...</p>
                      </div>
                    ) : filteredTransactions.length > 0 ? (
                      filteredTransactions.map((transaction) => (
                        <div key={transaction.id} className="history-item">
                          <div className="transaction-icon" style={{ color: transaction.color }}>
                            <span className="icon-symbol">{transaction.icon}</span>
                          </div>
                          <div className="transaction-details">
                            <p className="history-desc">{transaction.description}</p>
                            <p className="history-date">{transaction.createdAt}</p>
                            {/* 游戏相关详情 */}
                            {transaction.metadata?.gameType === 'icon_brawl' && (
                              <div className="transaction-game-info">
                                <span className="game-tag">🎮 图标大乱斗</span>
                                {transaction.metadata.sessionId && (
                                  <span className="session-info">局号: {transaction.metadata.sessionId.slice(-6)}</span>
                                )}
                                {transaction.metadata.betDetails && (
                                  <span className="bet-info">
                                    下注: {transaction.metadata.betDetails.icon} {transaction.metadata.betDetails.amount}积分
                                  </span>
                                )}
                                {transaction.metadata.winningIcons && (
                                  <span className="win-info">
                                    中奖: {transaction.metadata.winningIcons.join(', ')}
                                  </span>
                                )}
                                {transaction.metadata.rewardAmount && (
                                  <span className="reward-info">
                                    奖励: +{transaction.metadata.rewardAmount}积分
                                  </span>
                                )}
                              </div>
                            )}
                            {/* 盲盒相关详情 */}
                            {transaction.metadata?.drawType && (
                              <div className="transaction-blindbox-info">
                                <span className="blindbox-tag">🎁 盲盒活动</span>
                                <span className="draw-type">
                                  {transaction.metadata.drawType === 'single' ? '单抽' : '十连抽'}
                                </span>
                                {transaction.metadata.rewards && (
                                  <span className="rewards">
                                    获得: {transaction.metadata.rewards.join(', ')}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className={`history-amount ${transaction.amount > 0 ? 'positive' : 'negative'}`}>
                            {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">
                        <p>暂无{transactionFilter === 'all' ? '' : transactionFilters.find(f => f.id === transactionFilter)?.label}记录</p>
                        <p>参与游戏可获得积分</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 现金板块 */}
            <div className="wallet-section">
              <div className="cash-card">
                <div className="wallet-header">
                  <div className="wallet-title">
                    <span className="wallet-icon">💵</span>
                    <h3>现金余额</h3>
                  </div>
                  <button 
                    className="details-btn"
                    onClick={() => setShowCashDetails(!showCashDetails)}
                  >
                    明细 ›
                  </button>
                </div>
                <div className="balance-amount">
                  <span className="amount">¥{safeToFixed(cashBalance)}</span>
                  <span className="unit">现金</span>
                </div>
                <div className="wallet-actions">
                  <button className="withdraw-btn" onClick={() => setShowWithdraw(true)}>
                    💸 提现
                  </button>
                  <button className="cash-earn-btn" onClick={() => alert('现金赚取功能开发中...')}>
                    💰 赚取现金
                  </button>
                </div>
              </div>

              {/* 现金明细 */}
              {showCashDetails && (
                <div className="history-card">
                  <h4>现金明细</h4>
                  <div className="history-list">
                    {loading ? (
                      <div className="loading">
                        <div className="loading-spinner"></div>
                        <p>加载中...</p>
                      </div>
                    ) : cashHistory.length > 0 ? (
                      cashHistory.map((item) => (
                        <div key={item.id} className="history-item">
                          <div className="transaction-icon" style={{ color: '#4CAF50' }}>
                            <span className="icon-symbol">💰</span>
                          </div>
                          <div className="transaction-details">
                            <p className="history-desc">{item.description}</p>
                            <p className="history-date">{item.createdAt}</p>
                          </div>
                          <div className="history-amount positive">
                            +¥{safeToFixed(item.amount)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">
                        <p>暂无现金记录</p>
                        <p>积分兑换可获得现金</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 我的娃娃 */}
        {activeTab === 'dolls' && (
          <div className="content-section">
            <h2>🧸 我的娃娃</h2>
              
            {/* 筛选功能 */}
            <div className="doll-filters">
              <button 
                className={`filter-btn ${dollFilter === 'all' ? 'active' : ''}`}
                onClick={() => setDollFilter('all')}
              >
                全部
              </button>
              <button 
                className={`filter-btn ${dollFilter === 'active' ? 'active' : ''}`}
                onClick={() => setDollFilter('active')}
              >
                产出中
              </button>
              <button 
                className={`filter-btn ${dollFilter === 'level1' ? 'active' : ''}`}
                onClick={() => setDollFilter('level1')}
              >
                一级
              </button>
              <button 
                className={`filter-btn ${dollFilter === 'level2' ? 'active' : ''}`}
                onClick={() => setDollFilter('level2')}
              >
                二级
              </button>
            </div>

            {/* 娃娃列表 */}
            <div className="dolls-grid">
              {filteredDolls.length > 0 ? (
                filteredDolls.map((doll) => (
                  <div key={doll.id} className="doll-card-container">
                    <div 
                      className="doll-card"
                      onClick={() => setSelectedDoll(doll)}
                    >
                      <div className="doll-emoji">{doll.emoji}</div>
                      <div className="doll-info">
                        <h4>{doll.name}</h4>
                        <p>Lv.{doll.level}</p>
                        <p>产出: +{safeToFixed(doll.output)}/天</p>
                        <p>剩余: {doll.daysLeft}天</p>
                      </div>
                    </div>
                    {/* 回收按钮 */}
                    <button 
                      className="recycle-btn"
                      onClick={() => handleRecycleDoll(doll)}
                      disabled={globalLoading}
                    >
                      {globalLoading ? '处理中...' : `♻️ 回收 (${safeToFixed(0.5 * doll.daysLeft)}积分)`}
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty-dolls">
                  <span className="empty-icon">🎁</span>
                  <p>没有符合条件的娃娃</p>
                  <button 
                    className="go-shop-btn"
                    onClick={() => navigate('/mall')}
                  >
                    去商城看看 ›
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 账户设置 */}
        {activeTab === 'settings' && (
          <div className="content-section">
            <h2>⚙️ 账户设置</h2>
              
            <div className="settings-card">
              <div className="setting-item">
                <div className="setting-info">
                  <h4>修改密码</h4>
                  <p>定期修改密码，保护账户安全</p>
                </div>
                <button className="setting-btn">修改</button>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <h4>绑定邮箱</h4>
                  <p>绑定邮箱，用于找回密码</p>
                </div>
                <button className="setting-btn">绑定</button>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <h4>隐私设置</h4>
                  <p>管理个人信息的可见性</p>
                </div>
                <button className="setting-btn">设置</button>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <h4>消息通知</h4>
                  <p>设置系统消息和通知偏好</p>
                </div>
                <button className="setting-btn">设置</button>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <h4>退出登录</h4>
                  <p>安全退出当前账户</p>
                </div>
                <button className="logout-btn" onClick={onLogout}>
                  🚪 退出登录
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {globalError && (
        <div className="error-message">
          <p>❌ {globalError}</p>
          <button onClick={() => setGlobalError('')} className="close-error">×</button>
        </div>
      )}

      {/* 提现弹窗 */}
      {showWithdraw && (
        <div className="withdraw-modal" onClick={() => setShowWithdraw(false)}>
          <div className="withdraw-content" onClick={(e) => e.stopPropagation()}>
            <div className="withdraw-header">
              <h3>💸 现金提现</h3>
              <button className="close-btn" onClick={() => setShowWithdraw(false)}>×</button>
            </div>

            {/* 用户信息 */}
            <div className="withdraw-user-info">
              <div className="user-info-row">
                <span className="info-label">用户:</span>
                <span className="info-value">{user.username}</span>
              </div>
              <div className="user-info-row">
                <span className="info-label">现金余额:</span>
                <span className="info-value balance">¥{safeToFixed(cashBalance)}</span>
              </div>
            </div>

            {/* 提现流程说明 */}
            <div className="withdraw-process">
              <h4>提现流程</h4>
              <div className="process-steps">
                <div className="process-step">
                  <span className="step-number">1</span>
                  <span className="step-text">用户提交提现申请</span>
                </div>
                <div className="process-step">
                  <span className="step-number">2</span>
                  <span className="step-text">管理员后台审核</span>
                </div>
                <div className="process-step">
                  <span className="step-number">3</span>
                  <span className="step-text">审批通过后打款</span>
                </div>
              </div>
            </div>

            {/* 支付宝绑定 */}
            <div className="alipay-section">
              <h4>支付宝账户</h4>
              {isAlipayBound ? (
                <div className="alipay-bound">
                  <span className="alipay-icon">📱</span>
                  <span className="alipay-account">{alipayAccount}</span>
                  <button className="change-btn" onClick={handleBindAlipay}>更换</button>
                </div>
              ) : (
                <div className="alipay-unbound">
                  <span className="unbind-icon">🔒</span>
                  <p>未绑定支付宝账号</p>
                  <button className="bind-btn" onClick={handleBindAlipay}>立即绑定</button>
                </div>
              )}
            </div>

            {/* 提现金额 */}
            <div className="withdraw-amount-section">
              <h4>提现金额</h4>
              <div className="amount-grid">
                <div className="amount-row">
                  <button 
                    className="amount-btn"
                    onClick={() => handleWithdraw(10)}
                    disabled={!isAlipayBound || parseFloat(cashBalance || 0) < 10}
                  >
                    ¥{safeToFixed(10)}
                  </button>
                  <button 
                    className="amount-btn"
                    onClick={() => handleWithdraw(30)}
                    disabled={!isAlipayBound || parseFloat(cashBalance || 0) < 30}
                  >
                    ¥{safeToFixed(30)}
                  </button>
                  <button 
                    className="amount-btn"
                    onClick={() => handleWithdraw(50)}
                    disabled={!isAlipayBound || parseFloat(cashBalance || 0) < 50}
                  >
                    ¥{safeToFixed(50)}
                  </button>
                </div>
                <div className="amount-row">
                  <button 
                    className="amount-btn"
                    onClick={() => handleWithdraw(100)}
                    disabled={!isAlipayBound || parseFloat(cashBalance || 0) < 100}
                  >
                    ¥{safeToFixed(100)}
                  </button>
                  <button 
                    className="amount-btn"
                    onClick={() => handleWithdraw(300)}
                    disabled={!isAlipayBound || parseFloat(cashBalance || 0) < 300}
                  >
                    ¥{safeToFixed(300)}
                  </button>
                  <button 
                    className="amount-btn"
                    onClick={() => handleWithdraw(500)}
                    disabled={!isAlipayBound || parseFloat(cashBalance || 0) < 500}
                  >
                    ¥{safeToFixed(500)}
                  </button>
                </div>
              </div>
            </div>

            {/* 提现明细 */}
            <div className="withdraw-history-section">
              <div className="section-header">
                <h4>提现明细</h4>
                <button 
                  className="view-more-btn"
                  onClick={() => setShowWithdrawHistory(!showWithdrawHistory)}
                >
                  {showWithdrawHistory ? '收起' : '查看全部'} ›
                </button>
              </div>
              
              {showWithdrawHistory && (
                <div className="withdraw-history-list">
                  {withdrawHistory.length > 0 ? (
                    withdrawHistory.map((item) => (
                      <div key={item._id} className="withdraw-item">
                        <div className="withdraw-info">
                          <p className="withdraw-amount">¥{safeToFixed(item.amount)}</p>
                          <p className="withdraw-account">{item.alipayAccount}</p>
                          <p className="withdraw-date">{new Date(item.createdAt).toLocaleDateString()}</p>
                          <p className="process-time">
                            处理时间: {item.processedAt ? new Date(item.processedAt).toLocaleString() : '处理中...'}
                          </p>
                          {item.remark && (
                            <p className="withdraw-remark">备注: {item.remark}</p>
                          )}
                        </div>
                        <div className={`withdraw-status ${item.status}`}>
                          {item.status === 'approved' && '✅ 已成功'}
                          {item.status === 'pending' && '⏳ 待审核'}
                          {item.status === 'rejected' && '❌ 已拒绝'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-withdraw">
                      <p>暂无提现记录</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 娃娃详情弹窗 */}
      {selectedDoll && (
        <div className="doll-detail-modal" onClick={() => setSelectedDoll(null)}>
          <div className="doll-detail-content" onClick={(e) => e.stopPropagation()}>
            <div className="doll-detail-header">
              <h3>🧸 娃娃详情</h3>
              <button className="close-btn" onClick={() => setSelectedDoll(null)}>×</button>
            </div>
            
            <div className="doll-detail-info">
              <div className="doll-emoji-large">{selectedDoll.emoji}</div>
              <div className="doll-details">
                <h4>{selectedDoll.name}</h4>
                <div className="detail-row">
                  <span className="detail-label">等级:</span>
                  <span className="detail-value">Lv.{selectedDoll.level}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">每日产出:</span>
                  <span className="detail-value">+{safeToFixed(selectedDoll.output)} 积分</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">剩余天数:</span>
                  <span className="detail-value">{selectedDoll.daysLeft} 天</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">总天数:</span>
                  <span className="detail-value">{selectedDoll.totalDays} 天</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">累计产出:</span>
                  <span className="detail-value">+{safeToFixed(selectedDoll.totalEarned)} 积分</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">状态:</span>
                  <span className={`detail-value status ${selectedDoll.status}`}>
                    {selectedDoll.status === 'active' ? '🟢 产出中' : '⚪ 已停止'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">回收价值:</span>
                  <span className="detail-value recycle">{safeToFixed(0.5 * selectedDoll.daysLeft)} 积分</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;