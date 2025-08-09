import { Document } from '@langchain/core/dist/documents/index.js';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { TextLoader } from "langchain/document_loaders/fs/text";
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx';
import { CSVLoader } from '@langchain/community/document_loaders/fs/csv';
import { getLogger } from './logger';

const logger = getLogger('documentLoader');

/**
 * 文档加载器工具类，用于加载不同格式的文档
 */
export class DocumentLoader {
  /**
   * 根据文档类型加载文档
   * @param type 文档类型 (pdf, text, docx, csv)
   * @param content 文档内容或路径
   * @param metadata 文档元数据
   * @returns 加载的文档数组
   */
  public static async loadDocumentByType(
    type: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<any[]> {
    try {
      let loader;
      const fileType = type.toLowerCase();

      switch (fileType) {
        case 'pdf':
          loader = new PDFLoader(content);

          break;
        case 'text':
        case 'txt':
          loader = new TextLoader(content);
          break;
        case 'docx':
          loader = new DocxLoader(content);

          break;
        case 'csv':
          loader = new CSVLoader(content);

          break;
        default:
          logger.error(`Unsupported document type: ${type}`);
          throw new Error(`Unsupported document type: ${type}`);
      }

      const loadedDocs = await loader.load();

      // 添加自定义元数据
      if (metadata) {
        loadedDocs.forEach((doc: Document) => {
          doc.metadata = { ...doc.metadata, ...metadata };
        });
      }

      logger.info(`Successfully loaded ${loadedDocs.length} documents of type ${type}`);
      return loadedDocs;
    } catch (error) {
      logger.error(`Failed to load document of type ${type}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 批量加载多个文档
   * @param documents 文档数组，每个文档包含type, content和可选的metadata
   * @returns 所有加载的文档数组
   */
  public static async batchLoadDocuments(
    documents: Array<{ type: string; content: string; metadata?: Record<string, any> }>
  ): Promise<Document[]> {
    const allDocs: Document[] = [];

    for (const doc of documents) {
      try {
        const loadedDocs = await this.loadDocumentByType(doc.type, doc.content, doc.metadata);
        allDocs.push(...loadedDocs);
      } catch (error) {
        logger.warn(`Skipping document due to error: ${error instanceof Error ? error.message : String(error)}`);
        // 继续处理其他文档
      }
    }

    logger.info(`Successfully loaded total ${allDocs.length} documents in batch`);
    return allDocs;
  }
}