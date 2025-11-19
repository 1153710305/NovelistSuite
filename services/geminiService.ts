
import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { OutlineNode } from '../types';

/**
 * 获取 AI 客户端实例
 */
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    // Fallback for browser env if process.env is not polyfilled automatically
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
        return new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    throw new Error("API Key not found.");
  }
  return new GoogleGenAI({ apiKey });
};

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
 * Generate a Novel Cover Image
 */
export const generateCover = async (prompt: string, model: string = 'imagen-4.0-generate-001'): Promise<string> => {
    const reqId = Math.random().toString(36).substring(7);
    console.log('GeminiService', `[${reqId}] Request: generateCover`, { prompt, model });
    
    const ai = getAiClient();

    try {
        let base64Image: string | undefined;

        if (model.includes('flash-image')) {
            // Strategy A: Gemini Flash Image (generateContent with Modality)
            const response = await ai.models.generateContent({
                model: model,
                contents: {
                    parts: [{ text: prompt }]
                },
                config: {
                    responseModalities: [Modality.IMAGE],
                }
            });
            
            // Extract image from candidates
            const part = response.candidates?.[0]?.content?.parts?.[0];
            if (part && part.inlineData) {
                base64Image = part.inlineData.data;
            }
        } else {
            // Strategy B: Imagen (generateImages)
            const response = await ai.models.generateImages({
                model: model,
                prompt: prompt,
                config: {
                    numberOfImages: 1,
                    aspectRatio: '3:4', 
                    outputMimeType: 'image/jpeg'
                }
            });
            base64Image = response.generatedImages?.[0]?.image?.imageBytes;
        }

        if (base64Image) {
             return `data:image/jpeg;base64,${base64Image}`;
        }
        throw new Error("No image data returned from API.");

    } catch (error: any) {
        console.error('GeminiService', `[${reqId}] Failed: generateCover`, error);
        throw error;
    }
}

/**
 * Generate Daily Stories
 */
export const generateDailyStories = async (trendFocus: string, sources: string[], lang: string, model: string): Promise<string> => {
  const reqId = Math.random().toString(36).substring(7);
  const ai = getAiClient();
  
  const sourceContext = sources.length > 0 
    ? `STRICTLY LIMIT your trend sources to the following Chinese platforms: ${sources.join(', ')}.` 
    : `Use trending topics from major Chinese web novel and social media platforms.`;

  const prompt = `
    You are a creative writing assistant specializing in the Chinese web novel market.
    TASK: Generate 10 short story ideas based on current popular tropes.
    ${sourceContext}
    CONSTRAINTS: Focus on ${trendFocus || 'viral trends'}.
    OUTPUT FORMAT (Markdown):
    ### 1. [Title]
    *   **Source**: [Platform]
    *   **Genre**: [Genre]
    *   **Hook**: [High concept]
    *   **Synopsis**: [Summary]
    ${getLangInstruction(lang)}
  `;

  try {
    const response = await ai.models.generateContent({ model, contents: prompt });
    return response.text || "Failed to generate stories.";
  } catch (error: any) {
    console.error('GeminiService', `[${reqId}] Failed: generateDailyStories`, error);
    return "Error generating stories.";
  }
};

/**
 * Analyze Text
 */
export const analyzeText = async (text: string, focus: 'pacing' | 'characters' | 'viral_factors', lang: string, model: string): Promise<string> => {
  const ai = getAiClient();
  const instruction = focus === 'viral_factors' ? "Identify 'Golden 3 Chapters' hooks." : focus === 'pacing' ? "Analyze pacing." : "Analyze characters.";
  
  try {
    const response = await ai.models.generateContent({
      model,
      contents: `${instruction} ${getLangInstruction(lang)}\nTEXT: ${text.substring(0, 10000)}`
    });
    return response.text || "No analysis.";
  } catch (error) {
    console.error('GeminiService', 'Failed: analyzeText', error);
    throw error;
  }
};

/**
 * Manipulate Text (Tools)
 */
export const manipulateText = async (text: string, mode: 'continue' | 'rewrite' | 'polish', lang: string, model: string): Promise<string> => {
  const ai = getAiClient();
  const prompt = `${mode.toUpperCase()} this text. ${getLangInstruction(lang)}\nTEXT: ${text}`;
  try {
      const response = await ai.models.generateContent({ model, contents: prompt });
      return response.text || "Failed.";
  } catch(error) {
      console.error('GeminiService', 'Failed: manipulateText', error);
      throw error;
  }
};

const assignIds = (node: OutlineNode): OutlineNode => {
    if (!node.id) node.id = Math.random().toString(36).substring(2, 11);
    if (node.children) node.children = node.children.map(assignIds);
    return node;
}

/**
 * Generate Outline (Recursive)
 */
export const generateOutline = async (premise: string, lang: string, model: string): Promise<{outline: OutlineNode, synopsis: string} | null> => {
  const ai = getAiClient();

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      synopsis: { type: Type.STRING },
      root: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["book"] },
            description: { type: Type.STRING },
            children: {
                type: Type.ARRAY,
                items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ["character", "setting", "act"] },
                    description: { type: Type.STRING },
                    children: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                type: { type: Type.STRING },
                                description: { type: Type.STRING }
                            }
                        }
                    }
                },
                required: ["name", "type", "description"]
                }
            }
        },
        required: ["name", "type", "children"]
      }
    },
    required: ["synopsis", "root"]
  };

  // Updated prompt to ask for characters and settings
  const prompt = `
    Create a novel outline based on premise: "${premise}".
    Structure Requirements:
    1. Root node is 'book'.
    2. Direct children of 'book' MUST include several 'character' nodes (Protagonist, Antagonist), 'setting' nodes (World, Key Locations), and then 'act' nodes.
    3. 'act' nodes contain 'chapter' nodes.
    ${getLangInstruction(lang)}
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: schema },
    });
    const json = JSON.parse(response.text || "null");
    if (json && json.root) return { outline: assignIds(json.root), synopsis: json.synopsis || "" };
    return null;
  } catch (error) {
    console.error('GeminiService', 'Failed: generateOutline', error);
    return null;
  }
};

/**
 * Generate Child Nodes
 */
export const generateChildNodes = async (parentNode: OutlineNode, context: string, lang: string, model: string): Promise<OutlineNode[]> => {
    const ai = getAiClient();
    let targetType = parentNode.type === 'act' ? 'chapter' : parentNode.type === 'chapter' ? 'scene' : 'act';
    
    // Override for book root to allow adding chars/settings
    if (parentNode.type === 'book') targetType = 'act';

    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            children: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        type: { type: Type.STRING, enum: [targetType, 'character', 'setting'] },
                        description: { type: Type.STRING }
                    },
                    required: ["name", "type", "description"]
                }
            }
        },
        required: ["children"]
    };

    const prompt = `Generate children for node: ${parentNode.name} (${parentNode.type}). Context: ${context}. ${getLangInstruction(lang)}`;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        });
        const json = JSON.parse(response.text || "null");
        return json && json.children ? json.children.map((child: OutlineNode) => assignIds(child)) : [];
    } catch (error) {
        console.error('GeminiService', 'Failed: generateChildNodes', error);
        throw error;
    }
}

/**
 * Generate Chapter Content with Style
 */
export const generateChapterContent = async (
    node: OutlineNode, 
    context: string, 
    lang: string, 
    model: string,
    stylePrompt?: string // New parameter for Prompt Library
): Promise<string> => {
    const ai = getAiClient();
    
    let styleInstruction = "";
    if (stylePrompt) {
        styleInstruction = `\nWRITING STYLE/GUIDELINE:\n${stylePrompt}\n\nApply this style strictly.`;
    }

    const prompt = `
    Write content for chapter: ${node.name}
    Description: ${node.description}
    Context from Outline (Characters/Settings/Plot): ${context}
    ${styleInstruction}
    ${getLangInstruction(lang)}
    `;

    try {
        const response = await ai.models.generateContent({ model, contents: prompt });
        return response.text || "Failed to generate chapter.";
    } catch(error) {
        console.error('GeminiService', 'Failed: generateChapterContent', error);
        throw error;
    }
}
