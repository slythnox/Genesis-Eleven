import os from 'os';
import path from 'path';

export class PlatformUtils {
  static getPlatform() {
    return process.platform;
  }

  static isWindows() {
    return process.platform === 'win32';
  }

  static isMacOS() {
    return process.platform === 'darwin';
  }

  static isLinux() {
    return process.platform === 'linux';
  }

  static getShell() {
    if (this.isWindows()) {
      return process.env.COMSPEC || 'cmd.exe';
    }
    return process.env.SHELL || '/bin/bash';
  }

  static getHomeDirectory() {
    return os.homedir();
  }

  static getTempDirectory() {
    return os.tmpdir();
  }

  static normalizeCommand(command) {
    if (!command) return command;

    // Platform-specific command normalization
    if (this.isWindows()) {
      return this._normalizeWindowsCommand(command);
    } else if (this.isMacOS()) {
      return this._normalizeMacOSCommand(command);
    } else {
      return this._normalizeLinuxCommand(command);
    }
  }

  static _normalizeWindowsCommand(command) {
    const replacements = {
      'ls': 'dir',
      'ls -la': 'dir /a',
      'ls -l': 'dir',
      'cat': 'type',
      'rm': 'del',
      'mv': 'move',
      'cp': 'copy',
      'mkdir -p': 'mkdir',
      'touch': 'echo. >',
      'which': 'where',
      'ps': 'tasklist',
      'kill': 'taskkill /pid',
      'killall': 'taskkill /im'
    };

    let normalizedCommand = command;
    for (const [unixCmd, windowsCmd] of Object.entries(replacements)) {
      const regex = new RegExp(`\\b${unixCmd}\\b`, 'g');
      normalizedCommand = normalizedCommand.replace(regex, windowsCmd);
    }

    return normalizedCommand;
  }

  static _normalizeMacOSCommand(command) {
    // macOS-specific normalizations
    const replacements = {
      'xdg-open': 'open',
      'gnome-open': 'open',
      'kde-open': 'open'
    };

    let normalizedCommand = command;
    for (const [genericCmd, macCmd] of Object.entries(replacements)) {
      const regex = new RegExp(`\\b${genericCmd}\\b`, 'g');
      normalizedCommand = normalizedCommand.replace(regex, macCmd);
    }

    return normalizedCommand;
  }

  static _normalizeLinuxCommand(command) {
    // Linux-specific normalizations
    const replacements = {
      'open': 'xdg-open',
      'start': 'xdg-open'
    };

    let normalizedCommand = command;
    for (const [genericCmd, linuxCmd] of Object.entries(replacements)) {
      const regex = new RegExp(`\\b${genericCmd}\\b`, 'g');
      normalizedCommand = normalizedCommand.replace(regex, linuxCmd);
    }

    return normalizedCommand;
  }

  static getDefaultApplications() {
    if (this.isWindows()) {
      return {
        textEditor: 'notepad',
        fileManager: 'explorer',
        terminal: 'cmd',
        browser: 'start',
        calculator: 'calc'
      };
    } else if (this.isMacOS()) {
      return {
        textEditor: 'open -a TextEdit',
        fileManager: 'open',
        terminal: 'open -a Terminal',
        browser: 'open -a Safari',
        calculator: 'open -a Calculator'
      };
    } else {
      return {
        textEditor: 'xdg-open',
        fileManager: 'xdg-open',
        terminal: 'gnome-terminal',
        browser: 'xdg-open',
        calculator: 'gnome-calculator'
      };
    }
  }

  static getPathSeparator() {
    return path.sep;
  }

  static joinPath(...parts) {
    return path.join(...parts);
  }

  static resolvePath(filePath) {
    return path.resolve(filePath);
  }

  static getExecutableExtension() {
    return this.isWindows() ? '.exe' : '';
  }

  static formatPath(filePath) {
    if (this.isWindows()) {
      return filePath.replace(/\//g, '\\');
    }
    return filePath.replace(/\\/g, '/');
  }
}