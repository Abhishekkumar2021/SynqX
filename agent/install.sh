#!/bin/bash
set -e

echo "Standardizing SynqX Agent Environment (Latest 2025 Standards)..."

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --api-url) API_URL="$2"; shift ;;
        --client-id) CLIENT_ID="$2"; shift ;;
        --api-key) API_KEY="$2"; shift ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

if [ -z "$CLIENT_ID" ] || [ -z "$API_KEY" ]; then
    echo "[ERROR] Error: --client-id and --api-key are required."
    exit 1
fi

INSTALL_DIR="$HOME/.synqx-agent"
mkdir -p "$INSTALL_DIR"

# Check for UV (The fastest Python manager)
# THE PROFESSIONAL WAY: Install and Configure
echo "Installing synqx-agent CLI..."
pip install --upgrade pip
pip install -e .

echo "Persisting configuration..."
# Configuration
cat <<EOF > "$INSTALL_DIR/.env"
SYNQX_API_URL="${API_URL:-http://localhost:8000/api/v1}"
SYNQX_CLIENT_ID="${CLIENT_ID}"
SYNQX_API_KEY="${API_KEY}"
SYNQX_TAGS="default"
EOF



echo "[SUCCESS] Done! You can now start the agent using the global command:"
echo "------------------------------------------------"
echo "source $INSTALL_DIR/venv/bin/activate"
echo "synqx-agent start"
echo "------------------------------------------------"