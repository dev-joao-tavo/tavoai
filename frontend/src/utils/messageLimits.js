import axios from "../api/api";
import * as constants from '../utils/constants';

export const checkDailyLimit = async (quantityToSend) => {
  try {
    const token = localStorage.getItem('token');
    const today = new Date().toISOString().split('T')[0];
    
    const response = await axios.get(
      `${constants.API_BASE_URL}/message-history/daily-count`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    
    const sentToday = response.data.count || 0;
    const remaining = 200 - sentToday;
    
    return {
      canSend: remaining >= quantityToSend,
      remaining,
      limit: 200,
      wouldExceed: quantityToSend > remaining
    };
  } catch (error) {
    console.error('Error checking daily limit:', error);
    return { canSend: false, error: "Failed to check limits" };
  }
};