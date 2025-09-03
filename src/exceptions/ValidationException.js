export class ValidationException extends Error {
  constructor(message, command = null, riskLevel = null, blockedReasons = []) {
    super(message);
    this.name = 'ValidationException';
    this.command = command;
    this.riskLevel = riskLevel;
    this.blockedReasons = Array.isArray(blockedReasons) ? blockedReasons : [blockedReasons].filter(Boolean);
    this.timestamp = new Date().toISOString();
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationException);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      command: this.command,
      riskLevel: this.riskLevel,
      blockedReasons: this.blockedReasons,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }

  toString() {
    let result = `${this.name}: ${this.message}`;
    if (this.command) {
      result += ` (Command: ${this.command})`;
    }
    if (this.riskLevel) {
      result += ` (Risk Level: ${this.riskLevel})`;
    }
    if (this.blockedReasons.length > 0) {
      result += ` (Blocked: ${this.blockedReasons.join(', ')})`;
    }
    return result;
  }

  static isSecurityViolation(error) {
    if (!(error instanceof ValidationException)) {return false;}
    
    const message = error.message.toLowerCase();
    return message.includes('security') || 
           message.includes('blocked') || 
           message.includes('denied');
  }

  static isHighRiskOperation(error) {
    if (!(error instanceof ValidationException)) {return false;}
    return error.riskLevel === 'high';
  }

  static isDenylistViolation(error) {
    if (!(error instanceof ValidationException)) {return false;}
    
    return error.blockedReasons.some(reason => 
      reason.toLowerCase().includes('blocked') || 
      reason.toLowerCase().includes('pattern')
    );
  }

  addBlockedReason(reason) {
    if (reason && !this.blockedReasons.includes(reason)) {
      this.blockedReasons.push(reason);
    }
  }

  hasBlockedReasons() {
    return this.blockedReasons.length > 0;
  }
}