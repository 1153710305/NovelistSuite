
import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { OutlineNode, GenerationConfig, ChatMessage, ArchitectureMap } from '../types';

/**
 * 获取 AI 客户端实例
 * Initialize the Google GenAI client using the API key from environment variables.
 */
const getAiClient = () => {
  // Strictly follow guidelines: Use process.env.API_KEY directly.
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Helper to inject language-specific instructions into prompts.
 * Ensuring the model outputs in the user's preferred language.
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
 * Chat Streamer
 * Handles real-time chat interaction.
 * Converts app-specific ChatMessage types to Gemini API history format.
 */
export const streamChatResponse = async (
    messages: ChatMessage[], 
    newMessage: string, 
    model: string,
    onChunk: (text: string) => void
): Promise<string> => {
    const ai = getAiClient();
    
    // Convert history to Gemini format
    const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
    }));

    const chat = ai.chats.create({
        model: model,
        history: history
    });

    let fullResponse = '';
    try {
        const result = await chat.sendMessageStream({ message: newMessage });
        for await (const chunk of result) {
            const text = chunk.text;
            if (text) {
                fullResponse += text;
                onChunk(fullResponse);
            }
        }
        return fullResponse;
    } catch (error) {
        console.error("Chat Stream Error:", error);
        throw error;
    }
}

/**
 * Generates a novel cover image.
 * Uses the dedicated Imagen model or Gemini Flash Image model depending on configuration.
 */
export const generateCover = async (prompt: string, model: string = 'imagen-4.0-generate-001'): Promise<string> => {
    return generateImage(prompt, model, '3:4');
}

/**
 * core Image Generation function.
 * Supports different models and aspect ratios.
 * Handles response parsing for both Image generation models and Multimodal generation models.
 */
export const generateImage = async (prompt: string, model: string = 'imagen-4.0-generate-001', aspectRatio: string = '1:1'): Promise<string> => {
    const reqId = Math.random().toString(36).substring(7);
    console.log('GeminiService', `[${reqId}] Request: generateImage`, { prompt, model });
    
    const ai = getAiClient();

    try {
        let base64Image: string | undefined;

        if (model.includes('flash-image')) {
            // Logic for Gemini Flash Image (Nano Banana series)
            const response = await ai.models.generateContent({
                model: model,
                contents: { parts: [{ text: prompt }] },
                config: {
                    imageConfig: { aspectRatio: aspectRatio as any } 
                }
            });
            // Iterate through parts to find image
            if (response.candidates?.[0]?.content?.parts) {
                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData) {
                        base64Image = part.inlineData.data;
                        break;
                    }
                }
            }
        } else {
            // Logic for Imagen models
            const response = await ai.models.generateImages({
                model: model,
                prompt: prompt,
                config: { numberOfImages: 1, aspectRatio: aspectRatio as any, outputMimeType: 'image/jpeg' }
            });
            base64Image = response.generatedImages?.[0]?.image?.imageBytes;
        }

        if (base64Image) return `data:image/jpeg;base64,${base64Image}`;
        throw new Error("No image data returned from API.");
    } catch (error: any) {
        console.error('GeminiService', `[${reqId}] Failed: generateImage`, error);
        throw error;
    }
}

/**
 * Analyzes the text context around the cursor to generate a specific image prompt.
 * This is the "Bridge" between Text Context and Visual Generation.
 */
export const generateIllustrationPrompt = async (context: string, lang: string, model: string): Promise<string> => {
    const ai = getAiClient();
    const prompt = `
        Based on the following story segment, describe a vivid, artistic illustration that captures the mood and key elements. 
        Keep the description visual and specific (lighting, composition, style). 
        Output ONLY the visual description in English (as it works best for image generators).
        
        STORY CONTEXT:
        "${context.substring(0, 2000)}"
    `;

    try {
        const response = await ai.models.generateContent({ model, contents: prompt });
        return response.text?.trim() || "A fantasy scene";
    } catch (error) {
        console.error("Failed to generate illustration prompt", error);
        return "A detailed illustration of the scene";
    }
}

/**
 * Dashboard Feature: Trend Analysis.
 * Aggregates user-selected sources and asks AI to synthesize a "Trend Focus".
 * This keyword is later used to seed the Inspiration Generator.
 */
export const analyzeTrendKeywords = async (sources: string[], lang: string, model: string): Promise<string> => {
  const ai = getAiClient();
  const sourceText = sources.join(', ');
  // Updated prompt to focus on New Book Lists
  const prompt = `Analyze the current hottest trends on these platforms: ${sourceText}. 
  Specifically focus on the "New Book Rank" (新书榜) and "Potential Hit List" (潜力榜) from these sources.
  Identify what kinds of themes or 'golden fingers' are appearing in the newest popular novels.
  Provide a SINGLE, CONCISE keyword phrase (max 10 words) that represents a high-potential trend focus for writing a new web novel today. 
  Example: "Cyberpunk Immortal Cultivation" or "Streamer Survival in Wasteland".
  Output ONLY the phrase.
  ${getLangInstruction(lang)}`;

  try {
    const response = await ai.models.generateContent({ model, contents: prompt });
    return response.text?.trim() || "Viral Trend";
  } catch (error) {
    console.error('Failed to analyze trend', error);
    return "Viral Trend";
  }
}

/**
 * Studio Feature: Daily Inspiration Generation.
 * Uses the "Trend Focus" to generate 5 structured story ideas.
 * 
 * Strategy:
 * 1. Role-play as a Senior Creative Writing Assistant.
 * 2. Strict output format (Custom Markdown Key-Value) for easier parsing on frontend.
 * 3. Incorporates specific web novel elements like "Golden Finger" and "System".
 * 
 * Note: Reduced item count to 5 and switched to streaming to prevent timeouts.
 */
export const generateDailyStories = async (trendFocus: string, sources: string[], targetAudience: string, lang: string, model: string): Promise<string> => {
  const reqId = Math.random().toString(36).substring(7);
  const ai = getAiClient();
  
  const sourceContext = sources.length > 0 
    ? `STRICTLY LIMIT your trend sources to the following Chinese platforms: ${sources.join(', ')}.` 
    : `Use trending topics from major Chinese web novel and social media platforms.`;

  const audiencePrompt = targetAudience === 'male' ? "Male Frequency (男频)" : "Female Frequency (女频)";

  const prompt = `
    You are a senior creative writing assistant specializing in the Chinese web novel market.
    TASK: Generate 5 high-quality, viral-potential short story concepts.
    ${sourceContext}
    
    CONSTRAINTS: 
    1. Focus on "${trendFocus || 'viral trends'}".
    2. TARGET AUDIENCE: ${audiencePrompt}. Strictly generate content suitable for this audience's preferences.
    
    OUTPUT FORMAT (Markdown):
    Use the exact following key-value format for each item. Do not wrap in JSON or code blocks.
    
    ### 1. [Title]
    Source: [Platform Name]
    Gender: [${targetAudience === 'male' ? 'Male' : 'Female'}]
    Major Category: [e.g. Western Fantasy, Eastern Xianxia, Urban, Sci-Fi...]
    Theme: [e.g. Derivative, Officialdom, Urban Superpowers, Rebirth...]
    Character Archetype: [e.g. Multi-female/Harem, Emperor, CEO, Villain...]
    Plot Type: [e.g. God-slaying, Journey to West, Revenge, System...]
    Trope: [Main Trope/Hook]
    Golden Finger: [The specific cheat/advantage]
    Cool Point System: [How the character gains satisfaction/power]
    Memory Anchor: [A memorable specific scene or object]
    Cool Point: [What makes it satisfying?]
    Burst Point: [Opening conflict/twist]
    Synopsis: [Compelling summary...]
    
    ... (repeat for 5 items)
    
    ${getLangInstruction(lang)}
    Ensure all content is in Simplified Chinese.
  `;

  try {
    // Use stream to prevent timeout on long generations
    const result = await ai.models.generateContentStream({ 
        model, 
        contents: { role: 'user', parts: [{ text: prompt }] }
    });
    
    let fullText = '';
    for await (const chunk of result) {
        fullText += chunk.text;
    }
    return fullText || "Failed to generate stories.";
  } catch (error: any) {
    console.error('GeminiService', `[${reqId}] Failed: generateDailyStories`, error);
    return "Error generating stories. Please reduce complexity or try again.";
  }
};

const assignIds = (node: OutlineNode): OutlineNode => {
    if (!node.id) node.id = Math.random().toString(36).substring(2, 11);
    if (node.children) node.children = node.children.map(assignIds);
    return node;
}

// Legacy function for simple outline
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
                    type: { type: Type.STRING },
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

  const prompt = `Create a novel structure for: "${premise}". ${getLangInstruction(lang)}`;

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
 * Architect Core: 8-Map Generation.
 * Instead of a single flat outline, this function generates 8 distinct interconnected trees (Mind Maps).
 * This structure allows for "Retrieval Augmented Generation" within the editor, 
 * where the AI can look up "World" or "Character" details when writing a specific "Chapter".
 */
export const generateNovelArchitecture = async (idea: string, lang: string, model: string): Promise<ArchitectureMap & { synopsis: string }> => {
    const ai = getAiClient();

    // Define a simplified recursive schema for nodes
    const nodeSchema: Schema = {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING },
            type: { type: Type.STRING },
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
    };

    // The Mega-Schema for the 8-Map System
    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            synopsis: { type: Type.STRING },
            world: nodeSchema,
            system: nodeSchema,
            mission: nodeSchema,
            character: nodeSchema,
            anchor: nodeSchema,
            structure: nodeSchema,
            events: nodeSchema,
            chapters: {
                 type: Type.OBJECT,
                 properties: {
                    name: { type: Type.STRING },
                    type: { type: Type.STRING },
                    description: { type: Type.STRING },
                    children: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                type: { type: Type.STRING },
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
                            }
                        }
                    }
                },
                required: ["name", "type", "description"]
            }
        },
        required: ["synopsis", "world", "system", "mission", "character", "anchor", "structure", "events", "chapters"]
    };

    const prompt = `
        Based on the idea: "${idea}", create a comprehensive novel architecture with 8 distinct mind map structures.
        
        Requirements:
        1. World Setting (world): Worldview, power system, geography.
        2. Cool Point System (system): The hierarchy of satisfaction/upgrades.
        3. Mission Archives (mission): Main quest and side quests.
        4. Character Status (character): Protagonist stats/state and key relationships.
        5. Memory Anchors (anchor): Key distinctive items, phrases, or scenes.
        6. Work Outline (structure): High-level structure (Volumes/Acts).
        7. Major Events (events): The key turning points.
        8. Chapter Outline (chapters): Detailed list of chapters for the first volume (at least 10 chapters).

        ${getLangInstruction(lang)}
    `;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        });
        const json = JSON.parse(response.text || "null");
        if (!json) throw new Error("Empty JSON");

        return {
            synopsis: json.synopsis || "",
            world: assignIds(json.world),
            system: assignIds(json.system),
            mission: assignIds(json.mission),
            character: assignIds(json.character),
            anchor: assignIds(json.anchor),
            structure: assignIds(json.structure),
            events: assignIds(json.events),
            chapters: assignIds(json.chapters)
        };
    } catch (error) {
        console.error('GeminiService', 'Failed: generateNovelArchitecture', error);
        throw error;
    }
}

/**
 * Extracts a flattened text context from the hierarchical outline tree.
 * Used to feed relevant "World" or "Character" settings into the drafting AI.
 */
export const extractContextFromTree = (root: OutlineNode): string => {
    let context = '';
    const traverse = (node: OutlineNode) => {
        if (node.type === 'character') context += `[Character] ${node.name}: ${node.description}\n`;
        if (node.type === 'setting') context += `[Setting] ${node.name}: ${node.description}\n`;
        if (node.children) node.children.forEach(traverse);
    }
    traverse(root);
    return context;
}

/**
 * High-level orchestration function to convert a simple text Idea into a full project.
 * 1. Generates Architecture (8-Map).
 * 2. Extracts Context.
 * 3. Generates the first chapter/content based on that architecture.
 */
export const generateStoryFromIdea = async (
    idea: string, 
    config: GenerationConfig, 
    lang: string, 
    model: string,
    stylePrompt?: string
): Promise<{ title: string, content: string, architecture: ArchitectureMap | null, chapters?: {title:string, content:string, nodeId?: string}[] }> => {
    
    // Idea might contain markdown block, just use the first line or cleaned version
    const cleanPremise = idea.replace(/### \d+\./, '').split('\n')[0].trim();
    const cleanTitle = cleanPremise.length > 20 ? "Generated Novel" : cleanPremise;

    console.log("Step 1: Generating Architecture for", cleanTitle);
    
    // Use the new 8-map generation
    const architecture = await generateNovelArchitecture(idea, lang, model);
    
    const context = extractContextFromTree(architecture.world) + extractContextFromTree(architecture.character);
    const synopsis = architecture.synopsis;

    if (config.type === 'short') {
        const ai = getAiClient();
        let styleInstruction = "";
        if (stylePrompt) styleInstruction = `\nSTYLE: ${stylePrompt}\n`;

        const prompt = `
            Write a complete short story.
            Title: ${cleanTitle}
            Synopsis: ${synopsis}
            WORLD & CHARACTER SETTINGS:
            ${context}
            Length: Approx ${config.wordCount || 2000} words.
            ${styleInstruction}
            ${getLangInstruction(lang)}
        `;
        
        const response = await ai.models.generateContent({ model, contents: prompt });
        return {
            title: cleanTitle,
            architecture: architecture,
            content: response.text || "Failed to generate text."
        };
    } else {
        // Serial Novel: Generate first chapter from the "chapters" map
        let firstChapterNode: OutlineNode | null = null;
        if (architecture.chapters && architecture.chapters.children && architecture.chapters.children.length > 0) {
            firstChapterNode = architecture.chapters.children[0];
        }

        let firstChapterContent = "";
        let chapterTitle = "Chapter 1";

        if (firstChapterNode) {
            chapterTitle = firstChapterNode.name;
            firstChapterContent = await generateChapterContent(firstChapterNode, context, lang, model, stylePrompt);
        } else {
            const ai = getAiClient();
            const prompt = `
                Write Chapter 1 for novel: ${cleanTitle}.
                Synopsis: ${synopsis}
                Context: ${context}
                Length: ${config.wordsPerChapter || 2000} words.
                Style: ${stylePrompt || 'Standard'}
                ${getLangInstruction(lang)}
            `;
            const res = await ai.models.generateContent({ model, contents: prompt });
            firstChapterContent = res.text || "";
        }

        return {
            title: cleanTitle,
            architecture: architecture,
            content: "Serial Novel Project",
            chapters: [
                { 
                    title: chapterTitle, 
                    content: firstChapterContent,
                    nodeId: firstChapterNode?.id
                }
            ]
        };
    }
};

/**
 * Generates content for a specific chapter node.
 * CRITICAL: Injects the "World/Character" context to ensure consistency.
 */
export const generateChapterContent = async (
    node: OutlineNode, 
    context: string, 
    lang: string, 
    model: string,
    stylePrompt?: string 
): Promise<string> => {
    const ai = getAiClient();
    
    let styleInstruction = "";
    if (stylePrompt) {
        styleInstruction = `\nWRITING STYLE/GUIDELINE:\n${stylePrompt}\n\nApply this style strictly.`;
    }

    const prompt = `
    Write content for chapter: ${node.name}
    Description: ${node.description}
    GLOBAL CONTEXT (World/Characters):
    ${context}
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

/**
 * Rewrites content with context awareness.
 * Used in the Editor for "AI Modify" features.
 */
export const rewriteChapterWithContext = async (
    currentContent: string,
    updatedContext: string,
    lang: string, 
    model: string,
    stylePrompt?: string
): Promise<string> => {
    const ai = getAiClient();
    
    let styleInstruction = "";
    if (stylePrompt) {
        styleInstruction = `\nWRITING STYLE/GUIDELINE:\n${stylePrompt}\n\nApply this style strictly.`;
    }

    const prompt = `
        REWRITE the following chapter content.
        CONTEXT (World/Characters):
        ${updatedContext}
        ORIGINAL CONTENT:
        ${currentContent}
        Task: Improve the writing, adjust dialogue, behavior, and descriptions.
        ${styleInstruction}
        ${getLangInstruction(lang)}
    `;
    
    try {
        const response = await ai.models.generateContent({ model, contents: prompt });
        return response.text || "Failed to rewrite.";
    } catch(error) {
        console.error('GeminiService', 'Failed: rewriteChapterWithContext', error);
        throw error;
    }
}

export const analyzeText = async (textOrUrl: string, focus: 'pacing' | 'characters' | 'viral_factors', lang: string, model: string): Promise<string> => {
  const ai = getAiClient();
  const instruction = focus === 'viral_factors' ? "Identify 'Golden 3 Chapters' hooks, tropes, and engagement factors." : focus === 'pacing' ? "Analyze pacing and plot progression." : "Analyze characters and arcs.";
  
  const isUrl = textOrUrl.startsWith('http');
  const context = isUrl 
    ? `The user has provided a link: ${textOrUrl}. Please simulate a reading of the content at this link (or assume it is a well-known story if recognizable, otherwise analyze the intent of analyzing such a story structure) and provide an analysis.` 
    : `TEXT: ${textOrUrl.substring(0, 10000)}`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: `${instruction} ${getLangInstruction(lang)}\n${context}`
    });
    return response.text || "No analysis.";
  } catch (error) {
    console.error('GeminiService', 'Failed: analyzeText', error);
    throw error;
  }
};

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

export const generateChildNodes = async (parentNode: OutlineNode, context: string, lang: string, model: string): Promise<OutlineNode[]> => {
    const ai = getAiClient();
    let targetType = parentNode.type === 'act' ? 'chapter' : parentNode.type === 'chapter' ? 'scene' : 'act';
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
                        type: { type: Type.STRING, enum: [targetType, 'character', 'setting', 'item', 'event'] },
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
