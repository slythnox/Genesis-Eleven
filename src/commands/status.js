import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { ConfigManager } from '../utils/ConfigManager.js';
import { GeminiClient } from '../api/GeminiClient.js';
import { LoggingUtil } from '../utils/LoggingUtil.js';

// Get package.json for version
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf8'));

export function statusCommand() {
  const cmd = new Command('status');
  cmd
    .description('Show system status and health check')
    .option('--json', 'Output status in JSON format')
    .option('--test-api', 'Test API connectivity')
    .action(async (options) => {
      await handleStatus(options);
    });

  return cmd;
}

async function handleStatus(options = {}) {
  try {
    const config = ConfigManager.getInstance();
    const logger = LoggingUtil.getInstance();

    const status = {
      timestamp: new Date().toISOString(),
      version: packageJson.version,
      config: {
        geminiModel: config.get('gemini.model', 'gemini-1.5-flash'),
        apiKeysConfigured: config.get('gemini.apiKeys', '').split(',').filter(k => k.trim()).length,
        sandboxWorkdir: config.get('sandbox.workdir', '/tmp/forge-work'),
        sandboxTimeout: config.get('sandbox.timeout', 30000),
        maxMemoryMB: config.get('sandbox.maxMemoryMB', 512)
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      }
    };

    if (options.testApi) {
      console.log(chalk.blue('Testing API connectivity...'));
      try {
        const geminiClient = new GeminiClient();
        const isConnected = await geminiClient.validateConnection();
        status.apiTest = {
          success: isConnected,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        status.apiTest = {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    }

    if (options.json) {
      console.log(JSON.stringify(status, null, 2));
    } else {
      console.log(chalk.blue('🌟 Genesis Eleven CLI - System Status'));
      console.log(chalk.gray('─'.repeat(50)));
      
      console.log(chalk.green('📊 Configuration:'));
      console.log(`  Gemini Model: ${status.config.geminiModel}`);
      console.log(`  API Keys: ${status.config.apiKeysConfigured} configured`);
      console.log(`  Sandbox Directory: ${status.config.sandboxWorkdir}`);
      console.log(`  Sandbox Timeout: ${status.config.sandboxTimeout}ms`);
      console.log(`  Memory Limit: ${status.config.maxMemoryMB}MB`);
      
      console.log(chalk.green('\n💻 System Information:'));
      console.log(`  Node.js Version: ${status.system.nodeVersion}`);
      console.log(`  Platform: ${status.system.platform} (${status.system.arch})`);
      console.log(`  Uptime: ${Math.floor(status.system.uptime)}s`);
      console.log(`  Memory Usage: ${Math.round(status.system.memoryUsage.rss / 1024 / 1024)}MB`);

      if (status.apiTest) {
        console.log(chalk.green('\n🌐 API Connectivity:'));
        if (status.apiTest.success) {
          console.log(chalk.green('  ✅ API connection successful'));
        } else {
          console.log(chalk.red('  ❌ API connection failed'));
          console.log(chalk.red(`     Error: ${status.apiTest.error}`));
        }
      }

      // Health recommendations
      console.log(chalk.blue('\n💡 Health Check:'));
      const recommendations = [];
      
      if (status.config.apiKeysConfigured === 0) {
        recommendations.push('⚠️  No API keys configured. Run: el config');
      } else if (status.config.apiKeysConfigured === 1) {
        recommendations.push('💡 Consider adding multiple API keys for better rate limit handling');
      }
      
      if (status.system.memoryUsage.rss > 100 * 1024 * 1024) {
        recommendations.push('⚠️  High memory usage detected');
      }
      
      if (status.apiTest && !status.apiTest.success) {
        recommendations.push('❌ API connectivity issues detected. Check your API keys and network connection');
      }
      
      if (recommendations.length === 0) {
        console.log(chalk.green('  ✅ All systems operational'));
      } else {
        recommendations.forEach(rec => console.log(`  ${rec}`));
      }
    }

  } catch (error) {
    console.error(chalk.red(`\nStatus check failed: ${error.message}`));
    process.exit(1);
  }
}