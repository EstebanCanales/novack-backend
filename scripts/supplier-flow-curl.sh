#!/bin/bash

# Variables
API_URL="http://localhost:4000" # Changed to default NestJS port
SUPPLIER_EMAIL="supplier@test.com"
FIRST_EMPLOYEE_EMAIL="user1@testsupplier.com"
SECOND_EMPLOYEE_EMAIL="user2@testsupplier.com"

# 1. Create supplier
echo "Creating supplier..."
SUPPLIER_RESPONSE=$(curl -s -X POST "${API_URL}/suppliers" \
  -H "Content-Type: application/json" \
  -d '{
    "supplier_name": "Test Supplier",
    "supplier_creator": "John Contact",
    "contact_email": "'${SUPPLIER_EMAIL}'",
    "phone_number": "987654321",
    "address": "Test Address 123",
    "description": "Test supplier company description",
    "logo_url": "https://testsupplier.com/logo.png",
    "additional_info": "Working hours: 9-5",
    "is_subscribed": true,
    "has_card_subscription": true,
    "has_sensor_subscription": false,
    "employee_count": 2,
    "card_count": 0
  }')

SUPPLIER_ID=$(echo $SUPPLIER_RESPONSE | jq -r '.id')
echo "Supplier created with ID: ${SUPPLIER_ID}"

# Employee creation has been removed as the endpoints are not yet implemented

# 4. Get supplier details
echo -e "\nGetting supplier details..."
curl -s -X GET "${API_URL}/suppliers/${SUPPLIER_ID}" | jq '.'

# 5. Update supplier
echo -e "\nUpdating supplier..."
curl -s -X PATCH "${API_URL}/suppliers/${SUPPLIER_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "supplier_name": "Updated Test Supplier",
    "address": "Updated Test Address 123",
    "description": "Updated supplier description"
  }' | jq '.'

# 6. Get all suppliers
echo -e "\nGetting all suppliers..."
curl -s -X GET "${API_URL}/suppliers" | jq '.'

# 7. Delete supplier (uncomment if needed)
# echo -e "\nDeleting supplier..."
# curl -s -X DELETE "${API_URL}/suppliers/${SUPPLIER_ID}" -w "\nStatus: %{http_code}\n"

