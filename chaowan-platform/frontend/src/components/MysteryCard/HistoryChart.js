// frontend/src/components/MysteryCard/HistoryChart.js
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const HistoryChart = ({ history }) => {
  if (!history || history.length === 0) return <div style={{padding: 20, textAlign: 'center', color: '#999'}}>暂无历史数据</div>;

  // 🔧 兼容性处理：确保数据格式正确
  const data = history.map((item) => ({
    round: `R${item.roundNumber || item.round}`, 
    lord: item.lordCard,
    east: item.generalsCards?.east,
    south: item.generalsCards?.south,
    west: item.generalsCards?.west,
    north: item.generalsCards?.north,
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis dataKey="round" fontSize={12} tickLine={false} />
        <YAxis domain={[1, 10]} fontSize={12} tickLine={false} />
        <Tooltip 
          formatter={(value, name) => {
            const map = { lord: '领主', east: '东', south: '南', west: '西', north: '北' };
            return [value, map[name]];
          }}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        
        <Line type="monotone" dataKey="lord" stroke="#ff4500" strokeWidth={3} name="领主" dot={{ r: 4 }} activeDot={{ r: 7 }} />
        <Line type="monotone" dataKey="east" stroke="#8884d8" strokeWidth={1} name="东" strokeDasharray="5 5" dot={false} />
        <Line type="monotone" dataKey="south" stroke="#82ca9d" strokeWidth={1} name="南" strokeDasharray="5 5" dot={false} />
        <Line type="monotone" dataKey="west" stroke="#ffc658" strokeWidth={1} name="西" strokeDasharray="5 5" dot={false} />
        <Line type="monotone" dataKey="north" stroke="#ff7300" strokeWidth={1} name="北" strokeDasharray="5 5" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default HistoryChart;
