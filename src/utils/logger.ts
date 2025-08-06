import winston from 'winston';
import { config } from '../config';

// 定义日志级别
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// 定义日志格式
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, module }) => {
    return `[${timestamp}] [${level}] ${module ? `[${module}] ` : ''}${message}`;
  })
);

// 创建日志记录器
const logger = winston.createLogger({
  level: config.logLevel || 'info',
  levels,
  format,
  transports: [
    // 输出到控制台
    new winston.transports.Console(),
    // 输出到文件 (可选)
    // new winston.transports.File({ filename: 'error.log', level: 'error' }),
    // new winston.transports.File({ filename: 'combined.log' })
  ],
});

// 创建带模块名称的日志记录器
export function getLogger(moduleName: string) {
  return {
    info: (message: string) => logger.info(message, { module: moduleName }),
    warn: (message: string) => logger.warn(message, { module: moduleName }),
    error: (message: string) => logger.error(message, { module: moduleName }),
    debug: (message: string) => logger.debug(message, { module: moduleName }),
  };
}

export default logger;