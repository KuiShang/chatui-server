import { Request, Response } from 'express';
import { sendErrorResponse } from '../utils/commonUtils';
import { getLogger } from '../utils/logger';
import { processUploadedDocuments } from '../services/documentService';

import { Express } from 'express';
export type MulterFile = Express.Multer.File;

const logger = getLogger('documentsController');

/**
 * 处理文档上传请求
 * @param req Express请求对象
 * @param res Express响应对象
 */
export async function handleUploadDocuments(req: Request, res: Response) {
  try {
    // 验证文件是否存在
    const files = req.files as MulterFile[];
    if (!files || files.length === 0) {
      return sendErrorResponse(res, 400, 'No files uploaded');
    }

    try {
      // 调用service处理文档
      const processedCount = await processUploadedDocuments(files);

      return res.status(200).json({
        success: true,
        message: 'Documents uploaded and processed successfully',
        count: processedCount,
      });
    } catch (error) {
      return sendErrorResponse(
        res,
        400,
        'Failed to process documents',
        error instanceof Error ? error.message : String(error),
      );
    }
  } catch (error) {
    logger.error(
      `Error in documents upload: ${error instanceof Error ? error.message : String(error)}`,
    );
    return sendErrorResponse(
      res,
      500,
      'An error occurred while processing your request',
      error instanceof Error ? error.message : String(error),
    );
  }
}
