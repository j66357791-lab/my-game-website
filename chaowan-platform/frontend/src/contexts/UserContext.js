import React, { createContext, useState, useEffect, useContext } from 'react';
// 修改这行导入
import { 
  login, 
  register, 
  getToken, 
  saveToken, 
  clearToken, 
  validateToken 
} from '../services/authService';

// 创建用户上下文
const UserContext = createContext();

// 用户上下文Provider
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 初始化用户状态
  useEffect(() => {
    const initUser = async () => {
      try {
        const token = getToken();
        if (token) {
          const isValid = await validateToken(token);
          if (isValid) {
            // 这里需要获取用户信息，但你的authService没有这个方法
            // 可能需要添加一个getUser方法到authService
            setUser({ token }); // 临时设置
          }
        }
      } catch (err) {
        console.error('获取用户信息失败:', err);
        setError(err.message);
        clearToken();
      } finally {
        setLoading(false);
      }
    };

    initUser();
  }, []);

  // 登录
  const loginHandler = async (credentials) => {
    try {
      setLoading(true);
      const response = await login(credentials);
      if (response.token) {
        saveToken(response.token);
        setUser(response.user || { token: response.token });
      }
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 注册
  const registerHandler = async (userData) => {
    try {
      setLoading(true);
      const response = await register(userData);
      if (response.token) {
        saveToken(response.token);
        setUser(response.user || { token: response.token });
      }
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 登出
  const logout = () => {
    setUser(null);
    clearToken();
    setError(null);
  };

  // 更新用户信息
  const updateUser = (newUserData) => {
    setUser(prevUser => ({ ...prevUser, ...newUserData }));
  };

  const value = {
    user,
    loading,
    error,
    login: loginHandler,
    register: registerHandler,
    logout,
    updateUser,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin'
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

// 自定义Hook来使用用户上下文
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export default UserContext;
