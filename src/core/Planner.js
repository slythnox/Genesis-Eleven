import { GeminiClient } from '../api/GeminiClient.js';
import { ConfigManager } from '../utils/ConfigManager.js';
import { LoggingUtil } from '../utils/LoggingUtil.js';
import { PlatformUtils } from '../utils/PlatformUtils.js';
import { Plan } from '../models/Plan.js';
import { ApiException } from '../exceptions/ApiException.js';

export class Planner {
  constructor() {
    this.geminiClient = new GeminiClient();
    this.config = ConfigManager.getInstance();
    this.logger = LoggingUtil.getInstance();
  }

  async createPlan(userQuery) {
    try {
      const systemPrompt = this._buildSystemPrompt();
      const userPrompt = `User request: "${userQuery}"

Please analyze this request and create a structured execution plan. Consider:
1. What the user wants to accomplish
2. The safest way to achieve it
3. Any potential risks or side effects
4. Whether confirmation is needed for each step

Respond with valid JSON only.`;

      const response = await this.geminiClient.generateStructuredResponse(
        systemPrompt,
        userPrompt
      );

      const planData = this._parseAndValidatePlan(response);

      // Normalize commands for current platform
      planData.steps = planData.steps.map(step => ({
        ...step,
        command: PlatformUtils.normalizeCommand(step.command)
      }));

      const plan = new Plan(planData);

      this.logger.info('Plan created successfully', {
        userQuery,
        stepCount: plan.steps.length,
        riskLevel: plan.riskLevel
      });

      return plan;
    } catch (error) {
      this.logger.error('Failed to create plan', { userQuery, error: error.message });
      throw new ApiException(`Failed to create execution plan: ${error.message}`);
    }
  }

  _buildSystemPrompt() {
    return `You are an AI assistant that helps users control their desktop through natural language commands.

Your job:
- Take what the user wants to do and break it into clear steps
- Use actual shell commands that work on their system
- Be careful about anything that could mess up their computer
- Make sure each step makes sense

Rules:
- Only respond with JSON
- Focus on desktop stuff: files, apps, settings
- Don't do anything destructive without asking
- Use commands that actually exist
- Adapt commands for the user's operating system (Windows, macOS, Linux)

Platform-specific command guidelines:
- Windows: Use 'dir' instead of 'ls', 'type' instead of 'cat', 'del' instead of 'rm'
- macOS: Use 'open' to launch applications, 'osascript' for system control
- Linux: Use standard Unix commands, 'xdg-open' for file opening

Current platform: ${process.platform}

Always generate commands appropriate for the current platform.

JSON format:
{
  "intent": "What the user wants to do",
  "steps": [
    {
      "id": "step-1",
      "description": "What this step does",
      "command": "actual command to run",
      "requiresConfirmation": true|false,
      "riskLevel": "none|low|medium|high",
      "workingDirectory": "/path/to/run/from"
    }
  ],
  "riskLevel": "none|low|medium|high",
  "rollback": "How to undo this if needed",
  "estimatedDuration": "how long this might take",
  "prerequisites": ["what needs to be installed first"]
}

Risk levels:
- none: Just looking at stuff (ls, cat, echo)
- low: Moving files around, opening apps
- medium: Installing things, changing settings
- high: Deleting stuff, system changes

Be conservative - if something could break their system, mark it as high risk.`;
  }

  _parseAndValidatePlan(response) {
    try {
      let jsonStr = response.trim();

      // Strategy 1: Try to extract JSON from markdown code blocks
      const codeBlockMatch = jsonStr.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1];
      } else {
        // Strategy 2: Extract JSON object from response (handles trailing text)
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }
      }

      // Try to parse the JSON
      const planData = JSON.parse(jsonStr);

      // Validate required fields
      if (!planData.intent || !planData.steps || !Array.isArray(planData.steps)) {
        throw new Error('Invalid plan structure: missing required fields (intent, steps)');
      }

      if (planData.steps.length === 0) {
        throw new Error('Invalid plan: must contain at least one step');
      }

      // Validate each step
      planData.steps.forEach((step, index) => {
        if (!step.id || !step.command || !step.description) {
          throw new Error(`Invalid step ${index + 1}: missing required fields (id, command, description)`);
        }

        // Set defaults for optional fields
        step.requiresConfirmation = step.requiresConfirmation ?? false;
        step.riskLevel = step.riskLevel ?? 'low';
        step.workingDirectory = step.workingDirectory ?? process.cwd();
      });

      // Set defaults for plan-level fields
      planData.riskLevel = planData.riskLevel ?? 'low';
      planData.rollback = planData.rollback ?? 'No automatic rollback available';
      planData.estimatedDuration = planData.estimatedDuration ?? 'Unknown';
      planData.prerequisites = planData.prerequisites ?? [];

      return planData;
    } catch (error) {
      this.logger.error('Failed to parse plan response', {
        error: error.message,
        responsePreview: response.substring(0, 200)
      });
      throw new Error(`Failed to parse plan response: ${error.message}. The AI response may be malformed.`);
    }
  }

  async refinePlan(plan, userFeedback) {
    try {
      const refinementPrompt = `The user has provided feedback on the execution plan:
      
Original plan: ${JSON.stringify(plan.toJSON(), null, 2)}
User feedback: "${userFeedback}"

Please refine the plan based on this feedback. Respond with the updated JSON plan using the same format.`;

      const response = await this.geminiClient.generateStructuredResponse(
        this._buildSystemPrompt(),
        refinementPrompt
      );

      const refinedPlanData = this._parseAndValidatePlan(response);
      return new Plan(refinedPlanData);
    } catch (error) {
      throw new ApiException(`Failed to refine plan: ${error.message}`);
    }
  }
}