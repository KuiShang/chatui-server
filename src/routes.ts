// 路由定义
import { Express, Request, Response, RequestHandler } from 'express';
import { handleChainedModelChat, handleDirectModelChat, handleRagEnhancedChat, handleNonStreamingChat } from './controllers/chatController';
import { handleUploadDocuments } from './controllers/documentsController';
import upload from './middlewares/uploadMiddleware';

/**
 * 设置API路由
 * @param app Express应用实例
 */
export function setupRoutes(app: Express) {
  // 健康检查路由
  app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      message: 'Server is running',
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * 使用链式模型进行聊天的路由
   * @route POST /api/chat/chained-model
   * @param {string} question - 请求体中的问题字符串
   * @returns {Stream} 流式响应，包含模型生成的回答
   */
  app.post('/api/chat/chained-model', handleChainedModelChat);

  /**
   * 直接调用模型进行聊天的路由
   * @route POST /api/chat/direct-model
   * @param {string} question - 请求体中的问题字符串
   * @returns {Stream} 流式响应，包含模型生成的回答
   */
  app.post('/api/chat/direct-model', handleDirectModelChat);

  /**
   * 使用RAG技术增强聊天的路由
   * @route POST /api/chat/rag
   * @param {string} question - 请求体中的问题字符串
   * @returns {Stream} 流式响应，包含基于检索增强的回答
   */
  app.post('/api/chat/rag', handleRagEnhancedChat);

  /**
   * 使用非流式Agent回答的路由
   * @route POST /api/chat/non-streaming
   * @param {string} question - 请求体中的问题字符串
   * @returns {Object} JSON响应，包含非流式的回答结果
   */
  app.post('/api/chat/non-streaming', handleNonStreamingChat);

  /**
   * 上传文档到知识库的路由
   * @route POST /api/knowledge/documents
   * @param {Array<{content: string, metadata: object}>} documents - 请求体中的文档数组
   * @returns {Object} 包含上传结果的JSON响应
   */
  /**
   * 上传文档到知识库的路由
   * @route POST /api/knowledge/documents
   * @param {File[]} documents - FormData中的文件数组
   * @returns {Object} 包含上传结果的JSON响应
   */
  app.post('/api/knowledge/documents', upload.array('documents') as unknown as RequestHandler, handleUploadDocuments as RequestHandler);
}
