/**
 * @file server/src/utils/aiUtils.js
 * @description AI 相关工具函数（从前端迁移）
 */

/**
 * 清洗 JSON 字符串
 * 移除 Markdown 代码块标记，提取有效的 JSON 内容
 * @param {string} text - 原始文本
 * @returns {string} 清洗后的 JSON 字符串
 */
function cleanJson(text) {
    if (!text) return '{}';

    // 移除 markdown 标记
    let cleaned = text.replace(/```json\s*|\s*```/g, '');

    // 尝试提取第一个 { 或 [ 到最后一个 } 或 ]
    const firstOpenBrace = cleaned.indexOf('{');
    const firstOpenBracket = cleaned.indexOf('[');

    let startIndex = -1;
    if (firstOpenBrace !== -1 && firstOpenBracket !== -1) {
        startIndex = Math.min(firstOpenBrace, firstOpenBracket);
    } else if (firstOpenBrace !== -1) {
        startIndex = firstOpenBrace;
    } else {
        startIndex = firstOpenBracket;
    }

    if (startIndex !== -1) {
        const lastCloseBrace = cleaned.lastIndexOf('}');
        const lastCloseBracket = cleaned.lastIndexOf(']');
        const endIndex = Math.max(lastCloseBrace, lastCloseBracket);

        if (endIndex > startIndex) {
            cleaned = cleaned.substring(startIndex, endIndex + 1);
        }
    }

    return cleaned.trim();
}

/**
 * 截断上下文
 * 防止 Token 超限
 * @param {string} text - 原始文本
 * @param {number} maxLength - 最大长度
 * @returns {string} 截断后的文本
 */
function truncateContext(text, maxLength = 50000) {
    if (!text || text.length <= maxLength) {
        return text;
    }
    return text.substring(0, maxLength) + '...[truncated]';
}

/**
 * 带指数退避的重试函数
 * @param {Function} fn - 异步函数
 * @param {number} retries - 重试次数
 * @param {number} baseDelay - 基础延迟(ms)
 */
async function retryWithBackoff(fn, retries = 3, baseDelay = 3000) {
    try {
        return await fn();
    } catch (error) {
        if (retries <= 0) {
            throw error;
        }

        // 检查是否是不可重试的错误（如 400 Bad Request）
        if (error.message.includes('400') || error.message.includes('INVALID_ARGUMENT')) {
            throw error;
        }

        const delay = baseDelay * Math.pow(2, 3 - retries);
        console.log(`[Retry] 操作失败，${delay}ms 后重试。剩余次数: ${retries - 1}`);

        await new Promise(resolve => setTimeout(resolve, delay));
        return retryWithBackoff(fn, retries - 1, baseDelay);
    }
}

/**
 * 统一错误处理
 * @param {Error} error - 错误对象
 * @param {string} context - 上下文描述
 * @returns {string} 错误信息
 */
function handleGeminiError(error, context = '') {
    let message = error.message || 'Unknown error';

    if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
        return `[${context}] API 配额耗尽，请稍后重试`;
    }

    if (message.includes('SAFETY')) {
        return `[${context}] 内容被安全过滤器拦截`;
    }

    if (message.includes('API_KEY_INVALID') || message.includes('API key not valid')) {
        return `[${context}] API Key 无效，请检查配置`;
    }

    return `[${context}] ${message}`;
}

module.exports = {
    cleanJson,
    truncateContext,
    retryWithBackoff,
    handleGeminiError
};
