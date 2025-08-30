# 🧪 Correct Email Test - Postman & Curl Commands

## 📝 Test Booking with Your Real Data

### Curl Command (Ready to Use)
```bash
curl -X POST http://localhost:8000/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "startDate": "2025-08-29T03:30:00.000Z",
    "endDate": "2025-08-29T04:15:00.000Z", 
    "serviceType": "pet-sitting",
    "numberOfPets": 1,
    "petTypes": ["Dog(s)"],
    "totalAmount": 40,
    "sitterId": "688f2368d9ab7e18b048a578",
    "notes": "Booking created from dashboard availability check.",
    "specialInstructions": "Service: Once A Day Pet Sitting 45min - C$40. Time: 09:00 - 09:45",
    "clientNotes": "Preferred sitter: Angie Rohan. Selected based on availability check."
  }'
```

### Postman Collection Import
```json
{
  "info": {
    "name": "Email Test - Real Booking Data",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:8000"
    },
    {
      "key": "jwt_token",
      "value": "YOUR_JWT_TOKEN_HERE"
    }
  ],
  "item": [
    {
      "name": "📧 Email Test - Create Booking",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "Authorization", 
            "value": "Bearer {{jwt_token}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"startDate\": \"2025-08-29T03:30:00.000Z\",\n  \"endDate\": \"2025-08-29T04:15:00.000Z\",\n  \"serviceType\": \"pet-sitting\",\n  \"numberOfPets\": 1,\n  \"petTypes\": [\"Dog(s)\"],\n  \"totalAmount\": 40,\n  \"sitterId\": \"688f2368d9ab7e18b048a578\",\n  \"notes\": \"Booking created from dashboard availability check.\",\n  \"specialInstructions\": \"Service: Once A Day Pet Sitting 45min - C$40. Time: 09:00 - 09:45\",\n  \"clientNotes\": \"Preferred sitter: Angie Rohan. Selected based on availability check.\"\n}"
        },
        "url": {
          "raw": "{{base_url}}/bookings",
          "host": ["{{base_url}}"],
          "path": ["bookings"]
        }
      }
    }
  ]
}
```

## 🎯 Expected Results

**Request will create booking for:**
- **Service:** Once A Day Pet Sitting (45 minutes)
- **Time:** 09:00 - 09:45 on August 29, 2025
- **Pet:** 1 Dog
- **Amount:** $40 CAD
- **Assigned Sitter:** Angie Rohan (ID: 688f2368d9ab7e18b048a578)

**Emails will be sent to:**
1. **Admin** - New booking notification with all details
2. **Client** (from JWT token) - Booking confirmation 
3. **Angie Rohan** - Sitter assignment notification

## 📧 Email Content Preview

**Admin Email:**
```
Subject: New Booking Request - [Client Name from JWT]

🐾 Pet-Sitting Booking Created
- Client: [From JWT token user]
- Service Dates: Aug 29, 2025 (03:30 - 04:15)
- Service: pet-sitting
- Pets: 1 Dog(s)
- Amount: $40
- Assigned Sitter: Angie Rohan
- Notes: Booking created from dashboard availability check
- Instructions: Service: Once A Day Pet Sitting 45min - C$40. Time: 09:00 - 09:45
```

**Client Email:**
```
Subject: Booking Confirmation - Whiskarz Pet-Sitting

🐾 Booking Confirmed!
Your pet-sitting service has been booked for August 29, 2025
Total: $40
Sitter: Will be contacted shortly
```

**Sitter Email (Angie Rohan):**
```
Subject: New Pet-Sitting Assignment - [Client Name]

🎉 You have been assigned a new pet-sitting booking!
Service: Aug 29, 2025 (09:00 - 09:45)
Duration: 45 minutes
Payment: $40
Pet: 1 Dog
Client Notes: Preferred sitter selection based on availability
```

## 🚀 Test Steps

1. **Replace JWT Token:** Get valid token from login endpoint
2. **Run curl command** or import into Postman
3. **Watch server logs** for: "Email notifications sent for booking [ID]"
4. **Check 3 email inboxes** (admin, client, sitter)
5. **Verify booking created** in database

## 🔧 Get JWT Token First

```bash
# Login to get JWT token
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "client@example.com",
    "password": "password123"
  }'
```

Use the returned `access_token` in the Authorization header.
