import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is not set in environment variables');
  process.exit(1);
}

const FALLBACK_MODELS = ['gemini-2.5-flash-lite', 'gemini-2.5-flash'];

async function callGeminiWithRetry(
  url: string,
  payload: any,
  maxRetries: number = 2,        
  initialDelay: number = 500     
): Promise<any> {
  let lastError: any;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await axios.post(url, payload, { timeout: 15000 }); 
      return response;
    } catch (error: any) {
      lastError = error;
      const status = error.response?.status;
      if (status === 429 || (status >= 500 && status < 600)) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`⚠️ Gemini API error (${status}), retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export async function generateText(
  prompt: string,
  model: string = 'gemini-2.5-flash',
  temperature: number = 0.2,
  maxOutputTokens: number = 8192  
): Promise<string> {
  let currentModel = model;
  let lastError: any;

  for (let attempt = 0; attempt <= FALLBACK_MODELS.length; attempt++) {
    try {
      const url = `${GEMINI_API_URL}/${currentModel}:generateContent?key=${GEMINI_API_KEY}`;
      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature, topP: 0.95, topK: 40, maxOutputTokens },
      };

      const response = await callGeminiWithRetry(url, payload);
      if (response.data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return response.data.candidates[0].content.parts[0].text;
      }
      throw new Error('No response from Gemini');
    } catch (error: any) {
      lastError = error;
      const status = error.response?.status;
      if ((status === 429 || (status >= 500 && status < 600)) && attempt < FALLBACK_MODELS.length) {
        currentModel = FALLBACK_MODELS[attempt];
        console.log(`🔄 Switching to fallback model: ${currentModel}`);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}