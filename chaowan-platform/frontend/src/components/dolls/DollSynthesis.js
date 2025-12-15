import React, { useState } from 'react';
import { useUser } from '../../contexts/UserContext';
import DollInventory from './DollInventory';
import './Dolls.css';

const DollSynthesis = () => {
    const { synthesizeDoll } = useUser();
    const [selectedBase, setSelectedBase] = useState(null);
    const [selectedMaterials, setSelectedMaterials] = useState([]);

    const handleSelectBase = (doll) => {
        setSelectedBase(doll);
    };

    const handleSelectMaterial = (doll) => {
        if (selectedMaterials.find(m => m._id === doll._id)) {
            setSelectedMaterials(selectedMaterials.filter(m => m._id !== doll._id));
        } else if (selectedMaterials.length < 4) {
            setSelectedMaterials([...selectedMaterials, doll]);
        } else {
            alert('最多只能选择4个材料');
        }
    };

    const handleSynthesize = async () => {
        if (!selectedBase || selectedMaterials.length !== 4) {
            alert('请选择1个本体和4个材料');
            return;
        }
        try {
            const materialIds = selectedMaterials.map(m => m._id);
            await synthesizeDoll(selectedBase._id, materialIds);
            // 合成成功后，重置选择
            setSelectedBase(null);
            setSelectedMaterials([]);
        } catch (error) {
            // 错误已在 UserContext 中处理
        }
    };

    return (
        <div className="doll-synthesis">
            <h3>娃娃合成</h3>
            <div className="synthesis-area">
                <div className="selection-slot">
                    <p>本体 (1个)</p>
                    {selectedBase ? (
                        <div className="selected-doll">
                            <span>{selectedBase.emoji}</span>
                            <span>{selectedBase.name}</span>
                        </div>
                    ) : (
                        <div className="empty-slot">请选择</div>
                    )}
                </div>
                <div className="selection-slot">
                    <p>材料 (4个)</p>
                    <div className="material-slots">
                        {selectedMaterials.map(doll => (
                            <div key={doll._id} className="selected-doll">
                                <span>{doll.emoji}</span>
                                <span>{doll.name}</span>
                            </div>
                        ))}
                        {[...Array(4 - selectedMaterials.length)].map((_, i) => (
                            <div key={i} className="empty-slot">-</div>
                        ))}
                    </div>
                </div>
            </div>
            <button 
                onClick={handleSynthesize} 
                disabled={!selectedBase || selectedMaterials.length !== 4}
            >
                合成
            </button>
            
            <hr />
            <h4>从背包中选择娃娃</h4>
            <DollInventory 
                onDeploy={() => {}} // 在合成页面禁用出战按钮
                onSelectForSynthesis={(doll) => {
                    // 如果没选本体，则设为本体，否则设为材料
                    if (!selectedBase) {
                        handleSelectBase(doll);
                    } else {
                        handleSelectMaterial(doll);
                    }
                }}
            />
        </div>
    );
};

export default DollSynthesis;
