import { Document } from '@langchain/core/documents';
import { initializeVectorStore, addDocumentsToVectorStore, retrieveDocuments } from '../services/vectorStoreService';
import { getLogger } from '../utils/logger';

const logger = getLogger('vectorStoreExample');

/**
 * 演示多类型向量存储的使用示例
 */
async function vectorStoreTypeExample() {
  try {
    // 1. 初始化不同类型的向量存储
    logger.info('初始化不同类型的向量存储...');
    await initializeVectorStore('default');
    await initializeVectorStore('password');
    await initializeVectorStore('dailySkills');
    await initializeVectorStore('workSkills');
    logger.info('向量存储初始化完成');

    // 2. 准备不同类型的文档
    const passwordDocs: Document[] = [
      { pageContent: '密码安全最佳实践：使用至少12位字符，包含大小写字母、数字和特殊字符', metadata: { source: 'password_guide.md' } },
      { pageContent: '常见密码破解方法：暴力破解、字典攻击、彩虹表攻击', metadata: { source: 'password_attacks.md' } }
    ];

    const dailySkillsDocs: Document[] = [
      { pageContent: '烹饪技巧：煮意大利面时，水开后加一点盐，可以防止面条粘连', metadata: { source: 'cooking_tips.md' } },
      { pageContent: '家居清洁：白醋和小苏打混合可以有效去除顽固污渍', metadata: { source: 'cleaning_hacks.md' } }
    ];

    const workSkillsDocs: Document[] = [
      { pageContent: '编程技巧：使用TypeScript泛型可以提高代码的复用性和类型安全性', metadata: { source: 'ts_generics.md' } },
      { pageContent: '项目管理：敏捷开发方法论强调迭代开发和持续改进', metadata: { source: 'agile_methodology.md' } }
    ];


    // 3. 向不同类型的向量存储添加文档
    logger.info('向密码类型向量存储添加文档...');
    await addDocumentsToVectorStore(passwordDocs, 'password');

    logger.info('向日常技能类型向量存储添加文档...');
    await addDocumentsToVectorStore(dailySkillsDocs, 'dailySkills');

    logger.info('向工作技能类型向量存储添加文档...');
    await addDocumentsToVectorStore(workSkillsDocs, 'workSkills');

    // 4. 从不同类型的向量存储中检索文档
    logger.info('\n从密码类型向量存储检索文档:');
    const passwordResults = await retrieveDocuments('密码安全', 2, 'password');
    passwordResults.forEach((doc, index) => {
      logger.info(`结果 ${index + 1}:`);
      logger.info(`内容: ${doc.pageContent}`);
      logger.info(`来源: ${doc.metadata.source}\n`);
    });

    logger.info('从日常技能类型向量存储检索文档:');
    const dailySkillsResults = await retrieveDocuments('烹饪技巧', 2, 'dailySkills');
    dailySkillsResults.forEach((doc, index) => {
      logger.info(`结果 ${index + 1}:`);
      logger.info(`内容: ${doc.pageContent}`);
      logger.info(`来源: ${doc.metadata.source}\n`);
    });

    // 5. 测试默认类型的向量存储
    logger.info('从工作技能类型向量存储检索文档:');
    const workSkillsResults = await retrieveDocuments('编程技巧', 2, 'workSkills');
    workSkillsResults.forEach((doc, index) => {
      logger.info(`结果 ${index + 1}:`);
      logger.info(`内容: ${doc.pageContent}`);
      logger.info(`来源: ${doc.metadata.source}\n`);
    });

    logger.info('从默认类型向量存储检索文档:');
    const defaultResults = await retrieveDocuments('测试', 1);
    defaultResults.forEach((doc, index) => {
      logger.info(`结果 ${index + 1}:`);
      logger.info(`内容: ${doc.pageContent}`);
      logger.info(`来源: ${doc.metadata.source}\n`);
    });

  } catch (error) {
    logger.error(`示例运行失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 运行示例
vectorStoreTypeExample();