import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!apiKey) {
  console.warn("NEXT_PUBLIC_GEMINI_API_KEY is not set. Gemini features will not work.");
}

export const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const getModel = (modelName: string = "gemini-3.1-pro-preview") => {
  if (!genAI) return null;
  return genAI.models.generateContent.bind(genAI.models);
};
