import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { ConfigManager } from '../utils/ConfigManager.js';
import { LoggingUtil } from '../utils/LoggingUtil.js';
import { ExecutionResult } from '../models/ExecutionResult.js';
import { SandboxException } from '../exceptions/SandboxException.js';

export class SandboxExecutor {
  constructor() {
    this.config = ConfigManager.getInstance();
    this.logger = LoggingUtil.getInstance();
    this.workDir = this.config.get('sandbox.workdir', path.join(os.tmpdir(), 'genesis-eleven-work'));
    this.timeout = this.config.get('sandbox.timeout', 30000);
    this.maxMemoryMB = this.config.get('sandbox.maxMemoryMB', 512);
    this.initialized = false;
  }

  async initialize() {
    try {
      // Ensure work directory exists
      await fs.mkdir(this.workDir, { recursive: true });
      
      // Set up sandbox environment
      await this._setupSandboxEnvironment();
      
      this.initialized = true;
      this.logger.info('Sandbox initialized', { workDir: this.workDir });
    } catch (error) {
      throw new SandboxException(`Failed to initialize sandbox: ${error.message}`);
    }
  }

  async executeStep(step) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      this.logger.info('Executing step', { stepId: step.id, command: step.command });

      const startTime = Date.now();
      const workingDir = step.workingDirectory || this.workDir;

      // Validate working directory
      await this._validateWorkingDirectory(workingDir);

      const result = await this._runCommand(step.command, workingDir);
      const duration = Date.now() - startTime;

      const executionResult = new ExecutionResult({
        stepId: step.id,
        command: step.command,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        duration,
        workingDirectory: workingDir,
        success: result.exitCode === 0
      });

      this.logger.info('Step execution completed', {
        stepId: step.id,
        success: executionResult.success,
        duration
      });

      return executionResult;
    } catch (error) {
      this.logger.error('Step execution failed', { 
        stepId: step.id, 
        error: error.message 
      });
      
      return new ExecutionResult({
        stepId: step.id,
        command: step.command,
        exitCode: -1,
        stdout: '',
        stderr: error.message,
        duration: 0,
        workingDirectory: step.workingDirectory || this.workDir,
        success: false,
        error: error.message
      });
    }
  }

  async _runCommand(command, workingDir) {
    return new Promise((resolve, reject) => {
      // Parse command safely
      const parsedCommand = this._parseCommand(command);
      if (!parsedCommand) {
        reject(new SandboxException('Invalid command format'));
        return;
      }

      const { cmd, args } = parsedCommand;
      
      const child = spawn(cmd, args, {
        cwd: workingDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: this._getSandboxEnvironment(),
        timeout: this.timeout,
        shell: process.platform === 'win32' // Use shell on Windows
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (exitCode) => {
        resolve({
          exitCode: exitCode || 0,
          stdout: stdout.trim(),
          stderr: stderr.trim()
        });
      });

      child.on('error', (error) => {
        reject(new SandboxException(`Command execution failed: ${error.message}`));
      });

      // Handle timeout
      const timeoutId = setTimeout(() => {
        if (!child.killed) {
          child.kill('SIGTERM');
          reject(new SandboxException(`Command timed out after ${this.timeout}ms`));
        }
      }, this.timeout);

      child.on('close', () => {
        clearTimeout(timeoutId);
      });
    });
  }

  _parseCommand(command) {
    if (!command || typeof command !== 'string') {
      return null;
    }

    const trimmed = command.trim();
    if (!trimmed) {
      return null;
    }

    // Simple but safe command parsing
    const parts = trimmed.split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);

    return { cmd, args };
  }

  _getSandboxEnvironment() {
    const safeEnv = {
      PATH: process.env.PATH,
      HOME: this.workDir,
      TMPDIR: path.join(this.workDir, 'tmp'),
      USER: 'genesis-eleven-user',
      SHELL: process.env.SHELL || '/bin/bash',
      LANG: process.env.LANG || 'en_US.UTF-8',
      NODE_ENV: 'sandbox'
    };

    // Add platform-specific variables
    if (process.platform === 'win32') {
      safeEnv.USERPROFILE = this.workDir;
      safeEnv.TEMP = path.join(this.workDir, 'tmp');
      safeEnv.TMP = path.join(this.workDir, 'tmp');
    }

    return safeEnv;
  }

  async _setupSandboxEnvironment() {
    // Create necessary subdirectories
    const dirs = ['tmp', 'logs', 'workspace', 'backup'];
    
    for (const dir of dirs) {
      await fs.mkdir(path.join(this.workDir, dir), { recursive: true });
    }

    // Create basic configuration files
    const bashrc = path.join(this.workDir, '.bashrc');
    if (!(await this._fileExists(bashrc))) {
      const bashrcContent = `# Genesis Eleven CLI Sandbox Environment
export PS1="genesis-eleven$ "
export GENESIS_ELEVEN_SANDBOX=1
alias ll='ls -la'
alias la='ls -A'
`;
      await fs.writeFile(bashrc, bashrcContent);
    }
  }

  async _validateWorkingDirectory(workingDir) {
    try {
      // Ensure the directory exists
      await fs.mkdir(workingDir, { recursive: true });
      
      // Check if it's within allowed paths
      const resolvedPath = path.resolve(workingDir);
      const allowedPaths = [
        path.resolve(this.workDir),
        path.resolve(process.cwd()),
        path.resolve(os.homedir()),
        path.resolve(os.tmpdir())
      ];

      const isAllowed = allowedPaths.some(allowedPath => 
        resolvedPath.startsWith(allowedPath)
      );

      if (!isAllowed) {
        throw new SandboxException(`Working directory not allowed: ${workingDir}`);
      }

      // Check directory permissions
      await fs.access(resolvedPath, fs.constants.R_OK | fs.constants.W_OK);
      
    } catch (error) {
      throw new SandboxException(`Invalid working directory: ${error.message}`);
    }
  }

  async _fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async cleanup() {
    try {
      // Clean up temporary files older than 1 hour
      const tmpDir = path.join(this.workDir, 'tmp');
      
      if (await this._fileExists(tmpDir)) {
        const files = await fs.readdir(tmpDir);
        const oneHourAgo = Date.now() - (60 * 60 * 1000);

        for (const file of files) {
          try {
            const filePath = path.join(tmpDir, file);
            const stats = await fs.stat(filePath);
            
            if (stats.mtime.getTime() < oneHourAgo) {
              await fs.unlink(filePath);
            }
          } catch (error) {
            // Continue cleanup even if individual file fails
            this.logger.warn('Failed to clean up file', { file, error: error.message });
          }
        }
      }

      this.logger.info('Sandbox cleanup completed');
    } catch (error) {
      this.logger.warn('Sandbox cleanup failed', { error: error.message });
    }
  }

  getStats() {
    return {
      workDir: this.workDir,
      timeout: this.timeout,
      maxMemoryMB: this.maxMemoryMB,
      initialized: this.initialized
    };
  }
}