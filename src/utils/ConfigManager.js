import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export class ConfigManager {
  static instance = null;

  constructor() {
    this.configPath = path.join(os.homedir(), '.genesis-eleven', 'config.json');
    this.config = {};
    this.loaded = false;
  }

  static getInstance() {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  async load() {
    try {
      await this._ensureConfigDir();
      
      if (await this._fileExists(this.configPath)) {
        const configData = await fs.readFile(this.configPath, 'utf8');
        this.config = JSON.parse(configData);
      } else {
        this.config = this._getDefaultConfig();
        await this.save();
      }
      
      this.loaded = true;
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error.message}`);
    }
  }

  async save() {
    try {
      await this._ensureConfigDir();
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error.message}`);
    }
  }

  get(key, defaultValue = null) {
    if (!this.loaded) {
      this._loadSync();
    }
    
    const keys = key.split('.');
    let value = this.config;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  }

  set(key, value) {
    if (!this.loaded) {
      this._loadSync();
    }
    
    const keys = key.split('.');
    let current = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current) || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    if (!this.loaded) {
      this._loadSync();
    }
    
    const keys = key.split('.');
    let current = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current) || typeof current[k] !== 'object') {
        return false;
      }
      current = current[k];
    }
    
    delete current[keys[keys.length - 1]];
    return true;
  }

  getAll() {
    if (!this.loaded) {
      this._loadSync();
    }
    return { ...this.config };
  }

  reset() {
    this.config = this._getDefaultConfig();
    this.loaded = true;
  }

  _loadSync() {
    try {
      // Use dynamic import for fs module in ES modules context
      // Note: This is a workaround - ideally all code should be async
      import('fs').then(fs => {
        const { readFileSync, writeFileSync, existsSync, mkdirSync } = fs;
        
        if (!existsSync(path.dirname(this.configPath))) {
          mkdirSync(path.dirname(this.configPath), { recursive: true });
        }
        
        if (existsSync(this.configPath)) {
          const configData = readFileSync(this.configPath, 'utf8');
          this.config = JSON.parse(configData);
        } else {
          this.config = this._getDefaultConfig();
          writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
        }
        
        this.loaded = true;
      }).catch(error => {
        // Fallback to default config if import fails
        this.config = this._getDefaultConfig();
        this.loaded = true;
      });
    } catch (error) {
      this.config = this._getDefaultConfig();
      this.loaded = true;
    }
  }

  async _ensureConfigDir() {
    const configDir = path.dirname(this.configPath);
    try {
      await fs.mkdir(configDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  async _fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  _getDefaultConfig() {
    return {
      gemini: {
        model: 'gemini-1.5-flash',
        apiKeys: '',
        timeout: 30000,
        maxRetries: 3,
        enableRotation: false
      },
      sandbox: {
        workdir: path.join(os.tmpdir(), 'genesis-eleven-work'),
        timeout: 30000,
        maxMemoryMB: 512
      },
      security: {
        requireConfirmation: true,
        allowHighRisk: false
      },
      logging: {
        level: 'info',
        auditEnabled: true,
        auditDir: 'logs'
      }
    };
  }

  getConfigPath() {
    return this.configPath;
  }
}