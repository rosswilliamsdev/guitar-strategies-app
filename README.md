# Guitar Strategies 🎸

[![Development Status](https://img.shields.io/badge/status-production%20ready-brightgreen.svg)]()
[![Next.js](https://img.shields.io/badge/Next.js-15.4.6-black.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)]()
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Latest-blue.svg)]()

A complete guitar lesson management platform with built-in scheduling, invoicing, and student progress tracking. Teachers and administrators handle all scheduling while students access their lesson history, progress, and learning materials.

## 🚀 Overview

**Guitar Strategies** is a comprehensive lesson management platform with admin, teacher, and student roles.

### ✨ Complete Feature Set

#### **🗓️ Teacher-Managed Scheduling**

- **Teacher Availability Management** - Set weekly schedules with customizable time slots
- **Admin/Teacher Scheduling** - Teachers and admins handle all student scheduling
- **Recurring Lessons** - Set up weekly recurring time slots for students
- **Blocked Time Management** - Vacation and personal time blocking
- **Timezone Support** - Automatic UTC conversion and display

#### **💰 Invoicing & Payment Tracking**

- **Monthly Invoice Generation** - Automatic invoices based on scheduled lessons
- **Payment Method Integration** - Venmo, PayPal, Zelle payment options
- **Payment Tracking** - Mark payments received with method and notes
- **Professional Templates** - Clean, branded invoice formatting

#### **📚 Content & Progress Management**

- **Rich Text Lesson Logging** - Post-lesson notes with formatting toolbar
- **Library System** - macOS Finder-style file management for lesson materials
- **Student Progress Tracking** - Checklist system with celebratory completions
- **Recommendations Engine** - Teachers recommend gear, books, and apps

#### **🔐 Professional Platform Features**

- **Role-Based Authentication** - Student, Teacher, and Admin accounts with proper security
- **Email Notification System** - Automated booking confirmations, reminders, and updates
- **Admin Dashboard** - Complete user management, activity monitoring, and system health
- **Production-Ready Architecture** - Rate limiting, caching, error handling, and retry logic

## 🛠️ Tech Stack

- **Framework**: Next.js 15.4.6 with App Router
- **Language**: TypeScript 5
- **Database**: PostgreSQL with Prisma ORM 6.13.0
- **Authentication**: NextAuth.js v4.24.11
- **Styling**: TailwindCSS 3.4.17 + Typography plugin
- **Rich Text**: Tiptap editor with React integration
- **UI Components**: Radix UI primitives
- **Icons**: Lucide React
- **Validation**: Zod schemas

## 🏃‍♂️ Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Git

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/your-username/guitar-strategies-app.git
cd guitar-strategies-app
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

```bash
cp .env.example .env
# Update .env with your database URL and auth secret
```

4. **Set up the database**

```bash
npm run db:setup    # Initialize database
npm run seed        # Create test users
```

5. **Start the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 👥 Test Accounts

The seeding script creates test accounts for all user roles:

```bash
# Admin Account
Email: admin@guitarstrategies.com
Password: Admin123!

# Teacher Account
Email: teacher@guitarstrategies.com
Password: Admin123!

# Student Account
Email: student@guitarstrategies.com
Password: Admin123!
```

## 🗂️ Project Structure

```
guitar-strategies-app/
├── app/                          # Next.js App Router pages
│   ├── (auth)/                   # Authentication pages
│   ├── (dashboard)/              # Main application pages
│   └── api/                      # API routes
├── components/                   # React components
│   ├── ui/                       # Base UI components
│   ├── dashboard/                # Dashboard-specific components
│   ├── lessons/                  # Lesson management
│   ├── settings/                 # User settings
│   └── layout/                   # Navigation and layout
├── lib/                          # Utilities and configuration
├── prisma/                       # Database schema and migrations
├── CLAUDE.md                     # Development reference guide
└── CHANGELOG.md                  # Detailed change history
```

## 📖 Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Complete development reference guide
- **[CHANGELOG.md](./CHANGELOG.md)** - Detailed history of all changes
- **API Documentation** - Available endpoints and schemas

## 🧪 Development Workflow

### Current Lesson Workflow

1. **Availability Setup**: Teachers configure weekly availability in settings
2. **Scheduling**: Teachers or admins schedule students for time slots
3. **Teaching**: Lesson happens (in-person or online)
4. **Logging**: Teacher quickly logs lesson in app:
   - Select student from dropdown
   - Add rich text notes with formatting
   - Date/time auto-recorded (30min default)
5. **Tracking**: All data stored for progress and billing

### Database Commands

```bash
npm run db:reset     # Reset database schema
npm run db:migrate   # Run pending migrations
npm run db:studio    # Open Prisma Studio
npm run seed         # Seed test data
```

### Code Quality

```bash
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
npm run build        # Production build test
```

## 🎨 Design System

Built with an **OpenAI-inspired design** using:

- **Neutral grays** as the primary palette
- **Turquoise accents** (#14b8b3) for interactive elements
- **Inter font** for clean, professional typography
- **Subtle shadows** and clean borders
- **Responsive, mobile-first** approach

## 🔒 Security & Validation

- **Type-safe** with comprehensive TypeScript
- **Input validation** with Zod schemas
- **Authentication** with NextAuth.js and database sessions
- **Role-based access** control throughout application
- **Password hashing** with bcrypt
- **CSRF protection** and secure headers

## 🤝 Contributing

This project is currently in **active development**. While not ready for external contributions yet, the codebase follows these principles:

- **Consistent code style** with ESLint and Prettier
- **Type safety** - no `any` types allowed
- **Component reusability** with clear prop interfaces
- **Comprehensive validation** on all user inputs
- **Mobile-responsive** design patterns

## 📜 License

This project is currently **private** and in development. License will be determined before public release.

## 🔮 Roadmap

### Phase 1: Core MVP ✅

- [x] Authentication & user management
- [x] Basic lesson logging
- [x] Dashboard views
- [x] Settings management

### Phase 2: Enhanced Features ✅

- [x] Rich text lesson notes
- [x] Library system
- [x] Recommendations engine
- [x] Internal scheduling system
- [x] Invoice generation and payment tracking
- [x] Email notification system
- [x] Student progress checklists

### Phase 3: Production Ready ✅

- [x] Admin dashboard and user management
- [x] Production architecture (rate limiting, caching, error handling)
- [x] Professional UI with OpenAI-inspired design
- [x] Performance optimization
- [x] Email preferences and notification system

---

## 📞 Support

For development questions or issues:

- Review the [CLAUDE.md](./CLAUDE.md) development guide
- Check [CHANGELOG.md](./CHANGELOG.md) for recent changes
- Open an issue for bugs or feature requests

**Built with ❤️ for music teachers and students everywhere** 🎸
