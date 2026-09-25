const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');

const oldCall = `      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
      });`;

const newCall = `      let response;
      let retries = 3;
      while (retries > 0) {
        try {
          response = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: prompt,
          });
          break;
        } catch (e: any) {
          retries--;
          if (retries === 0) throw e;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }`;

content = content.replace(oldCall, newCall);

// also catch the error nicely and return user-friendly message
const oldCatch = `      console.error("Error generating description:", error);
      res.status(500).json({ error: error.message || "Failed to generate description" });`;

const newCatch = `      console.error("Error generating description:", error);
      const errorMessage = error.message || "Failed to generate description";
      if (errorMessage.includes("503") || errorMessage.includes("high demand")) {
        res.status(503).json({ error: "The AI model is currently busy. Please try again in a few seconds." });
      } else {
        res.status(500).json({ error: errorMessage });
      }`;

content = content.replace(oldCatch, newCatch);

fs.writeFileSync('server.ts', content);
console.log("Patched server.ts retry");
