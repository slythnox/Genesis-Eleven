import winston from 'winston';
import { promises as fs } from 'fs';
import path from 'path';
import { ConfigManager } from './ConfigManager.js';

export class LoggingUtil {
  static instance = null;

  constructor() {
    this.config = ConfigManager.getInstance();
    this.logger = null;
    this.auditLogger = null;
    this.initialized = false;
  }

  static getInstance() {
    if (!LoggingUtil.instance) {
      LoggingUtil.instance = new LoggingUtil();
    }
    return LoggingUtil.instance;
  }

  async initialize() {
    try {
      const logLevel = this.config.get('logging.level', 'info');
      const auditDir = this.config.get('logging.auditDir', 'logs');
      
      // Ensure log directory exists
      await fs.mkdir(auditDir, { recursive: true });

      // Configure main logger
      this.logger = winston.createLogger({
        level: logLevel,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        ),
        transports: [
          new winston.transports.File({
            filename: path.join(auditDir, 'forge-cli.log'),
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5
          })
        ]
      });

      // Add console transport only in development
      if (process.env.NODE_ENV === 'development') {
        this.logger.add(new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }));
      }

      // Configure audit logger for execution tracking
      this.auditLogger = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        transports: [
          new winston.transports.File({
            filename: path.join(auditDir, 'audit.log'),
            maxsize: 50 * 1024 * 1024, // 50MB
            maxFiles: 10
          })
        ]
      });

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize logging:', error.message);
      // Fallback to console logging
      this.logger = console;
      this.auditLogger = console;
    }
  }

  async _ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  async info(message, meta = {}) {
    await this._ensureInitialized();
    this.logger.info(message, meta);
  }

  async warn(message, meta = {}) {
    await this._ensureInitialized();
    this.logger.warn(message, meta);
  }

  async error(message, meta = {}) {
    await this._ensureInitialized();
    this.logger.error(message, meta);
  }

  async debug(message, meta = {}) {
    await this._ensureInitialized();
    this.logger.debug(message, meta);
  }

  async logExecution(executionData) {
    await this._ensureInitialized();
    
    try {
      // Log to audit trail
      this.auditLogger.info('Task execution', executionData);
      
      // Also save as individual task file
      const auditDir = this.config.get('logging.auditDir', 'logs');
      await fs.mkdir(auditDir, { recursive: true });
      const taskFile = path.join(auditDir, `${executionData.taskId}.json`);
      
      await fs.writeFile(taskFile, JSON.stringify(executionData, null, 2));
      
      this.info('Execution logged', { 
        taskId: executionData.taskId,
        status: executionData.status,
        stepCount: executionData.executionResults?.length || 0
      });
    } catch (error) {
      this.error('Failed to log execution', { 
        taskId: executionData.taskId,
        error: error.message 
      });
    }
  }

  async getRecentExecutions(limit = 10) {
    await this._ensureInitialized();
    
    try {
      const auditDir = this.config.get('logging.auditDir', 'logs');
      const files = await fs.readdir(auditDir);
      
      const taskFiles = files
        .filter(file => file.startsWith('task-') && file.endsWith('.json'))
        .sort((a, b) => {
          const timeA = a.match(/task-(\d+)/)?.[1] || '0';
          const timeB = b.match(/task-(\d+)/)?.[1] || '0';
          return parseInt(timeB) - parseInt(timeA);
        })
        .slice(0, limit);

      const executions = [];
      for (const file of taskFiles) {
        try {
          const filePath = path.join(auditDir, file);
          const data = await fs.readFile(filePath, 'utf8');
          executions.push(JSON.parse(data));
        } catch (error) {
          this.warn('Failed to read execution log', { file, error: error.message });
        }
      }

      return executions;
    } catch (error) {
      this.error('Failed to get recent executions', { error: error.message });
      return [];
    }
  }

  async clearOldLogs(daysToKeep = 30) {
    await this._ensureInitialized();
    
    try {
      const auditDir = this.config.get('logging.auditDir', 'logs');
      const files = await fs.readdir(auditDir);
      const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
      
      let deletedCount = 0;
      
      for (const file of files) {
        if (file.startsWith('task-') && file.endsWith('.json')) {
          const match = file.match(/task-(\d+)/);
          if (match) {
            const timestamp = parseInt(match[1]);
            if (timestamp < cutoffTime) {
              await fs.unlink(path.join(auditDir, file));
              deletedCount++;
            }
          }
        }
      }
      
      this.info('Old logs cleaned up', { deletedCount, daysToKeep });
      return deletedCount;
    } catch (error) {
      this.error('Failed to clean up old logs', { error: error.message });
      return 0;
    }
  }
}