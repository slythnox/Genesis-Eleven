export class Plan {
  constructor(data) {
    this.intent = data.intent;
    this.steps = data.steps.map(step => new Step(step));
    this.riskLevel = data.riskLevel || 'low';
    this.rollback = data.rollback || 'No automatic rollback available';
    this.estimatedDuration = data.estimatedDuration || 'Unknown';
    this.prerequisites = data.prerequisites || [];
    this.createdAt = new Date();
    this.id = this._generateId();
  }

  _generateId() {
    return `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getHighRiskSteps() {
    return this.steps.filter(step => step.riskLevel === 'high');
  }

  getStepsRequiringConfirmation() {
    return this.steps.filter(step => step.requiresConfirmation);
  }

  getTotalEstimatedDuration() {
    const stepDurations = this.steps
      .map(step => step.estimatedDuration || 0)
      .filter(duration => typeof duration === 'number');
    
    return stepDurations.length > 0 
      ? stepDurations.reduce((sum, duration) => sum + duration, 0)
      : 0;
  }

  toJSON() {
    return {
      id: this.id,
      intent: this.intent,
      steps: this.steps.map(step => step.toJSON()),
      riskLevel: this.riskLevel,
      rollback: this.rollback,
      estimatedDuration: this.estimatedDuration,
      prerequisites: this.prerequisites,
      createdAt: this.createdAt.toISOString()
    };
  }

  toString() {
    let output = `📋 ${this.intent}\n`;
    output += `🎯 Risk Level: ${this.riskLevel.toUpperCase()}\n`;
    output += `⏱️  Estimated Duration: ${this.estimatedDuration}\n`;
    
    if (this.prerequisites.length > 0) {
      output += `📋 Prerequisites: ${this.prerequisites.join(', ')}\n`;
    }
    
    output += '\n📝 Steps:\n';
    this.steps.forEach((step, index) => {
      output += `  ${index + 1}. ${step.toString()}\n`;
    });
    
    if (this.rollback !== 'No automatic rollback available') {
      output += `\n🔄 Rollback: ${this.rollback}\n`;
    }
    
    return output;
  }
}

export class Step {
  constructor(data) {
    this.id = data.id || `step-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    this.description = data.description;
    this.command = data.command;
    this.requiresConfirmation = data.requiresConfirmation || false;
    this.riskLevel = data.riskLevel || 'low';
    this.workingDirectory = data.workingDirectory || process.cwd();
    this.timeout = data.timeout || 30000;
    this.retryCount = data.retryCount || 0;
    this.estimatedDuration = data.estimatedDuration || 0;
  }

  toJSON() {
    return {
      id: this.id,
      description: this.description,
      command: this.command,
      requiresConfirmation: this.requiresConfirmation,
      riskLevel: this.riskLevel,
      workingDirectory: this.workingDirectory,
      timeout: this.timeout,
      retryCount: this.retryCount,
      estimatedDuration: this.estimatedDuration
    };
  }

  toString() {
    let output = `${this.description}`;
    
    // Add risk indicator
    const riskEmoji = {
      none: '🟢',
      low: '🔵', 
      medium: '🟡',
      high: '🔴'
    };
    
    output += ` ${riskEmoji[this.riskLevel] || '⚪'} (${this.riskLevel} risk)`;
    
    if (this.requiresConfirmation) {
      output += ' ⚠️ [REQUIRES CONFIRMATION]';
    }
    
    output += `\n     💻 Command: ${this.command}`;
    
    if (this.workingDirectory !== process.cwd()) {
      output += `\n     📁 Working Directory: ${this.workingDirectory}`;
    }
    
    if (this.estimatedDuration > 0) {
      output += `\n     ⏱️  Estimated Duration: ${this.estimatedDuration}ms`;
    }
    
    return output;
  }
}