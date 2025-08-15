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
    // 默认向量存储路径
    defaultIndexPath: process.env.FAISS_INDEX_PATH || './faiss.index',
    // 不同类型知识的向量存储路径配置
    indexes: {
      // 密码类文档存储路径
      password: process.env.FAISS_PASSWORD_INDEX_PATH || './faiss_password.index',
      // 日常技能类文档存储路径
      dailySkills: process.env.FAISS_DAILY_SKILLS_INDEX_PATH || './faiss_daily_skills.index',
      // 工作技能类文档存储路径
      workSkills: process.env.FAISS_WORK_SKILLS_INDEX_PATH || './faiss_work_skills.index',
      // 可以根据需要添加更多类型
    },
  },
};

// 验证必要的环境变量
if (!config.deepseek.apiKey) {
  console.warn('DEEPSEEK_API_KEY is not set in environment variables');
}

if (!config.zhipuai.apiKey) {
  console.warn('ZHIPUAI_API_KEY is not set in environment variables');
}