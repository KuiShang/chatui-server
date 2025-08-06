// 路由定义
import { Express, Request, Response } from 'express';
import { Readable } from 'stream';
import { askAgent, askAgentNoStream, askAgent2,askAgent3 } from './services/agent';
import { addDocumentsToVectorStore } from './services/vectorStore';
import { Document } from '@langchain/core/documents';
import { toUIMessageStream } from '@ai-sdk/langchain';
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  pipeUIMessageStreamToResponse,
} from 'ai';

// 不再需要ai包的导入
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

  // 聊天路由 无流式
  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const { question } = req.body;

      if (!question) {
        return res.status(400).json({
          error: 'Question is required',
        });
      }

      // const result = await askAgentNoStream(question);
      const result = await askAgent2(question);

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

  // 聊天路由
  app.post('/api/chat3', async (req: Request, res: Response) => {
    try {
      const { question } = req.body;

      if (!question) {
        return res.status(400).json({
          error: 'Question is required',
        });
      }
      const stream = await askAgent(question);
      const uiStreamResponse = createUIMessageStreamResponse({
        stream: toUIMessageStream(stream),
      });
      // 6. 将 createUIMessageStreamResponse 的结果转换为 Express 响应
      // 关键点：提取流和响应头，通过 Express 的 res 对象返回
      // 安全地设置响应头，只设置必要的Content-Type
      res.set('Content-Type', 'text/event-stream');
      res.set('Cache-Control', 'no-cache');
      res.set('Connection', 'keep-alive');

      // 将 Web ReadableStream 转换为 Node.js Readable 流
      if (uiStreamResponse.body) {
        const reader = uiStreamResponse.body.getReader();
        const nodeStream = new Readable({
          async read() {
            try {
              const { done, value } = await reader.read();
              if (done) {
                this.push(null);
              } else {
                this.push(Buffer.from(value));
              }
            } catch (error) {
              this.emit('error', error);
            }
          },
        });
        nodeStream.pipe(res);
      }
    } catch (error) {
      console.error('Error in chat route:', error);
      res.status(500).json({
        error: 'An error occurred while processing your request',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });
  // 聊天路由
  app.post('/api/chat2', async (req: Request, res: Response) => {
    try {
      const { question } = req.body;

      if (!question) {
        return res.status(400).json({
          error: 'Question is required',
        });
      }
      const langChainStream = await askAgent(question);
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
   // 聊天路由
  app.post('/api/chat4', async (req: Request, res: Response) => {
    try {
      const { question } = req.body;

      if (!question) {
        return res.status(400).json({
          error: 'Question is required',
        });
      }
      const langChainStream = await askAgent3(question);
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
  // 文档上传路由
  app.post('/api/documents', async (req: Request, res: Response) => {
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
