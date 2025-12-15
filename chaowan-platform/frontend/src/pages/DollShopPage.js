// frontend/src/pages/DollShopPage.js - 重构为管理中心
import React, { useState } from 'react';
import { useUser } from '../contexts/UserContext';
import DollInventory from '../components/Dolls/DollInventory';
import DollDeployment from '../components/Dolls/DollDeployment';
import DollSynthesis from '../components/Dolls/DollSynthesis';
import './DollShopPage.css'; // 这个CSS稍后你提供

const DollShopPage = () => {
    const { drawDoll, deployDoll, recallDoll } = useUser();
    const [activeTab, setActiveTab] = useState('draw'); // 'draw', 'inventory', 'deployment', 'synthesis'

    const renderContent = () => {
        switch (activeTab) {
            case 'draw':
                return (
                    <div className="draw-section">
                        <h2>抽取娃娃</h2>
                        <p>消耗500星源币抽取一个随机娃娃</p>
                        <button onClick={drawDoll}>抽取</button>
                    </div>
                );
            case 'inventory':
                return <DollInventory onDeploy={deployDoll} />;
            case 'deployment':
                return <DollDeployment onRecall={recallDoll} />;
            case 'synthesis':
                return <DollSynthesis />;
            default:
                return null;
        }
    };

    return (
        <div className="doll-shop-page">
            <h1>娃娃管理中心</h1>
            <div className="tab-navigation">
                <button onClick={() => setActiveTab('draw')} className={activeTab === 'draw' ? 'active' : ''}>抽取</button>
                <button onClick={() => setActiveTab('inventory')} className={activeTab === 'inventory' ? 'active' : ''}>背包</button>
                <button onClick={() => setActiveTab('deployment')} className={activeTab === 'deployment' ? 'active' : ''}>出战</button>
                <button onClick={() => setActiveTab('synthesis')} className={activeTab === 'synthesis' ? 'active' : ''}>合成</button>
            </div>
            <div className="tab-content">
                {renderContent()}
            </div>
        </div>
    );
};

export default DollShopPage;
