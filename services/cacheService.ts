import { GoogleGenAI } from "@google/genai";

// 缓存项接口
interface CacheEntry {
    key: string;            // 本地标识 Key (如 content hash)
    resourceName: string;   // Gemini API 返回的资源名 (cachedContents/xxx)
    expirationTime: number; // 过期时间戳
    tokenCount: number;     // 缓存的 Token 数
}

// 内存中的缓存映射
const cacheRegistry = new Map<string, CacheEntry>();

/**
 * 计算字符串的简单 Hash (用于标识内容是否变化)
 */
const computeHash = async (text: string): Promise<string> => {
    const msgBuffer = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * 缓存服务管理器
 */
export const CacheService = {
    /**
     * 尝试获取有效的缓存资源名
     * @param content 要缓存的大段文本内容
     * @param modelId 当前使用的模型 ID
     * @returns 缓存资源名 (cachedContents/xxx) 或 null
     */
    getOrCreateCache: async (content: string, modelId: string): Promise<string | null> => {
        // 1. 检查内容长度 (Gemini 缓存通常要求至少 32k tokens，这里我们放宽一点做测试，或者遵循官方建议)
        // 粗略估算：1 token ≈ 4 chars (英文) 或 1 char (中文)
        // 设定一个保守阈值，比如 10000 字符，太短的内容缓存没有意义且可能增加延迟
        if (content.length < 10000) {
            console.log('[CacheService] Content too short for caching, skipping.');
            return null;
        }

        try {
            const hash = await computeHash(content);
            const cacheKey = `${modelId}:${hash}`;
            const now = Date.now();

            // 2. 检查本地注册表
            const entry = cacheRegistry.get(cacheKey);
            if (entry) {
                if (entry.expirationTime > now) {
                    console.log(`[CacheService] Cache hit! Reusing ${entry.resourceName}`);
                    return entry.resourceName;
                } else {
                    console.log(`[CacheService] Cache expired for ${entry.resourceName}`);
                    cacheRegistry.delete(cacheKey);
                }
            }

            // 3. 如果没有缓存或已过期，创建新缓存 (需要调用 Gemini API)
            // 注意：前端直接调用缓存 API 可能存在跨域或权限问题，且 SDK 支持程度不一。
            // 这里我们暂时模拟一个逻辑，或者如果 SDK 提供了 cacheManager 就使用它。

            // 目前 @google/genai 的 Web SDK 可能还没完全暴露 cacheManager 给前端。
            // 且 Context Caching 通常是服务端行为。

            // 如果无法直接创建，我们返回 null，退化为普通请求。
            console.log('[CacheService] Cache miss. Creating new cache is not fully supported in client-side mode yet.');
            return null;

        } catch (error) {
            console.warn('[CacheService] Error accessing cache:', error);
            return null;
        }
    },

    /**
     * 清理过期缓存
     */
    prune: () => {
        const now = Date.now();
        for (const [key, entry] of cacheRegistry.entries()) {
            if (entry.expirationTime <= now) {
                cacheRegistry.delete(key);
            }
        }
    }
};
