
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeCode = async (code: string, language: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze the following ${language} code for errors, security vulnerabilities (especially if it's Solidity), and suggest optimizations:\n\n${code}`,
    config: {
      temperature: 0.7,
      topP: 0.95,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          issues: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                severity: { type: Type.STRING, description: "Low, Medium, High" },
                message: { type: Type.STRING },
                line: { type: Type.NUMBER }
              }
            }
          },
          optimization: { type: Type.STRING }
        },
        required: ["summary", "issues", "optimization"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const completeCode = async (code: string, language: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are a professional code completion engine for Soluf-th IDE. 
    Context: Language is ${language}.
    Code so far:
    ${code}
    
    TASK: Provide only the next logical code snippet to continue the file. 
    IMPORTANT: 
    - Return ONLY the code. 
    - No markdown formatting. 
    - No explanations. 
    - No triple backticks.`,
    config: {
      temperature: 0.2, // Lower temperature for more predictable completion
      maxOutputTokens: 200,
    }
  });

  return response.text;
};

export const chatWithAI = async (message: string, context: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Context: ${context}\n\nUser: ${message}`,
    config: {
      systemInstruction: "You are Soluf-th AI, a senior developer assistant. You specialize in VS Code, GitHub Actions, and Solidity smart contracts. Keep answers concise and code-focused.",
    }
  });
  return response.text;
};
