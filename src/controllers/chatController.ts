import { Request, Response } from 'express';
import { streamChainedModelResponse, streamModelResponse, streamRagEnhancedResponse, getNonStreamingAgentResponse } from '../services/agentService';
import { toUIMessageStream } from '@ai-sdk/langchain';
import { pipeUIMessageStreamToResponse } from 'ai';
import { sendErrorResponse, validateRequestParams } from '../utils/commonUtils';
import { getLogger } from '../utils/logger';

const logger = getLogger('chatController');

/**
 * 处理链式模型聊天请求
 * @param req Express请求对象
 * @param res Express响应对象
 */
export async function handleChainedModelChat(req: Request, res: Response) {
  try {
    const { question } = req.body;

    // 验证请求参数
    const { isValid, missingFields } = validateRequestParams(req.body, ['question']);
    if (!isValid) {
      return sendErrorResponse(
        res,
        400,
        `Missing required fields: ${missingFields.join(', ')}`
      );
    }

    const result = await streamChainedModelResponse(question);
    const uiMessageStream = toUIMessageStream(result);

    // 将UI消息流管道到Express响应
    pipeUIMessageStreamToResponse({
      response: res,
      stream: uiMessageStream,
    });
  } catch (error) {
    logger.error(`Error in chained model chat: ${error instanceof Error ? error.message : String(error)}`);
    return sendErrorResponse(
      res,
      500,
      'An error occurred while processing your request',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * 处理直接模型聊天请求
 * @param req Express请求对象
 * @param res Express响应对象
 */
export async function handleDirectModelChat(req: Request, res: Response) {
  try {
    const { question } = req.body;

    // 验证请求参数
    const { isValid, missingFields } = validateRequestParams(req.body, ['question']);
    if (!isValid) {
      return sendErrorResponse(
        res,
        400,
        `Missing required fields: ${missingFields.join(', ')}`
      );
    }

    const langChainStream = await streamModelResponse(question);
    const uiMessageStream = toUIMessageStream(langChainStream);

    // 将UI消息流管道到Express响应
    pipeUIMessageStreamToResponse({
      response: res,
      stream: uiMessageStream,
    });
  } catch (error) {
    logger.error(`Error in direct model chat: ${error instanceof Error ? error.message : String(error)}`);
    return sendErrorResponse(
      res,
      500,
      'An error occurred while processing your request',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * 处理RAG增强聊天请求
 * @param req Express请求对象
 * @param res Express响应对象
 */
export async function handleRagEnhancedChat(req: Request, res: Response) {
  try {
    const { question } = req.body;

    // 验证请求参数
    const { isValid, missingFields } = validateRequestParams(req.body, ['question']);
    if (!isValid) {
      return sendErrorResponse(
        res,
        400,
        `Missing required fields: ${missingFields.join(', ')}`
      );
    }

    const langChainStream = await streamRagEnhancedResponse(question);
    const uiMessageStream = toUIMessageStream(langChainStream);

    // 将UI消息流管道到Express响应
    pipeUIMessageStreamToResponse({
      response: res,
      stream: uiMessageStream,
    });
  } catch (error) {
    logger.error(`Error in RAG enhanced chat: ${error instanceof Error ? error.message : String(error)}`);
    return sendErrorResponse(
      res,
      500,
      'An error occurred while processing your request',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * 处理非流式Agent聊天请求
 * @param req Express请求对象
 * @param res Express响应对象
 */
export async function handleNonStreamingChat(req: Request, res: Response) {
  try {
    const { question } = req.body;

    // 验证请求参数
    const { isValid, missingFields } = validateRequestParams(req.body, ['question']);
    if (!isValid) {
      return sendErrorResponse(
        res,
        400,
        `Missing required fields: ${missingFields.join(', ')}`
      );
    }

    const answer = await getNonStreamingAgentResponse(question);

    // 构造符合Vercel AI useChat要求的响应格式
    const uiMessage = {
      id: Date.now().toString(),
      type: 'message',
      data: {
        content: answer,
        role: 'assistant',
        sources: answer,
      },
    };

    return res.status(200).json({
      messages: [uiMessage],
      conversationId: 'non-streaming-' + Date.now(),
      usage: {
        prompt: question,
        completion: answer,
      },
    });
  } catch (error) {
    logger.error(`Error in non-streaming chat: ${error instanceof Error ? error.message : String(error)}`);
    return sendErrorResponse(
      res,
      500,
      'An error occurred while processing your request',
      error instanceof Error ? error.message : String(error)
    );
  }
}