/**
 * @file promptConfig.ts
 * @description 提示词配置管理系统
 * 
 * 这个文件定义了所有可编辑的提示词配置
 * 管理员可以通过管理界面查看和编辑这些提示词
 */

/**
 * 提示词配置项接口
 */
export interface PromptConfigItem {
    id: string;                    // 唯一标识
    name: string;                  // 显示名称
    category: string;              // 分类
    description: string;           // 说明
    content: string;               // 提示词内容
    editable: boolean;             // 是否可编辑
    version: string;               // 版本号
    lastModified?: number;         // 最后修改时间
}

/**
 * 提示词分类
 */
export const PROMPT_CATEGORIES = {
    STRUCTURE: '结构化提示词',
    MAP_TYPE: '导图类型专项',
    GENERATION: '内容生成',
    ANALYSIS: '文本分析',
    OPTIMIZATION: '优化处理',
    CONVERSION: '格式转换'
} as const;

/**
 * 默认提示词配置
 * 这些配置会在首次加载时写入localStorage
 * 之后可以通过管理界面修改
 */
export const DEFAULT_PROMPT_CONFIG: PromptConfigItem[] = [
    {
        id: 'mindmap_structure_base',
        name: '思维导图基础结构',
        category: PROMPT_CATEGORIES.STRUCTURE,
        description: '定义思维导图的JSON输出格式和基本结构规则',
        editable: true,
        version: '1.0.0',
        content: `========================================
【输出格式】: JSON (严格模式)
========================================

你必须返回一个代表根节点的 JSON 对象。
禁止用数组包裹,禁止用 {"root": ...} 这样的额外层级。

【目标结构示例】(注意多层级):
{
  "name": "根节点名称",
  "type": "{{rootType}}",
  "description": "简短概述(不超过100字)",
  "children": [
     { 
       "name": "子节点1", 
       "type": "{{childType}}", 
       "description": "简短描述(不超过80字)", 
       "children": [
         {
           "name": "二级子节点1-1",
           "type": "{{childType}}",
           "description": "更具体的描述",
           "children": []
         }
       ]
     }
  ]
}

========================================
【关键结构规则】(必须严格遵守):
========================================

1. ⚠️ 禁止在 description 中堆砌大量内容!
   - 每个节点的 description 必须简洁(50-100字)
   - 如果有多个要点,必须拆分成多个子节点
   - description 只用于概述,不要列举详细内容

2. ✅ 必须创建足够的子节点:
   - 根节点的 children 数组至少要有 4-8 个子节点
   - 每个子节点必须有 'type'='{{childType}}'
   - 子节点的 name 要具体明确,不要用"其他"、"更多"等模糊词

3. ✅ 必须创建多层级结构:
   - **目标层级深度: 3-4层** (这是重点!)
   - 如果某个子节点内容复杂,必须继续创建它的 children
   - 不要把复杂内容都写在 description 里,而是拆分成子节点
   - 至少50%的一级子节点应该有自己的二级子节点
   - 叶子节点的 children 可以是空数组 []

4. ⚠️ 严禁的错误做法:
   - ❌ 把所有内容写在根节点的 description 里
   - ❌ 只创建1-2个子节点,其他内容都塞在 description
   - ❌ 使用"包括但不限于"、"等等"这样的模糊表述
   - ❌ 子节点 name 重复或过于笼统
   - ❌ 只有一层子节点,没有继续展开

5. ✅ 层级展开策略:
   - 第1层: 主要分类 (4-8个节点)
   - 第2层: 具体项目 (每个分类下2-5个节点)
   - 第3层: 详细属性 (复杂项目下1-3个节点)
   - 第4层: 可选的更细节内容`
    },
    {
        id: 'mindmap_system',
        name: '力量体系导图',
        category: PROMPT_CATEGORIES.MAP_TYPE,
        description: '力量体系/修炼体系的专项要求',
        editable: true,
        version: '1.0.0',
        content: `【力量体系专项要求】:
⚠️ 内容丰富度要求:
- 必须创建完整的等级体系,至少 8-12 个等级节点
- 每个等级必须有独特的能力和特征,不能千篇一律
- 必须包含特殊能力、稀有技能、禁术等吸引眼球的设定

✅ 结构要求:
- 每个等级节点下必须展开 4-6 个子节点:
  * 修炼条件(具体的资源、天赋要求)
  * 能力特征(独特的法术、技能)
  * 突破方法(关键的突破契机)
  * 战力表现(与其他等级的对比)
  * 稀有能力(该等级的特殊技能)
  * 修炼难度(时间、资源消耗)

🎯 精彩程度要求:
- 每个等级要有令人向往的独特能力
- 突破过程要有戏剧性和挑战性
- 高等级要有震撼性的力量展示
- 示例: "金丹期" -> ["凝聚金丹", "御剑飞行", "神识外放", "寿命延长至500年", "雷劫考验", "可炼制四品丹药"]`
    },
    {
        id: 'mindmap_world',
        name: '世界观导图',
        category: PROMPT_CATEGORIES.MAP_TYPE,
        description: '世界观设定的专项要求',
        editable: true,
        version: '1.0.0',
        content: `【世界观专项要求】:
⚠️ 内容丰富度要求:
- 必须创建宏大而独特的世界观,避免套路化设定
- 地理要有特色地标、奇异地形、神秘区域
- 历史要有重大事件、传奇人物、未解之谜
- 势力要有复杂关系、明争暗斗、隐藏组织
- 法则要有独特的世界规则、禁忌、天道设定

✅ 结构要求(至少5个一级节点):
1. 地理 -> 至少4-6个区域,每个区域3-5个子节点
2. 历史 -> 至少3-5个重大历史时期
3. 势力 -> 至少5-8个主要势力
4. 法则 -> 世界运行规则
5. 特色设定 -> 让世界独一无二的元素

🎯 精彩程度要求:
- 每个区域要有吸引人的特色和故事
- 势力之间要有复杂的恩怨情仇
- 历史要为当前剧情埋下伏笔
- 法则要能产生戏剧冲突`
    }
];

/**
 * 从localStorage加载提示词配置
 */
export const loadPromptConfig = (): PromptConfigItem[] => {
    const stored = localStorage.getItem('inkflow_prompt_config');
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error('Failed to parse prompt config:', e);
        }
    }
    // 首次加载,使用默认配置
    savePromptConfig(DEFAULT_PROMPT_CONFIG);
    return DEFAULT_PROMPT_CONFIG;
};

/**
 * 保存提示词配置到localStorage
 */
export const savePromptConfig = (config: PromptConfigItem[]): void => {
    localStorage.setItem('inkflow_prompt_config', JSON.stringify(config));
};

/**
 * 获取单个提示词配置
 */
export const getPromptById = (id: string): PromptConfigItem | undefined => {
    const config = loadPromptConfig();
    return config.find(item => item.id === id);
};

/**
 * 更新单个提示词配置
 */
export const updatePromptConfig = (id: string, updates: Partial<PromptConfigItem>): void => {
    const config = loadPromptConfig();
    const index = config.findIndex(item => item.id === id);
    if (index !== -1) {
        config[index] = {
            ...config[index],
            ...updates,
            lastModified: Date.now()
        };
        savePromptConfig(config);
    }
};

/**
 * 重置提示词配置为默认值
 */
export const resetPromptConfig = (): void => {
    savePromptConfig(DEFAULT_PROMPT_CONFIG);
};

/**
 * 导出提示词配置为JSON
 */
export const exportPromptConfig = (): string => {
    const config = loadPromptConfig();
    return JSON.stringify(config, null, 2);
};

/**
 * 从JSON导入提示词配置
 */
export const importPromptConfig = (jsonString: string): boolean => {
    try {
        const config = JSON.parse(jsonString);
        if (Array.isArray(config)) {
            savePromptConfig(config);
            return true;
        }
    } catch (e) {
        console.error('Failed to import prompt config:', e);
    }
    return false;
};
