#!/usr/bin/env node

/**
 * Batch migration script for converting console.log to structured logging
 * Handles multiple files at once with smart pattern detection
 */

const fs = require('fs');
const path = require('path');

// Migration configuration
const MIGRATIONS = {
  '/app/api/': { logger: 'apiLog', domain: 'API' },
  '/lib/': { logger: 'log', domain: 'Library' },
  '/components/': { logger: 'log', domain: 'Component' }
};

function detectContext(filePath, content) {
  // Determine which loggers to import based on file path and content
  const loggers = new Set();
  
  // Default based on path
  if (filePath.includes('/api/')) loggers.add('apiLog');
  else loggers.add('log');
  
  // Additional loggers based on content
  if (content.includes('prisma') || content.includes('database')) loggers.add('dbLog');
  if (content.includes('email') || content.includes('sendEmail')) loggers.add('emailLog');
  if (content.includes('invoice') || content.includes('Invoice')) loggers.add('invoiceLog');
  if (content.includes('schedule') || content.includes('recurring')) loggers.add('schedulerLog');
  if (filePath.includes('/auth/')) loggers.add('authLog');
  
  return Array.from(loggers);
}

function migrateConsoleStatements(content, primaryLogger = 'apiLog') {
  let updatedContent = content;
  
  // Pattern 1: console.log('message', data)
  updatedContent = updatedContent.replace(
    /console\.log\((['"`])([^'"`]+)\1,\s*(.+?)\);?$/gm,
    (match, quote, message, data) => {
      return `${primaryLogger}.info('${message}', ${data});`;
    }
  );
  
  // Pattern 2: console.error('message', error)
  updatedContent = updatedContent.replace(
    /console\.error\((['"`])([^'"`]+)\1,\s*(.+?)\);?$/gm,
    (match, quote, message, error) => {
      const errorVar = error.trim();
      return `${primaryLogger}.error('${message}', {
        error: ${errorVar} instanceof Error ? ${errorVar}.message : String(${errorVar}),
        stack: ${errorVar} instanceof Error ? ${errorVar}.stack : undefined
      });`;
    }
  );
  
  // Pattern 3: Simple console.log('message')
  updatedContent = updatedContent.replace(
    /console\.log\((['"`])([^'"`]+)\1\);?$/gm,
    (match, quote, message) => {
      if (message.includes('Error') || message.includes('error')) {
        return `${primaryLogger}.error('${message}');`;
      } else if (message.includes('Warning') || message.includes('warn')) {
        return `${primaryLogger}.warn('${message}');`;
      } else {
        return `${primaryLogger}.info('${message}');`;
      }
    }
  );
  
  // Pattern 4: console.warn
  updatedContent = updatedContent.replace(
    /console\.warn\((.+?)\);?$/gm,
    (match, args) => {
      return `${primaryLogger}.warn('Warning', { message: ${args} });`;
    }
  );
  
  // Pattern 5: Template literals console.log(`message ${var}`)
  updatedContent = updatedContent.replace(
    /console\.log\(`(.+?)`\);?$/gm,
    (match, template) => {
      // Try to extract message and variables
      const hasVariables = template.includes('${');
      if (hasVariables) {
        const message = template.replace(/\$\{[^}]+\}/g, '').trim();
        return `${primaryLogger}.info('${message}', { data: \`${template}\` });`;
      } else {
        return `${primaryLogger}.info('${template}');`;
      }
    }
  );
  
  // Pattern 6: Simple console.error(error)
  updatedContent = updatedContent.replace(
    /console\.error\(([a-zA-Z_$][a-zA-Z0-9_$]*)\);?$/gm,
    (match, errorVar) => {
      return `${primaryLogger}.error('Error occurred', {
        error: ${errorVar} instanceof Error ? ${errorVar}.message : String(${errorVar}),
        stack: ${errorVar} instanceof Error ? ${errorVar}.stack : undefined
      });`;
    }
  );
  
  return updatedContent;
}

function addLoggerImport(content, loggers, filePath) {
  // Check if already has logger import
  if (content.includes("from '@/lib/logger'") || content.includes('from "@/lib/logger"')) {
    return content;
  }
  
  // Find the last import statement
  const importMatches = content.match(/(import[\s\S]*?from\s+['"][^'"]+['"];?)/g);
  
  if (importMatches && importMatches.length > 0) {
    const lastImport = importMatches[importMatches.length - 1];
    const lastImportIndex = content.lastIndexOf(lastImport);
    const insertPosition = lastImportIndex + lastImport.length;
    
    const importStatement = `\nimport { ${loggers.join(', ')} } from '@/lib/logger';`;
    return content.slice(0, insertPosition) + importStatement + content.slice(insertPosition);
  }
  
  // If no imports found, add at the beginning
  return `import { ${loggers.join(', ')} } from '@/lib/logger';\n\n` + content;
}

function migrateFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    return { success: false, error: 'File not found' };
  }
  
  const originalContent = fs.readFileSync(fullPath, 'utf8');
  let content = originalContent;
  
  // Skip if no console statements
  if (!content.includes('console.')) {
    return { success: true, changesCount: 0, message: 'No console statements found' };
  }
  
  // Detect required loggers
  const loggers = detectContext(filePath, content);
  const primaryLogger = loggers[0] || 'log';
  
  // Add import statement
  content = addLoggerImport(content, loggers, filePath);
  
  // Count console statements before migration
  const consoleMatches = content.match(/console\.(log|error|warn|info|debug)/g);
  const changesCount = consoleMatches ? consoleMatches.length : 0;
  
  // Migrate console statements
  content = migrateConsoleStatements(content, primaryLogger);
  
  // Write the file if changes were made
  if (content !== originalContent) {
    // Create backup
    const backupPath = `${fullPath}.backup`;
    fs.writeFileSync(backupPath, originalContent);
    
    // Write updated content
    fs.writeFileSync(fullPath, content);
    
    return { success: true, changesCount, backupPath };
  }
  
  return { success: true, changesCount: 0 };
}

function findFilesWithConsole(directory) {
  const files = [];
  
  function traverse(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules, .next, etc.
        if (!item.startsWith('.') && item !== 'node_modules' && item !== 'out') {
          traverse(fullPath);
        }
      } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('console.')) {
          const relativePath = path.relative(process.cwd(), fullPath);
          files.push(relativePath);
        }
      }
    }
  }
  
  traverse(directory);
  return files;
}

function main(targetPath) {
  console.log('🚀 Starting batch logging migration...\n');
  
  let files = [];
  
  if (targetPath) {
    // If a specific path is provided
    const fullPath = path.join(process.cwd(), targetPath);
    if (fs.statSync(fullPath).isDirectory()) {
      files = findFilesWithConsole(fullPath);
      console.log(`Found ${files.length} files with console statements in ${targetPath}\n`);
    } else {
      files = [targetPath];
    }
  } else {
    // Default to API routes
    files = findFilesWithConsole('app/api');
    console.log(`Found ${files.length} API files with console statements\n`);
  }
  
  const results = {
    migrated: [],
    failed: [],
    skipped: []
  };
  
  // Process files
  files.forEach((file, index) => {
    process.stdout.write(`[${index + 1}/${files.length}] Processing ${file}... `);
    const result = migrateFile(file);
    
    if (result.success && result.changesCount > 0) {
      results.migrated.push({ file, changes: result.changesCount });
      console.log(`✅ (${result.changesCount} changes)`);
    } else if (result.success && result.changesCount === 0) {
      results.skipped.push(file);
      console.log('⏭️');
    } else {
      results.failed.push({ file, error: result.error });
      console.log(`❌ ${result.error}`);
    }
  });
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary');
  console.log('='.repeat(60));
  console.log(`✅ Migrated: ${results.migrated.length} files`);
  console.log(`⏭️  Skipped: ${results.skipped.length} files`);
  console.log(`❌ Failed: ${results.failed.length} files`);
  
  if (results.migrated.length > 0) {
    const totalChanges = results.migrated.reduce((sum, item) => sum + item.changes, 0);
    console.log(`\n📝 Total changes: ${totalChanges} console statements migrated`);
    
    console.log('\nTop migrated files:');
    results.migrated
      .sort((a, b) => b.changes - a.changes)
      .slice(0, 10)
      .forEach(({ file, changes }) => {
        console.log(`  - ${file} (${changes} changes)`);
      });
  }
  
  console.log('\n💡 Next steps:');
  console.log('1. Review the changes: git diff');
  console.log('2. Test the application: npm run dev');
  console.log('3. Remove backup files when satisfied: find . -name "*.backup" -delete');
  console.log('4. Commit the changes: git commit -am "Migrate to structured logging"');
}

// Parse command line arguments
const args = process.argv.slice(2);
const targetPath = args[0];

// Run the migration
main(targetPath);

module.exports = { migrateFile, findFilesWithConsole };