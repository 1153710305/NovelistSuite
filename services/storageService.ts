
/**
 * @file services/storageService.ts
 * @description 本地存储 (LocalStorage) 服务层。
 * 
 * ## 功能
 * - **数据持久化**: 封装浏览器的 localStorage API，提供类型安全的读写操作。
 * - **键值管理**: 集中管理所有存储 Key，避免命名冲突。
 * - **历史记录队列**: 实现了定长的历史记录队列（先进后出），自动修剪旧数据以控制存储体积。
 * 
 * ## 使用场景
 * - 保存用户设置、模型选择。
 * - 持久化生成的灵感、小说草稿、思维导图。
 * - 存储系统日志。
 */

// 存储键常量定义
export const STORAGE_KEYS = {
  SETTINGS: 'inkflow_settings',        // 全局设置 (语言, 模型)
  STUDIO: 'inkflow_studio',            // 工作室当前状态 (草稿箱)
  ARCHITECT: 'inkflow_architect',      // 架构师当前状态 (大纲设计)
  HISTORY_LAB: 'inkflow_history_lab',  // 实验室历史记录
  HISTORY_STUDIO: 'inkflow_history_studio', // 工作室项目历史
  HISTORY_ARCHITECT: 'inkflow_history_architect', // 架构设计历史
  HISTORY_COVERS: 'inkflow_history_covers', // 封面生成历史
  HISTORY_CHAT: 'inkflow_history_chat',     // 对话历史
  PROMPT_LIB: 'inkflow_prompt_library',      // 提示词库
  GLOBAL_PERSONA: 'inkflow_global_persona',   // 当前激活的全局 AI 身份设定 (System Instruction)
  PERSONA_LIB: 'inkflow_persona_library',      // 全局身份库 (List)
  MODEL_CONFIGS: 'inkflow_model_configs'       // 自定义模型配置 (Token Limits 等)
};

/**
 * 通用保存方法
 * 自动进行 JSON 序列化，并捕获 QuotaExceededError (存储空间已满)。
 * @param key 存储键
 * @param data 存储数据
 */
export const saveToStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to local storage', e);
    // TODO: 可以在这里添加 Toast 提示用户清理空间
  }
};

/**
 * 通用读取方法
 * 自动进行 JSON 反序列化，处理空值情况。
 * @param key 存储键
 * @returns 解析后的对象或 null
 */
export const loadFromStorage = (key: string) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (e) {
    console.error('Failed to load from local storage', e);
    return null;
  }
};

// --- 历史记录队列管理 ---

/**
 * 添加历史记录
 * 将新条目添加到数组头部，并限制最大长度为 50 条。
 * @param key 存储键
 * @param item 新记录
 * @returns 更新后的历史列表
 */
export const addHistoryItem = <T extends { id: string }>(key: string, item: T) => {
    const current = loadFromStorage(key) || [];
    const updated = [item, ...current];
    if (updated.length > 50) updated.length = 50; // 强制修剪
    saveToStorage(key, updated);
    return updated;
};

/**
 * 更新历史记录
 * 根据 ID 查找并合并更新字段，同时更新时间戳。
 * @param key 存储键
 * @param id 目标记录 ID
 * @param updates 更新的字段
 * @returns 更新后的历史列表
 */
export const updateHistoryItem = <T extends { id: string }>(key: string, id: string, updates: Partial<T>) => {
    const current = loadFromStorage(key) || [];
    const index = current.findIndex((item: T) => item.id === id);
    
    if (index !== -1) {
        const updatedItem = { ...current[index], ...updates, timestamp: Date.now() };
        // 保持原位更新
        const newHistory = [
            ...current.slice(0, index),
            updatedItem,
            ...current.slice(index + 1)
        ];
        saveToStorage(key, newHistory);
        return newHistory;
    }
    return current;
};

/**
 * 获取所有历史记录
 * @param key 存储键
 * @returns 历史列表
 */
export const getHistory = <T>(key: string): T[] => {
    return loadFromStorage(key) || [];
};

/**
 * 删除单条历史记录
 * @param key 存储键
 * @param id 目标 ID
 * @returns 更新后的历史列表
 */
export const deleteHistoryItem = <T extends { id: string }>(key: string, id: string): T[] => {
    const current = loadFromStorage(key) || [];
    const updated = current.filter((item: T) => item.id !== id);
    saveToStorage(key, updated);
    return updated;
};
