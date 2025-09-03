import { describe, it, expect, beforeEach } from '@jest/globals';
import { Plan, Step } from '../../models/Plan.js';

describe('Plan', () => {
  let planData;

  beforeEach(() => {
    planData = {
      intent: 'Test plan',
      steps: [
        {
          id: 'step-1',
          description: 'First step',
          command: 'echo "hello"',
          riskLevel: 'low'
        },
        {
          id: 'step-2', 
          description: 'Second step',
          command: 'ls -la',
          riskLevel: 'none',
          requiresConfirmation: true
        }
      ],
      riskLevel: 'low',
      rollback: 'No rollback needed',
      estimatedDuration: '30 seconds'
    };
  });

  it('should create a plan with correct properties', () => {
    const plan = new Plan(planData);
    
    expect(plan.intent).toBe('Test plan');
    expect(plan.steps).toHaveLength(2);
    expect(plan.riskLevel).toBe('low');
    expect(plan.rollback).toBe('No rollback needed');
    expect(plan.id).toMatch(/^plan-\d+-[a-z0-9]+$/);
  });

  it('should filter high risk steps correctly', () => {
    planData.steps.push({
      id: 'step-3',
      description: 'High risk step',
      command: 'rm -rf temp',
      riskLevel: 'high'
    });

    const plan = new Plan(planData);
    const highRiskSteps = plan.getHighRiskSteps();
    
    expect(highRiskSteps).toHaveLength(1);
    expect(highRiskSteps[0].riskLevel).toBe('high');
  });

  it('should filter steps requiring confirmation', () => {
    const plan = new Plan(planData);
    const confirmationSteps = plan.getStepsRequiringConfirmation();
    
    expect(confirmationSteps).toHaveLength(1);
    expect(confirmationSteps[0].id).toBe('step-2');
  });

  it('should convert to JSON correctly', () => {
    const plan = new Plan(planData);
    const json = plan.toJSON();
    
    expect(json.intent).toBe(planData.intent);
    expect(json.steps).toHaveLength(2);
    expect(json.id).toBeDefined();
    expect(json.createdAt).toBeDefined();
  });
});

describe('Step', () => {
  it('should create a step with default values', () => {
    const step = new Step({
      description: 'Test step',
      command: 'echo test'
    });

    expect(step.description).toBe('Test step');
    expect(step.command).toBe('echo test');
    expect(step.requiresConfirmation).toBe(false);
    expect(step.riskLevel).toBe('low');
    expect(step.id).toMatch(/^step-\d+-[a-z0-9]+$/);
  });

  it('should preserve provided values', () => {
    const stepData = {
      id: 'custom-step',
      description: 'Custom step',
      command: 'custom command',
      requiresConfirmation: true,
      riskLevel: 'high',
      workingDirectory: '/custom/path'
    };

    const step = new Step(stepData);
    
    expect(step.id).toBe('custom-step');
    expect(step.requiresConfirmation).toBe(true);
    expect(step.riskLevel).toBe('high');
    expect(step.workingDirectory).toBe('/custom/path');
  });
});