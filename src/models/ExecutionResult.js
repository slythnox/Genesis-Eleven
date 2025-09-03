export class ExecutionResult {
  constructor(data) {
    this.stepId = data.stepId;
    this.command = data.command;
    this.exitCode = data.exitCode;
    this.stdout = data.stdout || '';
    this.stderr = data.stderr || '';
    this.duration = data.duration || 0;
    this.workingDirectory = data.workingDirectory;
    this.success = data.success || false;
    this.error = data.error || null;
    this.timestamp = new Date();
    this.memoryUsage = data.memoryUsage || null;
  }

  toJSON() {
    return {
      stepId: this.stepId,
      command: this.command,
      exitCode: this.exitCode,
      stdout: this.stdout,
      stderr: this.stderr,
      duration: this.duration,
      workingDirectory: this.workingDirectory,
      success: this.success,
      error: this.error,
      memoryUsage: this.memoryUsage,
      timestamp: this.timestamp.toISOString()
    };
  }

  toString() {
    const statusEmoji = this.success ? '✅' : '❌';
    let output = `${statusEmoji} ${this.success ? 'Worked' : 'Failed'}: ${this.stepId}\n`;
    output += `Command: ${this.command}\n`;
    
    if (!this.success) {
      output += `Exit code: ${this.exitCode}\n`;
    }
    
    if (this.duration > 1000) {
      output += `Took: ${Math.round(this.duration / 1000)}s\n`;
    }
    
    if (this.stdout) {
      output += `Output: ${this._truncateOutput(this.stdout)}\n`;
    }
    
    if (this.stderr) {
      output += `Error: ${this._truncateOutput(this.stderr)}\n`;
    }
    
    if (this.error) {
      output += `Problem: ${this.error}\n`;
    }
    
    return output;
  }

  getFormattedOutput() {
    if (this.success && this.stdout) {
      return this.stdout;
    } else if (!this.success && this.stderr) {
      return this.stderr;
    } else if (this.error) {
      return this.error;
    }
    return 'No output';
  }

  _truncateOutput(output, maxLength = 500) {
    if (!output || output.length <= maxLength) {
      return output;
    }
    return output.substring(0, maxLength) + '\n... (output truncated)';
  }

  hasOutput() {
    return !!(this.stdout || this.stderr);
  }

  isTimeout() {
    return this.error && this.error.includes('timeout');
  }

  isPermissionError() {
    return this.exitCode === 126 || 
           (this.stderr && this.stderr.toLowerCase().includes('permission'));
  }

  isCommandNotFound() {
    return this.exitCode === 127 || 
           (this.stderr && this.stderr.toLowerCase().includes('command not found'));
  }
}