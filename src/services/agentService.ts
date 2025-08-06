// 这是一个导出层，保持API兼容性
import {
  initializeAgent,
  getAgent,
  getNonStreamingAgentResponse,
  streamModelResponse,
  streamChainedModelResponse,
  streamRagEnhancedResponse,
} from '../models/agentModel';

export {
  initializeAgent,
  getAgent,
  getNonStreamingAgentResponse,
  streamModelResponse,
  streamChainedModelResponse,
  streamRagEnhancedResponse,
};

// 为了向后兼容保留旧的导入路径
import { initializeVectorStore } from './vectorStoreService';
export {
  initializeVectorStore
};
