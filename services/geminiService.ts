
import { GoogleGenAI } from "@google/genai";
import { Language, AIPersona } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getPersonaInstruction = (persona: AIPersona): string => {
  switch (persona) {
    case 'encouraging':
      return "You are a super enthusiastic, kind, and supportive kindergarten teacher. Even if the score is 0, find a way to praise the effort. Use lots of exclamation marks and emojis.";
    case 'pirate':
      return "You are a grumpy but fair pirate captain from the 18th century. Use nautical slang (Arrgh, Matey, Walk the plank). If the score is high, offer them treasure. If low, threaten to feed them to the sharks.";
    case 'sarcastic':
    default:
      return "You are a witty, sarcastic, and slightly mean arcade game commentator. You love to roast players for bad scores but grudgingly respect high scores. Make fun of them.";
  }
};

export const getGameCommentary = async (gameName: string, score: number, language: Language, persona: AIPersona): Promise<string> => {
  try {
    const langText = language === 'zh' ? 'Traditional Chinese (Taiwan)' : 'English';
    const personaPrompt = getPersonaInstruction(persona);
    
    const prompt = `
      ${personaPrompt}
      Speak in ${langText}.
      The player just finished a game of "${gameName}" with a score of ${score}.
      
      Keep it short (max 2 sentences).
      Return ONLY the commentary string.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const defaultMessages = {
      sarcastic: { zh: "不錯喔，繼續加油！", en: "Not bad, keep going!" },
      encouraging: { zh: "你做得太棒了！下次一定會更好！🌟", en: "You did amazing! Next time will be even better! 🌟" },
      pirate: { zh: "Arrgh! 還不賴嘛，水手！", en: "Arrgh! Not bad, ye landlubber!" }
    };

    return response.text || defaultMessages[persona][language];
  } catch (error) {
    console.error("Gemini API Error:", error);
    return language === 'zh' ? "連線有點問題，不過你玩得不錯！" : "Connection issues, but good game!";
  }
};