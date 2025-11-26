#!/bin/bash
# Test script for running onstar2mqtt with local tokens

# Build the test image (if needed)
# docker build -t onstar2mqtt-test .

# Run with .env file (Vehicle 1)
echo "Running test with .env (Vehicle 1)..."
docker run --rm \
  --env-file .env \
  -e TOKEN_LOCATION=/app/tokens \
  -v "$PWD/gm_tokens.json:/app/tokens/gm_tokens.json" \
  -v "$PWD/microsoft_tokens.json:/app/tokens/microsoft_tokens.json" \
  onstar2mqtt-test

# Run with .env.docker file (Vehicle 2)
# echo "Running test with .env.docker (Vehicle 2)..."
# docker run --rm \
#   --env-file .env.docker \
#   -e TOKEN_LOCATION=/app/tokens \
#   -v "$PWD/gm_tokens.json:/app/tokens/gm_tokens.json" \
#   -v "$PWD/microsoft_tokens.json:/app/tokens/microsoft_tokens.json" \
#   onstar2mqtt-test
