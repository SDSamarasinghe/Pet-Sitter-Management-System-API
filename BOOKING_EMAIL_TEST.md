# 🧪 Email Test with Your Booking Data

## Test Booking Payload
Based on your provided data, here's the properly formatted booking request:

### Method 1: Test with curl command

```bash
curl -X POST http://localhost:8000/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
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

### Method 2: Postman/Thunder Client Request

**URL:** `POST http://localhost:8000/bookings`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

**Body (raw JSON):**
```json
{
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
}
```

## 📧 Expected Email Behavior

Since this booking includes a `sitterId`, the email system will send:

1. **Admin Email** 📨
   - Subject: "New Booking Request - [Client Name]"
   - Details about the pet-sitting service
   - Shows "Assigned Sitter: Angie Rohan" 
   - Service details: "Once A Day Pet Sitting 45min - C$40"

2. **Client Confirmation Email** 📨
   - Subject: "Booking Confirmation - Whiskarz Pet-Sitting"
   - Booking reference and details
   - Service time: 09:00 - 09:45
   - Total amount: $40

3. **Sitter Assignment Email** 📨
   - Subject: "New Pet-Sitting Assignment - [Client Name]"
   - Sent to Angie Rohan (sitterId: 688f2368d9ab7e18b048a578)
   - Client contact details
   - Service instructions and timing

## 🔍 What to Watch For

**Server Logs:**
```
Email notifications sent for booking [NEW_BOOKING_ID]
```

**Email Content Will Include:**
- ✅ Service type: "pet-sitting"
- ✅ Duration: 45 minutes (09:00 - 09:45)
- ✅ Amount: $40
- ✅ Pet info: 1 Dog
- ✅ Special instructions about timing
- ✅ Client notes about preferred sitter
- ✅ Booking notes from dashboard

## 🚀 Quick Test Steps

1. **Replace YOUR_JWT_TOKEN** with actual user token
2. **Run the curl command** or use Postman
3. **Check server terminal** for email confirmation logs  
4. **Check email inboxes** for the 3 expected emails
5. **Verify booking created** in database

## 📋 Troubleshooting

If no emails sent, check:
- ✅ Email environment variables configured
- ✅ Valid JWT token provided
- ✅ User exists in database
- ✅ Sitter ID "688f2368d9ab7e18b048a578" exists
- ✅ Server logs for error messages
