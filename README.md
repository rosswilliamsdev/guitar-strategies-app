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

### Core Application
- **Framework**: Next.js 15.4.6 with App Router
- **Language**: TypeScript 5
- **Database**: PostgreSQL with Prisma ORM 6.13.0 (hosted on Neon)
- **Authentication**: NextAuth.js v4.24.11
- **Styling**: TailwindCSS 3.4.17 + Typography plugin
- **Rich Text**: Tiptap editor with React integration
- **UI Components**: Radix UI primitives
- **Icons**: Lucide React
- **Validation**: Zod schemas

### AWS Infrastructure
- **Hosting**: EC2 with Docker containerization
- **Container Registry**: Amazon ECR
- **File Storage**: S3 with public read access
- **Automated Jobs**: Lambda + EventBridge (daily lesson generation)
- **Monitoring**: CloudWatch logs and metrics
- **Email**: Resend (external service)

See [AWS Setup Guide](./openspec/changes/aws-service-expansion/AWS_SETUP_GUIDE.md) for detailed configuration.

## 🔒 Security & Operations

### Automated Security Scanning
- **npm audit** - Dependency vulnerability scanning on every PR
- **Trivy** - Docker image vulnerability scanning (OS + Node.js CVEs)
- **Dependabot** - Automated security patch PRs (weekly)
- **SARIF Upload** - Vulnerability tracking in GitHub Security tab

### CI/CD Pipeline
- **Type checking** - TypeScript strict mode (`tsc --noEmit`)
- **Linting** - ESLint with Next.js config
- **Unit tests** - Vitest (100% API route coverage)
- **E2E tests** - Playwright (15 test suites covering auth, scheduling, invoicing)
- **Build verification** - Ensures production builds succeed
- **Security gates** - Blocks PRs with high/critical vulnerabilities

### Deployment
- **Image Registry** - Amazon ECR with commit-hash tagging
- **Immutable Tags** - Every deploy uses exact commit hash (no "latest")
- **Health Checks** - `/api/health` endpoint verifies DB, S3, and system health
- **Automated Rollback** - Failed health checks trigger automatic rollback

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

Create a `.env` file with the following required variables:

```bash
# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# Authentication (NextAuth.js)
NEXTAUTH_SECRET="your-secret-key-here"  # Generate with: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"

# AWS S3 (File Storage) - Optional for local development
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key-id"
AWS_SECRET_ACCESS_KEY="your-secret-access-key"
S3_BUCKET_NAME="guitar-strategies-files"

# Email (Resend) - Optional for local development
RESEND_API_KEY="re_..."

# OpenAI (Voice-to-text lesson notes) - Optional
OPENAI_API_KEY="sk-proj-..."
```

See [AWS Setup Guide](./openspec/changes/aws-service-expansion/AWS_SETUP_GUIDE.md) for S3 configuration.

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

## 📞 Support

For development questions or issues:

- Review the [CLAUDE.md](./CLAUDE.md) development guide
- Open an issue for bugs or feature requests

**Built with ❤️ for music teachers and students everywhere** 🎸
