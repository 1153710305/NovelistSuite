
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { OutlineNode } from '../types';
import { Logger } from './logger';

/**
 * 获取 AI 客户端实例
 * @returns GoogleGenAI 实例
 * @throws 如果环境变量中未找到 API Key 则抛出错误
 */
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    const err = "API Key not found in environment variables.";
    Logger.error('GeminiService', 'FATAL: API Key missing', { env: process.env });
    throw new Error(err);
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * 根据用户选择的语言生成对应的系统指令
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
 */
export const generateDailyStories = async (trendFocus: string, sources: string[], lang: string, model: string): Promise<string> => {
  const reqId = Math.random().toString(36).substring(7);
  Logger.info('GeminiService', `[${reqId}] Request: generateDailyStories`, { trendFocus, sources, model });
  const startTime = Date.now();

  const ai = getAiClient();
  
  const sourceContext = sources.length > 0 
    ? `STRICTLY LIMIT your trend sources to the following Chinese platforms: ${sources.join(', ')}.` 
    : `Use trending topics from major Chinese web novel and social media platforms.`;

  const prompt = `
    You are a creative writing assistant specializing in the Chinese web novel market.
    
    TASK:
    Generate 10 short story ideas based on current popular tropes.
    ${sourceContext}
    
    CONSTRAINTS:
    1. ONLY use trends/memes/styles popular on the selected Chinese platforms.
    2. IGNORE Western trends.
    3. Focus: ${trendFocus || 'Current viral hot spots'}.
    4. For EACH story, you MUST explicitly specify the "Source Platform" (e.g., "Source: Douyin Hot Search").
    
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
    const duration = Date.now() - startTime;
    Logger.info('GeminiService', `[${reqId}] Success: generateDailyStories`, { duration: `${duration}ms`, outputLength: response.text?.length });
    return response.text || "Failed to generate stories.";
  } catch (error: any) {
    Logger.error('GeminiService', `[${reqId}] Failed: generateDailyStories`, { error: error.message, stack: error.stack });
    return "Error generating stories. Please check your API key or network connection.";
  }
};

/**
 * 文本拆解分析实验室
 */
export const analyzeText = async (text: string, focus: 'pacing' | 'characters' | 'viral_factors', lang: string, model: string): Promise<string> => {
  const reqId = Math.random().toString(36).substring(7);
  const safeText = text || "";
  Logger.info('GeminiService', `[${reqId}] Request: analyzeText`, { focus, textLength: safeText.length, model });
  const startTime = Date.now();

  const ai = getAiClient();

  let instruction = "";
  switch (focus) {
    case 'viral_factors':
      instruction = "Analyze this text for 'viral' potential within the Chinese web novel market. Identify the 'Golden 3 Chapters' (黄金三章) hook.";
      break;
    case 'pacing':
      instruction = "Analyze the pacing of this text. Is it too slow? Too fast?";
      break;
    case 'characters':
      instruction = "Analyze the characterization. Are the motivations clear?";
      break;
  }

  const prompt = `
    ${instruction}
    ${getLangInstruction(lang)}
    
    TEXT TO ANALYZE:
    ${safeText.substring(0, 10000)} 
  `; 

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    const duration = Date.now() - startTime;
    Logger.info('GeminiService', `[${reqId}] Success: analyzeText`, { duration: `${duration}ms` });
    return response.text || "No analysis generated.";
  } catch (error: any) {
    Logger.error('GeminiService', `[${reqId}] Failed: analyzeText`, { error: error.message });
    throw error;
  }
};

/**
 * AI 辅助写作工具
 */
export const manipulateText = async (text: string, mode: 'continue' | 'rewrite' | 'polish', lang: string, model: string): Promise<string> => {
  const reqId = Math.random().toString(36).substring(7);
  Logger.info('GeminiService', `[${reqId}] Request: manipulateText`, { mode, model });
  const startTime = Date.now();

  const ai = getAiClient();

  let prompt = "";
  const langNote = getLangInstruction(lang);

  if (mode === 'continue') {
    prompt = `Continue the story for 500 words. Maintain tone. ${langNote}\n\nTEXT:\n${text}`;
  } else if (mode === 'rewrite') {
    prompt = `Rewrite to be more showing, less telling. ${langNote}\n\nTEXT:\n${text}`;
  } else if (mode === 'polish') {
    prompt = `Polish grammar and sentence variety. ${langNote}\n\nTEXT:\n${text}`;
  }

  try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });
      const duration = Date.now() - startTime;
      Logger.info('GeminiService', `[${reqId}] Success: manipulateText`, { duration: `${duration}ms` });
      return response.text || "Generation failed.";
  } catch(error: any) {
      Logger.error('GeminiService', `[${reqId}] Failed: manipulateText`, { error: error.message });
      throw error;
  }
};

/**
 * 辅助函数：为节点分配 ID
 */
const assignIds = (node: OutlineNode): OutlineNode => {
    if (!node.id) {
        node.id = Math.random().toString(36).substring(2, 11);
    }
    if (node.children) {
        node.children = node.children.map(assignIds);
    }
    return node;
}

/**
 * 生成小说大纲
 */
export const generateOutline = async (premise: string, lang: string, model: string): Promise<OutlineNode | null> => {
  const reqId = Math.random().toString(36).substring(7);
  Logger.info('GeminiService', `[${reqId}] Request: generateOutline`, { premise, model });
  const startTime = Date.now();
  
  const ai = getAiClient();

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
            name: { type: Type.STRING, description: "Act Name" },
            type: { type: Type.STRING, enum: ["act"] },
            description: { type: Type.STRING },
            children: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Chapter Title" },
                  type: { type: Type.STRING, enum: ["chapter"] },
                  description: { type: Type.STRING }
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

  const prompt = `Create a detailed novel outline. Premise: "${premise}". Structure: Book -> Acts -> Chapters. ${getLangInstruction(lang)}`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });
    const duration = Date.now() - startTime;
    Logger.info('GeminiService', `[${reqId}] Success: generateOutline`, { duration: `${duration}ms` });
    
    const json = JSON.parse(response.text || "null");
    if (json) {
        return assignIds(json);
    }
    return null;
  } catch (error: any) {
    Logger.error('GeminiService', `[${reqId}] Failed: generateOutline`, { error: error.message });
    return null;
  }
};

/**
 * 根据大纲节点生成具体的章节草稿
 */
export const generateChapterContent = async (node: OutlineNode, context: string, lang: string, model: string): Promise<string> => {
    const reqId = Math.random().toString(36).substring(7);
    Logger.info('GeminiService', `[${reqId}] Request: generateChapterContent`, { nodeName: node.name, model });
    const startTime = Date.now();

    const ai = getAiClient();
    
    const prompt = `
    Write content for chapter: ${node.name}
    Description: ${node.description}
    Context: ${context}
    ${getLangInstruction(lang)}
    `;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt
        });
        const duration = Date.now() - startTime;
        Logger.info('GeminiService', `[${reqId}] Success: generateChapterContent`, { duration: `${duration}ms` });
        return response.text || "Failed to generate chapter.";
    } catch(error: any) {
        Logger.error('GeminiService', `[${reqId}] Failed: generateChapterContent`, { error: error.message });
        throw error;
    }
}
