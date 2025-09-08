#!/usr/bin/env node
/**
 * shadcn/ui Migration Utility Script
 * 
 * Automated migration helpers for converting Guitar Strategies components
 * to use shadcn/ui patterns and components.
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuration
const COMPONENTS_DIR = path.join(process.cwd(), 'components');
const SHADCN_COMPONENTS_DIR = path.join(COMPONENTS_DIR, 'ui');
const BACKUP_DIR = path.join(process.cwd(), 'migration-backup');

// Component mapping configuration
const COMPONENT_MIGRATIONS = {
  // Direct replacements
  'button': {
    shadcnComponent: 'button',
    complexity: 'medium',
    customFeatures: ['role-based styling', 'loading states'],
    preserveCustom: true
  },
  'card': {
    shadcnComponent: 'card',
    complexity: 'low',
    customFeatures: [],
    preserveCustom: false
  },
  'input': {
    shadcnComponent: 'input',
    complexity: 'low',
    customFeatures: ['label', 'error', 'helper'],
    preserveCustom: false
  },
  'select': {
    shadcnComponent: 'select',
    complexity: 'low',
    customFeatures: [],
    preserveCustom: false
  },
  'dialog': {
    shadcnComponent: 'dialog',
    complexity: 'low',
    customFeatures: [],
    preserveCustom: false
  },
  'badge': {
    shadcnComponent: 'badge',
    complexity: 'low',
    customFeatures: [],
    preserveCustom: false
  },
  'checkbox': {
    shadcnComponent: 'checkbox',
    complexity: 'low',
    customFeatures: [],
    preserveCustom: false
  },
  'separator': {
    shadcnComponent: 'separator',
    complexity: 'low',
    customFeatures: [],
    preserveCustom: false
  },
  'textarea': {
    shadcnComponent: 'textarea',
    complexity: 'low',
    customFeatures: [],
    preserveCustom: false
  },
  'label': {
    shadcnComponent: 'label',
    complexity: 'low',
    customFeatures: [],
    preserveCustom: false
  },
  'radio-group': {
    shadcnComponent: 'radio-group',
    complexity: 'low',
    customFeatures: [],
    preserveCustom: false
  },
  'skeleton': {
    shadcnComponent: 'skeleton',
    complexity: 'medium',
    customFeatures: ['multiple variants'],
    preserveCustom: true
  },
  'alert': {
    shadcnComponent: 'alert',
    complexity: 'low',
    customFeatures: [],
    preserveCustom: false
  },
  
  // Components needing consolidation
  'modal': {
    shadcnComponent: 'dialog',
    complexity: 'medium',
    customFeatures: ['size variants', 'footer prop'],
    preserveCustom: false,
    consolidateWith: 'dialog'
  },
  
  // New shadcn/ui components to add
  'data-table': {
    shadcnComponent: 'table',
    complexity: 'high',
    addNew: true,
    replaces: ['student-list', 'lesson-list', 'library-list']
  },
  'form': {
    shadcnComponent: 'form',
    complexity: 'high',
    addNew: true,
    enhances: ['lesson-form', 'teacher-settings-form', 'student-settings-form']
  },
  'toast': {
    shadcnComponent: 'toast',
    complexity: 'medium',
    addNew: true,
    replaces: ['react-hot-toast']
  },
  'alert-dialog': {
    shadcnComponent: 'alert-dialog',
    complexity: 'medium',
    addNew: true,
    replaces: ['confirmation modals']
  }
};

// Utility functions
async function createBackup() {
  console.log('📦 Creating backup of current components...');
  
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    
    // Copy entire components directory
    await execAsync(`cp -r ${COMPONENTS_DIR} ${BACKUP_DIR}/components-$(date +%Y%m%d-%H%M%S)`);
    
    console.log('✅ Backup created successfully');
  } catch (error) {
    console.error('❌ Failed to create backup:', error.message);
    throw error;
  }
}

async function installShadcnComponent(componentName) {
  console.log(`📥 Installing shadcn/ui component: ${componentName}`);
  
  try {
    const { stdout, stderr } = await execAsync(`npx shadcn-ui@latest add ${componentName} --yes`);
    console.log(`✅ Installed ${componentName}`);
    if (stderr) {
      console.warn(`⚠️  Warning for ${componentName}:`, stderr);
    }
  } catch (error) {
    console.error(`❌ Failed to install ${componentName}:`, error.message);
    throw error;
  }
}

async function findComponentUsages(componentName) {
  console.log(`🔍 Finding usages of ${componentName}...`);
  
  try {
    // Search for imports of the component
    const { stdout } = await execAsync(
      `grep -r "from.*components.*${componentName}" --include="*.tsx" --include="*.ts" .`
    );
    
    const usages = stdout.trim().split('\n').filter(line => line.length > 0);
    console.log(`Found ${usages.length} usage(s) of ${componentName}`);
    
    return usages;
  } catch (error) {
    if (error.code === 1) {
      // No matches found
      console.log(`No usages found for ${componentName}`);
      return [];
    }
    throw error;
  }
}

async function updateImportStatements(filePath, oldComponent, newComponent) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    
    // Update import statements
    const updatedContent = content
      .replace(
        new RegExp(`from ['"@/components/ui/${oldComponent}['"]`, 'g'),
        `from "@/components/ui/${newComponent}"`
      )
      .replace(
        new RegExp(`import.*${oldComponent}.*from.*components`, 'g'),
        (match) => match.replace(oldComponent, newComponent)
      );
    
    if (content !== updatedContent) {
      await fs.writeFile(filePath, updatedContent);
      console.log(`✅ Updated imports in ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Failed to update ${filePath}:`, error.message);
  }
}

async function consolidateModalToDialog() {
  console.log('🔄 Consolidating Modal usages to Dialog pattern...');
  
  const modalUsages = await findComponentUsages('modal');
  
  for (const usage of modalUsages) {
    const filePath = usage.split(':')[0];
    console.log(`Updating ${filePath}...`);
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      // Replace Modal with Dialog patterns
      let updatedContent = content
        // Update imports
        .replace(/import.*Modal.*from.*modal/, 'import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"')
        // Update component usage patterns
        .replace(/<Modal\s+/g, '<Dialog ')
        .replace(/isOpen=/g, 'open=')
        .replace(/onClose=/g, 'onOpenChange={(open) => !open && onClose()}')
        .replace(/<\/Modal>/g, '</Dialog>')
        // Update props structure
        .replace(/title="([^"]*)"/, '<DialogHeader><DialogTitle>$1</DialogTitle></DialogHeader>')
        .replace(/footer=\{([^}]*)\}/, '<DialogFooter>$1</DialogFooter>');
      
      if (content !== updatedContent) {
        await fs.writeFile(filePath, updatedContent);
        console.log(`✅ Converted Modal to Dialog in ${filePath}`);
      }
    } catch (error) {
      console.error(`❌ Failed to convert ${filePath}:`, error.message);
    }
  }
}

async function extendButtonWithCustomFeatures() {
  console.log('🔧 Extending shadcn/ui Button with custom features...');
  
  const buttonExtension = `
// Extended Button with custom Guitar Strategies features
import { Button as ShadcnButton } from "./button"
import { cn } from "@/lib/utils"
import { getButtonVariant } from "@/lib/design"
import type { Role } from "@prisma/client"

interface ExtendedButtonProps extends React.ComponentProps<typeof ShadcnButton> {
  role?: Role;
  loading?: boolean;
  loadingText?: string;
}

export function Button({
  variant = "default",
  role,
  loading = false,
  loadingText = "Loading...",
  className,
  disabled,
  children,
  ...props
}: ExtendedButtonProps) {
  // Handle role-based styling
  if (variant === "role" && role) {
    return (
      <ShadcnButton
        className={cn(getButtonVariant("role", role), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>{loadingText}</span>
          </div>
        ) : (
          children
        )}
      </ShadcnButton>
    )
  }
  
  return (
    <ShadcnButton
      variant={variant}
      className={className}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>{loadingText}</span>
        </div>
      ) : (
        children
      )}
    </ShadcnButton>
  )
}
`;

  try {
    // Rename original button to button-extended
    await fs.rename(
      path.join(SHADCN_COMPONENTS_DIR, 'button.tsx'),
      path.join(SHADCN_COMPONENTS_DIR, 'button-base.tsx')
    );
    
    // Create extended button
    await fs.writeFile(
      path.join(SHADCN_COMPONENTS_DIR, 'button.tsx'),
      buttonExtension
    );
    
    console.log('✅ Created extended Button component');
  } catch (error) {
    console.error('❌ Failed to extend Button:', error.message);
  }
}

async function generateMigrationReport() {
  console.log('📊 Generating migration report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    components: {},
    summary: {
      total: 0,
      migrated: 0,
      remaining: 0,
      complexity: {
        low: 0,
        medium: 0,
        high: 0
      }
    }
  };
  
  for (const [componentName, config] of Object.entries(COMPONENT_MIGRATIONS)) {
    const usages = await findComponentUsages(componentName);
    report.components[componentName] = {
      ...config,
      usageCount: usages.length,
      usages: usages
    };
    
    report.summary.total++;
    report.summary.complexity[config.complexity]++;
  }
  
  await fs.writeFile(
    path.join(process.cwd(), 'migration-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log('✅ Migration report saved to migration-report.json');
  return report;
}

// Main migration functions
async function installAllShadcnComponents() {
  console.log('🚀 Installing all required shadcn/ui components...');
  
  const componentsToInstall = [
    'button', 'card', 'input', 'select', 'dialog', 'badge',
    'checkbox', 'separator', 'textarea', 'label', 'radio-group',
    'skeleton', 'alert', 'table', 'form', 'toast', 'alert-dialog',
    'tabs', 'accordion', 'navigation-menu', 'dropdown-menu',
    'sheet', 'command', 'popover', 'progress', 'tooltip',
    'calendar', 'slider', 'switch', 'avatar', 'scroll-area'
  ];
  
  for (const component of componentsToInstall) {
    await installShadcnComponent(component);
  }
}

async function runFullMigration() {
  console.log('🎯 Starting complete shadcn/ui migration...');
  
  try {
    // Step 1: Create backup
    await createBackup();
    
    // Step 2: Install shadcn/ui components
    await installAllShadcnComponents();
    
    // Step 3: Handle specific migrations
    await consolidateModalToDialog();
    await extendButtonWithCustomFeatures();
    
    // Step 4: Generate report
    const report = await generateMigrationReport();
    
    console.log('\n🎉 Migration completed successfully!');
    console.log(`📊 Summary: ${report.summary.total} components analyzed`);
    console.log(`🟢 Low complexity: ${report.summary.complexity.low}`);
    console.log(`🟡 Medium complexity: ${report.summary.complexity.medium}`);
    console.log(`🔴 High complexity: ${report.summary.complexity.high}`);
    
  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    console.log('🔄 Please check the backup at:', BACKUP_DIR);
  }
}

// CLI interface
const args = process.argv.slice(2);
const command = args[0];

async function main() {
  switch (command) {
    case 'backup':
      await createBackup();
      break;
      
    case 'install':
      const component = args[1];
      if (component) {
        await installShadcnComponent(component);
      } else {
        await installAllShadcnComponents();
      }
      break;
      
    case 'find-usages':
      const searchComponent = args[1];
      if (searchComponent) {
        await findComponentUsages(searchComponent);
      } else {
        console.error('❌ Please specify a component name');
      }
      break;
      
    case 'consolidate-modal':
      await consolidateModalToDialog();
      break;
      
    case 'extend-button':
      await extendButtonWithCustomFeatures();
      break;
      
    case 'report':
      await generateMigrationReport();
      break;
      
    case 'migrate':
      await runFullMigration();
      break;
      
    default:
      console.log(`
🚀 shadcn/ui Migration Utility

Usage:
  node scripts/shadcn-migration.js <command>

Commands:
  backup                 Create backup of current components
  install [component]    Install shadcn/ui component(s)
  find-usages <name>     Find component usage in codebase
  consolidate-modal      Convert Modal usage to Dialog
  extend-button          Create extended Button component
  report                 Generate migration analysis report
  migrate                Run complete migration process

Examples:
  node scripts/shadcn-migration.js backup
  node scripts/shadcn-migration.js install button
  node scripts/shadcn-migration.js find-usages modal
  node scripts/shadcn-migration.js migrate
      `);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  createBackup,
  installShadcnComponent,
  findComponentUsages,
  consolidateModalToDialog,
  extendButtonWithCustomFeatures,
  generateMigrationReport,
  runFullMigration
};