#!/bin/bash

# Script to test CI Playwright configuration locally
# Usage: ./scripts/test-ci-config.sh

set -e  # Exit on error

echo "🧪 Testing CI Playwright Configuration Locally"
echo "================================================"

# Set environment variables
export DATABASE_URL="postgresql://neondb_owner:npg_mCx9oIVB8MWy@ep-mute-violet-a4pa5r9o-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
export NEXTAUTH_SECRET="pfmHw5OzPVkp8ubUhGzOq/UhW2QWMamO6bQ55XLakcg="
export NEXTAUTH_URL="http://localhost:3000"

echo "✅ Environment variables set"

# Setup database
echo ""
echo "🗄️  Setting up test database..."
npx prisma generate
npx prisma migrate reset --force
npm run seed

echo ""
echo "🎭 Running Playwright tests with CI config..."
echo ""

# Run tests
npx playwright test --config=playwright.config.ci.ts

echo ""
echo "✅ Test run complete!"
