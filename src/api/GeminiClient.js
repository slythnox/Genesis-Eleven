import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigManager } from '../utils/ConfigManager.js';
import { LoggingUtil } from '../utils/LoggingUtil.js';
import { ApiException } from '../exceptions/ApiException.js';

export class GeminiClient {
  constructor() {
    this.config = ConfigManager.getInstance();
    this.logger = LoggingUtil.getInstance();
    this.clients = new Map();
    this.currentKeyIndex = 0;
    this.apiKeys = [];
    this.initialized = false;
  }

  async initialize() {
    try {
      await this.config.load();
      
      // Get API keys from config
      const keysConfig = this.config.get('gemini.apiKeys', '');
      this.apiKeys = keysConfig.split(',').map(key => key.trim()).filter(key => key);
      
      if (this.apiKeys.length === 0) {
        throw new Error('No API keys found. Please run: el config');
      }

      // Set up clients
      this.apiKeys.forEach((key, index) => {
        const client = new GoogleGenerativeAI(key);
        this.clients.set(index, client);
      });

      this.initialized = true;
      this.logger.info(`Initialized with ${this.apiKeys.length} API key(s)`);
    } catch (error) {
      throw new ApiException(`Failed to initialize Gemini client: ${error.message}`);
    }
  }

  async getModel() {
    if (!this.initialized) {
      await this.initialize();
    }

    const client = this.clients.get(this.currentKeyIndex);
    if (!client) {
      throw new ApiException('No valid API client available');
    }

    const modelName = this.config.get('gemini.model', 'gemini-1.5-flash');
    return client.getGenerativeModel({ model: modelName });
  }

  async generateStructuredResponse(systemPrompt, userPrompt, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    return this._executeWithRetry(async () => {
      const model = await this.getModel();
      
      const chat = model.startChat({
        history: [
          {
            role: 'user',
            parts: [{ text: systemPrompt }]
          },
          {
            role: 'model',
            parts: [{ text: 'I understand. I will respond with structured JSON as specified.' }]
          }
        ],
        generationConfig: {
          temperature: options.temperature || 0.1,
          topK: options.topK || 40,
          topP: options.topP || 0.95,
          maxOutputTokens: options.maxTokens || 2048,
        }
      });

      const result = await chat.sendMessage(userPrompt);
      return result.response.text();
    });
  }

  async generateResponse(prompt, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    return this._executeWithRetry(async () => {
      const model = await this.getModel();
      
      const result = await model.generateContent({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options.temperature || 0.7,
          topK: options.topK || 40,
          topP: options.topP || 0.95,
          maxOutputTokens: options.maxTokens || 1024,
        }
      });

      return result.response.text();
    });
  }

  async validateConnection() {
    try {
      const testResponse = await this.generateResponse('Hello, please respond with "Connection successful"');
      return testResponse.toLowerCase().includes('connection successful') || 
             testResponse.toLowerCase().includes('successful');
    } catch (error) {
      this.logger.error('Connection validation failed', { error: error.message });
      return false;
    }
  }

  async _executeWithRetry(operation) {
    const maxRetries = this.config.get('gemini.maxRetries', 3);
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Check if error is retryable
        if (!this._isRetryableError(error)) {
          throw error;
        }

        // Try rotating key if available and appropriate
        if (this._shouldRotateKey(error)) {
          await this._rotateKey();
        }

        // Don't retry on last attempt
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          this.logger.warn('Retrying API request', { 
            attempt: attempt + 1, 
            maxRetries,
            delay,
            error: error.message 
          });
          
          await this._sleep(delay);
        }
      }
    }

    throw new ApiException(`API request failed after ${maxRetries + 1} attempts: ${lastError.message}`);
  }

  async _rotateKey() {
    if (this.apiKeys.length <= 1) {
      this.logger.warn('Key rotation skipped - only one key available');
      return false;
    }

    const previousIndex = this.currentKeyIndex;
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    
    this.logger.info(`Rotated to API key ${this.currentKeyIndex + 1}/${this.apiKeys.length}`);

    return true;
  }

  _isRetryableError(error) {
    const retryableErrors = [
      'rate limit',
      'quota exceeded',
      'timeout',
      'network error',
      'service unavailable',
      '429',
      '500',
      '502',
      '503',
      '504'
    ];

    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError)
    );
  }

  _shouldRotateKey(error) {
    const rotationTriggers = [
      'rate limit',
      'quota exceeded',
      '429'
    ];

    const errorMessage = error.message.toLowerCase();
    return rotationTriggers.some(trigger => 
      errorMessage.includes(trigger)
    ) && this.config.get('gemini.enableRotation', false);
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}