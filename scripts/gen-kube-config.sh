#!/usr/bin/env bash
# Produces ./kubeconfig — a copy of ~/.kube/config with 127.0.0.1 replaced
# by host.docker.internal so the server container can reach the k8s API.
set -euo pipefail

OUT=./kubeconfig
cp "${HOME}/.kube/config" "$OUT"
sed -i '' 's|https://127\.0\.0\.1|https://host.docker.internal|g' "$OUT"
echo "Written: $OUT"
