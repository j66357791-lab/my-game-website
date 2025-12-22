import api from '../config/api';

// 创建提现申请
export const createWithdrawal = (withdrawalData) => 
    api.post('/withdrawal/create', withdrawalData);

// 获取用户提现记录
export const getUserWithdrawals = (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/withdrawal/my?${query}`);
};
