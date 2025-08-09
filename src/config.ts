// 配置文件
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  logLevel: process.env.LOG_LEVEL || 'info',
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    modelName: 'deepseek-chat',
  },
  serpapi: {
    apiKey: process.env.SERPAPI_API_KEY || '',
  },

  zhipuai: {
    apiKey: process.env.ZHIPUAI_API_KEY || '',
  },
  faiss: {
    indexPath: process.env.FAISS_INDEX_PATH || './faiss.index',
  },
};

// 验证必要的环境变量
if (!config.deepseek.apiKey) {
  console.warn('DEEPSEEK_API_KEY is not set in environment variables');
}

if (!config.zhipuai.apiKey) {
  console.warn('ZHIPUAI_API_KEY is not set in environment variables');
}