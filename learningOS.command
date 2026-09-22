#!/bin/bash
cd "$(dirname "$0")/learning-os" || exit

PORT=64296

echo "Killing existing process on port $PORT if it exists..."
lsof -ti tcp:$PORT | xargs kill 2>/dev/null || true

echo "Starting learning-os server on port $PORT..."

# Wait a couple of seconds and open the browser
(sleep 3 && open http://localhost:$PORT) &

PORT=$PORT npm run dev
