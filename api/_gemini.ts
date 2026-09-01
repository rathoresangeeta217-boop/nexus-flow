import { GoogleGenAI } from "@google/genai";

export function getAiClient() {
  let apiKeyToUse = process.env.GEMINI_API_KEY_ || process.env.GEMINI_API_KEY;
  if (!apiKeyToUse) {
    throw new Error("GEMINI_API_KEY environment variable is missing on the server. Please check your Vercel settings.");
  }
  return new GoogleGenAI({ apiKey: apiKeyToUse });
}

export function parseJsonOutput(text: string) {
  try {
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '');
      cleaned = cleaned.replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '');
      cleaned = cleaned.replace(/\s*```$/, '');
    }
    return JSON.parse(cleaned);
  } catch (e) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw e;
  }
}

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function callGeminiWithRetry(params: any, maxRetries = 6) {
  let attempt = 0;
  while (true) {
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Gemini API request timed out after 120 seconds. Please try again.")), 120000);
      });
      
      const contents: any[] = [];
      const parts: any[] = [];
      
      for (const input of params.input) {
         if (input.type === 'text') {
            parts.push({ text: input.text });
         } else {
            parts.push({
               inlineData: {
                  mimeType: input.mime_type,
                  data: input.data
               }
            });
         }
      }
      
      contents.push({ role: 'user', parts });
      
      const ai = getAiClient();
      const res = await Promise.race([
        ai.models.generateContent({
           model: params.model,
           contents: contents
        }),
        timeoutPromise
      ]);
      
      return { output_text: (res as any).text };
    } catch (error: any) {
      attempt++;
      const errMsg = ((error as any).message || "") + ((error as any).body || "");
      
      if (errMsg.includes('PerDay')) {
         throw new Error(JSON.stringify({ isRateLimit: true, message: "Global daily AI limits reached. Please try again tomorrow.", retryAfter: 86400000 }));
      }
      
      if (errMsg.includes('429') || errMsg.includes('Quota') || errMsg.includes('rate limit')) {
        if (attempt >= maxRetries) {
          throw new Error(JSON.stringify({ isRateLimit: true, message: "AI is currently busy. Please wait 30 seconds and try again.", retryAfter: 30000 }));
        }
        console.warn(`[Gemini] Rate limit hit. Retrying in ${attempt * 5}s... (Attempt ${attempt}/${maxRetries})`);
        await sleep(attempt * 5000);
        continue;
      }
      
      if (errMsg.includes('503') || errMsg.includes('overloaded')) {
         if (attempt >= maxRetries) {
            throw new Error("AI service is currently overloaded. Please try again in a few minutes.");
         }
         console.warn(`[Gemini] 503 Overloaded. Retrying in ${attempt * 5}s...`);
         await sleep(attempt * 5000);
         continue;
      }

      console.error("[Gemini] Fatal error:", error);
      throw error;
    }
  }
}
