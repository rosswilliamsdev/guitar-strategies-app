#!/bin/bash
# Quick script to test the Playwright global auth setup locally

set -e

echo "🧪 Testing Playwright Authentication Setup"
echo "==========================================="
echo ""

# Remove old auth files to force fresh authentication
echo "🗑️  Removing old auth files..."
rm -f playwright/.auth/teacher.json
rm -f playwright/.auth/student.json
rm -f playwright/.auth/error-screenshot.png

echo ""
echo "🏗️  Building production Next.js app..."
npm run build

echo ""
echo "🚀 Starting standalone server in background..."
node .next/standalone/server.js &
SERVER_PID=$!

# Give server time to start
echo "⏳ Waiting for server to be ready..."
sleep 5

# Wait for server to respond
MAX_ATTEMPTS=30
ATTEMPT=1
until curl -s http://localhost:3000 > /dev/null 2>&1; do
  if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo "❌ Server failed to start after ${MAX_ATTEMPTS} attempts"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
  fi
  echo "   Attempt $ATTEMPT/$MAX_ATTEMPTS - waiting for server..."
  sleep 2
  ATTEMPT=$((ATTEMPT + 1))
done

echo "✅ Server is ready!"
echo ""

# Run the global setup
echo "🔐 Running global authentication setup..."
npx playwright test --config=playwright.config.ci.ts --list > /dev/null 2>&1 || true
node -r esbuild-register playwright/global-setup.ts || {
  EXIT_CODE=$?
  echo ""
  echo "❌ Global setup failed with exit code: $EXIT_CODE"
  echo ""

  # Show screenshot if available
  if [ -f playwright/.auth/error-screenshot.png ]; then
    echo "📸 Error screenshot saved at: playwright/.auth/error-screenshot.png"
  fi

  # Kill server
  kill $SERVER_PID 2>/dev/null || true
  exit $EXIT_CODE
}

echo ""
echo "✅ Authentication setup completed successfully!"
echo ""

# Verify auth files were created
if [ -f playwright/.auth/teacher.json ] && [ -f playwright/.auth/student.json ]; then
  echo "✅ Auth files created:"
  echo "   - playwright/.auth/teacher.json ($(wc -c < playwright/.auth/teacher.json) bytes)"
  echo "   - playwright/.auth/student.json ($(wc -c < playwright/.auth/student.json) bytes)"
else
  echo "❌ Auth files were not created!"
  kill $SERVER_PID 2>/dev/null || true
  exit 1
fi

echo ""
echo "🧹 Cleaning up..."
kill $SERVER_PID 2>/dev/null || true

echo ""
echo "🎉 All tests passed!"
