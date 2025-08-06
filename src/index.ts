// 主应用入口文件
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './config';
import { setupRoutes } from './routes';
import { initializeVectorStore } from './services/vectorStore';
import { initializeAgent } from './services/agent';

async function startServer() {
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
  await initializeAgent();

  // 设置路由
  setupRoutes(app);

  // 启动服务器
  const PORT = config.port || 3000;
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
});