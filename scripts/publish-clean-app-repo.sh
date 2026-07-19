#!/usr/bin/env bash
# Publish a clean app-only tree to r3s0lv343vr/pm-r3s0lv343vr (main).
# Does NOT delete pitch-rise-verification branches.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${TMPDIR:-/tmp}/pm-r3s0lv343vr-clean-export"
REPO_URL="${REPO_URL:-https://github.com/r3s0lv343vr/pm-r3s0lv343vr.git}"

rm -rf "$DEST"
mkdir -p "$DEST"

# Copy app sources only — exclude Pitch Rise ballot artifacts and local junk.
tar -C "$ROOT" \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.vercel' \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='PUBLIC_URL.txt' \
  --exclude='verifications' \
  --exclude='docs/pitch-rise-verification' \
  --exclude='*.tsbuildinfo' \
  -cf - . | tar -C "$DEST" -xf -
rm -rf "$DEST/verifications" "$DEST/docs/pitch-rise-verification" 2>/dev/null || true

# Drop historical Pitch Rise note from the clean README export if a stub remains.
if [[ -d "$DEST/docs/pitch-rise-verification" ]]; then
  rm -rf "$DEST/docs/pitch-rise-verification"
fi

cd "$DEST"
git init -b main
git add -A
git -c user.email="r3s0lv343vr@users.noreply.github.com" -c user.name="r3s0lv343vr" \
  commit -m "chore: initial import of Project Intelligence Platform (Phase 1)"

# Create remote repo if missing (requires auth as r3s0lv343vr with repo scope).
if ! gh repo view r3s0lv343vr/pm-r3s0lv343vr >/dev/null 2>&1; then
  gh repo create r3s0lv343vr/pm-r3s0lv343vr \
    --public \
    --description "Hult Cohort Project 1 — Project Intelligence Platform (PM)" \
    --source=. \
    --remote=origin \
    --push
else
  git remote add origin "$REPO_URL"
  git push -u origin main
fi

echo "Published: $REPO_URL"
echo "Historical branch left untouched on pitch-rise-verification."
