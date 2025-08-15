import { Response } from 'express';
import fs from 'fs';
import { getLogger } from './logger';

const logger = getLogger('commonUtils');


/**
 * 处理成功响应
 * @param res Express响应对象
 * @param data 要返回的数据
 * @param statusCode HTTP状态码，默认为200
 */
export function sendSuccessResponse(
  res: Response,
  data: any,
  statusCode: number = 200
) {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}

/**
 * 处理错误响应
 * @param res Express响应对象
 * @param message 错误消息
 * @param statusCode HTTP状态码，默认为500
 * @param details 错误详情
 */
export function sendErrorResponse(
  res: Response,
  statusCode: number = 500,
  message: string,
  details?: any
) {
  return res.status(statusCode).json({
    success: false,
    error: message,
    details,
  });
}

/**
 * 验证请求参数
 * @param params 要验证的参数对象
 * @param requiredFields 必填字段数组
 * @returns {isValid: boolean, missingFields: string[]} 验证结果和缺失字段
 */
export function validateRequestParams(
  params: any,
  requiredFields: string[]
): { isValid: boolean; missingFields: string[] } {
  const missingFields = requiredFields.filter(field => !params[field]);
  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * 清理临时文件
 * @param filePaths 要清理的文件路径数组
 */
export function cleanupTempFiles(filePaths: string[]): void {
  filePaths.forEach((filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`临时文件已删除: ${filePath}`);
      } else {
        logger.warn(`临时文件不存在: ${filePath}`);
      }
    } catch (error) {
      logger.error(
        `Failed to delete temporary file: ${filePath}. Error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  });
}