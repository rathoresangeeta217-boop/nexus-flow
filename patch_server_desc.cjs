const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');

const endpoint = `  app.post("/api/generate-description", async (req, res) => {
    try {
      const { productName } = req.body;
      if (!productName) {
        return res.status(400).json({ error: "Product name is required" });
      }
      
      const ai = getAI();
      const prompt = \`Generate a short, compelling, and professional one-paragraph product description (maximum 3 sentences) for a product named "\${productName}". Focus on its potential features and benefits. Do not use any markdown formatting.\`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
      });
      
      res.json({ description: response.text });
    } catch (error) {
      console.error("Error generating description:", error);
      res.status(500).json({ error: error.message || "Failed to generate description" });
    }
  });

  app.post("/api/visual-match", async (req, res) => {`;

content = content.replace(
  '  app.post("/api/visual-match", async (req, res) => {',
  endpoint
);

fs.writeFileSync('server.ts', content);
console.log("Patched server.ts with generate-description endpoint");
