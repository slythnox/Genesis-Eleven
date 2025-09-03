export class ApiException extends Error {
  constructor(message, statusCode = null, response = null) {
    super(message);
    this.name = 'ApiException';
    this.statusCode = statusCode;
    this.response = response;
    this.timestamp = new Date().toISOString();
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiException);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }

  toString() {
    let result = `${this.name}: ${this.message}`;
    if (this.statusCode) {
      result += ` (Status: ${this.statusCode})`;
    }
    return result;
  }

  static isRateLimitError(error) {
    if (!(error instanceof ApiException)) {return false;}
    
    const message = error.message.toLowerCase();
    return message.includes('rate limit') || 
           message.includes('quota') || 
           error.statusCode === 429;
  }

  static isAuthenticationError(error) {
    if (!(error instanceof ApiException)) {return false;}
    
    const message = error.message.toLowerCase();
    return message.includes('unauthorized') || 
           message.includes('invalid api key') || 
           error.statusCode === 401;
  }

  static isNetworkError(error) {
    if (!(error instanceof ApiException)) {return false;}
    
    const message = error.message.toLowerCase();
    return message.includes('network') || 
           message.includes('timeout') || 
           message.includes('connection') ||
           [500, 502, 503, 504].includes(error.statusCode);
  }
}