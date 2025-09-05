/**
 * Logging Migration Script
 * 
 * This script helps migrate console.log statements to use the new structured logger.
 * It provides analysis and semi-automated conversion capabilities.
 */

const fs = require('fs');
const path = require('path');

// Directories to scan (excluding test files, scripts, and node_modules)
const SCAN_DIRS = ['app', 'lib', 'components'];
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.next/,
  /test-/,
  /\.test\./,
  /\.spec\./,
  /scripts/,
  /migration/
];

// Console method mappings to logger methods
const CONSOLE_METHOD_MAPPINGS = {
  'console.log': 'log.info',
  'console.info': 'log.info', 
  'console.warn': 'log.warn',
  'console.error': 'log.error',
  'console.debug': 'log.debug'
};

// Patterns for different types of logging
const LOG_PATTERNS = [
  {
    pattern: /console\.(log|info|warn|error|debug)\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
    type: 'simple_string',
    description: 'Simple string messages'
  },
  {
    pattern: /console\.(log|info|warn|error|debug)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^)]+)\)/g,
    type: 'string_with_data',
    description: 'String message with additional data'
  },
  {
    pattern: /console\.(log|info|warn|error|debug)\s*\(\s*([^'"`][^)]*)\)/g,
    type: 'complex',
    description: 'Complex logging (template literals, expressions, etc.)'
  }
];

class LoggingMigrator {
  constructor() {
    this.findings = [];
    this.stats = {
      filesScanned: 0,
      consoleStatementsFound: 0,
      filesWithConsole: 0,
      patternCounts: {}
    };
  }

  scanDirectory(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip excluded directories
        if (!EXCLUDE_PATTERNS.some(pattern => pattern.test(fullPath))) {
          this.scanDirectory(fullPath);
        }
      } else if (stat.isFile() && (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx'))) {
        // Skip excluded files
        if (!EXCLUDE_PATTERNS.some(pattern => pattern.test(fullPath))) {
          this.scanFile(fullPath);
        }
      }
    }
  }

  scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    this.stats.filesScanned++;
    
    const fileFindings = [];
    let hasConsoleStatements = false;
    
    // Check for console statements
    LOG_PATTERNS.forEach(({ pattern, type, description }) => {
      const matches = [...content.matchAll(pattern)];
      
      matches.forEach(match => {
        hasConsoleStatements = true;
        const lineNumber = this.getLineNumber(content, match.index);
        
        fileFindings.push({
          file: filePath,
          line: lineNumber,
          type,
          method: match[1],
          fullMatch: match[0],
          suggestion: this.generateSuggestion(match, type)
        });
        
        this.stats.consoleStatementsFound++;
        this.stats.patternCounts[type] = (this.stats.patternCounts[type] || 0) + 1;
      });
    });
    
    if (hasConsoleStatements) {
      this.stats.filesWithConsole++;
      this.findings.push(...fileFindings);
    }
  }

  getLineNumber(content, index) {
    return content.substring(0, index).split('\\n').length;
  }

  generateSuggestion(match, type) {
    const method = match[1];
    const loggerMethod = CONSOLE_METHOD_MAPPINGS[`console.${method}`] || 'log.info';
    
    switch (type) {
      case 'simple_string':
        const message = match[2];
        return `${loggerMethod}('${message}');`;
        
      case 'string_with_data':
        const messageWithData = match[2];
        const dataParam = match[3];
        return `${loggerMethod}('${messageWithData}', { data: ${dataParam} });`;
        
      case 'complex':
        return `// Complex logging - manual review needed\\n// Original: ${match[0]}\\n// Consider: ${loggerMethod}('your_message', { /* structured data */ });`;
        
      default:
        return `// Review needed: ${match[0]}`;
    }
  }

  generateReport() {
    console.log('\\n📊 Logging Migration Analysis Report');
    console.log('=====================================\\n');
    
    console.log(`📁 Files scanned: ${this.stats.filesScanned}`);
    console.log(`📄 Files with console statements: ${this.stats.filesWithConsole}`);
    console.log(`🔍 Total console statements found: ${this.stats.consoleStatementsFound}\\n`);
    
    console.log('📈 Pattern breakdown:');
    Object.entries(this.stats.patternCounts).forEach(([pattern, count]) => {
      console.log(`   ${pattern}: ${count}`);
    });
    
    console.log('\\n🎯 Top files needing attention:');
    const fileStats = {};
    this.findings.forEach(finding => {
      fileStats[finding.file] = (fileStats[finding.file] || 0) + 1;
    });
    
    Object.entries(fileStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([file, count]) => {
        console.log(`   ${file}: ${count} statements`);
      });
    
    if (this.findings.length > 0) {
      console.log('\\n💡 Sample conversions:');
      const sampleFindings = this.findings.slice(0, 5);
      sampleFindings.forEach(finding => {
        console.log(`\\n📍 ${finding.file}:${finding.line}`);
        console.log(`   Original: ${finding.fullMatch}`);
        console.log(`   Suggested: ${finding.suggestion}`);
      });
    }
    
    console.log('\\n🛠️ Next steps:');
    console.log('1. Import logger in files: import { log } from "@/lib/logger";');
    console.log('2. Replace simple console.log statements with log.info()');
    console.log('3. Add structured data objects for context');
    console.log('4. Use appropriate log levels (error, warn, info, debug)');
    console.log('5. Remove or comment out debugging console.logs');
  }

  generateMigrationScript() {
    const outputPath = 'logs-migration-guide.md';
    
    let content = `# Logging Migration Guide\\n\\n`;
    content += `Generated on: ${new Date().toISOString()}\\n\\n`;
    content += `## Summary\\n\\n`;
    content += `- Files scanned: ${this.stats.filesScanned}\\n`;
    content += `- Files with console statements: ${this.stats.filesWithConsole}\\n`;
    content += `- Total console statements: ${this.stats.consoleStatementsFound}\\n\\n`;
    
    content += `## Pattern Analysis\\n\\n`;
    Object.entries(this.stats.patternCounts).forEach(([pattern, count]) => {
      content += `- ${pattern}: ${count} occurrences\\n`;
    });
    
    content += `\\n## Files to Update\\n\\n`;
    const fileStats = {};
    this.findings.forEach(finding => {
      fileStats[finding.file] = (fileStats[finding.file] || 0) + 1;
    });
    
    Object.entries(fileStats)
      .sort(([,a], [,b]) => b - a)
      .forEach(([file, count]) => {
        content += `### ${file} (${count} statements)\\n\\n`;
        
        const fileFindings = this.findings.filter(f => f.file === file);
        fileFindings.forEach(finding => {
          content += `**Line ${finding.line}:**\\n`;
          content += `\`\`\`typescript\\n`;
          content += `// Current:\\n${finding.fullMatch}\\n\\n`;
          content += `// Suggested:\\n${finding.suggestion}\\n`;
          content += `\`\`\`\\n\\n`;
        });
      });
    
    content += `\\n## Import Statement\\n\\n`;
    content += `Add this import to the top of each file:\\n\\n`;
    content += `\`\`\`typescript\\n`;
    content += `import { log } from '@/lib/logger';\\n`;
    content += `// Or for specific domain loggers:\\n`;
    content += `import { apiLog, dbLog, emailLog } from '@/lib/logger';\\n`;
    content += `\`\`\`\\n\\n`;
    
    content += `## Best Practices\\n\\n`;
    content += `1. **Use appropriate log levels:**\\n`;
    content += `   - \`log.error()\` for errors and exceptions\\n`;
    content += `   - \`log.warn()\` for warnings and deprecated usage\\n`;
    content += `   - \`log.info()\` for general information\\n`;
    content += `   - \`log.debug()\` for debugging information\\n\\n`;
    
    content += `2. **Include structured data:**\\n`;
    content += `   \`\`\`typescript\\n`;
    content += `   log.info('User login successful', {\\n`;
    content += `     userId: user.id,\\n`;
    content += `     email: user.email,\\n`;
    content += `     ip: request.ip\\n`;
    content += `   });\\n`;
    content += `   \`\`\`\\n\\n`;
    
    content += `3. **Use domain-specific loggers:**\\n`;
    content += `   \`\`\`typescript\\n`;
    content += `   apiLog.info('API request completed', { method, endpoint, statusCode });\\n`;
    content += `   dbLog.error('Database connection failed', { error: error.message });\\n`;
    content += `   \`\`\`\\n`;
    
    fs.writeFileSync(outputPath, content);
    console.log(`\\n📄 Detailed migration guide written to: ${outputPath}`);
  }

  run() {
    console.log('🔍 Scanning codebase for console statements...');
    
    SCAN_DIRS.forEach(dir => {
      if (fs.existsSync(dir)) {
        this.scanDirectory(dir);
      }
    });
    
    this.generateReport();
    this.generateMigrationScript();
    
    return this.findings;
  }
}

// Run the migration analysis
if (require.main === module) {
  const migrator = new LoggingMigrator();
  migrator.run();
}

module.exports = LoggingMigrator;