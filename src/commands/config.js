import { Command } from 'commander';
import prompts from 'prompts';
import chalk from 'chalk';
import ora from 'ora';
import { ConfigManager } from '../utils/ConfigManager.js';
import { GeminiClient } from '../api/GeminiClient.js';

export function configCommand() {
  const cmd = new Command('config');
  
  cmd
    .description('Configure API keys and settings')
    .option('-k, --key <key>', 'Set primary API key')
    .option('-a, --add <key>', 'Add additional API key for rotation')
    .option('-r, --rotate', 'Enable API key rotation')
    .option('--show', 'Show current configuration (API keys hidden)')
    .option('--reset', 'Reset configuration to defaults')
    .option('--test', 'Test API connectivity')
    .action(async (options) => {
      await handleConfig(options);
    });

  return cmd;
}

async function handleConfig(options = {}) {
  try {
    const config = ConfigManager.getInstance();
    await config.load();

    if (options.reset) {
      config.reset();
      await config.save();
      console.log(chalk.green('✅ Configuration reset to defaults'));
      return;
    }

    if (options.show) {
      const configData = config.getAll();
      const safeConfig = { ...configData };
      
      // Hide API keys for security
      if (safeConfig.gemini?.apiKeys) {
        const keys = safeConfig.gemini.apiKeys.split(',').filter(k => k.trim());
        safeConfig.gemini.apiKeys = keys.map((_, i) => `[KEY_${i + 1}]`).join(', ');
      }
      
      console.log(chalk.green('📋 Current Configuration:'));
      console.log(JSON.stringify(safeConfig, null, 2));
      return;
    }

    if (options.test) {
      console.log(chalk.blue('🧪 Testing API connectivity...'));
      try {
        const geminiClient = new GeminiClient();
        const isConnected = await geminiClient.validateConnection();
        
        if (isConnected) {
          console.log(chalk.green('✅ API connection successful'));
        } else {
          console.log(chalk.red('❌ API connection failed'));
          console.log(chalk.yellow('💡 Check your API key configuration'));
        }
      } catch (error) {
        console.log(chalk.red('❌ API test failed'));
        console.error(chalk.red(`Error: ${error.message}`));
      }
      return;
    }

    if (options.key) {
      config.set('gemini.apiKeys', options.key);
      await config.save();
      console.log(chalk.green('✅ Primary API key configured'));
      return;
    }

    if (options.add) {
      const currentKeys = config.get('gemini.apiKeys', '');
      const keys = currentKeys ? currentKeys.split(',').map(k => k.trim()) : [];
      keys.push(options.add);
      config.set('gemini.apiKeys', keys.join(','));
      await config.save();
      console.log(chalk.green(`✅ API key added (total: ${keys.length})`));
      return;
    }

    if (options.rotate) {
      config.set('gemini.enableRotation', true);
      await config.save();
      console.log(chalk.green('✅ API key rotation enabled'));
      return;
    }

    // Interactive configuration
    await runInteractiveConfig(config);

  } catch (error) {
    console.error(chalk.red(`Configuration failed: ${error.message}`));
    process.exit(1);
  }
}

async function runInteractiveConfig(config) {
  console.log(chalk.blue('🔧 Genesis Eleven CLI Configuration'));
  console.log(chalk.gray('─'.repeat(40)));
  
  const currentKeys = config.get('gemini.apiKeys', '');
  const hasKeys = currentKeys && currentKeys.trim();
  
  if (hasKeys) {
    console.log(chalk.green('✅ API keys already configured'));
    
    const { action } = await prompts({
      type: 'select',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { title: 'Add another API key', value: 'add' },
        { title: 'Replace primary key', value: 'replace' },
        { title: 'Configure advanced settings', value: 'advanced' },
        { title: 'Test API connection', value: 'test' },
        { title: 'Exit', value: 'exit' }
      ]
    });

    if (action === 'exit') {return;}
    
    if (action === 'test') {
      await testApiConnection();
      return;
    }
    
    if (action === 'add') {
      const { newKey } = await prompts({
        type: 'password',
        name: 'newKey',
        message: 'Enter additional API key:'
      });
      
      if (newKey) {
        const keys = currentKeys.split(',').map(k => k.trim());
        keys.push(newKey);
        config.set('gemini.apiKeys', keys.join(','));
        config.set('gemini.enableRotation', true);
        await config.save();
        console.log(chalk.green(`✅ API key added (total: ${keys.length})`));
      }
      return;
    }
    
    if (action === 'replace') {
      const { newKey } = await prompts({
        type: 'password',
        name: 'newKey',
        message: 'Enter new primary API key:'
      });
      
      if (newKey) {
        config.set('gemini.apiKeys', newKey);
        await config.save();
        console.log(chalk.green('✅ Primary API key updated'));
      }
      return;
    }
    
    if (action === 'advanced') {
      await configureAdvancedSettings(config);
      
    }
  } else {
    // First-time setup
    console.log(chalk.yellow('🔑 Looks like this is your first time! Let\'s get you set up.'));
    console.log(chalk.gray('You\'ll need a Gemini API key from: https://makersuite.google.com/app/apikey\n'));
    
    const { apiKey } = await prompts({
      type: 'password',
      name: 'apiKey',
      message: 'Enter your API key:',
      validate: value => value.length > 15 ? true : 'That doesn\'t look like a valid API key'
    });

    if (!apiKey) {
      console.log(chalk.gray('Setup cancelled. Run \'el config\' when you\'re ready.'));
      return;
    }

    config.set('gemini.apiKeys', apiKey);
    await config.save();
    
    console.log(chalk.green('✅ Great! Your API key is saved.'));
    
    console.log(chalk.blue('\n🧪 Let me test that real quick...'));
    await testApiConnection();
  }
}

async function configureAdvancedSettings(config) {
  const current = config.getAll();
  
  const responses = await prompts([
    {
      type: 'select',
      name: 'model',
      message: 'Select Gemini model:',
      choices: [
        { title: 'gemini-1.5-flash (Fast, efficient)', value: 'gemini-1.5-flash' },
        { title: 'gemini-1.5-pro (More capable)', value: 'gemini-1.5-pro' }
      ],
      initial: current.gemini?.model === 'gemini-1.5-pro' ? 1 : 0
    },
    {
      type: 'number',
      name: 'timeout',
      message: 'API timeout (milliseconds):',
      initial: current.gemini?.timeout || 30000,
      min: 5000,
      max: 120000
    },
    {
      type: 'confirm',
      name: 'enableRotation',
      message: 'Enable API key rotation?',
      initial: current.gemini?.enableRotation || false
    },
    {
      type: 'confirm',
      name: 'requireConfirmation',
      message: 'Require confirmation for high-risk operations?',
      initial: current.security?.requireConfirmation !== false
    }
  ]);

  if (responses.model) {config.set('gemini.model', responses.model);}
  if (responses.timeout) {config.set('gemini.timeout', responses.timeout);}
  if (typeof responses.enableRotation === 'boolean') {config.set('gemini.enableRotation', responses.enableRotation);}
  if (typeof responses.requireConfirmation === 'boolean') {config.set('security.requireConfirmation', responses.requireConfirmation);}

  await config.save();
  console.log(chalk.green('✅ Advanced settings updated'));
}

async function testApiConnection() {
  const spinner = ora('Testing API connection...').start();
  
  try {
    const geminiClient = new GeminiClient();
    const isConnected = await geminiClient.validateConnection();
    
    if (isConnected) {
      spinner.succeed('API connection successful');
      console.log(chalk.green('🎉 You\'re all set! Try: el ask "Hello"'));
    } else {
      spinner.fail('API connection failed');
      console.log(chalk.red('❌ Could not connect to Gemini API'));
      console.log(chalk.yellow('💡 Please check your API key'));
    }
  } catch (error) {
    spinner.fail('API test failed');
    console.error(chalk.red(`Error: ${error.message}`));
  }
}