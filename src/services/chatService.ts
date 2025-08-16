import { getVectorStore } from './vectorStoreService';
import { DocumentInterface } from '@langchain/core/documents';
import { getLogger } from '../utils/logger';
import {
  RunnableSequence,
  RunnablePassthrough,
  RunnableBranch,
  RunnableLambda,
} from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatZhipuAI } from '@langchain/community/chat_models/zhipuai';
import { PromptTemplate, ChatPromptTemplate } from '@langchain/core/prompts';
import { config } from '../config';
import { RouterOutputParser } from 'langchain/output_parsers';
import { LLMRouterChain, LLMChain, MultiRouteChain } from 'langchain/chains';
const logger = getLogger('chatService');
import { zodToJsonSchema } from 'zod-to-json-schema';

import { SequentialChain } from 'langchain/chains';
import { z } from 'zod';
// 提取提示模板为常量
const RAG_PROMPT_TEMPLATE = `你是一个智能助手，需要根据提供的上下文和用户问题给出准确的回答。必须严格基于提供的文档回答，不能添加外部信息

  上下文信息:
  {context}

  用户问题:
  {input}

  回答:`;

const QUALITY_PROMPT_TEMPLATE = `
  请评估以下文档与问题的相关性，返回一个0-10的分数（10分为最相关）：
  问题：{query}
  文档：{documents}
  仅返回分数，不要其他内容。
`;

const ADJUST_QUERY_TEMPLATE = `
  以下检索结果与问题相关性较低，请生成一个更精准的检索词：
  原问题：{originalQuery}
  低相关文档：{poorDocuments}
  仅返回新的检索词，不要其他内容。
`;

// 创建共享的语言模型实例
const createZhipuAIModel = () =>
  new ChatZhipuAI({
    streaming: false,
    model: 'GLM-4-Flash',
    temperature: 0,
    zhipuAIApiKey: config.zhipuai.apiKey,
  });

const zhipuAIModel = createZhipuAIModel();

/**
 * 使用RAG技术获取流式增强回答
 * 该函数使用检索增强生成技术，从向量存储中检索相关上下文信息，
 * 结合用户问题生成更准确的回答
 *
 * @param question 用户提出的问题字符串
 * @param maxRetries 最大重试次数（默认2次）
 * @param minScore 最小可接受分数（默认7分）
 * @param retrievalCount 检索文档数量（默认2个）
 * @returns 返回一个可读流，包含模型生成的回答结果
 */
export async function streamRagEnhancedResponse(
  question: string,
  maxRetries: number = 2,
  minScore: number = 7,
  retrievalCount: number = 2,
) {
  let retries = 0;
  // 获取向量存储实例（仅获取一次）
  const vectorStore = getVectorStore();
  const retriever = vectorStore.asRetriever(retrievalCount);

  // 循环重试直到达标或达到最大次数
  while (retries <= maxRetries) {
    try {
      const documents = await retriever.invoke(question);
      const score = await evaluateRetrievalQuality(question, documents);
      logger.info(`检索质量分数: ${score}, 重试次数: ${retries}`);

      // 质量达标则退出循环
      if (score >= minScore) break;

      // 否则调整检索词并重试
      question = await adjustQuery(question, documents);
      logger.info(`重新检索，新的检索词: ${question}`);
      retries++;
    } catch (error) {
      logger.error(
        `检索过程中发生错误: ${error instanceof Error ? error.message : String(error)}`,
      );
      retries++;
      // 如果达到最大重试次数仍失败，则继续执行，使用原始问题
      if (retries > maxRetries) {
        logger.warn(`达到最大重试次数，使用原始问题继续: ${question}`);
      }
    }
  }

  // 创建提示模板
  const promptTemplate = PromptTemplate.fromTemplate(RAG_PROMPT_TEMPLATE);

  // 构建上下文检索链
  const contextRetrievalChain = RunnableSequence.from([
    (input) => input.question,
    retriever,
  ]);

  // 构建完整的RAG链
  const ragChain = RunnableSequence.from([
    {
      context: contextRetrievalChain,
      input: (input) => input.question,
    },
    promptTemplate,
    // 对于流式输出，这里应该使用streaming: true
    new ChatZhipuAI({
      streaming: true,
      model: 'GLM-4-Flash',
      temperature: 0,
      zhipuAIApiKey: config.zhipuai.apiKey,
    }),
    new StringOutputParser(),
  ]);

  // const result = await ragChain.stream({ question });
  return ragChain;
}
/**
 * 评估检索文档质量的函数
 * 该函数使用大语言模型来评估检索到的文档与查询问题的相关性，并返回一个0-10的相关性分数
 *
 * @param query 用户的查询问题
 * @param documents 检索到的文档数组
 * @returns Promise<number> 返回0-10的相关性分数
 */
const evaluateRetrievalQuality = async (
  query: string,
  documents: DocumentInterface<Record<string, any>>[],
) => {
  try {
    const qualityPrompt = PromptTemplate.fromTemplate(QUALITY_PROMPT_TEMPLATE);

    const qualityChain = RunnableSequence.from([
      qualityPrompt,
      zhipuAIModel,
      new StringOutputParser(),
    ]);

    const scoreText = await qualityChain.invoke({
      query,
      documents: documents.map((d) => d.pageContent).join('\n\n'),
    });

    const score = parseInt(scoreText);
    return isNaN(score) ? 0 : Math.max(0, Math.min(10, score)); // 确保分数在0-10范围内
  } catch (error) {
    logger.error(
      `评估检索质量时发生错误: ${error instanceof Error ? error.message : String(error)}`,
    );
    return 0;
  }
};

/**
 * 调整查询词函数，通过AI模型分析低相关性文档，生成更精准的检索词
 * @param originalQuery 原始查询词
 * @param poorDocuments 相关性较低的文档集合
 * @returns 经过AI优化后的新的检索词
 */
const adjustQuery = async (
  originalQuery: string,
  poorDocuments: DocumentInterface<Record<string, any>>[],
) => {
  try {
    const prompt = PromptTemplate.fromTemplate(ADJUST_QUERY_TEMPLATE);

    const adjustChain = prompt.pipe(zhipuAIModel);

    const result = await adjustChain.invoke({
      originalQuery,
      poorDocuments: poorDocuments
        .map((d) => d.pageContent)
        .slice(0, 2)
        .join('\n\n'),
    });

    return result.content.toString().trim() || originalQuery;
  } catch (error) {
    logger.error(
      `调整查询词时发生错误: ${error instanceof Error ? error.message : String(error)}`,
    );
    return originalQuery; // 出错时返回原始查询词
  }
};
const promptTemplate = PromptTemplate.fromTemplate('请回答以下问题 {question}');
// 构建处理链，包含提示词模板、语言模型和字符串输出解析器
const defaultChain = RunnableSequence.from([
  promptTemplate,
  zhipuAIModel,
  new StringOutputParser(),
]);

/**
 * 使用链式模型处理并获取流式响应
 * @param question 用户问题
 * @returns 链式处理后的流式响应
 */
export async function streamChainedModelResponse(question: string) {
  const result = await defaultChain.stream({ question });

  return result;
}

/**
 * 路由聊天请求到适当的处理函数
 * @param question 用户问题
 * @returns ReadableStream<string> 包含回答的可读流
 */
export async function routeChatRequest(question: string) {
  const branch = RunnableBranch.from([
    [
      (x: { topic: string; question: string }) =>
        x.topic.toLowerCase().includes('rag'),
      RunnableLambda.from(() => {
        console.log('RAG 模式');
        return streamRagEnhancedResponse(question);
      }),
    ],
    RunnableLambda.from(() => {
      console.log('默认模式');
      return defaultChain;
    }),
  ]);
  const promptTemplate = PromptTemplate.fromTemplate(
    '请判断以下问题是否与"集成"或"球状闪电"相关，只需回答"rag"或"default"，不要返回其他任何内容。问题：{question}',
  );

  const classificationChain = RunnableSequence.from([
    promptTemplate,
    zhipuAIModel,
    new StringOutputParser(),
  ]);

  const fullChain = RunnableSequence.from([
    {
      topic: classificationChain,
      question: (input: { question: string }) => input.question,
    },
    branch,
  ]);
  const result = await fullChain.stream({ question });
  return result;
}
