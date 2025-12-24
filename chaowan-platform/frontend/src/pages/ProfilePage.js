// frontend/src/pages/ProfilePage.js - 整合提现功能版
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/api';
import { useUser } from '../contexts/UserContext';
import './ProfilePage.css';

// 🔧 安全的数字格式化函数
const safeToFixed = (value, decimals = 2) => {
  if (value === null || value === undefined || value === '') return '0.00';
  const num = parseFloat(value);
  if (isNaN(num)) return '0.00';
  return num.toFixed(decimals);
};

const ProfilePage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('personal');
  
  // --- 全局用户状态 ---
  const { 
    points, 
    starcoin, 
    cashBalance, 
    updateCash,
    refreshData 
  } = useUser();

  // --- 1. 个人中心 (邮件系统) ---
  const [mails, setMails] = useState([]);
  const [mailLoading, setMailLoading] = useState(false);

  // --- 2. 钱包管理 (转账 & 提现) ---
  // 转账
  const [transferTargetId, setTransferTargetId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);
  
  // 提现 (原有逻辑)
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showWithdrawHistory, setShowWithdrawHistory] = useState(false);
  const [withdrawHistory, setWithdrawHistory] = useState([]);
  const [alipayAccount, setAlipayAccount] = useState('');
  const [isAlipayBound, setIsAlipayBound] = useState(false);
  
  // 明细
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);
  const [transactions, setTransactions] = useState([]);

  // --- 3. 游戏统计 ---
  const [statsGameType, setStatsGameType] = useState('race');
  const [statsPeriod, setStatsPeriod] = useState('day');
  const [gameStats, setGameStats] = useState(null);

  // --- 4. 账户设置 ---
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // ====== 邮件逻辑 ======
  const fetchMails = async () => {
    setMailLoading(true);
    try {
      const res = await api.get('/auth/mails');
      if (res.success) setMails(res.data);
    } catch (error) {
      console.error('获取邮件失败', error);
    } finally {
      setMailLoading(false);
    }
  };

  const handleClaimMail = async (mailId) => {
    try {
      const res = await api.post(`/auth/mails/${mailId}/claim`);
      if (res.success) {
        alert('领取成功！');
        fetchMails();
        refreshData(); // 更新全局余额
      }
    } catch (error) {
      alert(error.response?.data?.message || '领取失败');
    }
  };

  // ====== 钱包逻辑 ======
  // 通用获取交易明细 (兼容新旧逻辑)
  const fetchTransactions = async () => {
    try {
      // 尝试获取积分历史
      const resPoints = await api.get('/points/history').catch(() => ({success: false}));
      // 尝试获取现金历史
      const resCash = await api.get('/transactions/cash').catch(() => ({success: false}));
      
      // 这里简单处理，合并显示，实际可分开
      let allTx = [];
      if (resPoints.success) allTx = [...allTx, ...resPoints.data.history];
      if (resCash.success) allTx = [...allTx, ...resCash.data.transactions];
      
      setTransactions(allTx.slice(0, 20)); // 显示最近20条
    } catch (error) {
      console.error('获取明细失败');
    }
  };

  // 转账逻辑
  const handleTransfer = async () => {
    if (!transferTargetId || !transferAmount) return alert('请输入完整信息');
    if (!window.confirm(`您确定要转增给 ID: ${transferTargetId} 用户 ${transferAmount} 积分吗？(含2%手续费)`)) return;

    try {
      const res = await api.post('/auth/transfer', {
        targetUserId: transferTargetId,
        amount: parseInt(transferAmount)
      });
      if (res.success) {
        alert(res.message);
        setShowTransferModal(false);
        refreshData();
      }
    } catch (error) {
      alert(error.response?.data?.message || '转增失败');
    }
  };

  // 提现逻辑 (原有保留)
  const fetchWithdrawHistory = async () => {
    try {
      const res = await api.get('/withdrawal/my');
      if (res.success) setWithdrawHistory(res.data.withdrawals);
    } catch (error) {
      console.error('获取提现历史失败');
    }
  };

  const handleBindAlipay = () => {
    const account = prompt('请输入支付宝账号：');
    if (account && account.trim()) {
      setAlipayAccount(account);
      setIsAlipayBound(true);
      alert('支付宝绑定成功！');
    }
  };

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
        const res = await api.post('/withdrawal/create', {
          amount: amount,
          alipayAccount: alipayAccount,
          realName: user.username
        });
        if (res.success) {
          updateCash(-amount, `提现到支付宝 ${alipayAccount}`);
          alert('提现申请已提交！\n状态：待审核\n请耐心等待管理员审批。');
          fetchWithdrawHistory();
        } else {
          alert('提现申请失败: ' + res.message);
        }
      } catch (error) {
        alert('网络错误，请重试');
      }
    }
  };

  // ====== 游戏统计逻辑 ======
  const fetchGameStats = async () => {
    try {
      const res = await api.get('/auth/game-stats', {
        params: { gameType: statsGameType, period: statsPeriod }
      });
      if (res.success) setGameStats(res.data);
    } catch (error) {
      console.error('获取统计失败');
    }
  };

  // ====== 账户设置逻辑 ======
  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/change-password', {
        oldPassword,
        newPassword
      });
      if (res.success) {
        alert('密码修改成功，请重新登录');
        onLogout();
      }
    } catch (error) {
      alert(error.response?.data?.message || '修改失败');
    }
  };

  // ====== Effect ======
  useEffect(() => {
    if (activeTab === 'personal') fetchMails();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'wallet') fetchTransactions();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'wallet') fetchWithdrawHistory();
  }, [activeTab, cashBalance]);

  useEffect(() => {
    if (activeTab === 'games') fetchGameStats();
  }, [activeTab, statsGameType, statsPeriod]);

  return (
    <div className="profile-page-mobile">
      {/* 顶部导航 */}
      <div className="top-nav">
        <button className="back-btn" onClick={() => navigate('/')}>← 返回</button>
        <h1 className="page-title">个人中心</h1>
        <div className="user-avatar-small">{user.username.charAt(0).toUpperCase()}</div>
      </div>

      {/* 标签栏 */}
      <div className="tab-navigation">
        <button className={`tab-item ${activeTab === 'personal' ? 'active' : ''}`} onClick={() => setActiveTab('personal')}>
          <span className="tab-icon">👤</span>
          <span className="tab-label">个人中心</span>
        </button>
        <button className={`tab-item ${activeTab === 'wallet' ? 'active' : ''}`} onClick={() => setActiveTab('wallet')}>
          <span className="tab-icon">💰</span>
          <span className="tab-label">钱包管理</span>
        </button>
        <button className={`tab-item ${activeTab === 'games' ? 'active' : ''}`} onClick={() => setActiveTab('games')}>
          <span className="tab-icon">🎮</span>
          <span className="tab-label">游戏中心</span>
        </button>
        <button className={`tab-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
          <span className="tab-icon">⚙️</span>
          <span className="tab-label">账户设置</span>
        </button>
      </div>

      <div className="main-content-mobile">
        {/* --- 1. 个人中心 --- */}
        {activeTab === 'personal' && (
          <div className="content-section">
            <h2>个人中心</h2>
            <div className="info-card">
              <h4>基本信息</h4>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">账户ID：</span>
                  <span className="info-value">{user._id}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">用户名：</span>
                  <span className="info-value">{user.username}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">邮箱：</span>
                  <span className="info-value">{user.email}</span>
                </div>
              </div>
            </div>

            <div className="mail-section">
              <h3>📧 邮件系统</h3>
              <div className="mail-list">
                {mailLoading ? <p>加载中...</p> : mails.length === 0 ? <p>暂无邮件</p> : mails.map(mail => (
                  <div key={mail._id} className={`mail-item ${!mail.isRead ? 'unread' : ''}`}>
                    <div className="mail-header">
                      <span className="mail-title">{mail.title}</span>
                      <span className="mail-time">{new Date(mail.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="mail-content">{mail.content}</p>
                    <div className="mail-rewards">
                      {mail.rewards.points > 0 && <span>💎 +{mail.rewards.points}</span>}
                      {mail.rewards.starcoin > 0 && <span>🪙 +{mail.rewards.starcoin}</span>}
                      {mail.rewards.cash > 0 && <span>💵 +{mail.rewards.cash}</span>}
                    </div>
                    {!mail.isClaimed && (
                      <button className="claim-btn" onClick={() => handleClaimMail(mail._id)}>领取奖励</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- 2. 钱包管理 (整合提现) --- */}
        {activeTab === 'wallet' && (
          <div className="content-section">
            <h2>钱包管理</h2>
            
            <div className="wallet-cards">
              <div className="balance-card points">
                <h4>积分余额</h4>
                <p className="amount">{points}</p>
                <button className="card-action" onClick={() => setShowTransferModal(true)}>积分转增</button>
              </div>
              <div className="balance-card starcoin">
                <h4>星源币</h4>
                <p className="amount">{starcoin}</p>
              </div>
              <div className="balance-card cash">
                <h4>现金余额 (CNY)</h4>
                <p className="amount">¥{safeToFixed(cashBalance)}</p>
                <button className="card-action" onClick={() => setShowWithdraw(true)}>立即提现</button>
              </div>
            </div>

            {/* 钱包操作按钮 (保留充值和提现入口) */}
            <div className="wallet-actions">
              <button className="action-btn recharge" onClick={() => alert('联系管理员充值')}>充值</button>
              <button className="action-btn withdraw" onClick={() => setShowWithdraw(true)}>提现</button>
            </div>

            {/* 账户明细 */}
            <div className="history-section">
              <h3>账户明细</h3>
              <div className="history-list">
                {transactions.length === 0 ? <p>暂无明细</p> : transactions.map((t, idx) => (
                  <div key={idx} className="history-item">
                    <div className="history-info">
                      <p className="history-desc">{t.description}</p>
                      <p className="history-date">{new Date(t.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="history-amount" style={{color: t.amount > 0 ? '#28a745' : '#dc3545'}}>
                      {t.amount > 0 ? '+' : ''}{t.amount}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* --- 原有提现弹窗逻辑 --- */}
            {showWithdraw && (
              <div className="withdraw-modal" onClick={() => setShowWithdraw(false)}>
                <div className="withdraw-content" onClick={(e) => e.stopPropagation()}>
                  <div className="withdraw-header">
                    <h3>💸 现金提现</h3>
                    <button className="close-btn" onClick={() => setShowWithdraw(false)}>×</button>
                  </div>

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

                  <div className="withdraw-process">
                    <h4>提现流程</h4>
                    <div className="process-steps">
                      <div className="process-step"><span className="step-number">1</span><span className="step-text">用户提交提现申请</span></div>
                      <div className="process-step"><span className="step-number">2</span><span className="step-text">管理员后台审核</span></div>
                      <div className="process-step"><span className="step-number">3</span><span className="step-text">审批通过后打款</span></div>
                    </div>
                  </div>

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

                  <div className="withdraw-amount-section">
                    <h4>提现金额</h4>
                    <div className="amount-grid">
                      <div className="amount-row">
                        {[10, 30, 50].map(amt => (
                          <button key={amt} className="amount-btn" onClick={() => handleWithdraw(amt)} disabled={!isAlipayBound || cashBalance < amt}>
                            ¥{amt}
                          </button>
                        ))}
                      </div>
                      <div className="amount-row">
                        {[100, 300, 500].map(amt => (
                          <button key={amt} className="amount-btn" onClick={() => handleWithdraw(amt)} disabled={!isAlipayBound || cashBalance < amt}>
                            ¥{amt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="withdraw-history-section">
                    <div className="section-header">
                      <h4>提现明细</h4>
                      <button className="view-more-btn" onClick={() => setShowWithdrawHistory(!showWithdrawHistory)}>
                        {showWithdrawHistory ? '收起' : '查看全部'} ›
                      </button>
                    </div>
                    {showWithdrawHistory && (
                      <div className="withdraw-history-list">
                        {withdrawHistory.length > 0 ? withdrawHistory.map((item) => (
                          <div key={item._id} className="withdraw-item">
                            <div className="withdraw-info">
                              <p className="withdraw-amount">¥{safeToFixed(item.amount)}</p>
                              <p className="withdraw-account">{item.alipayAccount}</p>
                              <p className="withdraw-date">{new Date(item.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className={`withdraw-status ${item.status}`}>
                              {item.status === 'approved' && '✅ 已成功'}
                              {item.status === 'pending' && '⏳ 待审核'}
                              {item.status === 'rejected' && '❌ 已拒绝'}
                            </div>
                          </div>
                        )) : <div className="empty-withdraw"><p>暂无提现记录</p></div>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- 3. 游戏中心 --- */}
        {activeTab === 'games' && (
          <div className="content-section">
            <h2>游戏中心</h2>
            <div className="game-stats-controls">
              <div className="game-type-selector">
                <button className={statsGameType === 'race' ? 'active' : ''} onClick={() => setStatsGameType('race')}>龟兔赛跑</button>
                <button className={statsGameType === 'mystery' ? 'active' : ''} onClick={() => setStatsGameType('mystery')}>神秘卡牌</button>
              </div>
              <div className="period-selector">
                {['日', '周', '月', '年'].map(p => (
                  <button key={p} className={statsPeriod.includes({日:'day', 周:'week', 月:'month', 年:'year'}[p]) ? 'active' : ''} onClick={() => setStatsPeriod({日:'day', 周:'week', 月:'month', 年:'year'}[p])}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {gameStats ? (
              <div className="stats-dashboard">
                <div className="stat-card">
                  <h4>总流水</h4>
                  <p>{gameStats.totalBet}</p>
                </div>
                <div className="stat-card">
                  <h4>总盈亏</h4>
                  <p className={gameStats.profit >= 0 ? 'profit-win' : 'profit-loss'}>
                    {gameStats.profit >= 0 ? '+' : ''}{gameStats.profit}
                  </p>
                </div>
                <div className="game-details-list">
                  <h4>游戏明细</h4>
                  {gameStats.details.map(d => (
                    <div key={d._id} className="detail-row">
                      <span>{d.description}</span>
                      <span className={d.amount > 0 ? 'win' : 'lose'}>{d.amount > 0 ? '+' : ''}{d.amount}</span>
                      <span>{new Date(d.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p>加载中...</p>
            )}
          </div>
        )}

        {/* --- 4. 账户设置 --- */}
        {activeTab === 'settings' && (
          <div className="content-section">
            <h2>账户设置</h2>
            <div className="settings-card">
              <div className="setting-header"><h3>修改密码</h3></div>
              <form onSubmit={handleChangePassword}>
                <div className="form-group">
                  <label>原密码</label>
                  <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>新密码</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                </div>
                <button type="submit" className="save-btn">保存修改</button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* 转账弹窗 */}
      {showTransferModal && (
        <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>积分转增</h3>
            <input placeholder="对方用户ID" value={transferTargetId} onChange={e => setTransferTargetId(e.target.value)} />
            <input type="number" placeholder="转增金额" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} />
            <p className="tips">手续费: 2%</p>
            <div className="modal-actions">
              <button onClick={() => setShowTransferModal(false)}>取消</button>
              <button onClick={handleTransfer}>确认</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
