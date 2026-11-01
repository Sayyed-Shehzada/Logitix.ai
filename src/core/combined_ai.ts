/**
 * Multi-Provider AI Engine Client (TypeScript)
 * Combines Google Gemini, Anthropic Claude, and AIML API (aggregating GPT-4o, Claude, DeepSeek, etc.)
 * with automatic fallback, multi-turn conversation support, and health diagnostics.
 */

import { GoogleGenAI } from '@google/genai';

export interface MultiModelMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface MultiModelRequestOptions {
  model?: string;
  provider?: 'auto' | 'gemini' | 'claude' | 'aiml' | 'manus';
  messages: MultiModelMessage[];
  temperature?: number;
  maxTokens?: number;
  systemInstruction?: string;
  imageBase64?: string;
  mimeType?: string;
}

export interface MultiModelResponse {
  text: string;
  providerUsed: 'gemini' | 'claude' | 'aiml' | 'manus' | 'mock';
  modelUsed: string;
  latencyMs: number;
}

export interface ProviderStatus {
  gemini: { configured: boolean; model: string };
  claude: { configured: boolean; model: string };
  aiml: { configured: boolean; baseUrl: string };
  manus: { configured: boolean; model: string };
}

export class CombinedAIEngine {
  private geminiClient: GoogleGenAI | null = null;
  private geminiKey: string = '';
  private claudeKey: string = '';
  private aimlKey: string = '';
  private manusKey: string = '';
  private aimlBaseUrl: string = 'https://api.aimlapi.com/v1';

  constructor() {
    this.refreshKeys();
  }

  public refreshKeys() {
    this.geminiKey = process.env.GEMINI_API_KEY || '';
    this.claudeKey = process.env.ANTHROPIC_API_KEY || '';
    this.aimlKey = process.env.AIML_API_KEY || '';
    this.manusKey = process.env.MANUS_API_KEY || '';

    if (this.geminiKey) {
      this.geminiClient = new GoogleGenAI({
        apiKey: this.geminiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'logitix-unified-ai',
          },
        },
      });
    }
  }

  public getStatus(): ProviderStatus {
    this.refreshKeys();
    return {
      gemini: {
        configured: Boolean(this.geminiKey),
        model: 'gemini-3.1-flash-lite',
      },
      claude: {
        configured: Boolean(this.claudeKey),
        model: 'claude-3-7-sonnet-20250219',
      },
      aiml: {
        configured: Boolean(this.aimlKey),
        baseUrl: this.aimlBaseUrl,
      },
      manus: {
        configured: Boolean(this.manusKey),
        model: 'manus-ai',
      },
    };
  }

  /**
   * Primary unified call method.
   * Routes to the requested provider or uses a resilient tier fallback:
   * 1. If explicit provider is requested and key exists, try that.
   * 2. If Manus is requested, route directly to Manus AI API / Agent.
   * 3. If AIML API is configured, use it for cross-model queries (Claude, GPT, DeepSeek).
   * 4. If Claude API is configured, use direct Anthropic API.
   * 5. Gemini is the high-performance arbiter / default.
   */
  public async generate(options: MultiModelRequestOptions): Promise<MultiModelResponse> {
    this.refreshKeys();
    const startTime = Date.now();
    const { model = 'gemini-3.1-flash-lite', provider = 'auto' } = options;

    // Direct provider routing if explicitly requested
    if ((provider === 'manus' || model.toLowerCase().includes('manus')) && this.manusKey) {
      try {
        const text = await this.callManusApi(options);
        return { text, providerUsed: 'manus', modelUsed: 'manus-ai', latencyMs: Date.now() - startTime };
      } catch (err) {
        console.warn('Direct Manus API call notice, falling back:', err);
      }
    }

    if (provider === 'claude' && this.claudeKey) {
      try {
        const text = await this.callClaudeDirect(options);
        return { text, providerUsed: 'claude', modelUsed: model || 'claude-3-7-sonnet-20250219', latencyMs: Date.now() - startTime };
      } catch (err) {
        console.warn('Direct Claude call failed, falling back to next provider:', err);
      }
    }

    if (provider === 'aiml' && this.aimlKey) {
      try {
        const text = await this.callAimlApi(options);
        return { text, providerUsed: 'aiml', modelUsed: model, latencyMs: Date.now() - startTime };
      } catch (err) {
        console.warn('AIML API call failed, falling back to next provider:', err);
      }
    }

    if (provider === 'gemini' && this.geminiClient) {
      const text = await this.callGemini(options);
      return { text, providerUsed: 'gemini', modelUsed: model, latencyMs: Date.now() - startTime };
    }

    // Auto routing based on requested model name:
    const lowerModel = model.toLowerCase();

    // 1. If user asks for Claude model:
    if (lowerModel.includes('claude')) {
      if (this.claudeKey) {
        try {
          const text = await this.callClaudeDirect(options);
          return { text, providerUsed: 'claude', modelUsed: model, latencyMs: Date.now() - startTime };
        } catch (err) {
          console.warn('Direct Claude error, checking AIML fallback:', err);
        }
      }
      if (this.aimlKey) {
        try {
          const text = await this.callAimlApi({ ...options, model: 'claude-3-5-sonnet-20241022' });
          return { text, providerUsed: 'aiml', modelUsed: 'claude-3-5-sonnet-20241022', latencyMs: Date.now() - startTime };
        } catch (err) {
          console.warn('AIML Claude error:', err);
        }
      }
    }

    // 2. If user asks for GPT-4o or DeepSeek:
    if (lowerModel.includes('gpt') || lowerModel.includes('deepseek') || lowerModel.includes('llama')) {
      if (this.aimlKey) {
        try {
          const aimlModel = lowerModel.includes('deepseek')
            ? 'deepseek/deepseek-r1'
            : lowerModel.includes('gpt')
            ? 'gpt-4o'
            : model;
          const text = await this.callAimlApi({ ...options, model: aimlModel });
          return { text, providerUsed: 'aiml', modelUsed: aimlModel, latencyMs: Date.now() - startTime };
        } catch (err) {
          console.warn('AIML API call failed for ' + model + ':', err);
        }
      }
    }

    // 3. High-Resilience Gemini Call (Default & Ultimate Arbiter)
    if (this.geminiClient) {
      try {
        const text = await this.callGemini(options);
        return { text, providerUsed: 'gemini', modelUsed: 'gemini-3.1-flash-lite', latencyMs: Date.now() - startTime };
      } catch (err) {
        console.error('Gemini call failed:', err);
        throw err;
      }
    }

    // If no provider succeeded or configured
    throw new Error('No active AI provider configured. Please check GEMINI_API_KEY, AIML_API_KEY, or ANTHROPIC_API_KEY.');
  }

  /**
   * Call AIML API (OpenAI-compatible unified endpoint)
   * Supports GPT-4o, Claude 3.5/3.7, DeepSeek-R1, Mistral, Llama 3 via one key
   */
  public async callAimlApi(options: MultiModelRequestOptions): Promise<string> {
    if (!this.aimlKey) {
      throw new Error('AIML_API_KEY is not configured.');
    }

    const messages = [];
    if (options.systemInstruction) {
      messages.push({ role: 'system', content: options.systemInstruction });
    }

    options.messages.forEach((m) => {
      messages.push({
        role: m.role === 'system' ? 'system' : m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      });
    });

    const bodyPayload: any = {
      model: options.model || 'gpt-4o',
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
    };

    const res = await fetch(`${this.aimlBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.aimlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AIML API Error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content returned by AIML API');
    }
    return content;
  }

  /**
   * Call Manus AI API (Autonomous Agent endpoint)
   * Supports official Manus API Key via https://api.manus.im or compatible proxy
   */
  public async callManusApi(options: MultiModelRequestOptions): Promise<string> {
    if (!this.manusKey) {
      throw new Error('MANUS_API_KEY is not configured.');
    }

    const messages: any[] = [];
    if (options.systemInstruction) {
      messages.push({ role: 'system', content: options.systemInstruction });
    }

    options.messages.forEach((m) => {
      messages.push({
        role: m.role === 'system' ? 'system' : m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      });
    });

    const endpoints = [
      'https://api.manus.im/v1/chat/completions',
      'https://api.manus.ai/v1/chat/completions',
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          signal: AbortSignal.timeout(4000),
          headers: {
            Authorization: `Bearer ${this.manusKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: options.model || 'manus-ai',
            messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 2048,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content || data.result || data.output;
          if (content) return content;
        }
      } catch (err) {
        console.warn(`Manus API attempt at ${url} notice:`, err);
      }
    }

    throw new Error('Manus API endpoint call failed or returned empty output.');
  }

  /**
   * Call Anthropic Claude Messages API directly
   */
  public async callClaudeDirect(options: MultiModelRequestOptions): Promise<string> {
    if (!this.claudeKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured.');
    }

    const messages = options.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

    if (messages.length === 0) {
      messages.push({ role: 'user', content: 'Hello' });
    }

    const bodyPayload: any = {
      model: options.model || 'claude-3-7-sonnet-20250219',
      max_tokens: options.maxTokens ?? 2048,
      temperature: options.temperature ?? 0.7,
      messages,
    };

    if (options.systemInstruction) {
      bodyPayload.system = options.systemInstruction;
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.claudeKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Claude API Error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const textPart = data.content?.find((c: any) => c.type === 'text');
    return textPart?.text || data.content?.[0]?.text || '';
  }

  /**
   * Call Google Gemini API (@google/genai SDK)
   */
  public async callGemini(options: MultiModelRequestOptions): Promise<string> {
    if (!this.geminiClient) {
      this.refreshKeys();
      if (!this.geminiClient) {
        throw new Error('GEMINI_API_KEY is not configured.');
      }
    }

    const contents: any[] = [];
    options.messages.forEach((m) => {
      if (m.role === 'system') return;
      contents.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      });
    });

    // Handle image if provided
    if (options.imageBase64 && options.mimeType) {
      const lastUser = contents.filter((c) => c.role === 'user').pop();
      if (lastUser) {
        lastUser.parts.push({
          inlineData: {
            mimeType: options.mimeType,
            data: options.imageBase64,
          },
        });
      }
    }

    const config: any = {
      temperature: options.temperature ?? 0.7,
    };
    if (options.systemInstruction) {
      config.systemInstruction = options.systemInstruction;
    }

    const modelToUse = options.model && options.model.startsWith('gemini') ? options.model : 'gemini-3.1-flash-lite';

    const response = await this.geminiClient.models.generateContent({
      model: modelToUse,
      contents: contents.length > 0 ? contents : [{ role: 'user', parts: [{ text: 'Hello' }] }],
      config,
    });

    return response.text || '';
  }
}

export const combinedAIEngine = new CombinedAIEngine();
