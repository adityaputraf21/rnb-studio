#!/bin/sh
set -e

# frps needs a config file — we generate it at container start so the auth
# token can come from a Railway environment variable instead of being
# hardcoded into the image.
cat > /app/frps.toml <<EOF
bindPort = 7000
auth.method = "token"
auth.token = "${FRP_AUTH_TOKEN:-changeme-set-FRP_AUTH_TOKEN}"
EOF

if [ "${ENABLE_FRP_TUNNEL:-false}" = "true" ]; then
  echo "FRP tunnel enabled — starting frps on port 7000..."
  frps -c /app/frps.toml &
else
  echo "FRP tunnel disabled (ENABLE_FRP_TUNNEL not set to true) — skipping frps."
fi

# Run the main app in the foreground so the container's lifecycle follows it
exec node server/index.js
