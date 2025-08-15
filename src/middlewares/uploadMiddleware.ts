import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getLogger } from '../utils/logger';

const logger = getLogger('uploadMiddleware');

// 配置multer存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 确保中文文件名正确处理
    try {
      // 检查文件名是否为Buffer，如果是则转换为UTF-8
      const originalname = Buffer.isBuffer(file.originalname)
        ? file.originalname.toString('utf8')
        : file.originalname;
      // 替换可能导致问题的特殊字符
      const safeFilename = originalname.replace(/[\\/:*?"<>|]/g, '_');
      cb(null, `${Date.now()}-${safeFilename}`);
    } catch (error) {
      logger.error(`处理文件名时出错: ${error instanceof Error ? error.message : String(error)}`);
      // 使用时间戳作为备用文件名
      cb(null, `${Date.now()}-file`);
    }
  },
});

// 创建multer实例
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    // 允许的文件类型
    const allowedTypes = [
      'text/plain',
      'text/markdown',
      'application/markdown',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    // 检查文件扩展名是否为.md
    const isMarkdownFile = file.originalname.toLowerCase().endsWith('.md');

    // 如果是octet-stream但扩展名是.md，也允许上传
    if (
      allowedTypes.includes(file.mimetype) ||
      (file.mimetype === 'application/octet-stream' && isMarkdownFile)
    ) {
      cb(null, true);
    } else {
      logger.warn(`不支持的文件类型: ${file.mimetype}`);
      cb(new Error(`不支持的文件类型: ${file.mimetype}`));
    }
  },
});

export default upload;