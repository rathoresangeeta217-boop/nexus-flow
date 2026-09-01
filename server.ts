import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";


// Fallback if environment variable is missing
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });



function parseJsonOutput(text) {
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


const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function callGeminiWithRetry(params, maxRetries = 6) {
  let attempt = 0;
  while (true) {
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Gemini API request timed out after 120 seconds. Please try again.")), 120000);
      });
      
      const contents = [];
      const parts = [];
      
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
      
      const res = await Promise.race([
        ai.models.generateContent({
           model: params.model,
           contents: contents
        }),
        timeoutPromise
      ]);
      
      return { output_text: (res as any).text };
    } catch (error) {
      attempt++;
      const errMsg = ((error as any).message || "") + ((error as any).body || "");
      
      if (errMsg.includes('PerDay')) {
        throw new Error(JSON.stringify({
           isRateLimit: true,
           message: "Daily limit of 20 requests reached for this token. Please use a real Gemini API key (AIzaSy...).",
           retryAfter: 0
        }));
      }
      if (errMsg.includes('503') || errMsg.includes('429') || errMsg.includes('Quota exceeded') || errMsg.includes('too_many_requests')) {
        let delay = 10000 * attempt;
        const match = errMsg.match(/retry in ([\d\.]+)s/);
        if (match && match[1]) {
           delay = parseFloat(match[1]) * 1000 + 2000;
        }
        
        if (delay > 10000 || attempt >= maxRetries) {
           throw new Error(JSON.stringify({
             isRateLimit: true,
             message: "Google AI rate limit reached.",
             retryAfter: delay
           }));
        }
        
        console.log(`Rate limited (429). Retrying in ${delay}ms... (Attempt ${attempt}/${maxRetries})`);
        await sleep(delay);
      } else {
        if (attempt >= maxRetries) throw error;
      }
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use((req, res, next) => {
    console.log("INCOMING REQUEST:", req.method, req.url);
    next();
  });


  // Increase the payload limit for file uploads (base64)
  app.use(express.json({ limit: '500mb' }));
  app.use(express.urlencoded({ limit: '500mb', extended: true }));

  // API routes FIRST
  app.post("/api/parse-order", async (req, res) => {
    try {
      const { fileData } = req.body;
      if (!fileData) {
        return res.status(400).json({ error: "Missing file data" });
      }

      // fileData is a data URL like "data:application/pdf;base64,..."
      const match = fileData.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        return res.status(400).json({ error: "Invalid data URL format" });
      }

      const mimeType = match[1];
      const base64Data = match[2];

      const prompt = `
        Analyze this file and extract the following order details in JSON format.
        Return ONLY valid JSON.
        Expected JSON structure:
        {
          "customerName": "...",
          "companyName": "...",
          "mobileNumber": "...",
          "email": "...",
          "address": "...",
          "gst": "...",
          "totalItems": 0,
          "products": [
            { "name": "...", "description": "...", "specification": "...", "quantity": 0, "rate": "...", "amount": "..." }
          ],
          "totalAmount": "...",
          "advancePayment": "...",
          "transportationCharges": "...",
          "installationCharges": "...",
          "bankDetails": "..."
        }
        Extract the FINAL GRAND TOTAL or TOTAL AMOUNT of the invoice/quotation into the "totalAmount" field as a string (include currency symbols like ₹ or Rs. if present). IF THE GRAND TOTAL IS NOT EXPLICITLY WRITTEN, you MUST calculate it by multiplying the quantity by the rate/price for each item and adding them up, including any GST/taxes. Look for any mention of advance payment requirements, transportation/freight/loading charges, or installation charges, and extract their string values. Extract any bank details mentioned (Bank Name, Account Number, IFSC Code) into "bankDetails".
        CRITICAL INSTRUCTION FOR PRODUCTS: 
        1. Extract the EXACT product title verbatim from the text of the quotation for the "name" field. Do NOT alter, summarize, or translate the text.
        2. Extract any detailed description verbatim into the "description" field.
        3. Extract the EXACT specifications or size verbatim into the "specification" field.
        4. Extract the unit rate/price for each product into the "rate" field, and the total line amount into the "amount" field.
        DO NOT invent generic names like "Product 1" or "Wooden Table". READ THE TEXT FROM THE DOCUMENT.
      `;

      const response = await callGeminiWithRetry({
        model: 'gemini-3.6-flash',
        input: [
          { type: 'text', text: prompt },
          {
            
              type: mimeType.startsWith('image/') ? 'image' : 'document',
              mime_type: mimeType,
              data: base64Data
              
          }
        ],
        
      });

      const text = response.output_text;
      if (!text) {
        throw new Error("No output from Gemini");
      }
      
      console.log("Visual Match Raw Output:", text);
        const parsed = parseJsonOutput(text);
      res.json(parsed);
    } catch (error: any) {
      console.error("Error parsing order:", error);
      
      try {
        const errObj = JSON.parse(error.message);
        if (errObj.isRateLimit) {
           return res.status(429).json({ error: errObj.message, retryAfter: errObj.retryAfter });
        }
        if (errObj.error && errObj.error.message) {
           return res.status(500).json({ error: errObj.error.message });
        }
      } catch (e) {
        // ignore
      }
      
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/identify-product", async (req, res) => {
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
  });

  
  app.post("/api/visual-match", async (req, res) => {
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

      const parts = [];
      parts.push({ type: 'text', text: "You are an AI visual search assistant. I am providing a REFERENCE IMAGE of a product below. Your goal is to find ALL items in the catalog that visually match or are similar to this reference image.\n\nREFERENCE IMAGE:" });
      parts.push({
        type: mimeType.startsWith('image/') ? 'image' : 'document',
        mime_type: mimeType,
        data: base64Data
      });
      
      parts.push({ type: 'text', text: "\n\nHere is the catalog of available items. Some items have text descriptions, and some have their own reference images attached:\n" });
      
      const catalogCleaned = [];
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

      parts.push({ type: 'text', text: `\nTask:
1. Look at the REFERENCE IMAGE.
2. Look at all the items in the catalog (both their text and their images, if provided).
3. Identify ALL items in the catalog that are visually the SAME or HIGHLY SIMILAR to the reference image. If the reference image is the exact same photo as a catalog item's photo, it is a guaranteed match. Even if they are just similar types of items (e.g. both are office chairs), include them.
4. Return ONLY a JSON object with a single array property "matchingIds" containing the string IDs of the matched items. If no items match, return {"matchingIds": []}. Do not return any other text.` });

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
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }


  app.use((err, req, res, next) => {
    console.error("EXPRESS GLOBAL ERROR:", err);
    res.status(err.status || 500).json({ error: "Server Error: " + err.message });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
