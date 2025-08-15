// 向量存储服务
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { ZhipuAIEmbeddings } from '@langchain/community/embeddings/zhipuai';
import { Document } from '@langchain/core/documents';
import { config } from '../config';
import { getLogger } from '../utils/logger';

const logger = getLogger('vectorStoreService');

// 声明向量存储实例映射，用于存储不同类型的向量存储
const vectorStores: Record<string, FaissStore | null> = {};

// 支持的向量存储类型
export type VectorStoreType = 'default' | 'password' | 'dailySkills' | 'workSkills';

/**
 * 初始化向量存储
 * @param type 向量存储类型，默认为'default'
 */
export async function initializeVectorStore(type: VectorStoreType = 'default') {
  try {
    // 如果该类型的向量存储已初始化，则直接返回
    if (vectorStores[type]) {
      logger.info(`Vector store of type '${type}' already initialized`);
      return;
    }

    // 创建ZhipuAI嵌入模型实例
    const embeddings = new ZhipuAIEmbeddings({
      apiKey: config.zhipuai.apiKey,
      modelName: 'embedding-2', // 使用智谱AI的embedding模型
    });

    // 获取对应类型的索引路径
    const indexPath = type === 'default'
      ? config.faiss.defaultIndexPath
      : config.faiss.indexes[type as keyof typeof config.faiss.indexes];

    // 尝试加载现有的FAISS索引
    try {
      vectorStores[type] = await FaissStore.load(indexPath, embeddings);
      logger.info(`FAISS index of type '${type}' loaded successfully from ${indexPath}`);
    } catch (error) {
      // 如果索引不存在，创建一个新的
      logger.info(`Creating new FAISS index for type '${type}' at ${indexPath}`);
      // 可以添加一些初始文档
      const initialDocs: Document[] = [
        { pageContent: `这是${type}类型的初始文档，用于测试RAG功能`, metadata: { source: `initial_${type}` } }
      ];
      vectorStores[type] = await FaissStore.fromDocuments(initialDocs, embeddings);
      // 保存索引
      await vectorStores[type]?.save(indexPath);
      logger.info(`FAISS index for type '${type}' created and saved`);
    }
  } catch (error) {
    logger.error(`Failed to initialize vector store of type '${type}': ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * 获取向量存储实例
 * @param type 向量存储类型，默认为'default'
 * @returns 对应类型的向量存储实例
 */
export function getVectorStore(type: VectorStoreType = 'default') {
  if (!vectorStores[type]) {
    throw new Error(`Vector store of type '${type}' not initialized`);
  }
  return vectorStores[type]!;
}

/**
 * 向向量存储中添加文档
 * @param documents 要添加的文档数组
 * @param type 向量存储类型，默认为'default'
 * @returns 是否添加成功
 */
export async function addDocumentsToVectorStore(documents: Document[], type: VectorStoreType = 'default') {
  // 确保向量存储已初始化
  if (!vectorStores[type]) {
    await initializeVectorStore(type);
  }

  const vectorStore = vectorStores[type];
  if (!vectorStore) {
    throw new Error(`Vector store of type '${type}' not initialized`);
  }

  try {
    // 获取对应类型的索引路径
    const indexPath = type === 'default'
      ? config.faiss.defaultIndexPath
      : config.faiss.indexes[type as keyof typeof config.faiss.indexes];

    await vectorStore.addDocuments(documents);
    // 保存更新后的索引
    await vectorStore.save(indexPath);
    logger.info(`Added ${documents.length} documents to vector store of type '${type}'`);
    return true;
  } catch (error) {
    logger.error(`Failed to add documents to vector store of type '${type}': ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * 从向量存储中检索文档
 * @param query 查询文本
 * @param k 要检索的文档数量
 * @param type 向量存储类型，默认为'default'
 * @returns 检索到的文档数组
 */
export async function retrieveDocuments(query: string, k: number = 4, type: VectorStoreType = 'default') {
  // 确保向量存储已初始化
  if (!vectorStores[type]) {
    await initializeVectorStore(type);
  }

  const vectorStore = vectorStores[type];
  if (!vectorStore) {
    throw new Error(`Vector store of type '${type}' not initialized`);
  }

  try {
    return await vectorStore.similaritySearch(query, k);
  } catch (error) {
    logger.error(`Failed to retrieve documents from vector store of type '${type}': ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}