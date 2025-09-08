# shadcn/ui Migration Plan for Guitar Strategies

## Executive Summary

This document outlines a comprehensive migration plan to adopt shadcn/ui components in the Guitar Strategies application. The current codebase has 128 components with a strong foundation that's partially compatible with shadcn/ui patterns, making this migration feasible with moderate complexity.

### Current State Analysis
- **Total Components**: 128 (20 UI, 108 feature/page components)
- **Existing Patterns**: Already uses Radix UI primitives, Tailwind CSS, and TypeScript
- **Current UI Foundation**: Custom components with some shadcn/ui-like patterns
- **Migration Readiness**: High - existing architecture is compatible

---

## Phase 1: Foundation Setup

### 1.1 Install shadcn/ui CLI and Dependencies

```bash
# Install shadcn/ui CLI
npx shadcn-ui@latest init

# Core dependencies (some already installed)
npm install @radix-ui/react-accordion
npm install @radix-ui/react-alert-dialog  
npm install @radix-ui/react-avatar
npm install @radix-ui/react-dropdown-menu
npm install @radix-ui/react-form
npm install @radix-ui/react-navigation-menu
npm install @radix-ui/react-popover
npm install @radix-ui/react-scroll-area
npm install @radix-ui/react-sheet
npm install @radix-ui/react-slider
npm install @radix-ui/react-switch
npm install @radix-ui/react-table
npm install @radix-ui/react-tabs
npm install @radix-ui/react-toast
npm install @radix-ui/react-tooltip
npm install lucide-react
```

### 1.2 Create shadcn/ui Configuration

```json
// components.json
{
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

---

## Phase 2: Core UI Component Migration

### Priority 1: Direct Replacements (Low Complexity)

#### 2.1 Button Component
**Current**: `/components/ui/button.tsx` (Custom implementation with role-based styling)
**Target**: shadcn/ui Button with extended variants

**Migration Complexity**: 🟡 Medium
**Custom Features to Preserve**: 
- Role-based styling (`variant="role"`, `role` prop)
- Loading states with custom spinner
- Size variants match existing patterns

**Migration Script**:
```bash
npx shadcn-ui@latest add button
```

**Custom Extension**:
```typescript
// Extend shadcn Button with custom features
interface ExtendedButtonProps extends ButtonProps {
  role?: Role;
  loading?: boolean;
  loadingText?: string;
}
```

#### 2.2 Input Component  
**Current**: `/components/ui/input.tsx` (Simple with label/error/helper)
**Target**: shadcn/ui Input + Label + Form integration

**Migration Complexity**: 🟢 Low
**Custom Features**: Label, error messages, helper text

**Migration Script**:
```bash
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add form
```

#### 2.3 Card Component
**Current**: `/components/ui/card.tsx` (Already shadcn/ui compatible)
**Target**: shadcn/ui Card (drop-in replacement)

**Migration Complexity**: 🟢 Low
**Notes**: Current implementation is nearly identical to shadcn/ui

**Migration Script**:
```bash
npx shadcn-ui@latest add card
```

#### 2.4 Select Component
**Current**: `/components/ui/select.tsx` (Already using Radix UI)
**Target**: shadcn/ui Select (minimal changes needed)

**Migration Complexity**: 🟢 Low
**Notes**: Current implementation matches shadcn/ui patterns

**Migration Script**:
```bash
npx shadcn-ui@latest add select
```

#### 2.5 Dialog Component
**Current**: `/components/ui/dialog.tsx` (Already using Radix UI)
**Target**: shadcn/ui Dialog (drop-in replacement)

**Migration Complexity**: 🟢 Low
**Custom Features**: Already imports from `@/lib/design` instead of `@/lib/utils`

#### 2.6 Badge Component
**Current**: `/components/ui/badge.tsx` (Basic variants)
**Target**: shadcn/ui Badge

**Migration Complexity**: 🟢 Low

**Migration Script**:
```bash
npx shadcn-ui@latest add badge
```

#### 2.7 Other Direct Replacements
```bash
# Install remaining compatible components
npx shadcn-ui@latest add checkbox
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add label
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add radio-group
npx shadcn-ui@latest add skeleton
npx shadcn-ui@latest add alert
```

### Priority 2: Component Consolidation (Medium Complexity)

#### 2.8 Modal vs Dialog Consolidation
**Current**: Both `/components/ui/modal.tsx` (custom) and `/components/ui/dialog.tsx` (Radix)
**Target**: Unified shadcn/ui Dialog pattern
**Migration Complexity**: 🟡 Medium

**Strategy**: 
1. Migrate all Modal usages to Dialog pattern
2. Create wrapper component if needed for backwards compatibility
3. Remove custom Modal implementation

**Components Using Modal** (25 usages):
- `BookingSuccessModal`
- `ConfettiModal`
- `DeleteInvoiceModal`
- `MarkPaidModal`
- `FilePreviewModal`
- `LessonManagementModal`
- `BookStudentModal`

---

## Phase 3: Advanced UI Components

### Priority 3: New shadcn/ui Components (High Value)

#### 3.1 Data Table Component
**Target**: shadcn/ui Table + Data Table
**Usage**: Replace custom list components with standardized data tables
**Benefits**: Sorting, filtering, pagination out of the box

**Components to Upgrade**:
- `StudentList` (25 usages)
- `LessonList` (30 usages) 
- `LibraryList` (Complex macOS-style interface)
- `RecommendationsList`
- `CurriculumList`
- `InvoiceList`

```bash
npx shadcn-ui@latest add table
npx shadcn-ui@latest add data-table
```

#### 3.2 Form Components
**Target**: shadcn/ui Form with react-hook-form integration
**Benefits**: Better validation, accessibility, error handling

```bash
npx shadcn-ui@latest add form
npx shadcn-ui@latest add accordion
npx shadcn-ui@latest add tabs
```

**Major Forms to Upgrade**:
- `LessonForm` (High complexity - rich text, file uploads)
- `TeacherSettingsForm` (Multi-tab interface)
- `StudentSettingsForm`
- `CurriculumForm` (Drag-and-drop sections)
- `InvoiceForm`
- `RecommendationForm`

#### 3.3 Navigation Components
```bash
npx shadcn-ui@latest add navigation-menu
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add sheet
npx shadcn-ui@latest add command
```

**Usage**: 
- Upgrade `DashboardSidebar` with Sheet for mobile
- Add Command palette for quick actions
- Improve dropdown menus in navigation

#### 3.4 Feedback Components
```bash
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add alert-dialog
npx shadcn-ui@latest add progress
npx shadcn-ui@latest add tooltip
```

**Replacements**:
- Replace `react-hot-toast` with shadcn/ui Toast
- Upgrade confirmation dialogs to AlertDialog
- Add Progress components for loading states
- Add Tooltips for better UX

---

## Phase 4: Complex Custom Components

### Priority 4: Specialized Components (Keep Custom)

#### 4.1 Rich Text Editor
**Current**: `/components/ui/rich-text-editor.tsx` (Tiptap-based)
**Decision**: Keep custom - highly specialized
**Migration**: Add shadcn/ui styling classes

#### 4.2 Calendar/Scheduling Components
**Current**: Custom scheduling system
**Decision**: Keep custom - business-critical logic
**Enhancement**: Add shadcn/ui Calendar as base, extend for scheduling

```bash
npx shadcn-ui@latest add calendar
npx shadcn-ui@latest add popover
```

**Components**:
- `AvailabilityCalendar` - Keep custom logic, upgrade styling
- `WeeklyScheduleGrid` - Add shadcn/ui base calendar
- `BookingInterface` - Style improvements only
- `TeacherScheduleView` - Style improvements only

#### 4.3 Specialized Business Components
Keep custom with style improvements:
- `LibraryList` (macOS Finder-style interface)
- `PriorityBadge` (Custom business logic)  
- `YouTubeEmbed` (External service integration)
- `LoadingSpinner` (Multiple variants)
- `EmptyState` (Custom messaging)

---

## Phase 5: Migration Execution Plan

### 5.1 Week 1: Foundation Setup
- [ ] Install shadcn/ui CLI and dependencies
- [ ] Configure components.json
- [ ] Update utils.ts to match shadcn/ui patterns
- [ ] Install Priority 1 components (Button, Input, Card, etc.)

### 5.2 Week 2: Core Component Migration
- [ ] Replace Button usages (preserve role-based styling)
- [ ] Replace Input/Form components
- [ ] Consolidate Modal/Dialog usage
- [ ] Update Card implementations

### 5.3 Week 3: Advanced Components
- [ ] Install and configure Data Table
- [ ] Migrate major list components to Data Table
- [ ] Add Form components with validation
- [ ] Install navigation and feedback components

### 5.4 Week 4: Polish and Cleanup
- [ ] Update all remaining components
- [ ] Add missing shadcn/ui components (Toast, AlertDialog, etc.)
- [ ] Remove unused custom components
- [ ] Update Storybook stories for new components

---

## Phase 6: Benefits Assessment

### 6.1 Immediate Benefits
- **Consistency**: Unified design system across all components
- **Accessibility**: Better ARIA compliance and keyboard navigation
- **Maintenance**: Reduced custom code to maintain
- **Documentation**: Better component documentation via shadcn/ui
- **Community**: Access to shadcn/ui ecosystem and updates

### 6.2 Performance Benefits
- **Bundle Size**: Potentially smaller (eliminate duplicate patterns)
- **Tree Shaking**: Better dead code elimination
- **TypeScript**: Improved type safety and IntelliSense

### 6.3 Developer Experience
- **Faster Development**: Pre-built components reduce boilerplate
- **Better Testing**: Standardized patterns easier to test
- **Onboarding**: New developers familiar with shadcn/ui patterns

---

## Risk Assessment and Mitigation

### 6.4 High Risk Items
1. **RichTextEditor**: Complex Tiptap integration - Keep custom
2. **SchedulingSystem**: Business-critical scheduling logic - Gradual migration
3. **LibraryList**: Complex macOS interface - Keep custom, style improvements only

### 6.5 Medium Risk Items
1. **Button Role Styling**: Need to preserve custom role-based variants
2. **Form Validations**: Ensure Zod schemas work with new form components
3. **Modal Consolidation**: 25+ components using Modal need careful migration

### 6.6 Mitigation Strategies
- **Gradual Migration**: Component-by-component replacement
- **Backwards Compatibility**: Keep wrapper components during transition
- **Comprehensive Testing**: Test each component thoroughly after migration
- **Feature Parity**: Ensure all custom features are preserved

---

## Component Mapping Reference

### Complete shadcn/ui Component Map

| Current Component | shadcn/ui Equivalent | Complexity | Action |
|-------------------|---------------------|------------|--------|
| `Button` | `Button` + custom variants | 🟡 Medium | Extend |
| `Card` | `Card` | 🟢 Low | Replace |
| `Input` | `Input` + `Label` + `Form` | 🟢 Low | Replace |
| `Select` | `Select` | 🟢 Low | Replace |
| `Dialog` | `Dialog` | 🟢 Low | Replace |
| `Modal` | `Dialog` | 🟡 Medium | Consolidate |
| `Badge` | `Badge` | 🟢 Low | Replace |
| `Checkbox` | `Checkbox` | 🟢 Low | Replace |
| `RadioGroup` | `RadioGroup` | 🟢 Low | Replace |
| `Separator` | `Separator` | 🟢 Low | Replace |
| `Textarea` | `Textarea` | 🟢 Low | Replace |
| `Label` | `Label` | 🟢 Low | Replace |
| `Skeleton` | `Skeleton` | 🟢 Low | Replace |
| `Alert` | `Alert` | 🟢 Low | Replace |
| `LoadingSpinner` | `Skeleton` + custom | 🟡 Medium | Hybrid |
| `Toaster` | `Toast` | 🟡 Medium | Replace |
| `RichTextEditor` | Custom + shadcn styling | 🔴 High | Style only |
| `TimePicker` | Custom + `Popover` | 🟡 Medium | Hybrid |
| `ConfettiModal` | `Dialog` + custom | 🟡 Medium | Migrate |
| `PriorityBadge` | `Badge` + custom | 🟢 Low | Extend |
| `YouTubeEmbed` | Custom | 🟢 Low | Style only |
| `EmptyState` | Custom + shadcn styling | 🟢 Low | Style only |

### New shadcn/ui Components to Add

| Component | Usage | Priority |
|-----------|-------|----------|
| `DataTable` | Replace list components | High |
| `Form` | Better form validation | High |
| `Toast` | Replace react-hot-toast | High |
| `AlertDialog` | Confirmation dialogs | High |
| `Tabs` | Settings and multi-step forms | Medium |
| `Accordion` | FAQ, collapsible content | Medium |
| `NavigationMenu` | Enhanced navigation | Medium |
| `DropdownMenu` | Context menus, actions | Medium |
| `Sheet` | Mobile sidebar | Medium |
| `Command` | Quick actions palette | Low |
| `Popover` | Contextual content | Low |
| `Progress` | Loading indicators | Low |
| `Tooltip` | Help text, info | Low |
| `Calendar` | Date selection base | Low |
| `Slider` | Settings, filters | Low |
| `Switch` | Toggle settings | Low |
| `Avatar` | User profiles | Low |
| `ScrollArea` | Better scrolling | Low |

---

## Conversion Scripts

### 6.7 Automated Migration Scripts

I'll create conversion scripts to automate repetitive migrations:

1. **Button Migration Script**: Update Button imports and props
2. **Modal to Dialog Script**: Convert Modal usages to Dialog
3. **Import Update Script**: Batch update component imports
4. **Style Cleanup Script**: Remove unused custom component files

---

This migration plan provides a structured approach to adopting shadcn/ui while preserving the unique business logic and specialized components that make Guitar Strategies unique. The phased approach minimizes risk while maximizing the benefits of a unified design system.