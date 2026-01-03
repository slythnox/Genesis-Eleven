# Genesis Eleven CLI - AI-Powered Desktop Control

**Genesis Eleven CLI** is a smart command-line tool that lets you control your computer using plain English. Tell it what you want to do, and it figures out the commands to make it happen. Want to organize your files? Just say so. Need to open an app? Ask away. It's like having a conversation with your computer.

## ✨ Key Features

- 🧠 **Talk to Your Computer** - Use normal language instead of memorizing commands
- 🖥️ **Control Everything** - Files, apps, settings, you name it
- 🌍 **Works Everywhere** - Full support for Windows, macOS, and Linux
- 🛡️ **Stay Safe** - Won't let you accidentally break anything
- 📋 **See Before You Do** - Shows you what it plans to do first
- ⚡ **Handle Complex Stuff** - Can do multiple things in sequence
- 🔄 **Never Get Stuck** - Switches API keys if one gets rate limited
- 📊 **Keep Track** - Logs everything so you know what happened
- 🎯 **Smart About Risk** - Knows what's dangerous and what's not
- 🔧 **Runs Safely** - Everything happens in a protected environment

## 🚀 Quick Start

### Installation

```bash
# Clone and install
git clone https://github.com/slythnox/genesis-eleven-cli
cd genesis-eleven-cli
npm install

# Make globally available
npm link

# Configure API key
el config

# Test installation
el ask "Hello, are you working?"
```

### System Requirements

- **Node.js 18+** - Required for all platforms
- **Windows 10/11** - Full support with cmd.exe and PowerShell
- **macOS 10.15+** - Native Unix command support
- **Linux** - Any modern distribution with bash/zsh
- **Internet Connection** - Required for Gemini AI API

### Getting Your API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Create API key" or "Get API key"
3. Copy the generated key
4. Run `el config` and follow the prompts

## 📖 Usage Examples

### Desktop Control

```bash
# File and folder management
el "move all photos from Downloads to Pictures folder"
el "create a backup of my Documents folder"
el "find and delete duplicate files in my Downloads"
el "organize my Desktop by file type"

# Application control
el "open Spotify and play my liked songs"
el "close all browser windows except the current one"
el "launch Visual Studio Code with my project folder"
el "take a screenshot and save it to Desktop"

# System settings
el "change wallpaper to a nature image"
el "set brightness to 50%"
el "increase volume by 20%"
el "enable dark mode"
el "connect to my home WiFi network"

# Platform-specific examples
# Windows
el "open Control Panel and show installed programs"
el "check Windows Update status"
el "open Task Manager"

# macOS  
el "open System Preferences and show display settings"
el "show all running applications in Activity Monitor"
el "enable Night Shift mode"

# Linux
el "open file manager and navigate to home directory"
el "show system information using neofetch"
el "update package repositories"
```

### Automation Workflows

```bash
# Development workflows
el "open my project, start the dev server, and launch browser"
el "commit all changes with message 'daily update' and push to main"
el "run all tests and generate coverage report"

# Daily routines
el "organize Downloads, empty Trash, and update all apps"
el "backup important files and clean temporary folders"
el "check system updates and install if available"

# Content creation
el "resize all images in this folder to 1920x1080"
el "convert all videos to MP4 format"
el "compress PDFs in Documents folder"
```

### Interactive Commands

```bash
# Ask questions
el ask "How do I optimize my system performance?"
el ask "What's taking up the most disk space?"

# Plan without executing
el plan "clean up my entire system and optimize performance"

# Validate commands for safety
el validate "rm -rf temp/"

# Check system status
el status --test-api
```

### Advanced Usage

```bash
# Auto-approve all steps (use carefully)
el -y "update all applications to latest versions"

# Verbose output with detailed logging
el -v "optimize system performance and clean storage"

# Plan-only mode for review
el -p "automate my morning routine setup"

# Test API connectivity
el config --test
```

## 🏗️ Architecture

### Project Structure

```
genesis-eleven-cli/
├── bin/
│   └── el.js                 # CLI entry point
├── src/
│   ├── api/
│   │   └── GeminiClient.js   # Gemini AI integration
│   ├── commands/             # CLI command handlers
│   │   ├── ask.js           # Quick Q&A
│   │   ├── config.js        # Configuration management
│   │   ├── execute.js       # Command execution
│   │   ├── plan.js          # Plan generation
│   │   ├── status.js        # System status
│   │   └── validate.js      # Security validation
│   ├── core/                # Core business logic
│   │   ├── Planner.js       # Natural language → plans
│   │   ├── SandboxExecutor.js # Safe command execution
│   │   └── Validator.js     # Security validation
│   ├── exceptions/          # Custom error types
│   │   ├── ApiException.js
│   │   ├── SandboxException.js
│   │   └── ValidationException.js
│   ├── models/              # Data structures
│   │   ├── ExecutionResult.js
│   │   ├── Plan.js
│   │   └── ValidationResult.js
│   ├── utils/               # Utilities
│   │   ├── ConfigManager.js # Configuration handling
│   │   └── LoggingUtil.js   # Structured logging
│   └── config/
│       └── denylist.yaml    # Security rules
└── logs/                    # Execution logs
```

### Execution Flow

1. **Natural Language Input** → User describes desired desktop action
2. **AI Planning** → Gemini converts request to structured plan
3. **Security Validation** → Multi-layer safety checks
4. **User Approval** → Review and approve risky operations
5. **Sandboxed Execution** → Run commands in controlled environment
6. **Results & Audit** → Display results and log everything

## 🖥️ Desktop Control Capabilities

### File & Folder Operations
- Move, copy, rename, and organize files
- Create backups and archives
- Find and remove duplicates
- Batch file operations and conversions

### Application Management
- Launch and close applications
- Switch between windows and workspaces
- Automate application workflows
- Manage startup programs

### System Settings
- Adjust display settings (brightness, resolution)
- Control audio (volume, output device)
- Change wallpapers and themes
- Manage network connections
- Configure system preferences

### Automation & Workflows
- Create custom automation sequences
- Schedule recurring tasks
- Simulate keyboard and mouse actions
- Integrate multiple system operations

## 🛡️ Security Features

### Multi-Layer Protection

- **Denylist Filtering** - Blocks dangerous commands and patterns
- **Risk Assessment** - Categorizes operations by safety level
- **User Confirmation** - Requires approval for high-risk operations
- **Sandboxed Execution** - Isolated execution environment
- **Comprehensive Audit** - Complete trail of all operations

### Risk Categories

| Level | Description | Examples |
|-------|-------------|----------|
| **None** | Safe read-only operations | `ls`, `cat`, `echo`, `pwd` |
| **Low** | File operations in user directories | `mkdir`, `cp`, `mv` in home |
| **Medium** | System configuration, installations | Application launches, settings changes |
| **High** | Destructive or system-wide changes | `rm -rf`, system modifications |

## ⚙️ Configuration

### Interactive Setup

```bash
# Full interactive configuration
el config

# Quick API key setup
el config --key YOUR_API_KEY

# Add additional keys for rotation
el config --add ADDITIONAL_KEY

# Enable key rotation
el config --rotate

# Test configuration
el config --test
```

### Configuration Options

```json
{
  "gemini": {
    "model": "gemini-1.5-flash",
    "apiKeys": "your-api-keys-here",
    "timeout": 30000,
    "maxRetries": 3,
    "enableRotation": false
  },
  "sandbox": {
    "workdir": "/tmp/genesis-work",
    "timeout": 30000,
    "maxMemoryMB": 512
  },
  "security": {
    "requireConfirmation": true,
    "allowHighRisk": false
  },
  "logging": {
    "level": "info",
    "auditEnabled": true,
    "auditDir": "logs"
  }
}
```

## 📊 Monitoring & Logging

### Execution Tracking

Every operation is logged with complete details:

```json
{
  "taskId": "task-1703123456789-abc123",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "userQuery": "organize photos by date",
  "plan": { /* execution plan */ },
  "validationResult": { /* security validation */ },
  "executionResults": [ /* step results */ ],
  "status": "success"
}
```

### Monitoring Commands

```bash
# System health check
el status

# Test API connectivity
el status --test-api

# View recent executions
el logs --recent 10

# Clean old logs
el logs --clean 30
```

## 🎯 Real-World Examples

### Desktop Automation

```bash
el "set up my morning workspace: open email, calendar, and todo app"
el "organize my Desktop and Downloads folders"
el "change to dark mode and set volume to 30%"
el "take a screenshot of my current screen"
```

### File Management

```bash
el "move all photos from last month to Photos/2024/January"
el "compress all videos in Downloads to save space"
el "find and remove duplicate music files"
el "backup my Documents folder to external drive"
```

### System Control

```bash
el "adjust screen brightness for evening work"
el "switch to my presentation display setup"
el "enable Do Not Disturb mode for 2 hours"
el "clean up system cache and temporary files"
```

### Application Workflows

```bash
el "open my development environment with VS Code, terminal, and browser"
el "close all social media apps and enable focus mode"
el "launch my video editing workflow with required applications"
el "set up my streaming setup with OBS and audio tools"
```

## 🔧 Development

### Running Tests

```bash
# Install dependencies
npm install

# Run test suite
npm test

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes with tests
4. Run the test suite: `npm test`
5. Submit a pull request

## 🚨 Safety Guidelines

### Best Practices

1. **Always Review Plans** - Check execution plans before approval
2. **Start with Simple Commands** - Test with low-risk operations first
3. **Use Plan Mode** - Use `--plan-only` for complex operations
4. **Backup Important Data** - Ensure backups before destructive operations
5. **Monitor Execution Logs** - Regularly check audit trails

### What Genesis Eleven Won't Do

- Execute commands without user approval for high-risk operations
- Bypass security validations or denylist rules
- Run commands outside the configured sandbox environment
- Execute anything that matches security patterns
- Operate without proper API key configuration
- Perform destructive operations without explicit confirmation

## 🤝 Support & Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| API key errors | Run `el config --test` to validate keys |
| Rate limit exceeded | Add multiple API keys: `el config --add KEY` |
| Permission errors | Check sandbox directory permissions |
| Command blocked | Review security settings and denylist |
| High memory usage | Adjust sandbox limits in configuration |

### Getting Help

```bash
# Command help
el --help
el <command> --help

# System status
el status

# Configuration check
el config --show

# Recent activity
el logs --recent
```

### Debug Mode

```bash
# Enable verbose logging
NODE_ENV=development el -v "your command"

# Check configuration
el config --show

# Test API connectivity
el config --test
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Gemini AI** - Providing advanced AI capabilities
- **Node.js Community** - Excellent tooling and ecosystem
- **Security Community** - Best practices for safe command execution

---

**Built with ❤️ by slythnox**

*Genesis Eleven CLI - Your AI-powered desktop companion*
