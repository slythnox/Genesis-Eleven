import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { Planner } from '../core/Planner.js';
import { Validator } from '../core/Validator.js';

export function planCommand() {
  const cmd = new Command('plan');
  cmd
    .description('Create and display an execution plan without running it')
    .argument('<query...>', 'Natural language command to plan')
    .option('-v, --verbose', 'Show detailed validation information')
    .option('--json', 'Output plan in JSON format')
    .action(async (queryParts, options) => {
      const query = queryParts.join(' ');
      await handlePlan(query, options);
    });

  return cmd;
}

async function handlePlan(query, options = {}) {
  try {
    console.log(chalk.blue('🌟 Genesis Eleven CLI - Plan Generator'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.cyan(`Query: ${query}`));
    console.log();

    // Initialize components
    const planner = new Planner();
    const validator = new Validator();

    // Create execution plan
    const planSpinner = ora('Creating execution plan...').start();
    let plan;
    try {
      plan = await planner.createPlan(query);
      planSpinner.succeed('Execution plan created');
    } catch (error) {
      planSpinner.fail('Failed to create plan');
      console.error(chalk.red(`Error: ${error.message}`));
      return;
    }

    // Validate plan
    const validationSpinner = ora('Validating plan safety...').start();
    let validationResult;
    try {
      validationResult = await validator.validatePlan(plan);
      validationSpinner.succeed('Plan validation completed');
    } catch (error) {
      validationSpinner.fail('Plan validation failed');
      console.error(chalk.red(`Validation error: ${error.message}`));
      return;
    }

    // Output results
    if (options.json) {
      const output = {
        plan: plan.toJSON(),
        validation: {
          allowed: validationResult.allowed,
          riskLevel: validationResult.riskLevel,
          summary: validationResult.summary,
          stepResults: validationResult.stepResults.map(r => r.toJSON())
        }
      };
      console.log(JSON.stringify(output, null, 2));
    } else {
      // Display plan
      console.log(chalk.green('\n📋 Execution Plan:'));
      console.log(chalk.gray('─'.repeat(30)));
      console.log(plan.toString());

      // Display validation summary
      console.log(chalk.blue(`\n🛡️  Security Assessment:`));
      console.log(`Overall Status: ${validationResult.allowed ? chalk.green('ALLOWED') : chalk.red('BLOCKED')}`);
      console.log(`Risk Level: ${getRiskLevelColor(validationResult.riskLevel)}`);
      console.log(`Total Steps: ${validationResult.summary.totalSteps}`);
      console.log(`Blocked Steps: ${validationResult.summary.blockedSteps}`);
      console.log(`High Risk Steps: ${validationResult.summary.highRiskSteps}`);
      console.log(`Total Warnings: ${validationResult.summary.totalWarnings}`);

      // Show detailed validation if verbose
      if (options.verbose) {
        console.log(chalk.yellow('\n⚠️  Detailed Validation Results:'));
        validationResult.stepResults.forEach(result => {
          console.log(chalk.gray(`\nStep ${result.stepId}:`));
          console.log(`  Status: ${result.allowed ? chalk.green('ALLOWED') : chalk.red('BLOCKED')}`);
          console.log(`  Risk Level: ${getRiskLevelColor(result.riskLevel)}`);
          
          if (result.warnings.length > 0) {
            console.log(`  Warnings:`);
            result.warnings.forEach(warning => {
              console.log(chalk.yellow(`    - ${warning}`));
            });
          }
          
          if (result.blockedReasons.length > 0) {
            console.log(`  Blocked Reasons:`);
            result.blockedReasons.forEach(reason => {
              console.log(chalk.red(`    - ${reason}`));
            });
          }
        });
      }

      // Show execution command
      console.log(chalk.blue('\n🚀 To execute this plan, run:'));
      console.log(chalk.gray(`el execute "${query}"`));
    }

  } catch (error) {
    console.error(chalk.red(`\nPlan generation failed: ${error.message}`));
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