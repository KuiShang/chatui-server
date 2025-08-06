// 路由定义
import { Express, Request, Response } from 'express';
import {
  streamModelResponse,
  getNonStreamingAgentResponse,
  streamChainedModelResponse,
  streamRagEnhancedResponse,
} from './services/agent';

import { addDocumentsToVectorStore } from './services/vectorStore';
import { Document } from '@langchain/core/documents';
import { toUIMessageStream } from '@ai-sdk/langchain';
import {
  UIMessage,
  createUIMessageStream,
  pipeUIMessageStreamToResponse,
} from 'ai';

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
  app.post('/api/chat/chained-model', async (req: Request, res: Response) => {
    try {
      const { question } = req.body;

      if (!question) {
        return res.status(400).json({
          error: 'Question is required',
        });
      }

      // const result = await getNonStreamingAgentResponse(question);

      const result = await streamChainedModelResponse(question);

      // 返回完整 JSON 响应
      // res.status(200).json(result);
      const uiMessageStream = toUIMessageStream(result);

      // 将UI消息流管道到Express响应
      pipeUIMessageStreamToResponse({
        response: res,
        stream: uiMessageStream,
      });
    } catch (error) {
      console.error('Error in chat route:', error);
      res.status(500).json({
        error: 'An error occurred while processing your request',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * 直接调用模型进行聊天的路由
   * @route POST /api/chat/direct-model
   * @param {string} question - 请求体中的问题字符串
   * @returns {Stream} 流式响应，包含模型生成的回答
   */
  app.post('/api/chat/direct-model', async (req: Request, res: Response) => {
    try {
      const { question } = req.body;

      if (!question) {
        return res.status(400).json({
          error: 'Question is required',
        });
      }
      const langChainStream = await streamModelResponse(question);
      const uiMessageStream = toUIMessageStream(langChainStream);

      // 将UI消息流管道到Express响应
      pipeUIMessageStreamToResponse({
        response: res,
        stream: uiMessageStream,
      });
    } catch (error) {
      console.error('Error in chat route:', error);
      res.status(500).json({
        error: 'An error occurred while processing your request',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });
  /**
   * 使用RAG技术增强聊天的路由
   * @route POST /api/chat/rag
   * @param {string} question - 请求体中的问题字符串
   * @returns {Stream} 流式响应，包含基于检索增强的回答
   */
  app.post('/api/chat/rag', async (req: Request, res: Response) => {
    try {
      const { question } = req.body;

      if (!question) {
        return res.status(400).json({
          error: 'Question is required',
        });
      }
      const langChainStream = await streamRagEnhancedResponse(question);

      const uiMessageStream = toUIMessageStream(langChainStream);

      // 将UI消息流管道到Express响应
      pipeUIMessageStreamToResponse({
        response: res,
        stream: uiMessageStream,
      });
    } catch (error) {
      console.error('Error in chat route:', error);
      res.status(500).json({
        error: 'An error occurred while processing your request',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * 使用非流式Agent回答的路由,前端用普通ajax请求接收，不能使用vercel ai sdk 的 useChat接收
   * @route POST /api/chat/non-streaming
   * @param {string} question - 请求体中的问题字符串
   * @returns {Object} JSON响应，包含非流式的回答结果
   */
  app.post('/api/chat/non-streaming', async (req: Request, res: Response) => {
    const { question } = req.body;
    const answer = await getNonStreamingAgentResponse(question);
    // 创建UI消息响应
    const uiMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: answer,
      type: 'text',
    };

    // 返回非流式响应
    res.json({
      success: true,
      message: uiMessage,
    });
  });

  /**
   * 上传文档到知识库的路由
   * @route POST /api/knowledge/documents
   * @param {Array<{content: string, metadata: object}>} documents - 请求体中的文档数组
   * @returns {Object} 包含上传结果的JSON响应
   */
  app.post('/api/knowledge/documents', async (req: Request, res: Response) => {
    try {
      const { documents } = req.body;

      if (!documents || !Array.isArray(documents)) {
        return res.status(400).json({
          error: 'Documents array is required',
        });
      }

      // 转换为Document对象
      const langchainDocs: Document[] = documents.map((doc: any) => ({
        pageContent: doc.content,
        metadata: doc.metadata || {},
      }));

      const success = await addDocumentsToVectorStore(langchainDocs);

      if (success) {
        res.status(200).json({
          message: `Successfully added ${documents.length} documents`,
          count: documents.length,
        });
      } else {
        res.status(500).json({
          error: 'Failed to add documents',
        });
      }
    } catch (error) {
      console.error('Error in documents route:', error);
      res.status(500).json({
        error: 'An error occurred while processing your request',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });
}
