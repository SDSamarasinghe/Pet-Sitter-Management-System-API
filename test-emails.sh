#!/bin/bash

# 🧪 Quick Email Testing Script for Pet-Sitter API
# This script helps you quickly test the email notification system

echo "🐾 Pet-Sitter Email Testing Script"
echo "=================================="

# Configuration
BASE_URL="http://localhost:8000"
echo "📍 API Base URL: $BASE_URL"

# Check if server is running
echo "🔍 Checking if server is running..."
if curl -s "$BASE_URL/api/health" > /dev/null; then
    echo "✅ Server is running!"
else
    echo "❌ Server is not running. Please start the server first."
    echo "Run: npm run start:dev"
    exit 1
fi

echo ""
echo "📧 Email Testing Options:"
echo "1. Test new booking creation (client flow)"
echo "2. Test admin booking creation with sitter assignment"
echo "3. Test sitter assignment to existing booking"
echo "4. Get user IDs for testing"
echo ""

read -p "Choose an option (1-4): " choice

case $choice in
    1)
        echo "📝 Testing new booking creation..."
        echo "You'll need to replace USER_ID_HERE with actual user ID"
        echo ""
        echo "Sample curl command:"
        echo 'curl -X POST '$BASE_URL'/bookings \'
        echo '  -H "Content-Type: application/json" \'
        echo '  -H "Authorization: Bearer YOUR_JWT_TOKEN" \'
        echo '  -d '"'"'{
            "userId": "USER_ID_HERE",
            "startDate": "2025-08-25",
            "endDate": "2025-08-27", 
            "serviceType": "Pet Sitting",
            "numberOfPets": 2,
            "petTypes": ["Dog", "Cat"],
            "serviceAddress": "123 Pet Street, Animal City, AC 12345",
            "totalAmount": 150,
            "notes": "Test booking for email notifications",
            "specialInstructions": "This is a test booking to verify email system"
        }'"'"
        ;;
    2)
        echo "👨‍💼 Testing admin booking creation..."
        echo "You'll need admin JWT token and valid user IDs"
        echo ""
        echo "Sample curl command:"
        echo 'curl -X POST '$BASE_URL'/bookings/admin \'
        echo '  -H "Content-Type: application/json" \'
        echo '  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \'
        echo '  -d '"'"'{
            "userId": "CLIENT_USER_ID",
            "sitterId": "SITTER_USER_ID",
            "startDate": "2025-08-30",
            "endDate": "2025-09-02",
            "serviceType": "Pet Sitting", 
            "numberOfPets": 1,
            "petTypes": ["Dog"],
            "serviceAddress": "456 Dog Lane, Pet City, PC 67890",
            "totalAmount": 200,
            "status": "assigned",
            "notes": "Admin test booking"
        }'"'"
        ;;
    3)
        echo "👤 Testing sitter assignment..."
        echo "You'll need booking ID and sitter ID"
        echo ""
        echo "Sample curl command:"
        echo 'curl -X PUT '$BASE_URL'/bookings/BOOKING_ID/assign-sitter \'
        echo '  -H "Content-Type: application/json" \'
        echo '  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \'
        echo '  -d '"'"'{
            "sitterId": "SITTER_USER_ID"
        }'"'"
        ;;
    4)
        echo "📋 Getting user IDs for testing..."
        echo ""
        echo "Get clients:"
        echo "curl -X GET $BASE_URL/users/admin/clients -H \"Authorization: Bearer ADMIN_JWT_TOKEN\""
        echo ""
        echo "Get sitters:"
        echo "curl -X GET $BASE_URL/users/admin/sitters -H \"Authorization: Bearer ADMIN_JWT_TOKEN\""
        ;;
    *)
        echo "❌ Invalid option selected"
        exit 1
        ;;
esac

echo ""
echo "📋 After running the test:"
echo "1. Check server logs for email sending confirmations"
echo "2. Check email inboxes (admin, client, sitter)"
echo "3. Verify booking was created in database"
echo ""
echo "🔍 Expected log messages:"
echo "- 'Email notifications sent for booking [ID]'"
echo "- 'Sitter assignment notification sent for booking [ID]'"
echo ""
echo "📧 Expected emails:"
echo "- Admin: Booking notification with complete details"
echo "- Client: Booking confirmation with next steps"
echo "- Sitter: Assignment notification with client info"
