import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { GeminiClient } from '../api/GeminiClient.js';

export function askCommand() {
  const cmd = new Command('ask');
  
  cmd
    .description('Ask a quick question to the AI assistant')
    .argument('<question...>', 'Question to ask')
    .option('-t, --temperature <number>', 'Response creativity (0.0-1.0)', parseFloat, 0.7)
    .option('-m, --max-tokens <number>', 'Maximum response length', parseInt, 1024)
    .option('--json', 'Output response in JSON format')
    .action(async (questionParts, options) => {
      await handleAsk(questionParts.join(' '), options);
    });

  return cmd;
}

async function handleAsk(question, options = {}) {
  try {
    if (!question.trim()) {
      console.error(chalk.red('Please provide a question to ask.'));
      return;
    }

    console.log(chalk.blue('🌟 Genesis Eleven AI Assistant'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(chalk.cyan(`Question: ${question}`));
    console.log();

    const spinner = ora('Let me think about that...').start();
    
    try {
      const geminiClient = new GeminiClient();
      const response = await geminiClient.generateResponse(question, {
        temperature: options.temperature,
        maxTokens: options.maxTokens
      });

      spinner.succeed('Response ready');
      console.log();

      if (options.json) {
        console.log(JSON.stringify({
          question,
          response,
          timestamp: new Date().toISOString(),
          options
        }, null, 2));
      } else {
        console.log(response);
        console.log();
      }

    } catch (error) {
      spinner.fail('Couldn\'t get an answer');
      
      if (error.message.includes('API key')) {
        console.log(chalk.yellow('🔑 Looks like there\'s an issue with your API key.'));
        console.log(chalk.gray('Try running: el config'));
      } else if (error.message.includes('rate limit')) {
        console.log(chalk.yellow('⏰ Hit the rate limit. Give it a sec or add another API key.'));
      } else {
        console.error(chalk.red(`Error: ${error.message}`));
      }
    }

  } catch (error) {
    console.error(chalk.red(`Something went wrong: ${error.message}`));
    process.exit(1);
  }
}