#!/bin/bash
set -e

echo "🧹 Cleaning up any stale Xvfb processes and state..."

# Kill any existing Xvfb processes
pkill -9 Xvfb 2>/dev/null || true

# Clean up X11 lock files and sockets
rm -rf /tmp/.X*-lock /tmp/.X11-unix 2>/dev/null || true

echo "✅ Cleanup complete, starting application..."

# Execute the application
exec "$@"
