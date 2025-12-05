/**
 * @file server/src/services/PromptService.js
 * @description 提示词服务（从前端迁移）
 */

const PromptService = {
    /**
     * 获取全局系统指令
     */
    getGlobalSystemInstruction: (lang = 'zh') => {
        return `You are an expert web novel editor and creative writing assistant. 
Your goal is to help users create high-quality, commercially successful web novels.
You must output in ${lang === 'zh' ? 'Simplified Chinese (简体中文)' : 'English'}.
Always follow the JSON schema strictly when requested.`;
    },

    /**
     * 获取语言指令
     */
    getLangInstruction: (lang = 'zh') => {
        return lang === 'zh'
            ? "请使用简体中文回答。"
            : "Please answer in English.";
    },

    /**
     * 每日灵感生成 (JSON Schema 模式)
     */
    dailyInspiration: (trend, audience, rules) => {
        const audienceDesc = audience === 'male'
            ? "男频（热血、升级、系统、争霸）"
            : "女频（情感、细腻、CP感、大女主/甜宠）";

        // 处理自定义规则
        const ruleTitle = rules?.title || "具有强烈的网文风格，吸睛，包含核心梗或金手指。";
        const ruleSynopsis = rules?.synopsis || "必须是“新媒体爆款文案”风格。前三句必须抛出冲突、悬念或金手指。";
        const ruleCoolPoint = rules?.coolPoint || "明确指出读者的情绪价值来源（如：人前显圣、极致反差）。";
        const ruleBurstPoint = rules?.burstPoint || "核心冲突的高潮点或反转点。";

        return `
        任务：基于当前市场趋势 "${trend}"，结合 "${audienceDesc}" 的受众偏好，构思 5 个极具爆款潜力的小说核心创意。
        
        【生成约束与指导】：
        1. **书名 (Title)**：${ruleTitle}
        2. **简介 (Synopsis)**：${ruleSynopsis}
        3. **爽点 (Cool Point)**：${ruleCoolPoint}
        4. **爆点 (Burst Point)**：${ruleBurstPoint}
        5. **金手指 (Golden Finger)**：必须具体、新颖（例如：不是简单的“系统”，而是“每花一分钱返现十倍的系统”）。
        
        要求：
        - 严格 JSON 输出：不要包含 Markdown 代码块标记，直接返回 JSON 数组。
        `;
    },

    /**
     * 架构生成：第一阶段（基础设定）
     */
    architectureStep1: (idea) => {
        return `
        第一阶段：地基构建。
        基于创意 "${idea}"，请构建小说的基础架构。
        
        请包含以下内容：
        1. **核心梗 (Core Trope)**：一句话概括故事核心。
        2. **世界观 (Worldview)**：故事发生的背景设定。
        3. **力量体系 (Power System)**：等级划分或能力设定。
        4. **主角设定 (Protagonist)**：姓名、性格、金手指。
        5. **主线目标 (Main Goal)**：主角的最终目标。
        
        请以 JSON 格式返回。
        `;
    },

    /**
     * 章节内容生成
     */
    chapterContent: (title, outline, wordCount) => {
        return `
        任务：撰写章节正文。
        
        章节标题：${title}
        章节大纲：${outline || '无'}
        字数要求：${wordCount || 2000}字左右
        
        要求：
        1. 网文风格，节奏紧凑，代入感强。
        2. 场景描写生动，对话自然。
        3. 结尾留有悬念（钩子）。
        4. 不要输出任何解释性文字，直接输出正文。
        `;
    }
};

module.exports = PromptService;
