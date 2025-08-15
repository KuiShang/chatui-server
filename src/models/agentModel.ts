import { ChatZhipuAI } from '@langchain/community/chat_models/zhipuai';
import { Runnable, RunnableSequence } from '@langchain/core/runnables';
import { BaseMessage, BaseMessageChunk } from '@langchain/core/messages';
import { Document } from '@langchain/core/documents';
import { getVectorStore } from '../services/vectorStoreService';
import { config } from '../config';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import { IterableReadableStream } from '@langchain/core/utils/stream';
import { VectorStoreRetriever } from '@langchain/core/vectorstores';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { getLogger } from '../utils/logger';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

const logger = getLogger('agentModel');

// 声明agent实例
let agent: Runnable<
  {
    input: string;
    chat_history?: BaseMessage[] | string;
    [key: string]: unknown;
  },
  {
    context: Document[];
    answer: string;
    [key: string]: unknown;
  }
> | null = null;
let model: ChatZhipuAI;
const stringParser = new StringOutputParser();

/**
 * 初始化Agent
 */
export async function initializeAgent() {
  try {
    model = new ChatZhipuAI({
      streaming: true,
      model: 'GLM-4-Flash', // Available models:
      temperature: 0,
      zhipuAIApiKey: config.zhipuai.apiKey, // In Node.js defaults to process.env.ZHIPUAI_API_KEY
    });

    // 获取向量存储实例
    const vectorStore = getVectorStore();

    // 创建检索器
    // 先检查向量数据库中的文档数量
    let k = 4;
    try {
      // 获取向量存储中的文档数量
      const docCount = await vectorStore
        .similaritySearch('任何查询', 1000)
        .then((docs) => docs.length);
      // 确保k不超过文档数量
      k = Math.min(k, docCount > 0 ? docCount : 1);
    } catch (error) {
      logger.warn(`无法获取文档数量，使用默认k值: ${k}`);
    }
    const retriever = vectorStore.asRetriever({ k });

    // 创建提示模板
    const promptTemplate = PromptTemplate.fromTemplate(
      `你是一个智能助手，需要根据提供的上下文和用户问题给出准确的回答。

        上下文信息:
        {context}

        用户问题:
        {input}

        回答:`,
    );
    const combineDocsChain = await createStuffDocumentsChain({
      llm: model,
      prompt: promptTemplate,
    });
    // 创建RAG链
    agent = await createRetrievalChain({
      combineDocsChain,
      retriever,
    });
    logger.info('Agent initialized successfully');
  } catch (error) {
    logger.error(
      `Failed to initialize agent: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

/**
 * 获取Agent实例
 */
export function getAgent() {
  if (!agent) {
    throw new Error('Agent not initialized');
  }
  return agent;
}

/**
 * 获取非流式Agent回答
 * @param question 用户问题
 * @returns 解析后的回答结果字符串
 */
export async function getNonStreamingAgentResponse(question: string) {
  if (!agent) {
    throw new Error('Agent not initialized');
  }
  logger.info(`Question: ${question}`);
  try {
    const result = await agent.invoke({ input: question });
    // 使用StringOutputParser解析回答
    const parsedAnswer = await stringParser.invoke(result.answer);
    logger.info(`Parsed Answer: ${parsedAnswer}`);

    return parsedAnswer;
  } catch (error) {
    logger.error(
      `Failed to ask agent: ${error instanceof Error ? error.message : String(error)}`,
    );
    return '抱歉，我无法回答这个问题。';
  }
}

/**
 * 直接向模型提问并获取流式响应
 * @param question 用户问题
 * @returns 模型生成的流式响应
 */
export async function streamModelResponse(
  question: string,
): Promise<IterableReadableStream<BaseMessageChunk>> {
  if (!agent) {
    throw new Error('Agent not initialized');
  }
  logger.info(`Question: ${question}`);
  // 直接调用模型的stream方法获取流式结果
  const stream = await model.stream(question);
  return stream;
}

/**
 * 使用链式模型处理并获取流式响应
 * @param question 用户问题
 * @returns 链式处理后的流式响应
 */
export async function streamChainedModelResponse(question: string) {
  // 创建提示词模板，用于格式化问题输入
  const promptTemplate = PromptTemplate.fromTemplate('请回答以下问题 {topic}');

  // 构建处理链，包含提示词模板、语言模型和字符串输出解析器
  const chain = RunnableSequence.from([
    promptTemplate,
    model,
    new StringOutputParser(),
  ]);

  // 执行链式调用并获取流式结果
  const result = await chain.stream({ topic: question });
  return result;
}




