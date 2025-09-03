import { describe, it, expect, beforeEach } from '@jest/globals';
import { Validator } from '../../core/Validator.js';

describe('Validator', () => {
  let validator;

  beforeEach(() => {
    validator = new Validator();
  });

  it('should allow safe commands', async () => {
    const step = {
      id: 'test-step',
      command: 'ls -la',
      description: 'List files'
    };

    const result = await validator.validateStep(step);
    
    expect(result.allowed).toBe(true);
    expect(result.riskLevel).toBe('none');
    expect(result.blockedReasons).toHaveLength(0);
  });

  it('should block dangerous commands', async () => {
    const step = {
      id: 'test-step',
      command: 'rm -rf /',
      description: 'Dangerous deletion'
    };

    const result = await validator.validateStep(step);
    
    expect(result.allowed).toBe(false);
    expect(result.blockedReasons.length).toBeGreaterThan(0);
  });

  it('should detect high risk operations', async () => {
    const step = {
      id: 'test-step',
      command: 'sudo rm -rf /tmp/test',
      description: 'System deletion'
    };

    const result = await validator.validateStep(step);
    
    expect(result.riskLevel).toBe('high');
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should require confirmation for risky operations', async () => {
    const step = {
      id: 'test-step',
      command: 'git reset --hard',
      description: 'Reset git repository'
    };

    const result = await validator.validateStep(step);
    
    expect(result.requiresConfirmation).toBe(true);
  });

  it('should provide suggestions for safer alternatives', async () => {
    const step = {
      id: 'test-step',
      command: 'chmod 777 file.txt',
      description: 'Change permissions'
    };

    const result = await validator.validateStep(step);
    
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions[0]).toContain('restrictive permissions');
  });
});