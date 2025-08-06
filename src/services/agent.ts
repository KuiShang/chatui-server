// Agent服务
import { ChatDeepSeek } from '@langchain/deepseek';
import { ChatZhipuAI } from '@langchain/community/chat_models/zhipuai';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { Runnable, RunnableSequence } from '@langchain/core/runnables';
import { BaseMessage, BaseMessageChunk } from '@langchain/core/messages';
import { Document } from '@langchain/core/documents';
import { ReadableStream } from 'stream/web';
import { Readable } from 'stream';

import { getVectorStore, initializeVectorStore } from './vectorStore';
import { config } from '../config';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import { IterableReadableStream } from '@langchain/core/utils/stream';
import { VectorStoreRetriever } from '@langchain/core/vectorstores';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
//
const stringParser = new StringOutputParser();
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
let retriever: VectorStoreRetriever<FaissStore>;
/**
 * 初始化Agent
 */
export async function initializeAgent() {
  try {
    // 创建DeepSeek聊天模型实例
    // const model = new ChatDeepSeek({
    //   streaming: true,
    //   apiKey: config.deepseek.apiKey,
    //   modelName: config.deepseek.modelName,
    //   temperature: 0.7,
    // });

    model = new ChatZhipuAI({
      streaming: true,
      model: 'GLM-4-Flash', // Available models:
      temperature: 0,
      zhipuAIApiKey: config.zhipuai.apiKey, // In Node.js defaults to process.env.ZHIPUAI_API_KEY
    });

    // 初始化向量存储
    await initializeVectorStore();
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
      console.warn('无法获取文档数量，使用默认k值:', k);
    }
    retriever = vectorStore.asRetriever({ k });

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
    // agent = RetrievalQAChain.fromLLM(model, retriever, {
    //   prompt: promptTemplate,
    //   returnSourceDocuments: true, // 返回源文档
    // });
    agent = await createRetrievalChain({
      combineDocsChain,
      retriever,
    });
    console.log('Agent initialized successfully');
  } catch (error) {
    console.error('Failed to initialize agent:', error);
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
 * 使用Agent进行问答
 * @param question 用户问题
 * @returns 回答结果
 */
export async function askAgentNoStream(question: string) {
  if (!agent) {
    throw new Error('Agent not initialized');
  }
  console.log(`Question: ${question}`);
  try {
    const result = await agent.invoke({ input: question });
    // console.log(`Answer: ${JSON.stringify(result)}`);
    // 使用StringOutputParser解析回答
    const parsedAnswer = await stringParser.invoke(result.answer);
    console.log(`Parsed Answer: ${parsedAnswer}`);

    return parsedAnswer;
  } catch (error) {
    console.error('Failed to ask agent:', error);
    return {
      answer: '抱歉，我无法回答这个问题。',
      sources: [],
    };
  }
}
export async function askAgent(
  question: string,
): Promise<IterableReadableStream<BaseMessageChunk>> {
  if (!agent) {
    throw new Error('Agent not initialized');
  }
  console.log(`Question: ${question}`);
  // 使用LCEL的stream方法获取流式结果
  const stream = await model.stream(question);
  console.log('stream:', stream);
  return stream;
}

export async function askAgent2(question: string) {
  const promptTemplate =
    PromptTemplate.fromTemplate('请回答以下问题 {topic}');
  const chain = RunnableSequence.from([
    promptTemplate,
    model,
    new StringOutputParser(),
  ]);
  // const result = await chain.invoke({ topic: '打工人' });
  const result = await chain.stream({ topic: question });

  return result;
}
export async function askAgent3(question: string) {
  // 创建提示模板
  const promptTemplate = PromptTemplate.fromTemplate(
    `你是一个智能助手，需要根据提供的上下文和用户问题给出准确的回答。

      上下文信息:
      {context}

      用户问题:
      {input}

      回答:`,
  );
  // 获取向量存储实例

  const contextRetrievalChain = RunnableSequence.from([
    (input) => input.question,
    retriever,
  ]);

  const ragChain = RunnableSequence.from([
    {
      context: contextRetrievalChain,
      input: (input) => input.question,
    },
    promptTemplate,
    model,
    new StringOutputParser(),
  ]);
  // const result = await chain.invoke({ topic: '打工人' });
  const result = await ragChain.stream({ question });

  return result;
}
