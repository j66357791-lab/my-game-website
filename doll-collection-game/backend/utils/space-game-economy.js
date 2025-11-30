let bossProbability = {
    low: { stars: [0, 1, 2], weight: 20 },
    medium: { stars: [3, 4, 5], weight: 45 },
    high: { stars: [6, 7, 8], weight: 25 },
    extreme: { stars: [9, 10], weight: 10 }
};

function adjustBossEconomy(totalProfitLoss) {
    const THRESHOLD = 5000;
    const ADJUSTMENT_RATE = 2;

    if (totalProfitLoss < -THRESHOLD) {
        bossProbability.low.weight -= ADJUSTMENT_RATE;
        bossProbability.extreme.weight += ADJUSTMENT_RATE;
        console.log(`[经济调整] 市场过热，降温。高星权重: ${bossProbability.extreme.weight}%`);
    } else if (totalProfitLoss > THRESHOLD) {
        bossProbability.low.weight += ADJUSTMENT_RATE;
        bossProbability.extreme.weight -= ADJUSTMENT_RATE;
        console.log(`[经济调整] 市场过冷，刺激。高星权重: ${bossProbability.extreme.weight}%`);
    }

    bossProbability.low.weight = Math.max(10, Math.min(30, bossProbability.low.weight));
    bossProbability.extreme.weight = Math.max(5, Math.min(15, bossProbability.extreme.weight));
}

function generateBossStar() {
    const rand = Math.random() * 100;
    let cumulative = 0;
    
    cumulative += bossProbability.low.weight;
    if (rand < cumulative) return bossProbability.low.stars[Math.floor(Math.random() * bossProbability.low.stars.length)];

    cumulative += bossProbability.medium.weight;
    if (rand < cumulative) return bossProbability.medium.stars[Math.floor(Math.random() * bossProbability.medium.stars.length)];

    cumulative += bossProbability.high.weight;
    if (rand < cumulative) return bossProbability.high.stars[Math.floor(Math.random() * bossProbability.high.stars.length)];
    
    return bossProbability.extreme.stars[Math.floor(Math.random() * bossProbability.extreme.stars.length)];
}

module.exports = {
    bossProbability,
    adjustBossEconomy,
    generateBossStar
};
