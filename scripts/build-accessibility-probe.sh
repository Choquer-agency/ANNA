#!/bin/bash
# Compile the accessibility-probe Swift binary as a universal (arm64 + x64) macOS binary
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SRC="$PROJECT_DIR/resources/accessibility-probe.swift"
OUT="$PROJECT_DIR/resources/accessibility-probe"

swiftc -O -target arm64-apple-macosx11.0 -o "${OUT}-arm64" "$SRC"
swiftc -O -target x86_64-apple-macosx11.0 -o "${OUT}-x64" "$SRC"
lipo -create "${OUT}-arm64" "${OUT}-x64" -output "$OUT"
rm "${OUT}-arm64" "${OUT}-x64"
chmod +x "$OUT"

echo "Built universal accessibility-probe at $OUT"
