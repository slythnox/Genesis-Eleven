export class ValidationResult {
  constructor(data) {
    this.stepId = data.stepId;
    this.command = data.command;
    this.allowed = data.allowed || false;
    this.riskLevel = data.riskLevel || 'low';
    this.warnings = data.warnings || [];
    this.blockedReasons = data.blockedReasons || [];
    this.requiresConfirmation = data.requiresConfirmation || false;
    this.suggestions = data.suggestions || [];
    this.timestamp = new Date();
    this.confidence = data.confidence || 0.8; // AI confidence in assessment
  }

  toJSON() {
    return {
      stepId: this.stepId,
      command: this.command,
      allowed: this.allowed,
      riskLevel: this.riskLevel,
      warnings: this.warnings,
      blockedReasons: this.blockedReasons,
      requiresConfirmation: this.requiresConfirmation,
      suggestions: this.suggestions,
      confidence: this.confidence,
      timestamp: this.timestamp.toISOString()
    };
  }

  toString() {
    const statusEmoji = this.allowed ? '✅' : '❌';
    const riskEmoji = {
      none: '🟢',
      low: '🔵',
      medium: '🟡', 
      high: '🔴'
    };

    let output = `${statusEmoji} Validation for Step ${this.stepId}: ${this.allowed ? 'ALLOWED' : 'BLOCKED'}\n`;
    output += `💻 Command: ${this.command}\n`;
    output += `${riskEmoji[this.riskLevel] || '⚪'} Risk Level: ${this.riskLevel.toUpperCase()}\n`;
    output += `🎯 Confidence: ${Math.round(this.confidence * 100)}%\n`;
    
    if (this.requiresConfirmation) {
      output += `⚠️  Requires Confirmation: Yes\n`;
    }
    
    if (this.warnings.length > 0) {
      output += `⚠️  Warnings:\n`;
      this.warnings.forEach(warning => {
        output += `  • ${warning}\n`;
      });
    }
    
    if (this.blockedReasons.length > 0) {
      output += `❌ Blocked Reasons:\n`;
      this.blockedReasons.forEach(reason => {
        output += `  • ${reason}\n`;
      });
    }
    
    if (this.suggestions.length > 0) {
      output += `💡 Suggestions:\n`;
      this.suggestions.forEach(suggestion => {
        output += `  • ${suggestion}\n`;
      });
    }
    
    return output;
  }

  hasWarnings() {
    return this.warnings.length > 0;
  }

  isBlocked() {
    return !this.allowed;
  }

  isHighRisk() {
    return this.riskLevel === 'high';
  }

  addWarning(warning) {
    if (warning && !this.warnings.includes(warning)) {
      this.warnings.push(warning);
    }
  }

  addBlockedReason(reason) {
    if (reason && !this.blockedReasons.includes(reason)) {
      this.blockedReasons.push(reason);
      this.allowed = false;
    }
  }

  addSuggestion(suggestion) {
    if (suggestion && !this.suggestions.includes(suggestion)) {
      this.suggestions.push(suggestion);
    }
  }
}