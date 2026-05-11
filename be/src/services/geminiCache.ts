import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 3600, checkperiod: 120 }); 

function hash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString();
}

export function getCachedResponse(prompt: string, model: string): string | undefined {
  const key = `${model}:${hash(prompt)}`;
  return cache.get(key);
}

export function setCachedResponse(prompt: string, model: string, response: string): void {
  const key = `${model}:${hash(prompt)}`;
  cache.set(key, response);
}