export class SandboxException extends Error {
  constructor(message, exitCode = null, command = null, workingDirectory = null) {
    super(message);
    this.name = 'SandboxException';
    this.exitCode = exitCode;
    this.command = command;
    this.workingDirectory = workingDirectory;
    this.timestamp = new Date().toISOString();
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SandboxException);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      exitCode: this.exitCode,
      command: this.command,
      workingDirectory: this.workingDirectory,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }

  toString() {
    let result = `${this.name}: ${this.message}`;
    if (this.command) {
      result += ` (Command: ${this.command})`;
    }
    if (this.exitCode !== null) {
      result += ` (Exit Code: ${this.exitCode})`;
    }
    return result;
  }

  static isTimeoutError(error) {
    if (!(error instanceof SandboxException)) {return false;}
    return error.message.toLowerCase().includes('timeout');
  }

  static isPermissionError(error) {
    if (!(error instanceof SandboxException)) {return false;}
    
    const message = error.message.toLowerCase();
    return message.includes('permission') || 
           message.includes('access denied') || 
           error.exitCode === 126;
  }

  static isCommandNotFoundError(error) {
    if (!(error instanceof SandboxException)) {return false;}
    
    const message = error.message.toLowerCase();
    return message.includes('command not found') || 
           message.includes('not found') || 
           error.exitCode === 127;
  }

  static isMemoryError(error) {
    if (!(error instanceof SandboxException)) {return false;}
    
    const message = error.message.toLowerCase();
    return message.includes('memory') || 
           message.includes('out of memory') || 
           error.exitCode === 137; // SIGKILL due to OOM
  }
}