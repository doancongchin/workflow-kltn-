import axios from 'axios';
import dotenv from 'dotenv';
import { getCachedResponse, setCachedResponse } from './geminiCache.js';

dotenv.config();

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

function getApiKeys(): string[] {
  const keys: string[] = [];

  const commaKeys = process.env.GEMINI_API_KEY;
  if (commaKeys) {
    const split = commaKeys.split(',').map(k => k.trim()).filter(k => k.length > 0);
    keys.push(...split);
  }

  for (let i = 1; i <= 10; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key) keys.push(key);
  }

  return [...new Set(keys)];
}

const API_KEYS = getApiKeys();

if (API_KEYS.length === 0) {
  console.error('❌ No Gemini API keys found in environment variables');
  process.exit(1);
}

console.log(`✅ Loaded ${API_KEYS.length} Gemini API key(s)`);

let currentKeyIndex = 0;
const keyBlockedUntil: Record<string, number> = {};

function getAvailableApiKey(): string | null {
  const now = Date.now();
  for (let i = 0; i < API_KEYS.length; i++) {
    const idx = (currentKeyIndex + i) % API_KEYS.length;
    const key = API_KEYS[idx];
    if (keyBlockedUntil[key] && now < keyBlockedUntil[key]) continue;
    currentKeyIndex = (idx + 1) % API_KEYS.length;
    return key;
  }
  return null;
}

function markKeyError(key: string, status: number) {
  if (status === 429 || status === 403) {
    keyBlockedUntil[key] = Date.now() + 60000;
    console.warn(`⛔ Key ${key.slice(0,8)}... blocked for 60s due to ${status}`);
  }
}

const DEFAULT_MODEL = 'gemini-2.5-flash-lite';
const FALLBACK_MODELS = ['gemini-2.5-flash'];

async function callGeminiWithRetry(
  url: string,
  payload: any,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<any> {
  let lastError: any;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await axios.post(url, payload, { timeout: 60000 });
      return response;
    } catch (error: any) {
      lastError = error;
      const status = error.response?.status;
      const isTimeout = error.code === 'ECONNABORTED';
      if (isTimeout || status === 429 || status === 503 || (status >= 500 && status < 600)) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`⚠️ API error (${status || 'timeout'}), retry in ${delay}ms...`);
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
  model: string = DEFAULT_MODEL,
  temperature: number = 0.2,
  maxOutputTokens: number = 5000
): Promise<string> {
  if (!prompt || prompt.trim().length === 0) {
    throw new Error('Prompt cannot be empty');
  }
  let finalPrompt = prompt;
  if (finalPrompt.length > 30000) {
    console.warn(`⚠️ Prompt too long (${finalPrompt.length}), truncating...`);
    finalPrompt = finalPrompt.substring(0, 30000);
  }

  const cached = getCachedResponse(finalPrompt, model);
  if (cached) {
    console.log(`✅ Cache hit for model ${model}`);
    return cached;
  }

  let currentModel = model;
  let lastError: any;

  for (let attempt = 0; attempt <= FALLBACK_MODELS.length; attempt++) {
    const apiKey = getAvailableApiKey();
    if (!apiKey) {
      throw new Error('No available API key (all blocked)');
    }

    try {
      const url = `${GEMINI_API_URL}/${currentModel}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [{ parts: [{ text: finalPrompt }] }],
        generationConfig: { temperature, topP: 0.95, topK: 40, maxOutputTokens },
      };

      const response = await callGeminiWithRetry(url, payload);
      if (response.data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const result = response.data.candidates[0].content.parts[0].text;
        setCachedResponse(finalPrompt, model, result);
        return result;
      }
      throw new Error('No response from Gemini');
    } catch (error: any) {
      lastError = error;
      const status = error.response?.status;
      if (status === 429 || status === 403) {
        markKeyError(apiKey, status);
        continue;
      }
      if ((status === 503 || (status >= 500 && status < 600)) && attempt < FALLBACK_MODELS.length) {
        currentModel = FALLBACK_MODELS[attempt];
        console.log(`🔄 Switching to fallback model: ${currentModel}`);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}