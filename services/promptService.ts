
/**
 * @file services/promptService.ts
 * @description 提示词工程中心 (Prompt Engineering Hub)。
 * 
 * ## 作用
 * - 集中管理所有发往 AI 的指令。
 * - 针对中文网文语境（爽文、黄金三章、情绪流）进行深度优化。
 * - 方便开发者统一调整 AI 的人设和输出风格。
 */

import { PersonaTemplate } from "../types";

// 默认中文系统指令
export const DEFAULT_PERSONA_ZH = "你是由 InkFlow AI 驱动的资深网文主编和金牌创作助手。你精通中国网络小说（如起点、番茄、晋江）的流行趋势、黄金三章法则、情绪流写法以及爽点设置。你的目标是辅助作者创作出逻辑严密、节奏紧凑、极具商业价值的小说。\n\n回答要求：\n1. 除非用户要求，否则直接输出结果，不要在那‘好的，我明白了’。\n2. 严禁使用翻译腔，确保中文表达地道、通俗。\n3. 在涉及剧情建议时，多从‘期待感’和‘读者情绪’角度分析。";

// 默认英文系统指令
export const DEFAULT_PERSONA_EN = "You are InkFlow AI, a senior web novel editor and elite writing assistant. You are an expert in web novel trends, pacing, and emotional engagement. Your goal is to assist authors in creating high-quality, commercially successful fiction.\n\nRequirements:\n1. Direct output without filler phrases.\n2. Use natural, engaging language.\n3. Focus on 'Reader Expectations' and 'Emotional Pacing'.";

// 默认身份模板库 (用于初始化)
export const DEFAULT_PERSONA_TEMPLATES: PersonaTemplate[] = [
    {
        id: 'editor_zh',
        name: '资深主编 (默认)',
        description: '平衡型。专注于商业价值、逻辑自洽和读者情绪，适合大多数网文创作。',
        content: DEFAULT_PERSONA_ZH,
        isDefault: true
    },
    {
        id: 'critic_zh',
        name: '毒舌书评人',
        description: '挑剔型。会毫不留情地指出逻辑漏洞、毒点和水文，适合打磨大纲和精修章节。',
        content: "你是一名以‘毒舌’著称的资深书评人。你极度反感套路化、逻辑不通和水字数的行为。在分析和创作时，请务必：\n1. 尖锐地指出潜在的‘毒点’和逻辑硬伤。\n2. 拒绝任何形式的废话和自我感动。\n3. 用词犀利，直击要害，不要顾及作者面子，只对作品质量负责。",
        isDefault: true
    },
    {
        id: 'brainstorm_zh',
        name: '脑洞风暴伙伴',
        description: '创意型。思维跳跃，不拘泥于逻辑，专注于提供新奇、反套路的点子，适合灵感生成。',
        content: "你是一名思维极度活跃的创意总监。你的特长是‘反套路’和‘脑洞大开’。在辅助创作时：\n1. 总是尝试提出意想不到的转折。\n2. 鼓励将风马牛不相及的元素组合在一起（如：赛博朋克+种田）。\n3. 不要过分在意现实逻辑，‘有趣’是第一原则。",
        isDefault: true
    },
    {
        id: 'coauthor_zh',
        name: '温柔续写助手',
        description: '辅助型。擅长模仿文风，顺着作者的思路往下写，注重细节描写和氛围烘托。',
        content: "你是一名温柔细腻的协作作家。你的目标是完美融入作者的文风。在续写和润色时：\n1. 仔细分析前文的语言风格（是华丽、简练还是幽默），并进行模仿。\n2. 关注人物的情感流动和环境细节。\n3. 不要随意改变大纲走向，而是丰富细节，让文字更有画面感。",
        isDefault: true
    }
];

// 灵感生成规则接口
export interface InspirationRules {
    title?: string;
    synopsis?: string;
    coolPoint?: string;
    burstPoint?: string;
}

export const PromptService = {
    /**
     * 获取全局系统指令 (System Instruction)
     * 定义 AI 的核心人设：资深网文编辑/金牌辅助。
     * 这将作为 systemInstruction 参数传递给模型，优先级最高。
     */
    getGlobalSystemInstruction: (lang: string): string => {
        const instruction = lang === 'zh' ? DEFAULT_PERSONA_ZH : DEFAULT_PERSONA_EN;
        const langConstraint = lang === 'zh' 
            ? "\n【重要】：请必须使用简体中文 (Simplified Chinese) 进行输出。" 
            : "\nIMPORTANT: Provide the output in English.";
            
        return `${instruction}${langConstraint}`;
    },

    /**
     * 获取语言指令
     * 强制 AI 输出特定语言，特别是中文网文风格。
     */
    getLangInstruction: (lang: string): string => {
        return lang === 'zh' 
            ? "【重要】：请必须使用简体中文 (Simplified Chinese) 进行输出。文笔要通俗流畅，符合中国网络小说阅读习惯。" 
            : "IMPORTANT: Provide the output in English.";
    },

    /**
     * 趋势分析提示词
     * 用于从混合来源文本中提取单一核心关键词。
     */
    analyzeTrend: (sources: string[]): string => {
        return `
        任务：作为一名资深网文市场分析师，请根据以下来源的近期热门内容，提取一个最具“爆款潜力”的题材关键词或核心梗。
        来源参考：${sources.join(', ')}
        
        要求：
        1. 只返回一个具体的关键词（例如：“赛博修仙”、“规则怪谈”、“年代文后妈”、“全家读心”）。
        2. 不要解释，不要标点，只要那个词。
        `;
    },

    /**
     * 每日灵感生成 (JSON Schema 模式)
     * 生成结构化的灵感卡片，包含网文特有的爽点分析。
     * 
     * @param trend 趋势关键词
     * @param audience 目标受众
     * @param rules 用户自定义的生成规则 (可选)
     */
    dailyInspiration: (trend: string, audience: string, rules?: InspirationRules): string => {
        const audienceDesc = audience === 'male' 
            ? "男频（热血、升级、系统、争霸）" 
            : "女频（情感、细腻、CP感、大女主/甜宠）";

        // 处理自定义规则，如果未提供则使用默认值
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
     * 8-Map 系统第一步：确定世界观和宏观结构。
     */
    architectureStep1: (idea: string): string => {
        return `
        第一阶段：地基构建。
        核心脑洞：${idea}
        
        请构建以下内容：
        1. **简介 (Synopsis)**：完善故事梗概。
        2. **世界观 (World)**：地理环境、历史背景、核心法则（如灵气复苏、赛博高科技）。
        3. **宏观结构 (Structure)**：分卷规划（如：第一卷 潜龙在渊，第二卷 龙战于野）。
        
        保持描述精炼，逻辑自洽。
        `;
    },

    /**
     * 架构生成：第二阶段（实体设计）
     * 8-Map 系统第二步：填充角色和力量体系。
     */
    architectureStep2: (synopsis: string): string => {
        return `
        第二阶段：实体填充。
        基于简介：${synopsis}
        
        请构建：
        1. **力量/升级体系 (System)**：详细的等级划分（如：练气、筑基... 或 F级、S级...），以及升级条件。
        2. **角色关系 (Character)**：
           - 主角：性格、外貌、核心驱动力。
           - 反派：与主角的冲突点。
           - 重要配角：功能性（如：搞笑担当、导师、伴侣）。
        `;
    },

    /**
     * 架构生成：第三阶段（剧情细化）
     * 8-Map 系统第三步：设计任务、伏笔和前十章细纲。
     */
    architectureStep3: (synopsis: string): string => {
        return `
        第三阶段：剧情编织。
        基于简介：${synopsis}
        
        请构建：
        1. **任务/状态模版 (Mission)**：主角在不同阶段的典型状态或任务类型。
        2. **伏笔/锚点 (Anchor)**：贯穿全文的悬念或关键物品。
        3. **事件流 (Events)**：关键的剧情转折点（起承转合）。
        4. **章节细纲 (Chapters)**：前 10 章的详细细纲，每章包含核心冲突和期待感钩子。
        `;
    },

    /**
     * 章节正文生成 (V2 - 强化承上启下)
     * 集成“黄金三章”法则，注入全局上下文，强化钩子处理。
     */
    writeChapter: (title: string, desc: string, context: string, wordCount: number, style?: string): string => {
        let styleInstruction = style ? `\n【用户自定义文风/要求】：\n${style}` : "";
        
        return `
        任务：撰写网络小说章节 (番茄/起点爆款风格)。
        
        【目标章节】：${title}
        【本章剧情梗概】：${desc}
        【字数目标】：约 ${wordCount} 字。
        
        【数据上下文 (Context Bundle)】：
        ${context}
        
        ------------------------------------------------------------
        【⭐⭐⭐ 核心写作指令 (Critical Execution) ⭐⭐⭐】：
        
        1. **承上 (Analyze & Resolve)**：
           - 请先阅读上下文中的【上一章结尾片段】。
           - 思考：上一章留下了什么悬念、情绪钩子或待解决的冲突？
           - 行动：在本章**开篇前 300 字内**，必须对上一章的钩子做出回应或推进（例如：反派打脸、危机爆发、宝物到手）。
           - 禁忌：严禁无视上文，直接开启不相关的新剧情。
        
        2. **正文推进 (Pacing)**：
           - 严格执行【本章剧情梗概】。
           - 节奏要快，多用短句。
           - 描写原则：少用形容词堆砌，多用动作和对话来展示（Show, don't tell）。
           - 情绪调动：明确主角的爽点（装逼、收获、突破）或压抑点（为后续爆发做铺垫）。
        
        3. **启下 (Hook & Foreshadowing)**：
           - 请阅读上下文中的【下一章预告】（如有）。
           - 思考：下一章的核心冲突是什么？
           - 行动：在本章**最后 200 字**，必须埋下伏笔或制造新的悬念（断章）。
           - 策略：可以是新敌人出现、突发意外、主角发现惊天秘密等，以此强行勾引读者点击下一章。
        
        ${styleInstruction}
        `;
    },

    /**
     * 文本润色/修改
     * 提供续写、重写和润色三种工具模式。
     */
    manipulateText: (text: string, mode: 'continue' | 'rewrite' | 'polish'): string => {
        const map = {
            continue: "续写：顺着上文的语气和情节，继续往下写 500 字左右。",
            rewrite: "重写：保持原意不变，但优化文笔，使其更具画面感和感染力。",
            polish: "润色：修正语病，优化词汇，使句子更通顺、更有文学性。"
        };
        return `${map[mode]}\n\n【原文】：\n${text}`;
    },

    /**
     * 插图提示词生成
     * 将中文小说场景转换为英文绘画提示词 (Stable Diffusion/Midjourney 格式)。
     */
    illustrationPrompt: (context: string): string => {
        return `
        基于以下小说片段，提取一个最具画面感的场景，并将其转换为 AI 绘画（Midjourney/Stable Diffusion）的英文提示词。
        
        小说片段：${context.substring(0, 1000)}
        
        要求：
        1. 包含主体、环境、光影、艺术风格（如 Cinematic, Unreal Engine 5, Fantasy Art）。
        2. 只返回英文 Prompt。
        `;
    }
};
