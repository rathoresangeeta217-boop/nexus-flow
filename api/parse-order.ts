import { callGeminiWithRetry, parseJsonOutput } from './_gemini';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const { fileData } = req.body;
    if (!fileData) {
      return res.status(400).json({ error: "Missing fileData" });
    }

    const match = fileData.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ error: "Invalid data URL format" });
    }

    const mimeType = match[1];
    const base64Data = match[2];

    const prompt = `
      You are an expert procurement assistant. Your job is to extract data from the provided purchase order, quotation, or invoice.
      Extract the data into this EXACT JSON structure, and nothing else:
      {
        "customerName": "...",
        "companyName": "...",
        "mobileNumber": "...",
        "email": "...",
        "address": "...",
        "gst": "...",
        "products": [
          { "name": "...", "description": "...", "specification": "...", "quantity": 0, "rate": "...", "amount": "..." }
        ],
        "totalAmount": "...",
        "advancePayment": "...",
        "transportationCharges": "...",
        "installationCharges": "..."
      }
      Extract the FINAL GRAND TOTAL or TOTAL AMOUNT of the invoice/quotation into the "totalAmount" field as a string (include currency symbols like ₹ or Rs. if present). IF THE GRAND TOTAL IS NOT EXPLICITLY WRITTEN, you MUST calculate it by multiplying the quantity by the rate/price for each item and adding them up, including any GST/taxes. Look for any mention of advance payment requirements, transportation/freight/loading charges, or installation charges, and extract their string values.
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
    
    console.log("Parse Output:", text);
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
}
