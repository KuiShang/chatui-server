# ChatUI-Server

基于LangChain.js的后端服务，支持RAG（检索增强生成）和智能聊天agent功能。本项目提供了完整的API接口，可用于构建智能问答系统、知识库查询等应用。

## 技术栈
- Node.js + TypeScript
- LangChain.js: 用于构建LLM应用程序的开发框架
- DeepSeek/GLM-4-Flash大模型: 提供对话和文本生成能力
- FAISS向量数据库: 用于高效存储和检索文档向量
- 智谱AI Embeddings: 用于生成文本向量表示
- Express: Web服务器框架

## 功能特点
- **智能聊天**: 基于大模型的对话功能，支持上下文理解和多轮对话
- **RAG检索增强**: 结合文档知识库回答问题，提高回答准确性
- **文档管理**: 支持文档上传、解析和向量存储
- **检索优化**: 实现了检索质量评估和查询词自动优化
- **多类型知识存储**: 支持按类型存储不同知识，优化检索效果
- **流式响应**: 支持LLM生成结果的流式输出，提升用户体验

## 环境配置
1. 复制`.env.example`文件为`.env`
2. 填写必要的API密钥：
   - DEEPSEEK_API_KEY: DeepSeek API密钥
   - ZHIPUAI_API_KEY: 智谱AI API密钥

## 安装依赖
```bash
# 使用npm
npm install

# 或使用yarn
yarn install
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
### 聊天接口
- **URL**: `/api/chat`
- **方法**: `POST`
- **参数**: 
  - `question`: 问题文本
  - `chatHistory`: 聊天历史数组（可选）
- **返回**: 流式响应，包含AI生成的回答

### 文档上传接口
- **URL**: `/api/documents`
- **方法**: `POST`
- **参数**: 
  - `file`: 上传的文档文件
  - `type`: 文档类型（可选，用于分类存储）
- **返回**: 上传状态和文档ID

### 健康检查接口
- **URL**: `/api/health`
- **方法**: `GET`
- **返回**: 服务状态信息

## 项目结构
```
├── src/
│   ├── index.ts: 应用入口
│   ├── config.ts: 配置文件
│   ├── routes.ts: 路由定义
│   ├── controllers/
│   │   ├── chatController.ts: 聊天相关接口
│   │   └── documentsController.ts: 文档管理接口
│   ├── examples/
│   │   └── vectorStoreTypeExample.ts: 向量存储类型示例
│   ├── middlewares/
│   │   └── uploadMiddleware.ts: 文件上传中间件
│   ├── models/
│   │   └── agentModel.ts: AI agent模型
│   ├── services/
│   │   ├── agentService.ts: AI agent服务
│   │   ├── chatService.ts: 聊天服务
│   │   ├── documentService.ts: 文档服务
│   │   ├── optimizedChatService.ts: 优化版聊天服务
│   │   └── vectorStoreService.ts: 向量存储服务
│   └── utils/
│       ├── commonUtils.ts: 通用工具函数
│       ├── documentLoader.ts: 文档加载工具类
│       └── logger.ts: 日志工具
├── uploads/: 上传文档存储目录
└── package.json: 项目依赖配置
```

## 使用示例
### 聊天接口调用示例
```javascript
// 使用fetch API调用聊天接口
const chatWithAI = async (question) => {
  const response = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question }),
  });

  // 处理流式响应
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let result = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    result += chunk;
    console.log('Received chunk:', chunk);
  }

  return result;
};
```

### 多类型知识存储使用示例
```typescript
// 初始化不同类型的向量存储
await initializeVectorStore('password');
await initializeVectorStore('dailySkills');
await initializeVectorStore('workSkills');

// 向不同类型存储添加文档
await addDocumentsToVectorStore(passwordDocs, 'password');
await addDocumentsToVectorStore(dailySkillsDocs, 'dailySkills');
await addDocumentsToVectorStore(workSkillsDocs, 'workSkills');

// 从指定类型存储检索文档
const results = await retrieveDocuments('编程技巧', 2, 'workSkills');
```

## 注意事项
1. 确保安装了所有依赖
2. 确保正确配置了API密钥
3. 首次运行会创建FAISS索引文件
4. 对于大型文档集，可能需要调整向量存储配置以提高性能
5. 如需生产部署，建议配置适当的日志和监控系统

## 许可证
[MIT License](LICENSE)