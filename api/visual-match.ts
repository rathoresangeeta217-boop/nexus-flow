import { callGeminiWithRetry, parseJsonOutput } from './_gemini';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const { imageData, catalog } = req.body;
    if (!imageData) {
      return res.status(400).json({ error: "Missing image data" });
    }

    const match = imageData.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ error: "Invalid data URL format" });
    }

    const mimeType = match[1];
    const base64Data = match[2];

    const parts: any[] = [];
    parts.push({ type: 'text', text: "You are an AI visual search assistant. I am providing a REFERENCE IMAGE of a product below. Your goal is to find ALL items in the catalog that visually match or are similar to this reference image.\n\nREFERENCE IMAGE:" });
    
    parts.push({
      type: mimeType.startsWith('image/') ? 'image' : 'document',
      mime_type: mimeType,
      data: base64Data
    });
    
    parts.push({ type: 'text', text: "\n\nHere is the catalog of available items. Some items have text descriptions, and some have their own reference images attached:\n" });
    
    for (const item of catalog) {
      let itemDesc = `Item ID: ${item.id}\n`;
      if (item.name) itemDesc += `Name: ${item.name}\n`;
      if (item.specification) itemDesc += `Specification: ${item.specification}\n`;
      if (item.items) itemDesc += `Items: ${JSON.stringify(item.items)}\n`;
      
      parts.push({ type: 'text', text: itemDesc });
      
      if (item.image) {
        const imgMatch = item.image.match(/^data:([^;]+);base64,(.+)$/);
        if (imgMatch) {
          parts.push({ type: 'text', text: "Image for this item:" });
          parts.push({
            type: 'image',
            mime_type: imgMatch[1],
            data: imgMatch[2]
          });
        }
      }
      parts.push({ type: 'text', text: "\n---\n" });
    }
    
    parts.push({ type: 'text', text: `\nTask:\n1. Look at the REFERENCE IMAGE.\n2. Look at all the items in the catalog (both their text and their images, if provided).\n3. Identify ALL items in the catalog that are visually the SAME or HIGHLY SIMILAR to the reference image. If the reference image is the exact same photo as a catalog item's photo, it is a guaranteed match. Even if they are just similar types of items (e.g. both are office chairs), include them.\n4. Return ONLY a JSON object with a single array property "matchingIds" containing the string IDs of the matched items. If no items match, return {"matchingIds": []}. Do not return any text other than the JSON object.` });
    
    const response = await callGeminiWithRetry({
      model: 'gemini-3.6-flash',
      input: parts
    });
    
    const text = response.output_text ? response.output_text.trim() : "";
    try {
      const parsed = parseJsonOutput(text);
      res.json({ matchingIds: parsed.matchingIds || [] });
    } catch (e) {
      res.json({ matchingIds: [] });
    }

  } catch (error: any) {
    console.error("Error matching product:", error);
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
