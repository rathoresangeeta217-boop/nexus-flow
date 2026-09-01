import { callGeminiWithRetry } from './_gemini';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const { imageData } = req.body;
    if (!imageData) {
      return res.status(400).json({ error: "Missing image data" });
    }

    const match = imageData.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ error: "Invalid data URL format" });
    }

    const mimeType = match[1];
    const base64Data = match[2];

    const prompt = `Identify the main product or furniture item in this image. 
     Return ONLY a short, concise name (2-4 words maximum) that can be used as a search query. 
     For example: "Office Chair", "Wooden Desk", "Conference Table", "Drawer Handle".`;

    const response = await callGeminiWithRetry({
      model: 'gemini-3.6-flash',
      input: [
        { type: 'text', text: prompt },
        {
            type: mimeType.startsWith('image/') ? 'image' : 'document',
            mime_type: mimeType,
            data: base64Data
        }
      ]
    });

    const text = response.output_text ? response.output_text.trim() : "";
    res.json({ searchQuery: text });

  } catch (error: any) {
    console.error("Error identifying product:", error);
    try {
      const errObj = JSON.parse(error.message);
      if (errObj.isRateLimit) {
         return res.status(429).json({ error: errObj.message, retryAfter: errObj.retryAfter });
      }
      if (errObj.error && errObj.error.message) {
         return res.status(500).json({ error: errObj.error.message });
      }
    } catch (e) {}
    res.status(500).json({ error: error.message });
  }
}
