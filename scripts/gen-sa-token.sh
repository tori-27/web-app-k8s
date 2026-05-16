#!/usr/bin/env bash
# Generates a service-account token + CA bundle that the server-incluster
# compose service mounts at /var/run/secrets/kubernetes.io/serviceaccount/.
set -euo pipefail

SA=webapp-dev
NS=default
OUT=./serviceaccount

kubectl create serviceaccount "$SA" -n "$NS" --dry-run=client -o yaml | kubectl apply -f -
kubectl create clusterrolebinding "$SA" \
  --clusterrole=view \
  --serviceaccount="$NS:$SA" \
  --dry-run=client -o yaml | kubectl apply -f -

mkdir -p "$OUT"
kubectl create token "$SA" -n "$NS" > "$OUT/token"
kubectl config view --raw --minify \
  -o jsonpath='{.clusters[0].cluster.certificate-authority-data}' \
  | base64 -d > "$OUT/ca.crt"
echo -n "$NS" > "$OUT/namespace"

# Export vars needed by docker-compose.yml
CLUSTER_URL=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')
HOST=$(echo "$CLUSTER_URL" | sed -E 's|https?://([^:/]+).*|\1|')
PORT=$(echo "$CLUSTER_URL" | sed -E 's|.*:([0-9]+)$|\1|; s|https?://.*||')
PORT=${PORT:-443}

echo "export KUBERNETES_SERVICE_HOST=$HOST"
echo "export KUBERNETES_SERVICE_PORT=$PORT"
echo ""
echo "Token written to $OUT/. Run:"
echo "  source <(./scripts/gen-sa-token.sh)"
echo "  docker compose --profile incluster up"
