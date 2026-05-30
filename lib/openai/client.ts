import OpenAI from 'openai'

// Gemini via l'API compatible OpenAI (gratuit sur Google AI Studio)
export const openai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
})

export const AI_MODEL = 'llama-3.3-70b-versatile'
