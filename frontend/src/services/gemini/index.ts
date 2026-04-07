/**
 * AI Integration Service for QGenesis (Google Gemini)
 * =====================================================
 * 
 * Complete AI integration layer with RAG support.
 * Powered by Google Gemini (free tier available).
 * 
 * ACTIVATION (in Cursor):
 * 1. npm install @google/generative-ai
 * 2. Set VITE_GEMINI_API_KEY in .env (get free key from https://aistudio.google.com/apikey)
 * 3. Set AI_FEATURES.useGemini = true in config.ts
 * 4. Everything works — RAG retrieval, material-restricted chat, question generation
 */

export * from './types';
export * from './questionGenerator';
export * from './materialAnalyzer';
export * from './assistantChat';
export * from './config';
export * from './prompts';
export * from './ragService';
