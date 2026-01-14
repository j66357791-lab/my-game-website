// frontend/src/components/MarketComponents.js
import React from 'react';
import { createChart } from 'lightweight-charts'; 

// K线图组件（自定义）
export const KlineChart = ({ data }) => {
  const chartRef = React.useRef(null);
  const chartInstance = React.useRef(null);

  React.useEffect(() => {
    if (!chartRef.current || !data) return;

    // ✅ 修改1: 使用 createChart 替代 new Chart
    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#e0e0e0' },
        horzLines: { color: '#e0e0e0' },
      },
    });

    const klineSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    klineSeries.setData(data.map(k => ({
      time: k.time,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
    })));

    chartInstance.current = chart;

    return () => {
      chart.remove();
    };
  }, [data]);

  return <div ref={chartRef} className="chart-container" />;
};

// 深度图组件（自定义）
export const DepthChart = ({ depth }) => {
  const chartRef = React.useRef(null);
  const chartInstance = React.useRef(null);

  React.useEffect(() => {
    if (!chartRef.current || !depth) return;

    // ✅ 修改2: 使用 createChart 替代 new Chart
    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 300,
      layout: { background: { color: '#ffffff' } },
    });

    const buySeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'price',
        precision: 4,
      },
    });

    const sellSeries = chart.addHistogramSeries({
      color: '#ef5350',
      priceFormat: {
        type: 'price',
        precision: 4,
      },
    });

    buySeries.setData(depth.buys.map(b => ({ value: b.amount, time: b.price })));
    sellSeries.setData(depth.sells.map(s => ({ value: s.amount, time: s.price })));

    chartInstance.current = chart;

    return () => {
      chart.remove();
    };
  }, [depth]);

  return <div ref={chartRef} className="chart-container" />;
};

// 订单簿组件（自定义）
export const OrderBook = ({ orders }) => {
  return (
    <div className="order-book">
      <div className="order-section">
        <h5>买盘</h5>
        <div className="order-list">
          {orders.buys.slice(0, 10).map((order, i) => (
            <div key={i} className="order-item buy">
              <span>{order.price}</span>
              <span>{order.amount}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="order-section">
        <h5>卖盘</h5>
        <div className="order-list">
          {orders.sells.slice(0, 10).map((order, i) => (
            <div key={i} className="order-item sell">
              <span>{order.price}</span>
              <span>{order.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 通用图表容器（自定义）
export const ChartContainer = ({ title, children }) => {
  return (
    <div className="chart-container">
      <h4>{title}</h4>
      {children}
    </div>
  );
};
