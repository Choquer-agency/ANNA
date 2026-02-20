#!/bin/bash
# Ensures cross-architecture native modules are present in node_modules
# for building both arm64 and x64 Electron builds.
# npm refuses to install packages whose "cpu" field doesn't match the host,
# so we download and extract them manually.

set -e

WHISPER_VERSION="1.0.16"

install_if_missing() {
  local pkg_name="$1"
  local pkg_dir="node_modules/@fugood/$pkg_name"

  if [ -d "$pkg_dir" ] && [ -f "$pkg_dir/index.node" ]; then
    echo "[cross-arch] $pkg_name already present, skipping"
    return
  fi

  echo "[cross-arch] Installing $pkg_name@$WHISPER_VERSION..."
  local tarball
  tarball=$(npm pack "@fugood/$pkg_name@$WHISPER_VERSION" --pack-destination /tmp/ 2>/dev/null | tail -1)
  mkdir -p "$pkg_dir"
  tar -xzf "/tmp/$tarball" -C "$pkg_dir" --strip-components=1
  rm -f "/tmp/$tarball"
  echo "[cross-arch] $pkg_name installed"
}

# Install the architecture we're NOT running on
if [ "$(uname -m)" = "arm64" ]; then
  install_if_missing "node-whisper-darwin-x64"
else
  install_if_missing "node-whisper-darwin-arm64"
fi
