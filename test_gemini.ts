import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({});
async function check() {
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{role: 'user', parts: [{text: 'hello'}]}]
    });
    console.log(res.text);
  } catch(e) {
    console.error(e);
  }
}
check();
