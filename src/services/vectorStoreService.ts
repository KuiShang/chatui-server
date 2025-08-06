// 向量存储服务
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { ZhipuAIEmbeddings } from '@langchain/community/embeddings/zhipuai';
import { Document } from '@langchain/core/documents';
import { config } from '../config';
import { getLogger } from '../utils/logger';

const logger = getLogger('vectorStoreService');

// 声明向量存储实例
let vectorStore: FaissStore | null = null;

/**
 * 初始化向量存储
 */
export async function initializeVectorStore() {
  try {
    // 创建ZhipuAI嵌入模型实例
    const embeddings = new ZhipuAIEmbeddings({
      apiKey: config.zhipuai.apiKey,
      modelName: 'embedding-2', // 使用智谱AI的embedding模型
    });

    // 尝试加载现有的FAISS索引
    try {
      vectorStore = await FaissStore.load(config.faiss.indexPath, embeddings);
      logger.info('FAISS index loaded successfully');
    } catch (error) {
      // 如果索引不存在，创建一个新的
      logger.info('Creating new FAISS index');
      // 可以添加一些初始文档
      const initialDocs: Document[] = [
        { pageContent: '这是一个初始文档，用于测试RAG功能', metadata: { source: 'initial' } }
      ];
      vectorStore = await FaissStore.fromDocuments(initialDocs, embeddings);
      // 保存索引
      await vectorStore.save(config.faiss.indexPath);
      logger.info('FAISS index created and saved');
    }
  } catch (error) {
    logger.error(`Failed to initialize vector store: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * 获取向量存储实例
 */
export function getVectorStore() {
  if (!vectorStore) {
    throw new Error('Vector store not initialized');
  }
  return vectorStore;
}

/**
 * 向向量存储中添加文档
 * @param documents 要添加的文档数组
 */
export async function addDocumentsToVectorStore(documents: Document[]) {
  if (!vectorStore) {
    throw new Error('Vector store not initialized');
  }

  try {
    await vectorStore.addDocuments(documents);
    // 保存更新后的索引
    await vectorStore.save(config.faiss.indexPath);
    logger.info(`Added ${documents.length} documents to vector store`);
    return true;
  } catch (error) {
    logger.error(`Failed to add documents to vector store: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * 从向量存储中检索文档
 * @param query 查询文本
 * @param k 要检索的文档数量
 * @returns 检索到的文档数组
 */
export async function retrieveDocuments(query: string, k: number = 4) {
  if (!vectorStore) {
    throw new Error('Vector store not initialized');
  }

  try {
    return await vectorStore.similaritySearch(query, k);
  } catch (error) {
    logger.error(`Failed to retrieve documents: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}