#!/usr/bin/env node

/**
 * Automated migration script for converting console.log to structured logging in API routes
 * This script handles common patterns and creates backup files
 */

const fs = require('fs');
const path = require('path');

// API routes to migrate
const API_ROUTES = [
  'app/api/lessons/[id]/route.ts',
  'app/api/student-checklists/route.ts',
  'app/api/student-checklists/items/[id]/route.ts',
  'app/api/lessons/route.ts',
  'app/api/settings/teacher/route.ts',
  'app/api/admin/env-validation/route.ts',
  'app/api/invoices/route.ts',
  'app/api/lessons/book/route.ts',
  'app/api/admin/database/pool-status/route.ts',
  'app/api/health/route.ts',
  'app/api/teacher/validate/[teacherId]/route.ts',
  'app/api/admin/lessons/bulk-delete/route.ts',
  'app/api/admin/lessons/[id]/route.ts',
  'app/api/admin/students/[id]/route.ts',
  'app/api/admin/teachers/[id]/route.ts',
  'app/api/admin/activity/route.ts',
  'app/api/admin/settings/route.ts',
  'app/api/billing/[id]/route.ts',
  'app/api/billing/monthly/route.ts',
  'app/api/invoices/overdue/route.ts',
  'app/api/settings/password/route.ts',
  'app/api/slots/[id]/route.ts',
  'app/api/invoices/[id]/route.ts',
  'app/api/invoices/[id]/pdf/route.ts',
  'app/api/settings/student/route.ts',
  'app/api/invoices/[id]/send/route.ts',
];

// Patterns for replacing console methods
const REPLACEMENTS = [
  {
    pattern: /console\.log\((.*?)\)/g,
    replace: (match, args) => {
      // Try to detect the context
      if (args.includes('Error') || args.includes('error')) {
        return `apiLog.error('API error', { message: ${args} })`;
      } else if (args.includes('Success') || args.includes('success')) {
        return `apiLog.info('API success', { message: ${args} })`;
      } else {
        return `apiLog.info('API log', { message: ${args} })`;
      }
    }
  },
  {
    pattern: /console\.error\((.*?)\)/g,
    replace: (match, args) => {
      // Check if it's a simple string or has multiple arguments
      if (args.includes(',')) {
        const [message, ...rest] = args.split(',').map(s => s.trim());
        return `apiLog.error(${message}, { error: ${rest.join(', ')} })`;
      }
      return `apiLog.error('API error', { error: ${args} })`;
    }
  },
  {
    pattern: /console\.warn\((.*?)\)/g,
    replace: (match, args) => {
      return `apiLog.warn('API warning', { message: ${args} })`;
    }
  }
];

function migrateFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return { success: false, error: 'File not found' };
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;
  
  // Check if already has logger import
  const hasLoggerImport = content.includes("from '@/lib/logger'");
  
  // Add import if not present
  if (!hasLoggerImport && content.includes('console.')) {
    // Find the last import statement
    const importMatch = content.match(/(import[\s\S]*?from\s+['"][^'"]+['"];?)/g);
    if (importMatch) {
      const lastImport = importMatch[importMatch.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      const insertPosition = lastImportIndex + lastImport.length;
      
      // Determine which loggers to import based on content
      const loggers = [];
      if (filePath.includes('/api/')) loggers.push('apiLog');
      if (content.includes('prisma') || content.includes('database')) loggers.push('dbLog');
      if (content.includes('email') || content.includes('send')) loggers.push('emailLog');
      if (loggers.length === 0) loggers.push('apiLog'); // Default to apiLog for API routes
      
      const importStatement = `\nimport { ${loggers.join(', ')} } from '@/lib/logger';`;
      content = content.slice(0, insertPosition) + importStatement + content.slice(insertPosition);
    }
  }
  
  // Apply replacements
  let changesCount = 0;
  REPLACEMENTS.forEach(({ pattern, replace }) => {
    const matches = content.match(pattern);
    if (matches) {
      changesCount += matches.length;
      content = content.replace(pattern, replace);
    }
  });
  
  // Smart replacements for common patterns
  content = content.replace(
    /console\.log\(['"`]([^'"`]+)['"`],\s*(.+?)\)/g,
    (match, message, data) => {
      return `apiLog.info('${message}', { data: ${data} })`;
    }
  );
  
  content = content.replace(
    /console\.error\(['"`]([^'"`]+)['"`],\s*(.+?)\)/g,
    (match, message, error) => {
      return `apiLog.error('${message}', { error: ${error} instanceof Error ? ${error}.message : String(${error}), stack: ${error} instanceof Error ? ${error}.stack : undefined })`;
    }
  );
  
  // Write the file if changes were made
  if (content !== originalContent) {
    // Create backup
    const backupPath = `${fullPath}.backup`;
    fs.writeFileSync(backupPath, originalContent);
    
    // Write updated content
    fs.writeFileSync(fullPath, content);
    
    return { 
      success: true, 
      changesCount,
      backupPath 
    };
  }
  
  return { 
    success: true, 
    changesCount: 0,
    message: 'No changes needed' 
  };
}

function main() {
  console.log('🚀 Starting API routes logging migration...\n');
  
  const results = {
    migrated: [],
    failed: [],
    skipped: []
  };
  
  API_ROUTES.forEach(route => {
    console.log(`Processing: ${route}`);
    const result = migrateFile(route);
    
    if (result.success && result.changesCount > 0) {
      results.migrated.push({ file: route, changes: result.changesCount });
      console.log(`  ✅ Migrated (${result.changesCount} changes)`);
    } else if (result.success && result.changesCount === 0) {
      results.skipped.push(route);
      console.log(`  ⏭️  Skipped (no changes needed)`);
    } else {
      results.failed.push({ file: route, error: result.error });
      console.log(`  ❌ Failed: ${result.error}`);
    }
  });
  
  // Summary
  console.log('\n📊 Migration Summary:');
  console.log('====================');
  console.log(`✅ Migrated: ${results.migrated.length} files`);
  console.log(`⏭️  Skipped: ${results.skipped.length} files`);
  console.log(`❌ Failed: ${results.failed.length} files`);
  
  if (results.migrated.length > 0) {
    console.log('\n📝 Files migrated:');
    results.migrated.forEach(({ file, changes }) => {
      console.log(`  - ${file} (${changes} changes)`);
    });
  }
  
  console.log('\n💡 Next steps:');
  console.log('1. Review the changes in each file');
  console.log('2. Test the application');
  console.log('3. Remove backup files when satisfied: rm app/api/**/*.backup');
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { migrateFile };