import React from 'react';
import { useUser } from '../../contexts/UserContext';
import './Dolls.css'; // 你需要创建这个CSS文件

const DollInventory = ({ onDeploy, onSelectForSynthesis }) => {
    const { dolls } = useUser();

    return (
        <div className="doll-inventory">
            <h3>娃娃背包</h3>
            <div className="doll-list">
                {dolls.length === 0 ? (
                    <p>背包空空如也，快去抽取新娃娃吧！</p>
                ) : (
                    dolls.map(doll => (
                        <div key={doll._id} className="doll-card">
                            <span className="doll-emoji">{doll.emoji}</span>
                            <span className="doll-name">{doll.name}</span>
                            <span className="doll-level">Lv.{doll.level}</span>
                            <span className="doll-attr">{doll.attribute}</span>
                            <div className="doll-actions">
                                <button onClick={() => onDeploy(doll._id)}>出战</button>
                                <button onClick={() => onSelectForSynthesis(doll)}>选为材料</button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default DollInventory;
