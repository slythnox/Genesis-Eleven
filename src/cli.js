#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import commands
import { configCommand } from './commands/config.js';
import { executeCommand } from './commands/execute.js';
import { planCommand } from './commands/plan.js';
import { validateCommand } from './commands/validate.js';
import { statusCommand } from './commands/status.js';
import { askCommand } from './commands/ask.js';
import { logsCommand } from './commands/logs.js';

// Get package.json for version
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

const program = new Command();

// Configure main program
program
  .name('el')
  .version(packageJson.version)
  .description('🌟 Genesis Eleven CLI - AI-powered desktop control assistant')
  .configureHelp({
    sortSubcommands: true
  });

// Add all commands
program.addCommand(configCommand());
program.addCommand(executeCommand());
program.addCommand(planCommand());
program.addCommand(validateCommand());
program.addCommand(statusCommand());
program.addCommand(askCommand());
program.addCommand(logsCommand());

// Default action - execute natural language query
program
  .argument('[query...]', 'Natural language command to execute')
  .option('-p, --plan-only', 'Show execution plan without running commands')
  .option('-y, --auto-approve', 'Automatically approve all steps (use with caution)')
  .option('-v, --verbose', 'Enable verbose output')
  .option('-c, --config <path>', 'Custom configuration file path')
  .action(async (query, options) => {
    if (query && query.length > 0) {
      const { handleExecute } = await import('./commands/execute.js');
      await handleExecute(query.join(' '), options);
    } else {
      console.log(chalk.blue('🌟 Genesis Eleven CLI - AI Desktop Control\n'));
      program.help();
    }
  });

// Global error handler
process.on('uncaughtException', (error) => {
  console.error(chalk.red('💥 Uncaught Exception:'), error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('💥 Unhandled Rejection:'), reason);
  process.exit(1);
});

// Parse command line arguments
program.parse(process.argv);