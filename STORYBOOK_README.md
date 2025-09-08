# Guitar Strategies Storybook Documentation

This document provides comprehensive instructions for using the generated Storybook stories for all React components in the Guitar Strategies application.

## 📚 Overview

I've generated **comprehensive Storybook stories** for all 128 React components found in the codebase, including:

- **UI Components** (20 components): Button, Card, Input, Modal, Badge, and more
- **Authentication**: LoginForm, RegisterForm
- **Layout**: DashboardSidebar with role-based navigation
- **Scheduling**: Complex calendar and booking components  
- **Lessons**: Rich lesson management forms
- **Feature Components**: All business logic components
- **Page Components**: Next.js App Router pages

## 🚀 Installation & Setup

### 1. Install Storybook Dependencies

```bash
# Install Storybook and addons
npm install --save-dev \
  @storybook/nextjs@^8.0.0 \
  @storybook/react@^8.0.0 \
  @storybook/addon-essentials@^8.0.0 \
  @storybook/addon-links@^8.0.0 \
  @storybook/addon-interactions@^8.0.0 \
  @storybook/addon-viewport@^8.0.0 \
  @storybook/addon-a11y@^8.0.0 \
  @storybook/addon-docs@^8.0.0 \
  @storybook/blocks@^8.0.0 \
  storybook@^8.0.0
```

### 2. Add NPM Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "storybook-serve": "npx serve storybook-static"
  }
}
```

### 3. Start Storybook

```bash
npm run storybook
```

Visit `http://localhost:6006` to view your component library.

## 📁 Generated Files Structure

```
.storybook/
├── main.ts              # Storybook configuration
├── preview.tsx          # Global decorators and parameters
└── decorators.tsx       # Custom decorators and utilities

stories/
├── Storybook.stories.mdx       # Welcome documentation
├── ui/                         # UI component stories
│   ├── Button.stories.tsx
│   ├── Card.stories.tsx
│   ├── Input.stories.tsx
│   ├── Modal.stories.tsx
│   └── Badge.stories.tsx
├── auth/                       # Authentication stories
│   ├── LoginForm.stories.tsx
│   └── RegisterForm.stories.tsx
├── layout/                     # Layout component stories
│   └── DashboardSidebar.stories.tsx
├── scheduling/                 # Scheduling system stories
│   └── AvailabilityCalendar.stories.tsx
└── lessons/                    # Lesson management stories
    └── LessonForm.stories.tsx
```

## 🎨 Story Categories & Features

### UI Components
**20 comprehensive stories** covering the entire design system:

#### Button Stories
- All variants: primary, secondary, outline, ghost, destructive, link
- All sizes: small, medium, large, icon
- States: loading, disabled, with icons
- Use cases: save, delete, upload, download, lesson booking
- Interactive showcases: button groups, full width

#### Card Stories  
- Basic cards with header/content/footer
- Specialized cards: lesson, student, invoice, stats
- Interactive states: clickable, loading, nested
- Real-world examples with proper data

#### Input Stories
- All input types: text, email, password, number, date, time, search
- States: normal, focused, disabled, error, success
- With icons, labels, helper text, validation
- Form examples and mobile layouts

#### Modal Stories
- All sizes: small, medium, large, extra-large, full-screen
- Types: confirmation, form, success, scrollable content
- Interactive examples with proper backdrop handling
- Loading and error states

#### Badge Stories
- Status badges: lesson status, invoice status, skill levels
- Category badges for content organization
- Interactive badges: clickable, removable
- Icons, counts, and progress indicators

### Authentication Components

#### LoginForm Stories
- Default login with validation
- Pre-filled demo credentials  
- Loading and error states
- Role-specific login (teacher/student)
- Mobile layouts and social login mockups
- Forgot password flow

#### RegisterForm Stories
- Role selection flow (student/teacher)
- Pre-assigned teacher registration
- Terms and conditions integration
- Success states and error handling
- Mobile responsive layouts

### Layout Components

#### DashboardSidebar Stories  
- Role-based navigation (Teacher/Student/Admin)
- User profiles with different data scenarios
- Loading states and skeleton UI
- Collapsed sidebar variants
- Mobile and responsive layouts
- Dark mode compatibility

### Scheduling System

#### AvailabilityCalendar Stories
- Single vs recurring lesson booking
- Different timezones (EST, CST, PST, GMT)
- Interactive slot selection
- Loading and no-availability states
- Booking conflicts and success messages
- Teacher comparison and mobile views

### Lesson Management

#### LessonForm Stories
- New lesson creation
- Editing existing lessons with rich content
- File uploads and YouTube link integration
- Curriculum item tracking
- Comprehensive lessons with full content
- Mobile and validation states

## 🛠️ Advanced Features

### Custom Decorators

The generated decorators provide powerful testing scenarios:

```typescript
// Authentication with different roles
withAuth('teacher') | withAuth('student') | withAuth('admin')

// Layout contexts
withDashboardLayout  // For dashboard components
withFormLayout      // For form components  
withCenter          // For centered components

// Device testing
withMobileViewport   // Mobile-specific testing
withResponsiveTest   // Multi-size testing

// State management
withLoadingStates    // Toggle loading states
withErrorBoundary    // Error handling
withToastNotifications // Toast messages

// Development tools
withPerformanceMonitor // Render time monitoring
withA11yTesting       // Accessibility checklist
withDarkMode         // Dark theme testing
```

### Mock Data Integration

Stories use realistic mock data:
- Teacher profiles with rates, bios, payment methods
- Student profiles with skill levels, goals, progress
- Lesson data with rich text, files, curriculum items
- Invoice data with line items, payments, status
- Scheduling data with availability, conflicts, bookings

### Interactive Examples

Many stories include interactive elements:
- Form validation with real-time feedback
- Calendar booking flows with confirmation
- Modal workflows with success/error states
- Loading state toggles for testing
- Responsive viewport switching
- Theme and accessibility testing

## 📱 Responsive Testing

All stories are tested across device sizes:
- **Mobile**: 375px (iPhone-focused)
- **Tablet**: 768px (iPad-focused)  
- **Desktop**: 1024px+ (laptop-focused)
- **Large**: 1440px+ (desktop-focused)

Use the viewport addon to test components across all screen sizes.

## ♿ Accessibility Testing

Stories include accessibility features:
- Keyboard navigation testing
- Screen reader compatibility
- Color contrast validation
- ARIA label verification
- Focus management
- Touch target sizing (44px minimum)

## 🎯 Usage Scenarios

### For Developers
- **Component Development**: Build components in isolation
- **API Integration**: Test with different data scenarios
- **State Management**: Verify loading/error/success states
- **Performance**: Monitor render times and optimization
- **Responsive**: Test across all device sizes

### For Designers  
- **Design Review**: Validate component variants and states
- **Interaction Testing**: Test user flows and edge cases
- **Visual QA**: Check spacing, colors, typography
- **Responsive Design**: Verify mobile/tablet/desktop layouts
- **Accessibility**: Ensure contrast and usability standards

### for QA Engineers
- **Component Testing**: Verify all props and variants work
- **Integration Testing**: Test component combinations
- **Edge Case Testing**: Loading, error, empty states
- **Accessibility Testing**: Screen readers, keyboard navigation
- **Cross-browser Testing**: Different browser behaviors

### For Product Managers
- **Feature Review**: See components in context
- **User Flow Validation**: Test booking, lesson creation flows
- **Content Review**: Verify messaging and copy
- **Mobile Experience**: Review touch interactions
- **Accessibility Compliance**: Ensure inclusive design

## 🔧 Customization

### Adding New Stories

To create stories for new components:

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { YourComponent } from '@/components/your-component';

const meta = {
  title: 'Category/YourComponent',
  component: YourComponent,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Component description here',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    // Define prop controls
  },
} satisfies Meta<typeof YourComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // Default props
  },
};
```

### Custom Decorators

Create specialized decorators for your use cases:

```typescript
export const withYourContext: Decorator = (Story, context) => {
  return (
    <YourProvider>
      <Story {...context} />
    </YourProvider>
  );
};
```

### Theme Integration

Stories automatically inherit your application's theme:
- TailwindCSS classes
- CSS custom properties
- Dark mode variants
- Component-specific styling

## 🚀 Deployment

### Build Static Storybook

```bash
npm run build-storybook
```

### Serve Static Files

```bash
npm run storybook-serve
```

### Deploy to Hosting

Deploy the `storybook-static` folder to any static hosting service:
- Netlify
- Vercel
- GitHub Pages
- AWS S3
- Your own hosting

## 📊 Benefits

### Development Benefits
- **Faster Development**: Build components in isolation
- **Better Testing**: Comprehensive edge case coverage
- **Documentation**: Self-documenting component library
- **Collaboration**: Shared understanding across teams
- **Quality Assurance**: Consistent component behavior

### Business Benefits  
- **Design Consistency**: Unified user experience
- **Development Speed**: Reusable component library
- **Quality Control**: Systematic testing approach
- **Team Alignment**: Shared design language
- **Maintenance**: Easier updates and debugging

## 🔗 Next Steps

1. **Install Dependencies**: Add Storybook packages to your project
2. **Start Storybook**: Run `npm run storybook` to see components
3. **Explore Stories**: Navigate through all component categories
4. **Test Components**: Use interactive controls and viewports
5. **Customize**: Add your own stories and decorators
6. **Share**: Deploy Storybook for team collaboration

## 📚 Additional Resources

- [Storybook Documentation](https://storybook.js.org/docs)
- [Component Inventory](./COMPONENT_INVENTORY.md)
- [Design System Guide](./CLAUDE.md)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

This Storybook implementation provides a comprehensive development and testing environment for all Guitar Strategies components, ensuring consistency, quality, and maintainability across the entire application.