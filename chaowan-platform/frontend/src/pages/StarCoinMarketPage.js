import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './StarCoinMarketPage.css';
import { 
  ChartContainer, 
  Chart, 
  KlineChart, 
  DepthChart, 
  OrderBook 
} from '../components/MarketComponents'; // ✅ 新增专业组件

const getAuthToken = () => localStorage.getItem('token');

export default function StarCoinMarketPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState({ points: 0, starcoin: 0 });
  const [price, setPrice] = useState('0.5');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('buy');
  const [klines, setKlines] = useState([]);
  const [depth, setDepth] = useState({ sells: [], buys: [] });
  const [trades, setTrades] = useState([]);
  const [orderBook, setOrderBook] = useState({ buys: [], sells: [] });
  const wsRef = useRef(null);

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

  // 获取K线数据
  const fetchKlines = async () => {
    try {
      const res = await fetch('https://tianchang.zeabur.app/api/starcoin/klines');
      const data = await res.json();
      setKlines(data);
    } catch (e) { console.error(e); }
  };

  // 获取深度数据
  const fetchDepth = async () => {
    try {
      const res = await fetch('https://tianchang.zeabur.app/api/starcoin/depth');
      const data = await res.json();
      setDepth(data);
      setOrderBook(data); // 同时更新订单簿
    } catch (e) { console.error(e); }
  };

  // 获取成交记录
  const fetchTrades = async () => {
    try {
      const res = await fetch('https://tianchang.zeabur.app/api/starcoin/trades');
      const data = await res.json();
      setTrades(data);
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
      fetchUser();
      fetchDepth();
    } else {
      alert(result.msg);
    }
  };

  // WebSocket连接
  useEffect(() => {
    fetchUser();
    fetchKlines();
    fetchDepth();
    fetchTrades();

    const token = getAuthToken();
    const ws = new WebSocket(`wss://tianchang.zeabur.app/market?token=${token}`);
    
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'DEPTH_UPDATE') {
        setDepth(msg.data);
        setOrderBook(msg.data);
      } else if (msg.type === 'NEW_TRADE') {
        setPrice(msg.data.price.toString());
        setTrades(prev => [msg.data, ...prev].slice(0, 50)); // 保留最近50条成交
      }
    };
    wsRef.current = ws;

    return () => { if(wsRef.current) wsRef.current.close(); };
  }, []);

  return (
    <div className="starcoin-market">
      {/* 顶部导航 */}
      <div className="market-header">
        <button onClick={() => navigate(-1)}>⬅️ 返回</button>
        <h3>星源币交易市场</h3>
        <div className="market-info">
          <span>最新价: <span className="price">{price}</span></span>
        </div>
      </div>

      {/* 资产信息 */}
      <div className="asset-info">
        <div>积分: {user.points}</div>
        <div>星源币: {user.starcoin}</div>
      </div>

      {/* 主要内容区 */}
      <div className="market-content">
        {/* 左侧：K线图 + 深度图 */}
        <div className="chart-section">
          <div className="kline-chart">
            <ChartContainer title="K线图">
              <KlineChart data={klines} />
            </ChartContainer>
          </div>
          <div className="depth-chart">
            <ChartContainer title="深度图">
              <DepthChart depth={depth} />
            </ChartContainer>
          </div>
        </div>

        {/* 右侧：订单簿 + 交易区 */}
        <div className="trading-section">
          {/* 订单簿 */}
          <div className="order-book">
            <h4>订单簿</h4>
            <OrderBook orders={orderBook} />
          </div>

          {/* 交易区 */}
          <div className="trade-panel">
            <h4>交易区</h4>
            <div className="trade-history">
              <h5>成交记录</h5>
              <div className="trades-list">
                {trades.map((trade, i) => (
                  <div key={i} className={`trade-item ${trade.type}`}>
                    <span>{trade.price}</span>
                    <span>{trade.amount}</span>
                    <span>{new Date(trade.time).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 下单表单 */}
            <div className="trade-form">
              <div className="tabs">
                <button className={type === 'buy' ? 'active' : ''} onClick={() => setType('buy')}>买入</button>
                <button className={type === 'sell' ? 'active' : ''} onClick={() => setType('sell')}>卖出</button>
              </div>
              <form onSubmit={handleSubmit}>
                <input placeholder="价格" value={price} onChange={e => setPrice(e.target.value)} />
                <input placeholder="数量" value={amount} onChange={e => setAmount(e.target.value)} />
                <button type="submit" className={`submit-btn ${type}`}>
                  {type === 'buy' ? '买入' : '卖出'} 星源币
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
