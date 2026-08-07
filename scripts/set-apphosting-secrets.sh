#!/usr/bin/env bash
# Load .env.local and push values to Firebase App Hosting secrets.
# Usage: ./scripts/set-apphosting-secrets.sh
# Requires: firebase login, Blaze plan, backend created via firebase init apphosting

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy .env.example and fill in values."
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

set_secret() {
  local name="$1"
  local value="${!name:-}"
  if [[ -z "$value" ]]; then
    echo "Skip $name (empty)"
    return
  fi
  printf '%s' "$value" | npx firebase apphosting:secrets:set "$name" --data-file=-
  echo "Set $name"
}

for key in \
  GEMINI_API_KEY \
  YOUTUBE_API_KEY \
  NEXT_PUBLIC_FIREBASE_API_KEY \
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
  NEXT_PUBLIC_FIREBASE_PROJECT_ID \
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET \
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID \
  NEXT_PUBLIC_FIREBASE_APP_ID; do
  set_secret "$key"
done

echo "Grant backend access to secrets (replace fitmomguide if you used another backend ID):"
echo "  npx firebase apphosting:secrets:grantaccess --backend fitmomguide"
