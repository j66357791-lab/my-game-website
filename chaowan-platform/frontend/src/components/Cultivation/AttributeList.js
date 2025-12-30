import React from 'react';

const AttributeList = ({ attributes }) => {
  // 属性列表的渲染逻辑（可根据需求调整）
  return (
    <div className="attribute-list">
      {Object.entries(attributes).map(([key, value]) => (
        <div key={key} className="attribute-item">
          <span>{key}:</span>
          <span>{value}</span>
        </div>
      ))}
    </div>
  );
};

export default AttributeList;
