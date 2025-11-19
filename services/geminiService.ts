
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { OutlineNode } from '../types';

/**
 * 获取 AI 客户端实例
 * @returns GoogleGenAI 实例
 * @throws 如果环境变量中未找到 API Key 则抛出错误
 */
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * 根据用户选择的语言生成对应的系统指令
 * 用于确保 AI 输出的语言符合用户设置
 * @param lang 语言代码 (zh, en, ja, etc.)
 * @returns 提示词指令字符串
 */
const getLangInstruction = (lang: string) => {
  switch (lang) {
    case 'zh': return "IMPORTANT: Provide the output in Simplified Chinese.";
    case 'ja': return "IMPORTANT: Provide the output in Japanese.";
    case 'es': return "IMPORTANT: Provide the output in Spanish.";
    case 'fr': return "IMPORTANT: Provide the output in French.";
    case 'de': return "IMPORTANT: Provide the output in German.";
    default: return "Provide the output in English.";
  }
}

/**
 * 生成每日灵感故事
 * @param trendFocus 用户输入的趋势焦点（如“赛博朋克”）
 * @param sources 用户选择的数据来源（如“抖音”、“起点”）
 * @param lang 当前系统语言
 * @param model 选用的 Gemini 模型
 * @returns 生成的 Markdown 格式故事列表
 */
export const generateDailyStories = async (trendFocus: string, sources: string[], lang: string, model: string): Promise<string> => {
  const ai = getAiClient();
  
  // 构建上下文限制，确保只使用中国平台的数据
  const sourceContext = sources.length > 0 
    ? `STRICTLY LIMIT your trend sources to the following Chinese platforms: ${sources.join(', ')}.` 
    : `Use trending topics from major Chinese web novel and social media platforms (e.g. Douyin, Qidian, Weibo).`;

  // 构建 Prompt
  const prompt = `
    You are a creative writing assistant specializing in the Chinese web novel market.
    
    TASK:
    Generate 10 short story ideas based on current popular tropes.
    ${sourceContext}
    
    CONSTRAINTS:
    1. ONLY use trends/memes/styles popular on the selected Chinese platforms.
    2. IGNORE Western trends (like Hollywood, Reddit, etc.).
    3. Focus: ${trendFocus || 'Current viral hot spots'}.
    4. For EACH story, you MUST explicitly specify the "Source Platform" (e.g., "Source: Douyin Hot Search" or "Source: Qidian Ranking") from the allowed list.
    
    OUTPUT FORMAT (Markdown):
    ### 1. [Title]
    *   **Source**: [Platform Name]
    *   **Genre**: [Genre]
    *   **Hook**: [One sentence high concept]
    *   **Synopsis**: [50 words summary]
    
    ...
    ${getLangInstruction(lang)}
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text || "Failed to generate stories.";
  } catch (error) {
    console.error(error);
    return "Error generating stories. Please check your API key.";
  }
};

/**
 * 文本拆解分析实验室
 * @param text 待分析的文本内容
 * @param focus 分析模式：爆款因子、节奏、角色
 * @param lang 语言
 * @param model 模型
 */
export const analyzeText = async (text: string, focus: 'pacing' | 'characters' | 'viral_factors', lang: string, model: string): Promise<string> => {
  const ai = getAiClient();

  let instruction = "";
  switch (focus) {
    case 'viral_factors':
      instruction = "Analyze this text for 'viral' potential within the Chinese web novel market. Identify the 'Golden 3 Chapters' (黄金三章) hook, emotional beats, and reader retention triggers. Explain why this would or wouldn't succeed on platforms like Fanqie or Qidian.";
      break;
    case 'pacing':
      instruction = "Analyze the pacing of this text. Is it too slow? Too fast? Are the scene transitions smooth?";
      break;
    case 'characters':
      instruction = "Analyze the characterization. Are the motivations clear? Is the dialogue natural? detailed breakdown.";
      break;
  }

  const prompt = `
    ${instruction}
    ${getLangInstruction(lang)}
    
    TEXT TO ANALYZE:
    ${text.substring(0, 10000)} 
  `; // 限制长度以防止 Token 溢出

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });
  return response.text || "No analysis generated.";
};

/**
 * AI 辅助写作工具（续写、改写、润色）
 */
export const manipulateText = async (text: string, mode: 'continue' | 'rewrite' | 'polish', lang: string, model: string): Promise<string> => {
  const ai = getAiClient();

  let prompt = "";
  const langNote = getLangInstruction(lang);

  if (mode === 'continue') {
    prompt = `Read the following text and continue the story for another 500 words. Maintain the tone, style, and character voices. ${langNote}\n\nTEXT:\n${text}`;
  } else if (mode === 'rewrite') {
    prompt = `Rewrite the following text to be more showing and less telling. Improve the flow and vocabulary. ${langNote}\n\nTEXT:\n${text}`;
  } else if (mode === 'polish') {
    prompt = `Polish the following text. Fix grammar, enhance sentence variety, and punch up the descriptions without changing the core plot. ${langNote}\n\nTEXT:\n${text}`;
  }

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });
  return response.text || "Generation failed.";
};

/**
 * 生成小说大纲（JSON 结构化输出）
 * 使用 JSON Schema 强制模型返回可解析的数据结构
 */
export const generateOutline = async (premise: string, lang: string, model: string): Promise<OutlineNode | null> => {
  const ai = getAiClient();

  // 定义输出的 JSON Schema，用于 D3.js 树状图渲染
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "Title of the book" },
      type: { type: Type.STRING, enum: ["book"] },
      description: { type: Type.STRING },
      children: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Act or Major Arc Name" },
            type: { type: Type.STRING, enum: ["act"] },
            description: { type: Type.STRING },
            children: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Chapter Title" },
                  type: { type: Type.STRING, enum: ["chapter"] },
                  description: { type: Type.STRING, description: "What happens in this chapter" }
                },
                required: ["name", "type", "description"]
              }
            }
          },
          required: ["name", "type", "children"]
        }
      }
    },
    required: ["name", "type", "children"]
  };

  const prompt = `Create a detailed novel outline based on this premise: "${premise}". 
  Structure it as Book -> Acts -> Chapters. 
  Create at least 3 Acts and 3 Chapters per Act.
  ${getLangInstruction(lang)}`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });
    
    return JSON.parse(response.text || "null");
  } catch (e) {
    console.error("JSON parsing error", e);
    return null;
  }
};

/**
 * 根据大纲节点生成具体的章节草稿
 */
export const generateChapterContent = async (node: OutlineNode, context: string, lang: string, model: string): Promise<string> => {
    const ai = getAiClient();
    
    const prompt = `
    Write the content for the following chapter/scene.
    
    Title: ${node.name}
    Description: ${node.description}
    
    Context (Book Outline/Summary):
    ${context}
    
    Write a compelling, immersive scene (approx 800 words).
    ${getLangInstruction(lang)}
    `;

    const response = await ai.models.generateContent({
        model,
        contents: prompt
    });

    return response.text || "Failed to generate chapter.";
}