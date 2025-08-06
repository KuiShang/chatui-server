# ChatUI Server

基于LangChain.js的后端项目，支持RAG和智能聊天agent。

## 技术栈
- Node.js + TypeScript
- LangChain.js
- DeepSeek大模型
- FAISS向量数据库
- 智谱AI Embeddings
- Express

## 功能
- 智能聊天：基于DeepSeek大模型的对话功能
- RAG检索增强：结合文档知识库回答问题
- 文档管理：上传和管理用于RAG的文档

## 环境配置
1. 复制`.env.example`文件为`.env`
2. 填写必要的API密钥：
   - DEEPSEEK_API_KEY: DeepSeek API密钥
   - ZHIPUAI_API_KEY: 智谱AI API密钥

## 安装依赖
```bash
npm install
```

## 运行项目
```bash
# 开发模式
npm run dev

# 编译项目
npm run build

# 生产模式运行
npm start
```

## API接口
- POST /api/chat: 聊天接口
- POST /api/documents: 上传文档接口
- GET /api/health: 健康检查接口

## 项目结构
- src/index.ts: 应用入口
- src/config.ts: 配置文件
- src/routes.ts: 路由定义
- src/services/vectorStore.ts: 向量存储服务
- src/services/agent.ts: AI agent服务

## 注意事项
1. 确保安装了所有依赖
2. 确保正确配置了API密钥
3. 首次运行会创建FAISS索引文件