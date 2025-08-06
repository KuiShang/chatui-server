import { Request, Response } from 'express';
import { addDocumentsToVectorStore } from '../services/vectorStoreService';
import { Document } from '@langchain/core/documents';
import { sendErrorResponse, validateRequestParams } from '../utils/commonUtils';
import { getLogger } from '../utils/logger';

const logger = getLogger('documentsController');

/**
 * 处理文档上传请求
 * @param req Express请求对象
 * @param res Express响应对象
 */
export async function handleUploadDocuments(req: Request, res: Response) {
  try {
    const { documents } = req.body;

    // 验证请求参数
    const { isValid, missingFields } = validateRequestParams(req.body, [
      'documents',
    ]);
    if (!isValid) {
      return sendErrorResponse(
        res,
        400,
        `Missing required fields: ${missingFields.join(', ')}`,
      );
    }

    if (!Array.isArray(documents)) {
      return sendErrorResponse(
        res,
        400,

        'Documents must be an array',
      );
    }

    // 处理不同类型的文档
    const processedDocs = [];
    // for (const doc of documents) {
    //   const { type, content, metadata } = doc;
    //   let loader;

    //   switch (type) {
    //     case 'pdf':
    //       // 处理PDF文档
    //       loader = new PDFLoader(content);
    //       break;
    //     case 'text':
    //       // 处理文本文档
    //       loader = new TextLoader(content);
    //       break;
    //     case 'docx':
    //       // 处理DOCX文档
    //       loader = new DocxLoader(content);
    //       break;
    //     case 'csv':
    //       // 处理CSV文档
    //       loader = new CSVLoader(content);
    //       break;
    //     default:
    //       return sendErrorResponse(
    //         res,
    //         400,
    //         `Unsupported document type: ${type}`,
    //       );
    //   }

    //   const loadedDocs = await loader.load();
    //   processedDocs.push(...loadedDocs);
    // }

    // // 将处理后的文档添加到向量存储
    // await addDocumentsToVectorStore(processedDocs);

    return res.status(200).json({
      success: true,
      message: 'Documents uploaded and processed successfully',
      count: processedDocs.length,
    });
  } catch (error) {
    logger.error(`Error in documents upload: ${error instanceof Error ? error.message : String(error)}`);
    return sendErrorResponse(
      res,
      500,
      'An error occurred while processing your request',
      error instanceof Error ? error.message : String(error),
    );
  }
}
