#!/bin/bash
# MCP Server Test Script

BASE_URL=${1:-"http://localhost:3001"}

echo "Testing Pelangi MCP Server at $BASE_URL"
echo "========================================"
echo ""

# Test 1: Health check
echo "1. Health Check"
curl -s "$BASE_URL/health" | jq '.'
echo ""

# Test 2: List tools
echo "2. List Available Tools"
curl -s -X POST "$BASE_URL/mcp" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}' | jq '.result.tools[] | {name, description}'
echo ""

# Test 3: Initialize
echo "3. Initialize MCP"
curl -s -X POST "$BASE_URL/mcp" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","id":0}' | jq '.result'
echo ""

# Test 4: Call tool - Get Occupancy
echo "4. Test Tool: Get Occupancy"
curl -s -X POST "$BASE_URL/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"tools/call",
    "params":{
      "name":"pelangi_get_occupancy",
      "arguments":{}
    },
    "id":2
  }' | jq '.result.content[0].text | fromjson'
echo ""

# Test 5: Call tool - Check Availability
echo "5. Test Tool: Check Availability"
curl -s -X POST "$BASE_URL/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"tools/call",
    "params":{
      "name":"pelangi_check_availability",
      "arguments":{}
    },
    "id":3
  }' | jq '.result.content[0].text | fromjson | length'
echo " available capsules"
echo ""

# Test 6: Call tool - Export WhatsApp Issues
echo "6. Test Tool: Export WhatsApp Issues"
curl -s -X POST "$BASE_URL/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"tools/call",
    "params":{
      "name":"pelangi_export_whatsapp_issues",
      "arguments":{}
    },
    "id":4
  }' | jq -r '.result.content[0].text'
echo ""

echo "========================================"
echo "Tests Complete!"
