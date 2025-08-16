// 主应用入口文件
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './config';
import { setupRoutes } from './routes';
import { initializeVectorStore } from './services/vectorStoreService';
import { getLogger } from './utils/logger';

const logger = getLogger('index');

async function startServer() {
  // 配置LangChain跟踪 - 放在应用启动最早期阶段
  // process.env.LANGCHAIN_TRACING_V2 = process.env.LANGCHAIN_TRACING_V2 || 'true';
  // process.env.LANGSMITH_TRACING = process.env.LANGSMITH_TRACING || 'true';
  // process.env.LANGSMITH_ENDPOINT = process.env.LANGSMITH_ENDPOINT || 'https://api.smith.langchain.com';
  // process.env.LANGSMITH_API_KEY = process.env.LANGSMITH_API_KEY;
  // process.env.LANGSMITH_PROJECT = process.env.LANGSMITH_PROJECT || 'chat-server';

  const app = express();
  const server = createServer(app);

  // 中间件
  app.use(express.json());
  // 配置CORS以允许跨域请求
  app.use(cors({
    origin: '*', // 允许所有来源
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // 允许的HTTP方法
    allowedHeaders: ['Content-Type', 'Authorization'] // 允许的请求头
  }));

  // 初始化服务
  await initializeVectorStore();




  // 设置路由
  setupRoutes(app);

  // 启动服务器
  const PORT = config.port || 3000;
  server.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  logger.error(`Failed to start server: ${error.message}`);
});