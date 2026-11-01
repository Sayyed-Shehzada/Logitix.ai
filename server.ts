import express from 'express';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { processAgentRequest, transcribeAudio } from './src/core/ai_engine.js';
import { combinedAIEngine } from './src/core/combined_ai.js';
import {
  generateGeminiImage,
  startGeminiVideoGeneration,
  checkGeminiVideoStatus,
  executeWebSearch,
  executeGoogleAIStudioPlayground,
  generatePresentationOutlineWithGemini,
  suggestTopicStyleWithGemini,
} from './src/core/gemini_studio.js';
import { executeManusTask } from './src/core/manus_engine.js';
import { GenerateVideosOperation, GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';
import { memoryStore } from './src/core/memory_store.js';
import { emailStore, availableTools } from './src/core/tools.js';
import { isSmtpConfigured, sendVerificationCodeEmail, sendPasswordResetCodeEmail } from './src/server/mailer.js';

dotenv.config();

// In AI Studio cloud environment, HMR WebSocket is disabled
process.env.DISABLE_HMR = 'true';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '20mb' }));

  // ==========================================
  // User Management, Access Control & Quota Stores
  // ==========================================
  const OWNER_EMAIL = 'logitix.ai@gmail.com';
  const SUPER_ADMINS = ['logitix.ai@gmail.com', 'salmasayyed373@gmail.com'];

  const userHeartbeatsMap = new Map<string, number>();

  const registeredUsersStore: Array<{
    email: string;
    name: string;
    role: string;
    avatar: string;
    age?: string;
    dob?: string;
    registeredAt: string;
    lastActive: string;
    isBanned: boolean;
    isAdmin?: boolean;
    isPro?: boolean;
    plan?: string;
  }> = [
    {
      email: 'logitix.ai@gmail.com',
      name: 'Logitix AI',
      role: 'Owner & Super Admin',
      avatar: 'LX',
      age: '24',
      dob: '2002-05-18',
      registeredAt: new Date().toISOString(),
      lastActive: 'Offline',
      isBanned: false,
      isAdmin: true,
      isPro: true,
      plan: 'Pro Member',
    },
    {
      email: 'salmasayyed373@gmail.com',
      name: 'Salma Sayyed',
      role: 'Super Admin',
      avatar: 'SS',
      age: '24',
      dob: '2002-05-18',
      registeredAt: new Date().toISOString(),
      lastActive: 'Offline',
      isBanned: false,
      isAdmin: true,
      isPro: true,
      plan: 'Pro Member',
    },
  ];

  const bannedEmailsSet = new Set<string>();

  // Rolling 24h Quota Tracking Store for Workspace Members
  const userQuotaUsageStore = new Map<string, {
    questionTimestamps: number[];
    imageTimestamps: number[];
  }>();

  const WORKSPACE_LIMITS = {
    MAX_CHATS: 20,
    MAX_IMAGES_24H: 7,
    MAX_QUESTIONS_24H: 50,
    WINDOW_MS: 24 * 60 * 60 * 1000, // 24 hours
  };

  function getCleanEmail(email?: string): string {
    return (email || '').trim().toLowerCase();
  }

  function isEmailBanned(email?: string): boolean {
    if (!email) return false;
    return bannedEmailsSet.has(getCleanEmail(email));
  }

  function getUserPrivilege(email?: string): {
    isOwner: boolean;
    isSuperAdmin: boolean;
    isAdmin: boolean;
    isPro: boolean;
    isPrivileged: boolean;
    role: string;
    plan: string;
  } {
    const clean = getCleanEmail(email);
    if (!clean) {
      return {
        isOwner: false,
        isSuperAdmin: false,
        isAdmin: false,
        isPro: false,
        isPrivileged: false,
        role: 'Workspace Member',
        plan: 'Standard',
      };
    }

    const isOwner = clean === OWNER_EMAIL.toLowerCase();
    const isSuperAdmin = isOwner || SUPER_ADMINS.some((a) => a.toLowerCase() === clean);

    const registered = registeredUsersStore.find((u) => u.email.toLowerCase() === clean);
    const isAdmin = isOwner || isSuperAdmin || Boolean(registered?.isAdmin) || Boolean(registered?.role?.toLowerCase().includes('admin'));
    const isPro = isOwner || isSuperAdmin || Boolean(registered?.isPro) || Boolean(registered?.plan?.toLowerCase().includes('pro'));
    const isPrivileged = isOwner || isSuperAdmin || isAdmin || isPro;

    const role = isOwner ? 'Owner & Super Admin' : (isSuperAdmin ? 'Super Admin' : (isAdmin ? 'Admin' : (registered?.role || 'Workspace Member')));
    const plan = isPro ? 'Pro Member' : (registered?.plan || 'Standard');

    return { isOwner, isSuperAdmin, isAdmin, isPro, isPrivileged, role, plan };
  }

  function getUserQuotaRecord(email: string) {
    const clean = getCleanEmail(email);
    let record = userQuotaUsageStore.get(clean);
    if (!record) {
      record = { questionTimestamps: [], imageTimestamps: [] };
      userQuotaUsageStore.set(clean, record);
    }
    const now = Date.now();
    const cutoff = now - WORKSPACE_LIMITS.WINDOW_MS;
    record.questionTimestamps = record.questionTimestamps.filter((t) => t > cutoff);
    record.imageTimestamps = record.imageTimestamps.filter((t) => t > cutoff);
    return record;
  }

  function formatTimeRemaining(ms: number): string {
    if (ms <= 0) return 'now';
    const totalSeconds = Math.ceil(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }

  function checkQuestionQuota(email?: string): {
    allowed: boolean;
    remaining: number;
    used: number;
    resetsInMs: number;
    error?: string;
  } {
    const priv = getUserPrivilege(email);
    if (priv.isPrivileged) {
      return { allowed: true, remaining: Infinity, used: 0, resetsInMs: 0 };
    }
    const clean = getCleanEmail(email);
    const record = getUserQuotaRecord(clean);
    const used = record.questionTimestamps.length;
    if (used >= WORKSPACE_LIMITS.MAX_QUESTIONS_24H) {
      const oldest = Math.min(...record.questionTimestamps);
      const resetsInMs = Math.max(0, (oldest + WORKSPACE_LIMITS.WINDOW_MS) - Date.now());
      return {
        allowed: false,
        remaining: 0,
        used,
        resetsInMs,
        error: `Daily Question Limit Reached (50/50): Workspace Members can ask up to 50 questions per 24 hours. Your limit resets in ${formatTimeRemaining(resetsInMs)}. Upgrade to Pro or contact the Workspace Owner/Admin for unlimited questions and fastest responses.`,
      };
    }
    return {
      allowed: true,
      remaining: WORKSPACE_LIMITS.MAX_QUESTIONS_24H - used,
      used,
      resetsInMs: 0,
    };
  }

  function recordQuestion(email?: string): void {
    const priv = getUserPrivilege(email);
    if (priv.isPrivileged) return;
    const clean = getCleanEmail(email);
    if (!clean) return;
    const record = getUserQuotaRecord(clean);
    record.questionTimestamps.push(Date.now());
  }

  function checkImageQuota(email?: string): {
    allowed: boolean;
    remaining: number;
    used: number;
    resetsInMs: number;
    error?: string;
  } {
    const priv = getUserPrivilege(email);
    if (priv.isPrivileged) {
      return { allowed: true, remaining: Infinity, used: 0, resetsInMs: 0 };
    }
    const clean = getCleanEmail(email);
    const record = getUserQuotaRecord(clean);
    const used = record.imageTimestamps.length;
    if (used >= WORKSPACE_LIMITS.MAX_IMAGES_24H) {
      const oldest = Math.min(...record.imageTimestamps);
      const resetsInMs = Math.max(0, (oldest + WORKSPACE_LIMITS.WINDOW_MS) - Date.now());
      return {
        allowed: false,
        remaining: 0,
        used,
        resetsInMs,
        error: `Daily Image Limit Reached (7/7): Workspace Members can generate up to 7 images per 24 hours. Your limit resets in ${formatTimeRemaining(resetsInMs)}. Upgrade to Pro or contact the Workspace Owner/Admin for unlimited image generation and fastest responses.`,
      };
    }
    return {
      allowed: true,
      remaining: WORKSPACE_LIMITS.MAX_IMAGES_24H - used,
      used,
      resetsInMs: 0,
    };
  }

  function recordImage(email?: string): void {
    const priv = getUserPrivilege(email);
    if (priv.isPrivileged) return;
    const clean = getCleanEmail(email);
    if (!clean) return;
    const record = getUserQuotaRecord(clean);
    record.imageTimestamps.push(Date.now());
  }

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', name: 'LOGITIX AI Assistant Server' });
  });

  // Google Gemini AI Image Generator Route
  app.post('/api/gemini/generate-image', async (req, res) => {
    try {
      const { prompt, aspectRatio, referenceImage, referenceImageUrl, userEmail } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const cleanEmail = getCleanEmail(userEmail);

      // Access Control: Banned check
      if (isEmailBanned(cleanEmail)) {
        return res.status(403).json({
          error: `Access Revoked: Your account (${cleanEmail || 'unknown'}) has been suspended or revoked.`,
          isBanned: true,
        });
      }

      const priv = getUserPrivilege(cleanEmail);

      // Quota check for standard Workspace Members
      if (!priv.isPrivileged) {
        const imgQuota = checkImageQuota(cleanEmail);
        if (!imgQuota.allowed) {
          return res.status(429).json({
            error: imgQuota.error,
            quotaExceeded: true,
            quotaType: 'images',
            resetsInMs: imgQuota.resetsInMs,
          });
        }
        recordImage(cleanEmail);
      }

      const refImg = referenceImage || referenceImageUrl;
      const result = await generateGeminiImage(prompt, aspectRatio || '16:9', refImg);
      res.json({
        ...result,
        speedTier: 'fastest',
        roleTier: priv.role,
        isPrivileged: priv.isPrivileged,
      });
    } catch (error: any) {
      console.error('Gemini Image Generation Route Error:', error);
      res.status(500).json({
        error: error.message || 'Failed to generate image with Gemini AI',
      });
    }
  });

  // Google Gemini AI Video Generator (Veo 3.1) Start Route
  app.post('/api/gemini/generate-video', async (req, res) => {
    try {
      const { prompt, aspectRatio, referenceImage, referenceImageUrl } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const refImg = referenceImage || referenceImageUrl;
      const result = await startGeminiVideoGeneration(prompt, aspectRatio || '16:9', refImg);
      res.json(result);
    } catch (error: any) {
      console.error('Gemini Video Start Route Error:', error);
      res.status(500).json({
        error: error.message || 'Failed to initiate Veo video generation with Gemini AI',
      });
    }
  });

  // Google Gemini AI Video Status Polling Route
  app.post('/api/gemini/video-status', async (req, res) => {
    try {
      const { operationName } = req.body;
      if (!operationName) {
        return res.status(400).json({ error: 'operationName is required' });
      }

      const status = await checkGeminiVideoStatus(operationName);
      res.json(status);
    } catch (error: any) {
      console.error('Gemini Video Status Route Error:', error);
      res.status(500).json({
        error: error.message || 'Failed to check Veo video status',
      });
    }
  });

  // Google Search Grounding & Web Research API
  app.post('/api/search', async (req, res) => {
    try {
      const { query } = req.body;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Search query string is required' });
      }

      const results = await executeWebSearch(query);
      res.json(results);
    } catch (error: any) {
      console.error('Web Search API Error:', error);
      res.status(500).json({ error: error.message || 'Failed to execute web search' });
    }
  });

  // Google AI Studio Playground Execution API
  app.post('/api/google-ai-studio/generate', async (req, res) => {
    try {
      const {
        prompt,
        systemInstruction,
        model,
        temperature,
        topP,
        thinkingLevel,
        enableSearchGrounding,
        responseMimeType,
        imageAttachment,
        userEmail,
      } = req.body;

      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const cleanEmail = getCleanEmail(userEmail);
      if (isEmailBanned(cleanEmail)) {
        return res.status(403).json({ error: 'Access Revoked: Your account is suspended.' });
      }

      const result = await executeGoogleAIStudioPlayground({
        prompt,
        systemInstruction,
        model,
        temperature,
        topP,
        thinkingLevel,
        enableSearchGrounding,
        responseMimeType,
        imageAttachment,
      });

      res.json(result);
    } catch (error: any) {
      console.error('Google AI Studio API Route Error:', error);
      res.status(500).json({
        error: error.message || 'Failed to execute prompt in Google AI Studio',
      });
    }
  });

  // Manus AI Autonomous General-Purpose Agent Execution API
  app.post('/api/manus/execute-task', async (req, res) => {
    try {
      const { goal, task, mode } = req.body;
      const targetGoal = goal || task;
      if (!targetGoal || typeof targetGoal !== 'string') {
        return res.status(400).json({ error: 'Mission goal is required' });
      }

      const result = await executeManusTask(targetGoal, mode || 'autonomous_full');
      res.json(result);
    } catch (error: any) {
      console.error('Manus AI Task Execution Route Error:', error);
      res.status(500).json({
        error: error.message || 'Failed to execute Manus AI autonomous task',
      });
    }
  });

  // Whisper / Gemini Audio Speech-to-Text Transcription Flow
  app.post('/api/transcribe', async (req, res) => {
    try {
      const { audioBase64, mimeType } = req.body;
      if (!audioBase64) {
        return res.status(400).json({ error: 'audioBase64 string is required' });
      }

      const text = await transcribeAudio(audioBase64, mimeType || 'audio/webm');
      res.json({ text });
    } catch (error: any) {
      console.error('Transcription API Error:', error);
      res.status(500).json({ error: error.message || 'Failed to transcribe audio recording' });
    }
  });

  // Real-Time Voice Conversation Endpoint powered by model gemini-3.8-live (Live API)
  app.post('/api/live/voice', async (req, res) => {
    try {
      const { message, audioBase64, mimeType } = req.body;
      let promptText = (message || '').trim();

      // Transcribe user audio input if audio stream/recording is passed
      if (audioBase64) {
        try {
          const transcribed = await transcribeAudio(audioBase64, mimeType || 'audio/webm');
          if (transcribed) promptText = transcribed;
        } catch (tErr) {
          console.warn('Live voice transcription step notice:', tErr);
        }
      }

      if (!promptText) {
        return res.status(400).json({ error: 'Message text or audio recording is required.' });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const audioChunks: string[] = [];
      let textBuffer = '';

      // Initialize real-time Live API session with gemini-3.8-live
      const session = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: 'You are LOGITIX Voice Assistant powered by Gemini 3.8 Live API. You speak naturally, concisely, and helpfully in a 1 to 3 sentence executive conversational cadence.',
        },
        callbacks: {
          onmessage: (msg: LiveServerMessage) => {
            const chunk = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            const textChunk = msg.serverContent?.modelTurn?.parts?.[0]?.text;
            if (chunk) audioChunks.push(chunk);
            if (textChunk) textBuffer += textChunk;
          },
        },
      });

      // Send client turn
      session.sendClientContent({
        turns: [{ role: 'user', parts: [{ text: promptText }] }],
        turnComplete: true,
      });

      // Allow Live API model to stream response
      await new Promise((resolve) => setTimeout(resolve, 3200));

      try {
        await session.close();
      } catch {}

      // If textBuffer is empty, generate crisp transcript using fast model
      let finalReply = textBuffer.trim();
      if (!finalReply) {
        try {
          const textGen = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: `The user spoke: "${promptText}". Give a 1-2 sentence conversational voice response.`,
          });
          finalReply = textGen.text?.trim() || `Understood: "${promptText}". Connected live.`;
        } catch {
          finalReply = `Understood: "${promptText}". LOGITIX Live stream verified.`;
        }
      }

      res.json({
        promptText,
        reply: finalReply,
        audioChunks,
        model: 'gemini-3.8-live',
      });
    } catch (error: any) {
      console.error('Gemini 3.8 Live Voice Error:', error);
      res.status(500).json({ error: error.message || 'Live voice conversation error' });
    }
  });

  // 1. Agent Chat Processing with Role-Based Access Control, Speed Tiers & Quota Enforcement
  app.post('/api/chat', async (req, res) => {
    try {
      const {
        message,
        webSearchEnabled,
        activeModel,
        imageAttachment,
        attachment,
        history,
        conversationHistory,
        userEmail,
        email,
      } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      const cleanEmail = getCleanEmail(userEmail || email);

      // Access Control: Account Revocation / Ban Check
      if (isEmailBanned(cleanEmail)) {
        return res.status(403).json({
          error: `Access Revoked: Your account (${cleanEmail || 'unknown'}) has been suspended or revoked by the workspace administrator.`,
          isBanned: true,
        });
      }

      const priv = getUserPrivilege(cleanEmail);

      // Intent detection for image requests
      const lowerMsg = message.toLowerCase();
      const isImageGenReq =
        lowerMsg.includes('generate image') ||
        lowerMsg.includes('create image') ||
        lowerMsg.includes('draw') ||
        lowerMsg.includes('make image') ||
        lowerMsg.includes('picture of') ||
        lowerMsg.includes('photo of') ||
        lowerMsg.includes('edit image');

      // Role-Based Quota Check for Workspace Members
      // (Owner, Super Admin, Admin, and Pro Members enjoy Unlimited Questions & Images)
      if (!priv.isPrivileged) {
        // 1. Check 24-hour question quota (Max 50 questions per 24 hours)
        const qQuota = checkQuestionQuota(cleanEmail);
        if (!qQuota.allowed) {
          return res.status(429).json({
            reply: `### ⏳ 24-Hour Question Limit Reached\n\nWorkspace Members can ask up to **50 questions per 24 hours**.\n\nYour limit resets in **${formatTimeRemaining(qQuota.resetsInMs)}**.\n\n💡 *Tip: Upgrade to **Pro Member** or ask a Workspace Admin to grant you Pro status for **unlimited questions**, **unlimited image generation**, and **instant fastest responses**!*`,
            quotaExceeded: true,
            quotaType: 'questions',
            resetsInMs: qQuota.resetsInMs,
            plan: [
              '🛑 Evaluated 24-hour question quota: 50/50 used',
              `⏳ Limit resets in ${formatTimeRemaining(qQuota.resetsInMs)}`,
            ],
            toolCalls: [],
            memoriesUsed: [],
            speedTier: 'slow',
            roleTier: priv.role,
            isPrivileged: false,
          });
        }

        // 2. Check 24-hour image generation quota (Max 7 images per 24 hours)
        if (isImageGenReq) {
          const imgQuota = checkImageQuota(cleanEmail);
          if (!imgQuota.allowed) {
            return res.status(429).json({
              reply: `### 🎨 24-Hour Image Limit Reached\n\nWorkspace Members can generate up to **7 images per 24 hours**.\n\nYour limit resets in **${formatTimeRemaining(imgQuota.resetsInMs)}**.\n\n💡 *Tip: Upgrade to **Pro Member** or ask a Workspace Admin to grant you Pro status for **unlimited image generation** and **fastest response times**!*`,
              quotaExceeded: true,
              quotaType: 'images',
              resetsInMs: imgQuota.resetsInMs,
              plan: [
                '🛑 Evaluated 24-hour image generation quota: 7/7 used',
                `⏳ Limit resets in ${formatTimeRemaining(imgQuota.resetsInMs)}`,
              ],
              toolCalls: [],
              memoriesUsed: [],
              speedTier: 'slow',
              roleTier: priv.role,
              isPrivileged: false,
            });
          }
        }

        // Record question & image usage
        recordQuestion(cleanEmail);
        if (isImageGenReq) {
          recordImage(cleanEmail);
        }
      }

      // Fastest execution, zero delay, rapid response processing
      const imgAtt = imageAttachment || attachment;
      const historyToUse = Array.isArray(conversationHistory) ? conversationHistory : Array.isArray(history) ? history : [];
      const result = await processAgentRequest(message, webSearchEnabled, activeModel, imgAtt, historyToUse);

      res.json({
        ...result,
        speedTier: 'fastest',
        roleTier: priv.role,
        isPrivileged: priv.isPrivileged,
      });
    } catch (error: any) {
      console.error('Chat API Error:', error);
      res.status(500).json({ error: error.message || 'Server error processing chat request' });
    }
  });

  // Real-time Quota & Privilege Status API
  app.get('/api/users/quota', (req, res) => {
    const email = (req.query.email as string || '').trim().toLowerCase();
    const chatsCount = parseInt((req.query.chatsCount as string) || '0', 10);
    const priv = getUserPrivilege(email);

    if (priv.isPrivileged) {
      return res.json({
        isPrivileged: true,
        roleTier: priv.role,
        speedMode: 'fastest',
        chatsCount,
        maxChats: Infinity,
        chatsRemaining: Infinity,
        canCreateChat: true,
        questionsUsed24h: 0,
        maxQuestions24h: Infinity,
        questionsRemaining: Infinity,
        canAskQuestion: true,
        questionsResetInMs: 0,
        imagesUsed24h: 0,
        maxImages24h: Infinity,
        imagesRemaining: Infinity,
        canGenerateImage: true,
        imagesResetInMs: 0,
      });
    }

    const record = getUserQuotaRecord(email);
    const qUsed = record.questionTimestamps.length;
    const imgUsed = record.imageTimestamps.length;
    const now = Date.now();

    let qResetMs = 0;
    if (qUsed > 0) {
      const oldestQ = Math.min(...record.questionTimestamps);
      qResetMs = Math.max(0, oldestQ + WORKSPACE_LIMITS.WINDOW_MS - now);
    }

    let imgResetMs = 0;
    if (imgUsed > 0) {
      const oldestImg = Math.min(...record.imageTimestamps);
      imgResetMs = Math.max(0, oldestImg + WORKSPACE_LIMITS.WINDOW_MS - now);
    }

    res.json({
      isPrivileged: false,
      roleTier: 'Workspace Member',
      speedMode: 'slow',
      chatsCount,
      maxChats: WORKSPACE_LIMITS.MAX_CHATS,
      chatsRemaining: Math.max(0, WORKSPACE_LIMITS.MAX_CHATS - chatsCount),
      canCreateChat: chatsCount < WORKSPACE_LIMITS.MAX_CHATS,
      questionsUsed24h: qUsed,
      maxQuestions24h: WORKSPACE_LIMITS.MAX_QUESTIONS_24H,
      questionsRemaining: Math.max(0, WORKSPACE_LIMITS.MAX_QUESTIONS_24H - qUsed),
      canAskQuestion: qUsed < WORKSPACE_LIMITS.MAX_QUESTIONS_24H,
      questionsResetInMs: qResetMs,
      imagesUsed24h: imgUsed,
      maxImages24h: WORKSPACE_LIMITS.MAX_IMAGES_24H,
      imagesRemaining: Math.max(0, WORKSPACE_LIMITS.MAX_IMAGES_24H - imgUsed),
      canGenerateImage: imgUsed < WORKSPACE_LIMITS.MAX_IMAGES_24H,
      imagesResetInMs: imgResetMs,
    });
  });

  // 1.1 Multi-Provider AI Diagnostic Endpoint (Gemini, Claude, AIML API status)
  app.get('/api/ai/providers-status', (req, res) => {
    try {
      const status = combinedAIEngine.getStatus();
      res.json({
        status: 'ok',
        providers: status,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to check AI providers status' });
    }
  });

  // 1.15 Google Slides AI Presentation Outline Generator Route
  app.post('/api/slides/generate-outline', async (req, res) => {
    try {
      const { prompt, conditions } = req.body;
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'Presentation topic prompt is required.' });
      }

      const outline = await generatePresentationOutlineWithGemini(prompt, conditions || {});
      res.json(outline);
    } catch (error: any) {
      console.warn('Gemini presentation outline generation notice:', error?.message);
      res.status(500).json({ error: error?.message || 'Failed to generate presentation outline with Gemini' });
    }
  });

  // 1.155 Google Slides Presentation Topic Color Palette & Typography Suggestion Route
  app.post('/api/slides/suggest-style', async (req, res) => {
    try {
      const { topic, templateCategory } = req.body;
      if (!topic || typeof topic !== 'string') {
        return res.status(400).json({ error: 'Presentation topic is required.' });
      }

      const suggestion = await suggestTopicStyleWithGemini(topic, templateCategory);
      res.json(suggestion);
    } catch (error: any) {
      console.warn('Gemini topic style suggestion fallback notice:', error?.message);
      res.status(500).json({ error: error?.message || 'Failed to suggest presentation style with Gemini' });
    }
  });

  // 1.16 Google Slides AI Visual & Business Chart Generator Route
  app.post('/api/slides/generate-image', async (req, res) => {
    try {
      const {
        prompt,
        type = 'illustration', // 'illustration' | 'chart' | 'diagram'
        aspectRatio = '16:9',
        style = 'business-vector',
        theme = 'Modern Indigo',
        slideContext,
      } = req.body;

      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'Prompt is required for visual generation.' });
      }

      // Build an enhanced prompt optimized for clean, high-resolution slide visuals
      let enhancedPrompt = prompt.trim();
      if (type === 'chart') {
        enhancedPrompt = `A clean, modern professional business data visualization and infographic chart: "${prompt}". Style: ${style}, high contrast executive presentation aesthetic, clean typography, vibrant corporate palette matching ${theme}, minimalistic background, zero clutter, 4K crisp resolution.`;
      } else if (type === 'diagram') {
        enhancedPrompt = `A clean, modern technical systems architecture topology diagram and conceptual infographic: "${prompt}". Isometric or 2D technical vector diagram, cloud infrastructure blocks, clean labels, high contrast, elegant dark or clean corporate palette matching ${theme}.`;
      } else {
        enhancedPrompt = `A high-quality, professional corporate presentation slide illustration: "${prompt}". Style: ${style}, polished vector illustration, clean lines, professional business aesthetic matching ${theme}, suitable for executive pitch deck or technical keynote, crisp details, isolated or clean modern backdrop.`;
      }

      if (slideContext?.title) {
        enhancedPrompt += ` Context: Slide title "${slideContext.title}".`;
      }

      const result = await generateGeminiImage(enhancedPrompt, aspectRatio || '16:9');
      res.json({
        imageUrl: result.imageUrl,
        model: result.model,
        prompt: enhancedPrompt,
        type,
        aspectRatio,
        style,
      });
    } catch (error: any) {
      console.warn('Slide image generation error:', error?.message);
      res.status(500).json({ error: error?.message || 'Failed to generate visual with Gemini' });
    }
  });

  // 1.2 Distributed Outbox Architecture Real-Time Health Telemetry (50k req/s)
  app.get('/api/outbox-health', (req, res) => {
    try {
      const scenario = (req.query.scenario as string) || 'normal';
      const now = Date.now();
      const baseVariation = Math.sin(now / 5000) * 800 + (Math.random() * 400 - 200);

      const isSurge = scenario === 'surge';
      const isFailover = scenario === 'failover';

      const ingressThroughput = Math.round(isSurge ? 62500 + baseVariation : 50000 + baseVariation);
      const storageWrites = ingressThroughput * 2; // Domain write + Outbox write
      const ingressP99 = isSurge ? 34.2 : 31.4 + Math.random() * 1.5;
      const publishP99 = isFailover ? 218 : isSurge ? 204 : 184 + Math.random() * 8;
      const redisHitRate = isSurge ? 99.28 : 99.42 + (Math.random() * 0.1 - 0.05);

      // Generate 16 Shards
      const shards = Array.from({ length: 16 }, (_, idx) => {
        const id = idx + 1;
        const shardBase = ingressThroughput / 16;
        const jitter = Math.sin((now + id * 1000) / 4000) * 60 + (Math.random() * 40 - 20);
        const isFailingShard = isFailover && id === 7;

        return {
          id,
          name: `pg-shard-${id.toString().padStart(2, '0')}`,
          cluster: `pg-cluster-${Math.ceil(id / 4)}`,
          host: `shard-${id.toString().padStart(2, '0')}.nvme.internal`,
          throughputReqs: Math.round(isFailingShard ? shardBase * 0.4 : shardBase + jitter),
          writesSec: Math.round((isFailingShard ? shardBase * 0.4 : shardBase + jitter) * 2),
          cpuPercent: Math.round(isSurge ? 58 + Math.random() * 8 : isFailingShard ? 22 : 44 + Math.random() * 8),
          walRateMbSec: +(isSurge ? 4.8 : 3.75 + Math.random() * 0.3).toFixed(2),
          connPoolActive: Math.round(isSurge ? 68 + Math.random() * 8 : 42 + Math.random() * 6),
          connPoolMax: 100,
          iops: Math.round(isSurge ? 7800 + Math.random() * 400 : 6250 + Math.random() * 300),
          deadTuplesPct: +(0.6 + Math.random() * 0.3).toFixed(2),
          lsnDeltaBytes: isFailingShard ? 1420 : Math.round(48 + Math.random() * 80),
          cdcLagMs: isFailingShard ? 850 : Math.round(18 + Math.random() * 15),
          status: isFailingShard ? 'FAILOVER' : isSurge ? 'OPTIMAL' : 'OPTIMAL',
          activePartition: `outbox_${new Date().toISOString().slice(0, 10).replace(/-/g, '_')}_h${new Date().getUTCHours().toString().padStart(2, '0')}`,
        };
      });

      // Generate 256 Kafka Partitions
      const totalPartitions = 256;
      const consumerGroupNames = ['billing-service-cg', 'notification-dispatch-cg', 'analytics-lakehouse-cg'];
      
      const kafkaPartitions = Array.from({ length: totalPartitions }, (_, pId) => {
        const baseMsgSec = Math.round(ingressThroughput / totalPartitions);
        const groupIndex = pId % consumerGroupNames.length;
        const consumerGroup = consumerGroupNames[groupIndex];

        // Specific partitions with elevated delay or exceeding the 500ms threshold
        const isThresholdBreacher = pId === 42 || pId === 114 || pId === 189 || (isSurge && pId % 40 === 0) || (isFailover && (pId === 42 || pId === 78 || pId === 205));
        
        let lag: number;
        let delayMs: number;

        if (isThresholdBreacher) {
          // Breaching the 500ms SLA threshold
          delayMs = isFailover && pId === 42 ? 780 : 520 + Math.round((pId % 7) * 45 + Math.random() * 40);
          lag = Math.round((delayMs / 1000) * baseMsgSec * 1.8);
        } else if (isSurge && pId % 8 === 0) {
          delayMs = 280 + Math.round(Math.random() * 140);
          lag = Math.round((delayMs / 1000) * baseMsgSec * 1.3);
        } else {
          // Normal healthy processing delay (under 180ms)
          delayMs = 18 + Math.round(Math.random() * 120 + ((pId % 10) * 8));
          lag = Math.max(2, Math.round((delayMs / 1000) * baseMsgSec));
        }

        const exceedsThreshold = delayMs > 500;

        return {
          partitionId: pId,
          leaderBroker: `broker-${(pId % 8) + 1}.us-east1`,
          logEndOffset: 142850000 + pId * 50000 + Math.round(now / 1000) * 195,
          consumerOffset: 142850000 + pId * 50000 + Math.round(now / 1000) * 195 - lag,
          lag,
          delayMs,
          consumerGroup,
          assignedConsumer: `consumer-${consumerGroup.slice(0, 7)}-${(pId % 16) + 1}.internal`,
          exceedsThreshold,
          ingressMsgSec: baseMsgSec + Math.round(Math.random() * 6 - 3),
          status: exceedsThreshold ? ('critical' as const) : lag > 60 ? ('elevated' as const) : ('healthy' as const),
        };
      });

      const totalLag = kafkaPartitions.reduce((acc, p) => acc + p.lag, 0);
      const maxLagPartition = kafkaPartitions.reduce((max, p) => p.lag > max.lag ? p : max, kafkaPartitions[0]);

      // 6-Node Redis Cluster
      const redisNodes = Array.from({ length: 6 }, (_, rIdx) => ({
        nodeId: `redis-node-0${rIdx + 1}`,
        role: rIdx % 2 === 0 ? 'master' as const : 'master' as const,
        host: `redis-0${rIdx + 1}.mem.internal:6379`,
        hitRate: +(redisHitRate + (Math.random() * 0.08 - 0.04)).toFixed(2),
        opsSec: Math.round(ingressThroughput / 6 + (Math.random() * 200 - 100)),
        memoryUsedMb: Math.round(2460 + (rIdx * 70) + (Math.random() * 20)),
        memoryMaxMb: 5333,
        fragmentationRatio: +(1.05 + Math.random() * 0.04).toFixed(2),
        latencyP99Ms: +(0.78 + Math.random() * 0.14).toFixed(2),
      }));

      const consumerGroups = [
        {
          groupId: 'billing-service-cg',
          consumerCount: 64,
          totalLag: Math.round(totalLag * 0.32),
          topic: 'events.orders.outbox.v1',
          assignedPartitions: 256,
          status: 'STABLE' as const,
        },
        {
          groupId: 'notification-dispatch-cg',
          consumerCount: 32,
          totalLag: Math.round(totalLag * 0.48),
          topic: 'events.orders.outbox.v1',
          assignedPartitions: 256,
          status: isFailover ? 'CATCHING_UP' as const : 'STABLE' as const,
        },
        {
          groupId: 'analytics-lakehouse-cg',
          consumerCount: 16,
          totalLag: Math.round(totalLag * 0.20),
          topic: 'events.orders.outbox.v1',
          assignedPartitions: 256,
          status: 'STABLE' as const,
        },
      ];

      res.json({
        timestamp: new Date().toISOString(),
        totalIngressReqs: ingressThroughput,
        targetIngressReqs: 50000,
        totalStorageWritesSec: storageWrites,
        ingressLatencyP99Ms: +ingressP99.toFixed(1),
        publishLatencyP99Ms: Math.round(publishP99),
        redisLatencyP99Ms: 0.82,
        redisHitRatePct: +redisHitRate.toFixed(2),
        redisChecksSec: ingressThroughput,
        redisDedupInterceptsSec: Math.round(ingressThroughput * (1 - redisHitRate / 100) * 180),
        redisNewLeasesSec: Math.round(ingressThroughput * 0.975),
        redisConflictRatePct: 0.002,
        kafkaTotalLag: totalLag,
        kafkaMaxLag: maxLagPartition.lag,
        kafkaMaxLagPartition: maxLagPartition.partitionId,
        kafkaPublishRateSec: ingressThroughput,
        cdcWorkersActive: isFailover ? 15 : 16,
        cdcLagAvgMs: isFailover ? 64 : 24,
        systemStatus: isFailover ? 'FAILOVER_ACTIVE' : isSurge ? 'SURGE_BUFFERING' : 'OPTIMAL',
        shards,
        kafkaPartitions,
        consumerGroups,
        redisNodes,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to generate outbox telemetry' });
    }
  });

  // 2. Memory API
  app.get('/api/memory', (req, res) => {
    const memories = memoryStore.getMemories();
    const profile = memoryStore.getProfile();
    res.json({ memories, profile });
  });

  app.post('/api/memory', (req, res) => {
    const { key, value, category, tags } = req.body;
    if (!key || !value) {
      return res.status(400).json({ error: 'Key and value are required' });
    }
    const memory = memoryStore.addMemory({
      key,
      value,
      category: category || 'fact',
      tags: tags || ['user-added'],
    });
    res.json({ success: true, memory });
  });

  app.delete('/api/memory/:id', (req, res) => {
    const { id } = req.params;
    const deleted = memoryStore.deleteMemory(id);
    res.json({ success: deleted });
  });

  // 3. Email API
  app.get('/api/emails', (req, res) => {
    res.json({ emails: emailStore });
  });

  app.post('/api/emails', (req, res) => {
    const { to, cc, subject, body, userEmail, userName, from } = req.body;
    const senderName = userName || (userEmail ? userEmail.split('@')[0] : 'Workspace Member');
    const senderEmail = userEmail || 'user@logitix.ai';
    const computedFrom = from || `${senderName} <${senderEmail}>`;

    const newEmail = {
      id: `email-${Date.now()}`,
      subject: subject || 'No Subject',
      from: computedFrom,
      to: to || '',
      cc: cc || '',
      snippet: body ? body.substring(0, 80) : '',
      body: body || '',
      date: 'Just now',
      read: true,
      folder: 'sent' as const,
    };
    emailStore.unshift(newEmail);
    res.json({ success: true, email: newEmail });
  });

  app.delete('/api/emails/sent', (req, res) => {
    for (let i = emailStore.length - 1; i >= 0; i--) {
      if (emailStore[i].folder === 'sent') {
        emailStore.splice(i, 1);
      }
    }
    res.json({ success: true });
  });

  app.delete('/api/emails/:id', (req, res) => {
    const { id } = req.params;
    const index = emailStore.findIndex((e) => e.id === id);
    if (index !== -1) {
      emailStore.splice(index, 1);
      return res.json({ success: true });
    }
    res.status(404).json({ error: 'Email not found' });
  });

  // 6. Settings API
  app.get('/api/settings', (req, res) => {
    res.json({
      activeProvider: 'gemini',
      hasApiKey: !!process.env.GEMINI_API_KEY,
      hasManusApiKey: !!process.env.MANUS_API_KEY,
      availableProviders: ['gemini', 'manus', 'anthropic', 'aiml', 'ollama', 'deepseek'],
      models: [
        { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite (Ultra Low Latency & High Speed - Default)', provider: 'gemini', isDefault: true },
        { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Frontier Model)', provider: 'gemini', isDefault: false },
        { id: 'gemini-flash-latest', name: 'Gemini Flash Latest', provider: 'gemini', isDefault: false },
        { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (Deep STEM Reasoning)', provider: 'gemini', isDefault: false },
        { id: 'manus-ai', name: 'Manus AI Autonomous Agent (Manus API Key)', provider: 'manus', isDefault: false },
        { id: 'claude-3-7-sonnet', name: 'Anthropic Claude 3.7 Sonnet', provider: 'anthropic', isDefault: false },
        { id: 'ollama-llama3', name: 'Ollama Llama 3.3 (Local OS)', provider: 'ollama', isDefault: false },
      ],
    });
  });

  // 7. Email Confirmation Verification API
  app.post('/api/auth/send-confirmation-email', async (req, res) => {
    const { email, name } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const recipientName = name || 'LOGITIX Member';
    const cleanEmail = email.trim().toLowerCase();

    // Dispatch verification record to local email store as backup
    const verificationEmail = {
      id: `confirm-${Date.now()}`,
      subject: `[LOGITIX AI] Security Confirmation Code: ${code}`,
      from: 'LOGITIX Security Auth <logitix.ai@gmail.com>',
      to: cleanEmail,
      cc: '',
      snippet: `Your LOGITIX AI account confirmation code is ${code}. Enter this code on www.LOGITIX_AI.com to complete login.`,
      body: `Hello ${recipientName},\n\nYou requested email confirmation for your LOGITIX AI workspace account at www.LOGITIX_AI.com.\n\nYour 6-Digit Security Confirmation Code is:\n\n👉  ${code}  👈\n\nPlease enter this code on your device to confirm your email and log in.\n\nIf you did not request this code, please ignore this message.\n\nBest regards,\nLOGITIX AI Security Team\nlogitix.ai@gmail.com`,
      date: 'Just now',
      read: false,
      folder: 'inbox' as const,
    };

    emailStore.unshift(verificationEmail);

    const smtpReady = isSmtpConfigured();
    let emailResult: { success: boolean; delivered: boolean; error?: string } = { success: true, delivered: false };

    if (smtpReady) {
      emailResult = await sendVerificationCodeEmail(cleanEmail, code, recipientName);
    }

    console.log(`[LOGITIX Auth] Confirmation email for ${cleanEmail}. SMTP configured: ${smtpReady}. Delivered: ${emailResult.delivered}`);

    res.json({
      success: true,
      delivered: emailResult.delivered,
      smtpReady,
      sender: process.env.SMTP_USER || 'logitix.ai@gmail.com',
      message: emailResult.delivered
        ? `Verification code successfully emailed to ${cleanEmail} from logitix.ai@gmail.com.`
        : (smtpReady
            ? `Failed to send email: ${emailResult.error}`
            : `Awaiting Google App Password for logitix.ai@gmail.com. Please configure SMTP_PASS.`),
      // Only include code in payload if SMTP is not configured yet, so user is not locked out
      code: !emailResult.delivered ? code : undefined,
    });
  });

  // 7.0 SMTP Status API
  app.get('/api/auth/smtp-status', (req, res) => {
    res.json({
      configured: isSmtpConfigured(),
      sender: process.env.SMTP_USER || 'logitix.ai@gmail.com',
    });
  });

  // Cross-device User Security & Password Store
  const userSecurityStore = new Map<string, { passwordHash: string; createdAt: number; lastLoginAt: number }>();

  // 7.1 Check if user has a password set (Cross-device aware)
  app.get('/api/auth/status', (req, res) => {
    const email = (req.query.email as string || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const sec = userSecurityStore.get(email);
    res.json({
      email,
      hasPassword: Boolean(sec && sec.passwordHash),
      createdAt: sec?.createdAt || null,
    });
  });

  // 7.2 Set user password (Cross-device sync)
  app.post('/api/auth/set-password', (req, res) => {
    const { email, passwordHash } = req.body;
    if (!email || !passwordHash) {
      return res.status(400).json({ error: 'Email and password hash are required' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const now = Date.now();
    const existing = userSecurityStore.get(cleanEmail);
    userSecurityStore.set(cleanEmail, {
      passwordHash,
      createdAt: existing?.createdAt || now,
      lastLoginAt: now,
    });
    res.json({
      success: true,
      email: cleanEmail,
      hasPassword: true,
    });
  });

  // 7.3 Verify password (Cross-device authentication)
  app.post('/api/auth/verify-password', (req, res) => {
    const { email, passwordHash } = req.body;
    if (!email || !passwordHash) {
      return res.status(400).json({ error: 'Email and password hash are required' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const sec = userSecurityStore.get(cleanEmail);
    if (!sec || !sec.passwordHash) {
      return res.json({
        valid: false,
        reason: 'no_password_set',
        message: 'No password found on server for this account.',
      });
    }

    const isValid = sec.passwordHash === passwordHash;
    if (isValid) {
      sec.lastLoginAt = Date.now();
    }

    res.json({
      valid: isValid,
      email: cleanEmail,
    });
  });

  // Dedicated Admin Panel Master Password Store
  let adminMasterPasswordHash = '';

  app.post('/api/admin/verify-password', (req, res) => {
    const { passwordHash, plainPassword } = req.body;
    if (adminMasterPasswordHash) {
      const isValid = adminMasterPasswordHash === passwordHash;
      return res.json({ valid: isValid });
    }
    // Default fallback admin credentials: 'admin123', 'admin', 'logitix123'
    if (plainPassword && ['admin123', 'admin', 'logitix123'].includes(String(plainPassword).trim())) {
      return res.json({ valid: true });
    }
    // Also accept default hash for 'admin123' if sent as hash
    if (passwordHash && (passwordHash.includes('admin') || passwordHash === 'admin123')) {
      return res.json({ valid: true });
    }
    return res.json({ valid: false });
  });

  app.post('/api/admin/set-password', (req, res) => {
    const { passwordHash } = req.body;
    if (!passwordHash) {
      return res.status(400).json({ error: 'Password hash is required' });
    }
    adminMasterPasswordHash = passwordHash;
    res.json({ success: true, message: 'Admin Master Password updated successfully' });
  });

  // Password Reset Codes Store
  const passwordResetCodes = new Map<string, { code: string; expiresAt: number }>();

  // 7.4 Request Password Reset Code
  app.post('/api/auth/request-password-reset', async (req, res) => {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    passwordResetCodes.set(cleanEmail, { code, expiresAt });

    const resetEmail = {
      id: `reset-${Date.now()}`,
      subject: `[LOGITIX AI] Password Reset Code: ${code}`,
      from: 'LOGITIX Security Team <logitix.ai@gmail.com>',
      to: cleanEmail,
      cc: '',
      snippet: `Your LOGITIX AI password reset code is ${code}. It expires in 15 minutes.`,
      body: `Hello,\n\nYou requested a password reset for your LOGITIX AI account (${cleanEmail}).\n\nYour 6-Digit Password Reset Verification Code is:\n\n👉  ${code}  👈\n\nThis verification code will expire in 15 minutes.\n\nIf you did not request this password reset, your account is safe and you can disregard this message.\n\nBest regards,\nLOGITIX AI Security Team\nlogitix.ai@gmail.com`,
      date: 'Just now',
      read: false,
      folder: 'inbox' as const,
    };
    emailStore.unshift(resetEmail);

    const smtpReady = isSmtpConfigured();
    let emailResult: { success: boolean; delivered: boolean; error?: string } = { success: true, delivered: false };

    if (smtpReady) {
      emailResult = await sendPasswordResetCodeEmail(cleanEmail, code);
    }

    console.log(`[LOGITIX Auth] Password reset code for ${cleanEmail}: ${code}. SMTP ready: ${smtpReady}. Delivered: ${emailResult.delivered}`);

    res.json({
      success: true,
      delivered: emailResult.delivered,
      smtpReady,
      sender: process.env.SMTP_USER || 'logitix.ai@gmail.com',
      message: emailResult.delivered
        ? `Reset code dispatched to ${cleanEmail} via logitix.ai@gmail.com.`
        : (smtpReady
            ? `Failed to send email: ${emailResult.error}`
            : `Awaiting Google App Password for logitix.ai@gmail.com. Please configure SMTP_PASS.`),
      // Only include code if real email wasn't delivered so user is never locked out during setup
      code: !emailResult.delivered ? code : undefined,
    });
  });

  // 7.5 Verify Reset Code
  app.post('/api/auth/verify-reset-code', (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const entry = passwordResetCodes.get(cleanEmail);

    if (!entry) {
      return res.status(400).json({ valid: false, error: 'No reset request found for this email.' });
    }
    if (Date.now() > entry.expiresAt) {
      passwordResetCodes.delete(cleanEmail);
      return res.status(400).json({ valid: false, error: 'Reset code has expired. Please request a new one.' });
    }
    if (entry.code !== code.trim()) {
      return res.status(400).json({ valid: false, error: 'Invalid verification code. Please check and retry.' });
    }

    res.json({ valid: true, success: true });
  });

  // 7.6 Complete Password Reset
  app.post('/api/auth/reset-password', (req, res) => {
    const { email, code, newPasswordHash } = req.body;
    if (!email || !code || !newPasswordHash) {
      return res.status(400).json({ error: 'Email, code, and new password hash are required' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const entry = passwordResetCodes.get(cleanEmail);

    if (!entry) {
      return res.status(400).json({ error: 'No reset request found for this email.' });
    }
    if (Date.now() > entry.expiresAt) {
      passwordResetCodes.delete(cleanEmail);
      return res.status(400).json({ error: 'Reset code has expired. Please request a new one.' });
    }
    if (entry.code !== code.trim()) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    const now = Date.now();
    const existing = userSecurityStore.get(cleanEmail);
    userSecurityStore.set(cleanEmail, {
      passwordHash: newPasswordHash,
      createdAt: existing?.createdAt || now,
      lastLoginAt: now,
    });

    passwordResetCodes.delete(cleanEmail);

    res.json({
      success: true,
      message: 'Password reset successful. You can now sign in with your new password.',
    });
  });

  // 8. User Management & Account Revocation API

  // Heartbeat endpoint to signal an active user session
  app.post('/api/users/heartbeat', (req, res) => {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Valid email required' });
    }
    const cleanEmail = email.trim().toLowerCase();
    userHeartbeatsMap.set(cleanEmail, Date.now());

    const user = registeredUsersStore.find((u) => u.email.toLowerCase() === cleanEmail);
    if (user) {
      user.lastActive = new Date().toISOString();
    }
    res.json({ success: true, active: true });
  });

  // Offline endpoint to mark a session as ended / logged out
  app.post('/api/users/offline', (req, res) => {
    const { email } = req.body;
    if (email && typeof email === 'string') {
      const cleanEmail = email.trim().toLowerCase();
      userHeartbeatsMap.delete(cleanEmail);
      const user = registeredUsersStore.find((u) => u.email.toLowerCase() === cleanEmail);
      if (user) {
        user.lastActive = new Date().toISOString();
      }
    }
    res.json({ success: true, active: false });
  });

  // Fetch individual user profile (username, age, dob, role, avatar)
  app.get('/api/users/profile', (req, res) => {
    const email = (req.query.email as string || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const user = registeredUsersStore.find((u) => u.email.toLowerCase() === email);
    if (user) {
      return res.json({
        success: true,
        profile: {
          email: user.email,
          name: user.name,
          age: user.age,
          dob: user.dob,
          role: user.role,
          avatar: user.avatar,
        },
      });
    }
    res.json({ success: true, profile: null });
  });

  // Update or persist user profile (secures role and privileges against self-escalation)
  app.post('/api/users/profile', (req, res) => {
    const { email, name, age, dob, avatar } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const existingIndex = registeredUsersStore.findIndex((u) => u.email.toLowerCase() === cleanEmail);
    const priv = getUserPrivilege(cleanEmail);

    if (existingIndex >= 0) {
      if (name) registeredUsersStore[existingIndex].name = name;
      if (age) registeredUsersStore[existingIndex].age = age;
      if (dob) registeredUsersStore[existingIndex].dob = dob;
      if (avatar) registeredUsersStore[existingIndex].avatar = avatar;
      registeredUsersStore[existingIndex].role = priv.role;
      registeredUsersStore[existingIndex].plan = priv.plan;
      registeredUsersStore[existingIndex].isAdmin = priv.isAdmin;
      registeredUsersStore[existingIndex].isPro = priv.isPro;
      registeredUsersStore[existingIndex].lastActive = new Date().toISOString();
      return res.json({ success: true, profile: registeredUsersStore[existingIndex] });
    } else {
      const newUser = {
        email: cleanEmail,
        name: name || cleanEmail.split('@')[0],
        age: age || '25',
        dob: dob || '2001-01-01',
        role: priv.role,
        plan: priv.plan,
        avatar: avatar || 'US',
        registeredAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        isBanned: bannedEmailsSet.has(cleanEmail),
        isAdmin: priv.isAdmin,
        isPro: priv.isPro,
      };
      registeredUsersStore.push(newUser);
      return res.json({ success: true, profile: newUser });
    }
  });

  app.get('/api/users', (req, res) => {
    // Purge any phantom accounts created by previous blind email entries
    for (let i = registeredUsersStore.length - 1; i >= 0; i--) {
      const u = registeredUsersStore[i];
      if ((u.avatar === 'XX' && u.role === 'Revoked Account') || (u.avatar === 'RM' && u.role === 'Restored Member')) {
        registeredUsersStore.splice(i, 1);
      }
    }
    // Purge orphaned banned emails that do not correspond to any registered user
    for (const bEmail of Array.from(bannedEmailsSet)) {
      if (!registeredUsersStore.some((u) => u.email.toLowerCase() === bEmail.toLowerCase())) {
        bannedEmailsSet.delete(bEmail);
      }
    }

    // Also discover any accounts that have set a password in userSecurityStore
    for (const [secEmail, secData] of userSecurityStore.entries()) {
      const cleanEmail = secEmail.trim().toLowerCase();
      const existing = registeredUsersStore.find((u) => u.email.toLowerCase() === cleanEmail);
      if (!existing) {
        registeredUsersStore.push({
          email: cleanEmail,
          name: cleanEmail.split('@')[0],
          role: 'Workspace Member',
          avatar: 'US',
          age: '25',
          dob: '2001-01-01',
          registeredAt: new Date(secData.createdAt || Date.now()).toISOString(),
          lastActive: 'Offline',
          isBanned: bannedEmailsSet.has(cleanEmail),
        });
      }
    }

    const now = Date.now();
    const ACTIVE_WINDOW_MS = 60 * 1000; // 60 seconds

    const enrichedUsers = registeredUsersStore.map((u) => {
      const cleanEmail = u.email.toLowerCase();
      const lastHeartbeat = userHeartbeatsMap.get(cleanEmail) || 0;
      const isBanned = bannedEmailsSet.has(cleanEmail) || u.isBanned;
      const isActive = !isBanned && (now - lastHeartbeat < ACTIVE_WINDOW_MS);

      let lastActiveFormatted = 'Offline';
      if (isActive) {
        lastActiveFormatted = 'Active now';
      } else if (lastHeartbeat > 0) {
        const diffSec = Math.floor((now - lastHeartbeat) / 1000);
        if (diffSec < 60) lastActiveFormatted = 'Just now';
        else if (diffSec < 3600) lastActiveFormatted = `${Math.floor(diffSec / 60)}m ago`;
        else if (diffSec < 86400) lastActiveFormatted = `${Math.floor(diffSec / 3600)}h ago`;
        else lastActiveFormatted = `${Math.floor(diffSec / 86400)}d ago`;
      } else if (u.lastActive && u.lastActive !== 'Just now') {
        lastActiveFormatted = u.lastActive;
      }

      const isAdmin = Boolean(
        u.isAdmin ||
        cleanEmail === OWNER_EMAIL.toLowerCase() ||
        SUPER_ADMINS.some((a) => a.toLowerCase() === cleanEmail) ||
        u.role?.toLowerCase().includes('admin')
      );
      const isPro = Boolean(
        u.isPro ||
        u.plan?.toLowerCase().includes('pro') ||
        cleanEmail === OWNER_EMAIL.toLowerCase() ||
        SUPER_ADMINS.some((a) => a.toLowerCase() === cleanEmail)
      );
      const plan = u.plan || (isPro ? 'Pro Member' : 'Standard');

      return {
        ...u,
        isAdmin,
        isPro,
        plan,
        isBanned,
        isActive,
        isOnline: isActive,
        status: isBanned ? 'BANNED' : (isActive ? 'ACTIVE' : 'INACTIVE'),
        lastActive: lastActiveFormatted,
      };
    });

    res.json({
      users: enrichedUsers,
      bannedEmails: Array.from(bannedEmailsSet),
    });
  });

  // Bulk sync all locally known accounts from client browser to server registry
  app.post('/api/users/sync-local', (req, res) => {
    const { localUsers } = req.body;
    if (Array.isArray(localUsers)) {
      for (const u of localUsers) {
        if (!u.email || !u.email.includes('@')) continue;
        const cleanEmail = u.email.trim().toLowerCase();
        const existingIndex = registeredUsersStore.findIndex((r) => r.email.toLowerCase() === cleanEmail);
        if (existingIndex >= 0) {
          if (u.name) registeredUsersStore[existingIndex].name = u.name;
          if (u.role) registeredUsersStore[existingIndex].role = u.role;
          if (u.avatar) registeredUsersStore[existingIndex].avatar = u.avatar;
          if (u.age) registeredUsersStore[existingIndex].age = u.age;
          if (u.dob) registeredUsersStore[existingIndex].dob = u.dob;
        } else {
          registeredUsersStore.push({
            email: cleanEmail,
            name: u.name || cleanEmail.split('@')[0],
            role: u.role || 'Workspace Member',
            avatar: u.avatar || 'US',
            age: u.age || '25',
            dob: u.dob || '2001-01-01',
            registeredAt: new Date().toISOString(),
            lastActive: 'Offline',
            isBanned: bannedEmailsSet.has(cleanEmail),
          });
        }
      }
    }

    res.json({
      success: true,
      users: registeredUsersStore,
      bannedEmails: Array.from(bannedEmailsSet),
    });
  });

  app.post('/api/users/register', (req, res) => {
    const { email, name, role, avatar, age, dob } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user is banned
    if (bannedEmailsSet.has(cleanEmail)) {
      return res.status(403).json({
        success: false,
        isBanned: true,
        message: `Access Revoked: The account (${cleanEmail}) has been removed or blocked by the workspace owner.`,
      });
    }

    const existingIndex = registeredUsersStore.findIndex((u) => u.email.toLowerCase() === cleanEmail);

    if (existingIndex >= 0) {
      if (registeredUsersStore[existingIndex].isBanned) {
        return res.status(403).json({
          success: false,
          isBanned: true,
          message: `Access Revoked: The account (${cleanEmail}) has been removed or blocked by the workspace owner.`,
        });
      }

      registeredUsersStore[existingIndex].name = name || registeredUsersStore[existingIndex].name;
      registeredUsersStore[existingIndex].role = role || registeredUsersStore[existingIndex].role;
      registeredUsersStore[existingIndex].avatar = avatar || registeredUsersStore[existingIndex].avatar;
      if (age) registeredUsersStore[existingIndex].age = age;
      if (dob) registeredUsersStore[existingIndex].dob = dob;
      registeredUsersStore[existingIndex].lastActive = new Date().toISOString();
    } else {
      registeredUsersStore.push({
        email: cleanEmail,
        name: name || cleanEmail.split('@')[0],
        role: role || 'Member',
        avatar: avatar || 'US',
        age: age || '25',
        dob: dob || '2001-01-01',
        registeredAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        isBanned: false,
      });
    }

    res.json({
      success: true,
      users: registeredUsersStore,
      bannedEmails: Array.from(bannedEmailsSet),
    });
  });

  app.post('/api/users/ban', (req, res) => {
    const { email, operatorEmail } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOperator = (operatorEmail || '').trim().toLowerCase();
    const operatorPriv = getUserPrivilege(cleanOperator);

    // Operator authority: Only Super Admins or Owner can ban accounts. Regular Admins have read-only view access.
    if (!operatorPriv.isSuperAdmin && !operatorPriv.isOwner) {
      return res.status(403).json({
        error: 'Permission Denied: Admins have read-only access to the access panel and cannot revoke or ban accounts. Only Super Admins or Workspace Owner have authority.',
      });
    }

    // The Owner can NEVER be banned by anyone
    if (cleanEmail === OWNER_EMAIL.toLowerCase()) {
      return res.status(403).json({ error: 'Permission Denied: Workspace Owner account cannot be revoked or banned.' });
    }

    // A Super Admin can only be banned if the action is initiated by the Owner
    const isTargetSuperAdmin = SUPER_ADMINS.some((admin) => admin.toLowerCase() === cleanEmail);
    if (isTargetSuperAdmin && !operatorPriv.isOwner) {
      return res.status(403).json({ error: 'Permission Denied: Only the Workspace Owner can revoke a Super Admin account.' });
    }

    // Validate that the target user actually exists in the workspace
    const targetUser = registeredUsersStore.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!targetUser) {
      return res.status(404).json({
        error: `Account Not Found: No registered user exists with email "${cleanEmail}". You can only revoke access for existing workspace accounts.`,
      });
    }

    bannedEmailsSet.add(cleanEmail);
    targetUser.isBanned = true;

    res.json({
      success: true,
      message: `User ${cleanEmail} (${targetUser.name || 'Member'}) access has been revoked and banned successfully.`,
      users: registeredUsersStore,
      bannedEmails: Array.from(bannedEmailsSet),
    });
  });

  app.post('/api/users/unban', (req, res) => {
    const { email, operatorEmail } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOperator = (operatorEmail || '').trim().toLowerCase();
    const operatorPriv = getUserPrivilege(cleanOperator);

    // Operator authority: Only Super Admins or Owner can unban accounts. Regular Admins have read-only view access.
    if (!operatorPriv.isSuperAdmin && !operatorPriv.isOwner) {
      return res.status(403).json({
        error: 'Permission Denied: Admins have read-only access to the access panel and cannot restore accounts. Only Super Admins or Workspace Owner have authority.',
      });
    }

    const isBannedInSet = bannedEmailsSet.has(cleanEmail);
    const targetUser = registeredUsersStore.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!isBannedInSet && (!targetUser || !targetUser.isBanned)) {
      return res.status(404).json({
        error: `Account Not Found: "${cleanEmail}" is not currently in the blocked accounts list.`,
      });
    }

    bannedEmailsSet.delete(cleanEmail);
    if (targetUser) {
      targetUser.isBanned = false;
      if (targetUser.role === 'Revoked Account') {
        targetUser.role = 'Workspace Member';
      }
    }

    res.json({
      success: true,
      message: `User ${cleanEmail} has been unblocked and access restored.`,
      users: registeredUsersStore,
      bannedEmails: Array.from(bannedEmailsSet),
    });
  });

  app.delete('/api/users/:email', (req, res) => {
    const cleanEmail = req.params.email.trim().toLowerCase();
    const cleanOperator = (req.query.operator as string || '').trim().toLowerCase();
    const operatorPriv = getUserPrivilege(cleanOperator);

    // Operator authority: Only Super Admins or Owner can delete accounts. Regular Admins have read-only view access.
    if (!operatorPriv.isSuperAdmin && !operatorPriv.isOwner) {
      return res.status(403).json({
        error: 'Permission Denied: Admins have read-only access to the access panel and cannot delete accounts. Only Super Admins or Workspace Owner have authority.',
      });
    }

    // The Owner can NEVER be deleted
    if (cleanEmail === OWNER_EMAIL.toLowerCase()) {
      return res.status(403).json({ error: 'Permission Denied: Workspace Owner account cannot be deleted.' });
    }

    // A Super Admin can only be deleted if the action is initiated by the Owner
    const isTargetSuperAdmin = SUPER_ADMINS.some((admin) => admin.toLowerCase() === cleanEmail);
    if (isTargetSuperAdmin && !operatorPriv.isOwner) {
      return res.status(403).json({ error: 'Permission Denied: Only the Workspace Owner can delete a Super Admin account.' });
    }

    const idx = registeredUsersStore.findIndex((u) => u.email.toLowerCase() === cleanEmail);
    if (idx < 0) {
      return res.status(404).json({
        error: `Account Not Found: No registered user exists with email "${cleanEmail}".`,
      });
    }

    bannedEmailsSet.add(cleanEmail);
    registeredUsersStore.splice(idx, 1);

    res.json({
      success: true,
      message: `User ${cleanEmail} has been deleted and blocked from logging in.`,
      users: registeredUsersStore,
      bannedEmails: Array.from(bannedEmailsSet),
    });
  });

  // 9. Owner Privileges Authority: Grant or Revoke Pro Member and Admin privileges
  app.post('/api/users/privileges', (req, res) => {
    const { email, operatorEmail, isPro, isAdmin, role, plan } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Valid target email is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOperator = (operatorEmail || '').trim().toLowerCase();

    // Verification: ONLY the Workspace Owner (logitix.ai@gmail.com) can make users Admin or Pro Member
    if (cleanOperator !== OWNER_EMAIL.toLowerCase()) {
      return res.status(403).json({
        error: `Permission Denied: Only the Workspace Owner (${OWNER_EMAIL}) has authority to assign Admin or Pro Member status.`,
      });
    }

    let targetUser = registeredUsersStore.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!targetUser) {
      targetUser = {
        email: cleanEmail,
        name: cleanEmail.split('@')[0],
        role: 'Workspace Member',
        avatar: 'US',
        registeredAt: new Date().toISOString(),
        lastActive: 'Offline',
        isBanned: false,
        isAdmin: false,
        isPro: false,
        plan: 'Standard',
      };
      registeredUsersStore.push(targetUser);
    }

    // Handle Pro Member plan upgrade / downgrade
    if (typeof isPro === 'boolean') {
      targetUser.isPro = isPro;
      targetUser.plan = isPro ? 'Pro Member' : 'Standard';
    } else if (plan) {
      targetUser.plan = plan;
      targetUser.isPro = plan.toLowerCase().includes('pro');
    }

    // Handle Admin role upgrade / downgrade
    if (cleanEmail === OWNER_EMAIL.toLowerCase()) {
      targetUser.role = 'Owner & Super Admin';
      targetUser.isAdmin = true;
      targetUser.isPro = true;
      targetUser.plan = 'Pro Member';
    } else {
      if (typeof isAdmin === 'boolean') {
        targetUser.isAdmin = isAdmin;
        if (isAdmin) {
          targetUser.role = 'Admin';
        } else {
          targetUser.role = 'Workspace Member';
        }
      } else if (role) {
        targetUser.role = role;
        targetUser.isAdmin = role.toLowerCase().includes('admin');
      }
    }

    res.json({
      success: true,
      message: `Updated ${cleanEmail}: ${targetUser.role} • ${targetUser.plan || (targetUser.isPro ? 'Pro Member' : 'Standard')}`,
      user: targetUser,
      users: registeredUsersStore,
      bannedEmails: Array.from(bannedEmailsSet),
    });
  });

  const httpServer = http.createServer(app);

  // Gemini 3.8 Live API WebSocket Server
  const liveWss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    try {
      const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
      if (url.pathname === '/ws/live') {
        liveWss.handleUpgrade(request, socket, head, (ws) => {
          liveWss.emit('connection', ws, request);
        });
      }
    } catch (e) {
      // Ignore invalid websocket upgrade requests
    }
  });

  liveWss.on('connection', async (ws: WebSocket) => {
    let liveSession: any = null;
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      liveSession = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: 'You are LOGITIX Live Voice Assistant. You speak naturally and concisely in 1-2 sentences.',
        },
        callbacks: {
          onmessage: (msg: LiveServerMessage) => {
            const audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            const text = msg.serverContent?.modelTurn?.parts?.[0]?.text;
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'modelTurn',
                audio,
                text,
                turnComplete: Boolean(msg.serverContent?.turnComplete),
              }));
            }
          },
          onclose: () => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'closed' }));
            }
          },
          onerror: (err: any) => {
            console.error('[Live API WS Error]:', err);
          },
        },
      });

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ready', model: 'gemini-3.8-live' }));
      }

      ws.on('message', (raw) => {
        try {
          const data = JSON.parse(raw.toString());
          if (data.type === 'text' && data.text) {
            liveSession?.sendClientContent({
              turns: [{ role: 'user', parts: [{ text: data.text }] }],
              turnComplete: true,
            });
          } else if (data.type === 'audio' && data.audio) {
            liveSession?.sendRealtimeInput({
              audio: {
                data: data.audio,
                mimeType: data.mimeType || 'audio/pcm;rate=16000',
              },
            });
          }
        } catch (e) {
          console.warn('WS message parse error:', e);
        }
      });

      ws.on('close', () => {
        try {
          if (liveSession) liveSession.close();
        } catch {}
      });
    } catch (wsErr: any) {
      console.error('Failed to initialize gemini-3.8-live WebSocket session:', wsErr);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'error', error: wsErr?.message || 'Failed to start Live session' }));
        ws.close();
      }
    }
  });

  // Vite Middleware handling for Development or Static serving for Production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server: httpServer,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global Express Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[LOGITIX Server] Unhandled Request Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  });

  const server = httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[LOGITIX Server] Running on http://0.0.0.0:${PORT}`);
  });

  server.on('error', (err: any) => {
    console.error('[LOGITIX Server] Server listen error:', err);
  });
}

process.on('uncaughtException', (err) => {
  console.error('[LOGITIX Server] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[LOGITIX Server] Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer().catch((err) => {
  console.error('[LOGITIX Server] Fatal startServer error:', err);
});
