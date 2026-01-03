import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { ConfigManager } from '../../utils/ConfigManager.js';

describe('ConfigManager', () => {
  let configManager;
  let tempConfigPath;

  beforeEach(async () => {
    // Create a temporary config directory for testing
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'genesis-test-'));
    tempConfigPath = path.join(tempDir, 'config.json');
    
    configManager = new ConfigManager();
    configManager.configPath = tempConfigPath;
  });

  afterEach(async () => {
    // Clean up temporary files
    try {
      await fs.unlink(tempConfigPath);
      await fs.rmdir(path.dirname(tempConfigPath));
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should create default configuration', async () => {
    await configManager.load();
    
    const config = configManager.getAll();
    expect(config.gemini).toBeDefined();
    expect(config.sandbox).toBeDefined();
    expect(config.security).toBeDefined();
    expect(config.logging).toBeDefined();
  });

  it('should get and set configuration values', async () => {
    await configManager.load();
    
    configManager.set('test.value', 'hello');
    expect(configManager.get('test.value')).toBe('hello');
    
    configManager.set('nested.deep.value', 42);
    expect(configManager.get('nested.deep.value')).toBe(42);
  });

  it('should return default values for missing keys', async () => {
    await configManager.load();
    
    expect(configManager.get('nonexistent.key', 'default')).toBe('default');
    expect(configManager.get('missing')).toBeNull();
  });

  it('should persist configuration to file', async () => {
    await configManager.load();
    
    configManager.set('persistent.test', 'value');
    await configManager.save();
    
    // Create new instance and load
    const newConfigManager = new ConfigManager();
    newConfigManager.configPath = tempConfigPath;
    await newConfigManager.load();
    
    expect(newConfigManager.get('persistent.test')).toBe('value');
  });

  it('should delete configuration keys', async () => {
    await configManager.load();
    
    configManager.set('delete.me', 'value');
    expect(configManager.get('delete.me')).toBe('value');
    
    configManager.delete('delete.me');
    expect(configManager.get('delete.me')).toBeNull();
  });

  it('should reset to default configuration', async () => {
    await configManager.load();
    
    configManager.set('custom.setting', 'value');
    configManager.reset();
    
    expect(configManager.get('custom.setting')).toBeNull();
    expect(configManager.get('gemini.model')).toBe('gemini-1.5-flash');
  });
});