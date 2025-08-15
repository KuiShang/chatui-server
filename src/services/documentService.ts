import { MulterFile } from '../controllers/documentsController';
import { DocumentLoader } from '../utils/documentLoader';
import { cleanupTempFiles } from '../utils/commonUtils';
import { addDocumentsToVectorStore } from './vectorStoreService';
import { getLogger } from '../utils/logger';

const logger = getLogger('documentService');

/**
 * 处理上传的文档
 * @param files 上传的文件数组
 * @returns 处理后的文档数量
 */
export async function processUploadedDocuments(files: MulterFile[]): Promise<number> {
  try {
    // 准备要加载的文档
    const docsToLoad = files.map((file: MulterFile) => ({
      type: DocumentLoader.getFileType(file.originalname, file.mimetype),
      path: file.path,
      metadata: {
        source: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      },
    }));

    // 批量加载文档并分割
    const loadedDocs = await DocumentLoader.batchLoadDocuments(
      docsToLoad,
      true,
    );

    // 清理临时文件
    const filePaths = files.map(file => file.path);
    cleanupTempFiles(filePaths);

    // 将分割后的文档添加到向量存储
    await addDocumentsToVectorStore(loadedDocs);

    return loadedDocs.length;
  } catch (error) {
    logger.error(
      `Failed to process documents: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}