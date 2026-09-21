#!/bin/bash
# YTS Learning OS — one-click launcher (also the .command fallback).
# First run: installs deps, builds. Every run: starts the server,
# waits until it is up, opens the browser, and stops the server when this window
# is closed. Never starts a second server if one is already running.

APP="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP" || exit 1
PORT=3210
URL="http://localhost:$PORT"
PIDFILE="$APP/.launcher.pid"

log() { printf "\033[1;35m[Learning OS]\033[0m %s\n" "$1"; }

# --- Already running? (live pidfile OR port responds) -> just open the browser.
if { [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE" 2>/dev/null)" 2>/dev/null; } || curl -s -o /dev/null "$URL"; then
  log "Server is already running — opening the browser."
  open "$URL"
  exit 0
fi

if ! command -v node >/dev/null 2>&1; then
  log "Node.js is required. Install it from https://nodejs.org, then double-click again."
  read -n 1 -s -r -p "Press any key to close."
  exit 1
fi

[ -d node_modules ] || { log "First run: installing dependencies (one-time, ~1 min)…"; npm install || exit 1; }
[ -d .next ] || { log "Building the app (one-time)…"; npm run build || exit 1; }

log "Starting the server on $URL …"
PORT="$PORT" npm run start >/tmp/yts-learning-os.log 2>&1 &
SERVER_PID=$!
echo "$SERVER_PID" > "$PIDFILE"

cleanup() { log "Stopping the server…"; kill "$SERVER_PID" 2>/dev/null; rm -f "$PIDFILE"; }
trap cleanup EXIT INT TERM

# Wait until the server answers (up to 60s), then open the browser.
for _ in $(seq 1 60); do curl -s -o /dev/null "$URL" && break; sleep 1; done
log "Ready. Opening the browser."
open "$URL"
log "Keep this window open while you use the app. Close it (or press Ctrl+C) to stop the server."
wait "$SERVER_PID"
