#!/bin/bash
# Script to get authentication token from PelangiManager

API_URL=${1:-"http://localhost:5000"}

echo "Getting authentication token from $API_URL"
echo "=========================================="
echo ""

# Prompt for credentials
read -p "Enter email/username: " EMAIL
read -sp "Enter password: " PASSWORD
echo ""

# Login and get token
RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

# Extract token using jq
TOKEN=$(echo "$RESPONSE" | jq -r '.token')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  echo ""
  echo "✅ Login successful!"
  echo ""
  echo "Your token:"
  echo "$TOKEN"
  echo ""
  echo "Add this to your .env file:"
  echo "PELANGI_API_TOKEN=$TOKEN"
  echo ""

  # Optionally update .env file
  read -p "Update .env file automatically? (y/n): " UPDATE
  if [ "$UPDATE" = "y" ]; then
    # Update the token in .env
    if [ -f .env ]; then
      sed -i "s/PELANGI_API_TOKEN=.*/PELANGI_API_TOKEN=$TOKEN/" .env
      echo "✅ .env file updated!"
    else
      echo "PELANGI_API_TOKEN=$TOKEN" >> .env
      echo "✅ .env file created!"
    fi
  fi
else
  echo ""
  echo "❌ Login failed!"
  echo "Response: $RESPONSE"
fi
