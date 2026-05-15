#!/usr/bin/env bash
set -euo pipefail

# Install Node.js v22 + pnpm 10.33.0 (run as root or with sudo)

echo "==> Installing Node.js v22 via NodeSource..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

echo "==> Enabling corepack..."
corepack enable

echo "==> Activating pnpm 10.33.0..."
corepack prepare pnpm@10.33.0 --activate

echo ""
echo "==> Done. Versions:"
node --version
pnpm --version
