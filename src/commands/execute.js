import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import { Planner } from '../core/Planner.js';
import { SandboxExecutor } from '../core/SandboxExecutor.js';
import { Validator } from '../core/Validator.js';
import { LoggingUtil } from '../utils/LoggingUtil.js';

export function executeCommand() {
  const cmd = new Command('execute');
  cmd
    .description('Execute a natural language command')
    .argument('<query...>', 'Natural language command to execute')
    .option('-p, --plan-only', 'Show execution plan without running commands')
    .option('-y, --auto-approve', 'Automatically approve all steps (use with caution)')
    .option('-v, --verbose', 'Enable verbose output')
    .action(async (queryParts, options) => {
      const query = queryParts.join(' ');
      await handleExecute(query, options);
    });

  return cmd;
}

export async function handleExecute(query, options = {}) {
  const logger = LoggingUtil.getInstance();
  const taskId = `task-${Date.now()}`;
  
  try {
    console.log(chalk.blue('🌟 Genesis Eleven CLI - AI Desktop Control'));
    console.log(chalk.gray('━'.repeat(48)));
    console.log(chalk.cyan(`Query: ${query}`));
    console.log();

    // Set up the tools we need
    const planner = new Planner();
    const validator = new Validator();
    const executor = new SandboxExecutor();

    const planSpinner = ora('Figuring out what to do...').start();
    let plan;
    try {
      plan = await planner.createPlan(query);
      planSpinner.succeed('Got it! Here\'s the plan');
    } catch (error) {
      planSpinner.fail('Hmm, couldn\'t figure that out');
      console.error(chalk.red(`Error: ${error.message}`));
      return;
    }

    console.log(chalk.green('\n📋 Here\'s what I\'ll do:'));
    console.log(chalk.gray('─'.repeat(25)));
    console.log(plan.toString());

    const validationSpinner = ora('Checking if this is safe...').start();
    let validationResult;
    try {
      validationResult = await validator.validatePlan(plan);
      validationSpinner.succeed('Safety check complete');
    } catch (error) {
      validationSpinner.fail('Safety check failed');
      console.error(chalk.red(`Validation error: ${error.message}`));
      return;
    }

    // Display validation results
    if (!validationResult.allowed) {
      console.log(chalk.red('\n❌ Plan blocked by security policies:'));
      validationResult.stepResults.forEach(result => {
        if (!result.allowed) {
          console.log(chalk.red(`  Step ${result.stepId}: ${result.blockedReasons.join(', ')}`));
        }
      });
      return;
    }

    if (validationResult.stepResults.some(r => r.hasWarnings())) {
      console.log(chalk.yellow('\n⚠️  Security warnings:'));
      validationResult.stepResults.forEach(result => {
        if (result.hasWarnings()) {
          result.warnings.forEach(warning => {
            console.log(chalk.yellow(`  Step ${result.stepId}: ${warning}`));
          });
        }
      });
    }

    console.log(chalk.blue(`\n🛡️  Overall Risk Level: ${validationResult.riskLevel.toUpperCase()}`));

    // Stop here if plan-only mode
    if (options.planOnly) {
      console.log(chalk.gray('\nJust showing the plan - not actually doing anything'));
      return;
    }

    // Ask user if they want to proceed
    if (!options.autoApprove) {
      const stepsRequiringConfirmation = plan.getStepsRequiringConfirmation();
      const highRiskSteps = validationResult.stepResults.filter(r => r.isHighRisk());
      
      if (stepsRequiringConfirmation.length > 0 || highRiskSteps.length > 0) {
        console.log(chalk.yellow('\n⚠️  These steps need your OK first:'));
        
        const confirmationSteps = new Set([
          ...stepsRequiringConfirmation.map(s => s.id),
          ...highRiskSteps.map(r => r.stepId)
        ]);

        confirmationSteps.forEach(stepId => {
          const step = plan.steps.find(s => s.id === stepId);
          if (step) {
            console.log(chalk.yellow(`  ${step.id}: ${step.description}`));
            console.log(chalk.gray(`    Command: ${step.command}`));
          }
        });

        const { proceed } = await prompts({
          type: 'confirm',
          name: 'proceed',
          message: 'Look good? Should I go ahead?',
          initial: false
        });

        if (!proceed) {
          console.log(chalk.gray('No worries, cancelled.'));
          return;
        }
      }
    }

    console.log(chalk.blue('\n🔧 Setting up...'));
    await executor.initialize();

    console.log(chalk.green('\n🚀 Here we go...'));
    console.log(chalk.gray('─'.repeat(25)));

    const executionResults = [];
    let allSuccessful = true;

    for (const step of plan.steps) {
      const stepSpinner = ora(`${step.description}`).start();
      
      try {
        const result = await executor.executeStep(step);
        executionResults.push(result);

        if (result.success) {
          stepSpinner.succeed(`${step.description}`);
          if (options.verbose && result.stdout) {
            console.log(chalk.gray(`   Output: ${result.stdout.substring(0, 200)}${result.stdout.length > 200 ? '...' : ''}`));
          }
        } else {
          stepSpinner.fail(`${step.description}`);
          console.log(chalk.red(`   Error: ${result.getFormattedOutput()}`));
          allSuccessful = false;
          
          // Ask if user wants to continue
          if (plan.steps.indexOf(step) < plan.steps.length - 1) {
            const { continueExecution } = await prompts({
              type: 'confirm',
              name: 'continueExecution',
              message: 'That step failed. Keep going with the rest?',
              initial: false
            });

            if (!continueExecution) {
              break;
            }
          }
        }
      } catch (error) {
        stepSpinner.fail(`${step.description}`);
        console.log(chalk.red(`   Error: ${error.message}`));
        allSuccessful = false;
        break;
      }
    }

    console.log(chalk.blue('\n📊 All done!'));
    console.log(chalk.gray('─'.repeat(20)));
    const successful = executionResults.filter(r => r.success).length;
    const failed = executionResults.filter(r => !r.success).length;
    
    if (allSuccessful) {
      console.log(chalk.green(`✅ Everything worked! (${successful}/${plan.steps.length} steps)`));
    } else {
      console.log(chalk.yellow(`⚠️  Mostly worked: ${successful} succeeded, ${failed} failed`));
    }

    // Log execution details
    const executionLog = {
      taskId,
      timestamp: new Date().toISOString(),
      userQuery: query,
      plan: plan.toJSON(),
      validationResult: {
        allowed: validationResult.allowed,
        riskLevel: validationResult.riskLevel,
        summary: validationResult.summary
      },
      executionResults: executionResults.map(r => r.toJSON()),
      status: allSuccessful ? 'success' : 'partial_failure',
      options
    };

    await logger.logExecution(executionLog);
    
    if (options.verbose) {
      console.log(chalk.gray(`\nExecution logged: logs/${taskId}.json`));
    }

    await executor.cleanup();

  } catch (error) {
    logger.error('Execution failed', { taskId, query, error: error.message });
    console.error(chalk.red(`\nExecution failed: ${error.message}`));
    process.exit(1);
  }
}