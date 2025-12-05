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
     * 趋势分析提示词
     */
    analyzeTrend: (sources) => {
        return `
请使用 Google Search 搜索最新的网络小说排行榜，来源：${sources.join('、')}。

【任务】：分析当前最热门的题材，提取一个最具"爆款潜力"的核心关键词。

【输出格式】：
- 只输出一个2-6字的关键词
- 不要任何解释、标点、序号
- 不要说"根据搜索"、"推荐"等描述性文字
- 直接输出关键词本身

【示例】：
正确：赛博修仙
错误：根据搜索到的信息，推荐"赛博修仙"
错误：1. 赛博修仙

现在请输出关键词：
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
     * 重绘单个导图
     */
    regenerateMap: (mapType, idea, context, style, requirements) => {
        const styleInstruction = style ? `\n【风格要求】：${style}` : "";
        const reqInstruction = requirements ? `\n【额外约束】：${requirements}` : "";

        return `
        任务：重构/优化小说设定导图。
        目标导图类型：${mapType}
        用户的修改意见：${idea || "请根据上下文优化此导图"}

        【上下文参考】：
        ${context}

        ${styleInstruction}
        ${reqInstruction}

        请输出符合该导图类型的 JSON 结构（OutlineNode 格式）。
        `;
    },

    /**
     * 扩展节点内容
     */
    expandNode: (node, context, style) => {
        const styleInstruction = style ? `\n【风格要求】：${style}` : "";

        return `
        任务：扩展大纲节点。
        当前节点：${node.name}
        描述：${node.description || ''}
        
        【上下文】：
        ${context}

        ${styleInstruction}

        请生成该节点的子节点列表 (JSON 数组格式)，每个子节点包含 name, type, description。
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
    },

    /**
     * 章节重写
     */
    rewriteChapter: (content, context, style) => {
        const styleInstruction = style ? `\n【风格/Prompt要求】：${style}` : "";

        return `
        任务：重写/润色章节内容。
        
        【参考上下文】：
        ${context}

        ${styleInstruction}

        【原文】：
        ${content}

        请输出重写后的正文。
        `;
    },

    /**
     * 文本工具 (续写/润色)
     */
    manipulateText: (text, mode) => {
        const map = {
            continue: "续写：顺着上文的语气和情节，继续往下写 500 字左右。",
            rewrite: "重写：保持原意不变，但优化文笔，使其更具画面感和感染力。",
            polish: "润色：修正语病，优化词汇，使句子更通顺、更有文学性。"
        };
        return `${map[mode] || map.polish}\n\n【原文】：\n${text}`;
    },

    /**
     * 插图提示词生成
     */
    illustrationPrompt: (context) => {
        return `
        基于以下小说片段，提取一个最具画面感的场景，并将其转换为 AI 绘画（Midjourney/Stable Diffusion）的英文提示词。
        
        小说片段：${context.substring(0, 1000)}
        
        要求：
        1. 包含主体、环境、光影、艺术风格（如 Cinematic, Unreal Engine 5, Fantasy Art）。
        2. 只返回英文 Prompt。
        `;
    }
};

module.exports = PromptService;
