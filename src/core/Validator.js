import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'yaml';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { ConfigManager } from '../utils/ConfigManager.js';
import { LoggingUtil } from '../utils/LoggingUtil.js';
import { ValidationResult } from '../models/ValidationResult.js';
import { ValidationException } from '../exceptions/ValidationException.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class Validator {
  constructor() {
    this.config = ConfigManager.getInstance();
    this.logger = LoggingUtil.getInstance();
    this.denylist = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      await this._loadDenylist();
      this.initialized = true;
      this.logger.info('Validator initialized');
    } catch (error) {
      throw new ValidationException(`Failed to initialize validator: ${error.message}`);
    }
  }

  async validateStep(step) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const result = new ValidationResult({
        stepId: step.id,
        command: step.command,
        allowed: true,
        riskLevel: step.riskLevel || 'low',
        warnings: [],
        blockedReasons: []
      });

      // Check against denylist
      const denylistCheck = this._checkDenylist(step.command);
      if (!denylistCheck.allowed) {
        result.allowed = false;
        result.blockedReasons.push(...denylistCheck.reasons);
      }

      // Analyze risk level
      const riskAnalysis = this._analyzeRiskLevel(step.command);
      result.riskLevel = this._getHigherRiskLevel(result.riskLevel, riskAnalysis.level);
      result.warnings.push(...riskAnalysis.warnings);

      // Check for high-risk operations
      const highRiskCheck = this._checkHighRiskOperations(step.command);
      if (highRiskCheck.isHighRisk) {
        result.riskLevel = this._getHigherRiskLevel(result.riskLevel, 'high');
        result.warnings.push(...highRiskCheck.warnings);
        result.requiresConfirmation = true;
      }

      // Add suggestions for safer alternatives
      const suggestions = this._generateSuggestions(step.command, result.riskLevel);
      result.suggestions.push(...suggestions);

      this.logger.debug('Step validation completed', {
        stepId: step.id,
        allowed: result.allowed,
        riskLevel: result.riskLevel,
        warningCount: result.warnings.length
      });

      return result;
    } catch (error) {
      this.logger.error('Step validation failed', { 
        stepId: step.id, 
        error: error.message 
      });
      throw new ValidationException(`Validation failed: ${error.message}`);
    }
  }

  async validatePlan(plan) {
    const results = [];
    let overallAllowed = true;
    let maxRiskLevel = 'none';

    for (const step of plan.steps) {
      const result = await this.validateStep(step);
      results.push(result);
      
      if (!result.allowed) {
        overallAllowed = false;
      }
      
      maxRiskLevel = this._getHigherRiskLevel(maxRiskLevel, result.riskLevel);
    }

    return {
      allowed: overallAllowed,
      riskLevel: maxRiskLevel,
      stepResults: results,
      summary: this._generateValidationSummary(results)
    };
  }

  async _loadDenylist() {
    try {
      const denylistPath = path.join(__dirname, '../config/denylist.yaml');
      const denylistContent = await fs.readFile(denylistPath, 'utf8');
      this.denylist = yaml.parse(denylistContent);
    } catch (error) {
      // If denylist file doesn't exist, use default rules
      this.denylist = this._getDefaultDenylist();
      this.logger.warn('Using default denylist rules', { error: error.message });
    }
  }

  _checkDenylist(command) {
    const result = { allowed: true, reasons: [] };
    
    if (!this.denylist) {
      return result;
    }

    // Check for exact matches first
    if (this.denylist.commands) {
      for (const blockedCmd of this.denylist.commands) {
        if (command.includes(blockedCmd)) {
          result.allowed = false;
          result.reasons.push(`That command is blocked: ${blockedCmd}`);
        }
      }
    }

    // Then check patterns
    if (this.denylist.patterns) {
      for (const pattern of this.denylist.patterns) {
        try {
          const regex = new RegExp(pattern, 'i');
          if (regex.test(command)) {
            result.allowed = false;
            result.reasons.push(`Matches a dangerous pattern`);
          }
        } catch (error) {
          this.logger.warn(`Bad regex pattern: ${pattern}`);
        }
      }
    }

    return result;
  }

  _analyzeRiskLevel(command) {
    const warnings = [];
    let level = 'none';

    // File operations
    if (/\b(rm|del|delete|mv|move)\b/i.test(command)) {
      level = 'low';
      if (/\b(rm\s+-rf|del\s+\/[qsf])\b/i.test(command)) {
        level = 'high';
        warnings.push('Destructive file operation detected');
      }
    }

    // Copy operations
    if (/\b(cp|copy)\b/i.test(command)) {
      level = 'low';
    }

    // System operations
    if (/\b(sudo|su|chmod|chown|systemctl|service)\b/i.test(command)) {
      level = 'high';
      warnings.push('System-level operation detected');
    }

    // Network operations
    if (/\b(curl|wget|ssh|scp|rsync)\b/i.test(command)) {
      level = 'medium';
      if (/\|\s*(bash|sh|zsh|fish)\b/i.test(command)) {
        level = 'high';
        warnings.push('Network download with shell execution detected');
      }
    }

    // Package managers
    if (/\b(apt|yum|dnf|pacman|brew|npm|pip|gem)\s+(install|add)\b/i.test(command)) {
      level = 'medium';
      warnings.push('Package installation detected');
    }

    // Process operations
    if (/\b(kill|killall|pkill)\b/i.test(command)) {
      level = 'medium';
      if (/kill\s+-9\s+-1/i.test(command)) {
        level = 'high';
        warnings.push('System-wide process termination detected');
      }
    }

    // Git operations
    if (/\bgit\s+(reset|clean)\b/i.test(command)) {
      level = 'medium';
      if (/git\s+(reset\s+--hard|clean\s+-fd)/i.test(command)) {
        level = 'high';
        warnings.push('Destructive git operation detected');
      }
    }

    return { level, warnings };
  }

  _checkHighRiskOperations(command) {
    const highRiskPatterns = [
      { pattern: /\bformat\s+[A-Z]:/i, warning: 'Disk formatting operation' },
      { pattern: /\bfdisk\b/i, warning: 'Disk partitioning operation' },
      { pattern: /\bmkfs\b/i, warning: 'Filesystem creation operation' },
      { pattern: /\bdd\s+if=.*of=\/dev\//i, warning: 'Direct disk write operation' },
      { pattern: /\bchmod\s+777\b/i, warning: 'Overly permissive file permissions' },
      { pattern: /\brm\s+-rf\s+\/\b/i, warning: 'Root filesystem deletion attempt' },
      { pattern: /\bshred\b/i, warning: 'Secure file deletion operation' },
      { pattern: /\bwipe\b/i, warning: 'Disk wiping operation' },
      { pattern: /:\(\)\{\s*:\|\:&\s*\};:/i, warning: 'Fork bomb detected' },
      { pattern: /while\s+true.*do/i, warning: 'Infinite loop detected' }
    ];

    const warnings = [];
    let isHighRisk = false;

    for (const { pattern, warning } of highRiskPatterns) {
      if (pattern.test(command)) {
        isHighRisk = true;
        warnings.push(warning);
      }
    }

    // Check if command is in high-risk list from denylist
    if (this.denylist?.highRisk) {
      for (const riskCmd of this.denylist.highRisk) {
        if (command.includes(riskCmd)) {
          isHighRisk = true;
          warnings.push(`High-risk operation: ${riskCmd}`);
        }
      }
    }

    return { isHighRisk, warnings };
  }

  _generateSuggestions(command, riskLevel) {
    const suggestions = [];

    if (riskLevel === 'high') {
      if (command.includes('rm -rf')) {
        suggestions.push('Consider using a safer deletion method or backup first');
      }
      if (command.includes('sudo')) {
        suggestions.push('Verify this system operation is necessary');
      }
    }

    if (command.includes('curl') && command.includes('|')) {
      suggestions.push('Download and inspect scripts before executing');
    }

    if (command.includes('chmod 777')) {
      suggestions.push('Use more restrictive permissions like 755 or 644');
    }

    return suggestions;
  }

  _getHigherRiskLevel(level1, level2) {
    const levels = { none: 0, low: 1, medium: 2, high: 3 };
    const value1 = levels[level1] || 1;
    const value2 = levels[level2] || 1;
    const maxValue = Math.max(value1, value2);
    return Object.keys(levels).find(key => levels[key] === maxValue) || 'low';
  }

  _generateValidationSummary(results) {
    const blocked = results.filter(r => !r.allowed).length;
    const warnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
    const highRisk = results.filter(r => r.riskLevel === 'high').length;
    const requiresConfirmation = results.filter(r => r.requiresConfirmation).length;

    return {
      totalSteps: results.length,
      blockedSteps: blocked,
      totalWarnings: warnings,
      highRiskSteps: highRisk,
      confirmationRequired: requiresConfirmation,
      overallSafe: blocked === 0 && highRisk === 0
    };
  }

  _getDefaultDenylist() {
    return {
      commands: [
        'rm -rf /',
        'rm -rf /*',
        'rm -rf ~',
        'rm -rf $HOME',
        'dd if=/dev/zero',
        'mkfs',
        'fdisk',
        'parted',
        'sudo rm',
        'chmod 777',
        'curl | bash',
        'wget | sh',
        'format',
        'del /q /s'
      ],
      patterns: [
        'rm\\s+-rf\\s+/',
        'chmod\\s+777\\s+',
        '\\|\\s*bash',
        '\\|\\s*sh',
        '>/dev/sd[a-z]',
        'format\\s+[A-Z]:',
        'del\\s+/[qsf]'
      ],
      highRisk: [
        'git reset --hard',
        'git clean -fd',
        'docker system prune',
        'npm ci',
        'mvn clean',
        'gradle clean',
        'truncate',
        'shred'
      ]
    };
  }
}