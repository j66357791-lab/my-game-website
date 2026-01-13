import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './StarCoinMarketPage.css';

// 复用你现有的 Context，或者直接从 localStorage 拿 token
const getAuthToken = () => localStorage.getItem('token');

export default function StarCoinMarketPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState({ points: 0, starcoin: 0 });
  const [klines, setKlines] = useState([]);
  const [depth, setDepth] = useState({ sells: [], buys: [] });
  const [price, setPrice] = useState('0.5');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('buy'); 
  const wsRef = useRef(null);
  const chartRef = useRef(null);
  const chartInstance = useRef(null); // Lightweight Charts 实例

  // 获取用户信息
  const fetchUser = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch('https://tianchang.zeabur.app/api/auth/user', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser({ points: data.data?.points || 0, starcoin: data.data?.starcoin || 0 });
      }
    } catch (e) { console.error(e); }
  };

  // 获取K线
  const fetchKlines = async () => {
    try {
      const res = await fetch('https://tianchang.zeabur.app/api/starcoin/klines');
      const data = await res.json();
      setKlines(data);
      // 这里你应该初始化 Lightweight Charts，这里为了省事省略了图表库的具体引入代码
      // 如果你没有安装 lightweight-charts，请 npm install 它
    } catch (e) { console.error(e); }
  };

  // 获取深度
  const fetchDepth = async () => {
    try {
      const res = await fetch('https://tianchang.zeabur.app/api/starcoin/depth');
      const data = await res.json();
      setDepth(data);
    } catch (e) { console.error(e); }
  };

  // 下单
  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = getAuthToken();
    const res = await fetch('https://tianchang.zeabur.app/api/starcoin/order', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ type, price: Number(price), amount: Number(amount) })
    });
    const result = await res.json();
    if(result.success) {
      alert('下单成功');
      fetchUser(); // 刷新余额
      fetchDepth(); // 刷新盘口
    } else {
      alert(result.msg);
    }
  };

  // 初始化
  useEffect(() => {
    fetchUser();
    fetchKlines();
    fetchDepth();
    
    // WebSocket 连接 (注意这里是 /market 路径)
    const token = getAuthToken();
    const ws = new WebSocket(`wss://tianchang.zeabur.app/market?token=${token}`);
    
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'DEPTH_UPDATE') {
        setDepth(msg.data);
      } else if (msg.type === 'NEW_TRADE') {
        // 收到新成交，更新最新价
        setPrice(msg.data.price.toString());
      }
    };
    wsRef.current = ws;

    return () => { if(wsRef.current) wsRef.current.close(); };
  }, []);

  return (
    <div className="starcoin-market">
      <div className="market-header">
        <button onClick={() => navigate(-1)}>⬅️ 返回</button>
        <h3>星源币市场</h3>
      </div>

      <div className="asset-info">
        <div>积分: {user.points}</div>
        <div>星源币: {user.starcoin}</div>
      </div>

      <div className="chart-placeholder">
        {/* 这里应该是 Lightweight Charts 容器 */}
        <div style={{padding: 20, textAlign: 'center', color: '#999'}}>
          当前价格: <span style={{fontSize: 24, color: 'red'}}>{price}</span>
        </div>
      </div>

      <div className="depth-container">
        <div className="depth-col">
           <h4>卖盘</h4>
           {depth.sells.map((o, i) => (
             <div key={i} className="depth-row">
               <span className="price green">{o.price}</span>
               <span>{o.amount}</span>
             </div>
           ))}
        </div>
        <div className="depth-col">
           <h4>买盘</h4>
           {depth.buys.map((o, i) => (
             <div key={i} className="depth-row">
               <span className="price red">{o.price}</span>
               <span>{o.amount}</span>
             </div>
           ))}
        </div>
      </div>

      <div className="trade-form">
        <div className="tabs">
          <button className={type === 'buy' ? 'active' : ''} onClick={() => setType('buy')}>买入</button>
          <button className={type === 'sell' ? 'active' : ''} onClick={() => setType('sell')}>卖出</button>
        </div>
        <form onSubmit={handleSubmit}>
          <input 
            placeholder="价格" 
            value={price} 
            onChange={e => setPrice(e.target.value)} 
          />
          <input 
            placeholder="数量" 
            value={amount} 
            onChange={e => setAmount(e.target.value)} 
          />
          <button type="submit" className={`submit-btn ${type}`}>
            {type === 'buy' ? '买入' : '卖出'} 星源币
          </button>
        </form>
      </div>
    </div>
  );
}
