import { Command } from 'commander';
import chalk from 'chalk';
import { LoggingUtil } from '../utils/LoggingUtil.js';

export function logsCommand() {
  const cmd = new Command('logs');
  
  cmd
    .description('View and manage execution logs')
    .option('-r, --recent <count>', 'Show recent executions', parseInt, 10)
    .option('-c, --clean <days>', 'Clean logs older than specified days', parseInt, 30)
    .option('--json', 'Output logs in JSON format')
    .action(async (options) => {
      await handleLogs(options);
    });

  return cmd;
}

async function handleLogs(options = {}) {
  try {
    const logger = LoggingUtil.getInstance();

    if (options.clean) {
      console.log(chalk.blue(`🧹 Cleaning logs older than ${options.clean} days...`));
      const deletedCount = await logger.clearOldLogs(options.clean);
      console.log(chalk.green(`✅ Cleaned ${deletedCount} old log files`));
      return;
    }

    console.log(chalk.blue('📋 Genesis Eleven CLI - Execution Logs'));
    console.log(chalk.gray('─'.repeat(50)));

    const executions = await logger.getRecentExecutions(options.recent);

    if (executions.length === 0) {
      console.log(chalk.gray('No execution logs found'));
      return;
    }

    if (options.json) {
      console.log(JSON.stringify(executions, null, 2));
    } else {
      executions.forEach((execution, index) => {
        const date = new Date(execution.timestamp).toLocaleString();
        const status = execution.status === 'success' ? chalk.green('SUCCESS') : chalk.red('FAILED');
        const stepCount = execution.executionResults?.length || 0;
        
        console.log(`${index + 1}. ${chalk.cyan(execution.userQuery)}`);
        console.log(`   📅 ${date}`);
        console.log(`   📊 Status: ${status} (${stepCount} steps)`);
        console.log(`   🆔 Task ID: ${execution.taskId}`);
        console.log();
      });

      console.log(chalk.blue(`\n📈 Showing ${executions.length} most recent executions`));
      console.log(chalk.gray(`Use --recent <count> to show more or --clean <days> to clean old logs`));
    }

  } catch (error) {
    console.error(chalk.red(`\nLogs command failed: ${error.message}`));
    process.exit(1);
  }
}