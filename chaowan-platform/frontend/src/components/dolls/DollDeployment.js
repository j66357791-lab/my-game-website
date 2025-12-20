import React from 'react';
import { useUser } from '../../contexts/UserContext';
import './Dolls.css';

const DollDeployment = ({ onRecall }) => {
    const { deployedDolls } = useUser();

    return (
        <div className="doll-deployment">
            <h3>出战位 ({deployedDolls.length}/5)</h3>
            <div className="doll-list">
                {deployedDolls.length === 0 ? (
                    <p>还有空闲的出战位，派遣你的娃娃去战斗吧！</p>
                ) : (
                    deployedDolls.map(doll => (
                        <div key={doll._id} className="doll-card deployed">
                            <span className="doll-emoji">{doll.emoji}</span>
                            <span className="doll-name">{doll.name}</span>
                            <span className="doll-level">Lv.{doll.level}</span>
                            <span className="doll-attr">{doll.attribute}</span>
                            <div className="doll-actions">
                                <button onClick={() => onRecall(doll._id)}>召回</button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default DollDeployment;
