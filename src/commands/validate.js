import { Command } from 'commander';
import chalk from 'chalk';
import { Validator } from '../core/Validator.js';

export function validateCommand() {
  const cmd = new Command('validate');
  cmd
    .description('Validate a command for security and safety')
    .argument('<command>', 'Command to validate')
    .option('--json', 'Output validation result in JSON format')
    .action(async (command, options) => {
      await handleValidate(command, options);
    });

  return cmd;
}

async function handleValidate(command, options = {}) {
  try {
    console.log(chalk.blue('🌟 Genesis Eleven CLI - Command Validator'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.cyan(`Command: ${command}`));
    console.log();

    const validator = new Validator();
    
    // Create a mock step for validation
    const mockStep = {
      id: 'validation-step',
      command: command,
      description: 'Command validation',
      riskLevel: 'unknown'
    };

    const result = await validator.validateStep(mockStep);

    if (options.json) {
      console.log(JSON.stringify(result.toJSON(), null, 2));
    } else {
      console.log(chalk.green('🛡️  Validation Results:'));
      console.log(chalk.gray('─'.repeat(30)));
      
      console.log(`Status: ${result.allowed ? chalk.green('ALLOWED') : chalk.red('BLOCKED')}`);
      console.log(`Risk Level: ${getRiskLevelColor(result.riskLevel)}`);
      console.log(`Requires Confirmation: ${result.requiresConfirmation ? chalk.yellow('YES') : chalk.green('NO')}`);
      
      if (result.warnings.length > 0) {
        console.log(chalk.yellow('\n⚠️  Warnings:'));
        result.warnings.forEach(warning => {
          console.log(chalk.yellow(`  - ${warning}`));
        });
      }
      
      if (result.blockedReasons.length > 0) {
        console.log(chalk.red('\n❌ Blocked Reasons:'));
        result.blockedReasons.forEach(reason => {
          console.log(chalk.red(`  - ${reason}`));
        });
      }
      
      if (result.suggestions.length > 0) {
        console.log(chalk.blue('\n💡 Suggestions:'));
        result.suggestions.forEach(suggestion => {
          console.log(chalk.blue(`  - ${suggestion}`));
        });
      }

      // Show recommendation
      if (result.allowed) {
        if (result.riskLevel === 'high' || result.requiresConfirmation) {
          console.log(chalk.yellow('\n⚠️  This command can be executed but requires careful consideration.'));
        } else {
          console.log(chalk.green('\n✅ This command appears safe to execute.'));
        }
      } else {
        console.log(chalk.red('\n❌ This command is blocked and cannot be executed.'));
      }
    }

  } catch (error) {
    console.error(chalk.red(`\nValidation failed: ${error.message}`));
    process.exit(1);
  }
}

function getRiskLevelColor(riskLevel) {
  switch (riskLevel) {
    case 'none': return chalk.green(riskLevel.toUpperCase());
    case 'low': return chalk.blue(riskLevel.toUpperCase());
    case 'medium': return chalk.yellow(riskLevel.toUpperCase());
    case 'high': return chalk.red(riskLevel.toUpperCase());
    default: return chalk.gray(riskLevel.toUpperCase());
  }
}