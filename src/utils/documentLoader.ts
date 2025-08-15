import { Document } from '@langchain/core/dist/documents/index.js';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx';
import { CSVLoader } from '@langchain/community/document_loaders/fs/csv';
import { Buffer } from 'buffer';
import {
  RecursiveCharacterTextSplitter,
  MarkdownTextSplitter,
} from 'langchain/text_splitter';

import { getLogger } from './logger';
import path from 'path';

const logger = getLogger('documentLoader');

/**
 * 文档加载器工具类，用于加载不同格式的文档
 */
export class DocumentLoader {
  /**
   * 根据文件名和MIME类型确定文件类型
   * @param filename 文件名
   * @param mimetype MIME类型
   * @returns 文件类型 (pdf, docx, markdown, text)
   */
  public static getFileType(filename: string, mimetype: string): string {
    const extension = path.extname(filename).toLowerCase();
    if (extension === '.md' || mimetype === 'text/markdown') {
      return 'markdown';
    } else if (extension === '.pdf' || mimetype === 'application/pdf') {
      return 'pdf';
    } else if (
      extension === '.docx' ||
      mimetype ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return 'docx';
    } else if (extension === '.csv' || mimetype === 'text/csv') {
      return 'csv';
    } else {
      return 'text';
    }
  }

  /**
export class DocumentLoader {
  /**
   * 处理文件路径，确保中文和特殊字符正确编码
   * @param filePath 原始文件路径
   * @returns 处理后的安全文件路径
   */
  public static sanitizeFilePath(filePath: string): string {
    try {
      // 检查文件路径是否为Buffer，如果是则转换为UTF-8
      const safePath = Buffer.isBuffer(filePath)
        ? filePath.toString('utf8')
        : filePath;
      return safePath;
    } catch (error) {
      logger.error(`处理文件路径时出错: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 根据文档类型加载文档
   * @param type 文档类型 (pdf, text, docx, csv)
   * @param filePath 文档文件路径
   * @param metadata 文档元数据
   * @returns 加载的文档数组
   */
  public static async loadDocumentByType(
    type: string,
    filePath: string,
    metadata?: Record<string, any>,
  ): Promise<any[]> {
    try {
      let loader;
      const fileType = type.toLowerCase();
      // 确保文件路径正确处理
      const safeFilePath = this.sanitizeFilePath(filePath);

      switch (fileType) {
        case 'pdf':
          loader = new PDFLoader(safeFilePath);

          break;
        case 'text':
        case 'txt':
        case 'markdown':
          loader = new TextLoader(safeFilePath);
          break;
        case 'docx':
          loader = new DocxLoader(safeFilePath);

          break;
        case 'csv':
          loader = new CSVLoader(safeFilePath);

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

      logger.info(
        `Successfully loaded ${loadedDocs.length} documents of type ${type}`,
      );
      return loadedDocs;
    } catch (error) {
      logger.error(
        `Failed to load document of type ${type}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * 根据文档类型分割文档
   * @param docs 要分割的文档数组
   * @returns 分割后的文档数组
   */
  public static async splitDocuments(docs: Document[]): Promise<Document[]> {
    const splitDocs: Document[] = [];

    for (const doc of docs) {
      // 根据文档类型选择合适的分割器
      let splitter;
      const docType = doc.metadata.type?.toLowerCase() || '';
      const fileExtension =
        doc.metadata.source?.split('.').pop()?.toLowerCase() || '';

      // 判断是否为Markdown文档
      if (
        docType === 'markdown' ||
        docType === 'md' ||
        fileExtension === 'md'
      ) {
        splitter = new MarkdownTextSplitter({
          chunkSize: 1000,
          chunkOverlap: 200,
        });
        // 确保中文文件名在日志中正确显示
        const sourceName = doc.metadata.source
          ? Buffer.isBuffer(doc.metadata.source)
            ? doc.metadata.source.toString('utf8')
            : doc.metadata.source
          : '未知';
        logger.info(
          `使用MarkdownTextSplitter处理文档: ${sourceName}`,
        );
      } else {
        splitter = new RecursiveCharacterTextSplitter({
          chunkSize: 500,
          chunkOverlap: 100,
        });
        // 确保中文文件名在日志中正确显示
        const sourceName = doc.metadata.source
          ? Buffer.isBuffer(doc.metadata.source)
            ? doc.metadata.source.toString('utf8')
            : doc.metadata.source
          : '未知';
        logger.info(
          `使用RecursiveCharacterTextSplitter处理文档: ${sourceName}`,
        );
      }

      const chunks = await splitter.splitDocuments([doc]);
      splitDocs.push(...chunks);
    }

    return splitDocs;
  }
  /**
   * 批量加载文档
   * @param documents - 文档信息数组，每个元素包含文档类型、路径和可选的元数据
   * @param split - 是否对加载的文档进行分割，默认为false
   * @returns 返回加载成功的文档数组
   */
  // 修改batchLoadDocuments方法，添加split参数
  public static async batchLoadDocuments(
    documents: Array<{
      type: string;
      path: string;
      metadata?: Record<string, any>;
    }>,
    split: boolean = false,
  ): Promise<Document[]> {
    const allDocs: Document[] = [];

    // 遍历所有文档进行加载处理
    for (const doc of documents) {
      try {
        const loadedDocs = await this.loadDocumentByType(
          doc.type,
          doc.path,
          doc.metadata,
        );
        if (split) {
          // 如果需要分割，则对文档进行分割处理
          const splitDocs = await this.splitDocuments(loadedDocs);
          allDocs.push(...splitDocs);
        } else {
          // 直接添加加载的文档
          allDocs.push(...loadedDocs);
        }
      } catch (error) {
        logger.warn(
          `Skipping document due to error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    logger.info(
      `Successfully loaded total ${allDocs.length} documents in batch`,
    );
    return allDocs;
  }
}
