# Availability API Testing Guide

## Prerequisites

1. Start the development server:
```bash
npm run start:dev
```

2. Ensure you have a valid JWT token for authentication
3. Have a valid sitter ID (MongoDB ObjectId)

## Test Scripts

### 1. Test Availability Settings

#### Create Default Settings
```bash
curl -X POST http://localhost:3000/api/availability/settings/64a7b8c9d1e2f3a4b5c6d7e8 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "weeklySchedule": {
      "monday": {"isAvailable": true, "startTime": "09:00", "endTime": "17:00"},
      "tuesday": {"isAvailable": true, "startTime": "09:00", "endTime": "17:00"},
      "wednesday": {"isAvailable": true, "startTime": "09:00", "endTime": "17:00"},
      "thursday": {"isAvailable": true, "startTime": "09:00", "endTime": "17:00"},
      "friday": {"isAvailable": true, "startTime": "09:00", "endTime": "17:00"},
      "saturday": {"isAvailable": false},
      "sunday": {"isAvailable": false}
    },
    "maxDailyBookings": 5,
    "advanceNoticeHours": 24,
    "travelDistance": 10,
    "holidayRates": {
      "enabled": false,
      "percentage": 0,
      "holidays": []
    },
    "unavailableDates": [],
    "isActive": true
  }'
```

#### Get Settings
```bash
curl -X GET http://localhost:3000/api/availability/settings/64a7b8c9d1e2f3a4b5c6d7e8 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Update Settings
```bash
curl -X PUT http://localhost:3000/api/availability/settings/64a7b8c9d1e2f3a4b5c6d7e8 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "maxDailyBookings": 8,
    "holidayRates": {
      "enabled": true,
      "percentage": 25,
      "holidays": ["2025-12-25", "2025-01-01"]
    }
  }'
```

### 2. Test Availability Slots

#### Create Single Slot
```bash
curl -X POST http://localhost:3000/api/availability/slots/64a7b8c9d1e2f3a4b5c6d7e8 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "date": "2025-08-20",
    "startTime": "09:00",
    "endTime": "12:00",
    "isAvailable": true,
    "notes": "Morning availability",
    "slotType": "regular"
  }'
```

#### Create Multiple Slots
```bash
curl -X POST http://localhost:3000/api/availability/slots/64a7b8c9d1e2f3a4b5c6d7e8/bulk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '[
    {
      "date": "2025-08-21",
      "startTime": "09:00",
      "endTime": "12:00",
      "isAvailable": true,
      "slotType": "regular"
    },
    {
      "date": "2025-08-21",
      "startTime": "14:00",
      "endTime": "17:00",
      "isAvailable": true,
      "slotType": "regular"
    },
    {
      "date": "2025-08-22",
      "startTime": "10:00",
      "endTime": "15:00",
      "isAvailable": true,
      "slotType": "holiday",
      "customRate": 35.00
    }
  ]'
```

#### Get Slots
```bash
# Get all slots
curl -X GET http://localhost:3000/api/availability/slots/64a7b8c9d1e2f3a4b5c6d7e8 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get slots for date range
curl -X GET "http://localhost:3000/api/availability/slots/64a7b8c9d1e2f3a4b5c6d7e8?startDate=2025-08-20&endDate=2025-08-25" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Update Slot
```bash
curl -X PUT http://localhost:3000/api/availability/slots/64a7b8c9d1e2f3a4b5c6d7e8/SLOT_ID_HERE \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "isAvailable": false,
    "notes": "Booked for client"
  }'
```

#### Delete Slot
```bash
curl -X DELETE http://localhost:3000/api/availability/slots/64a7b8c9d1e2f3a4b5c6d7e8/SLOT_ID_HERE \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Test Availability Check

#### Check Availability
```bash
curl -X GET "http://localhost:3000/api/availability/check/64a7b8c9d1e2f3a4b5c6d7e8?startDate=2025-08-20&endDate=2025-08-22" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Check Specific Time Range
```bash
curl -X GET "http://localhost:3000/api/availability/check/64a7b8c9d1e2f3a4b5c6d7e8?startDate=2025-08-20&endDate=2025-08-20&startTime=09:00&endTime=17:00" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Expected Responses

### Successful Settings Creation
```json
{
  "success": true,
  "data": {
    "_id": "64a7b8c9d1e2f3a4b5c6d7e8",
    "sitterId": "64a7b8c9d1e2f3a4b5c6d7e8",
    "weeklySchedule": {
      "monday": {"isAvailable": true, "startTime": "09:00", "endTime": "17:00"},
      // ... other days
    },
    "maxDailyBookings": 5,
    "advanceNoticeHours": 24,
    "travelDistance": 10,
    "holidayRates": {
      "enabled": false,
      "percentage": 0,
      "holidays": []
    },
    "unavailableDates": [],
    "isActive": true,
    "createdAt": "2025-08-17T10:00:00.000Z",
    "updatedAt": "2025-08-17T10:00:00.000Z"
  },
  "message": "Availability settings created successfully",
  "statusCode": 201
}
```

### Successful Availability Check
```json
{
  "success": true,
  "data": {
    "isAvailable": true,
    "availableSlots": [
      {
        "_id": "64a7b8c9d1e2f3a4b5c6d7e9",
        "sitterId": "64a7b8c9d1e2f3a4b5c6d7e8",
        "date": "2025-08-20T00:00:00.000Z",
        "startTime": "09:00",
        "endTime": "12:00",
        "isAvailable": true,
        "notes": "Morning availability",
        "slotType": "regular"
      }
    ],
    "settings": {
      "maxDailyBookings": 5,
      "advanceNoticeHours": 24,
      "travelDistance": 10
    },
    "conflicts": []
  },
  "message": "Availability check completed successfully"
}
```

### Error Response Example
```json
{
  "success": false,
  "message": "Slot overlaps with existing availability",
  "statusCode": 400
}
```

## Test Scenarios

### 1. Overlap Prevention Test
Try creating overlapping slots to test validation:

```bash
# Create first slot
curl -X POST http://localhost:3000/api/availability/slots/64a7b8c9d1e2f3a4b5c6d7e8 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "date": "2025-08-25",
    "startTime": "10:00",
    "endTime": "14:00",
    "isAvailable": true
  }'

# Try to create overlapping slot (should fail)
curl -X POST http://localhost:3000/api/availability/slots/64a7b8c9d1e2f3a4b5c6d7e8 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "date": "2025-08-25",
    "startTime": "12:00",
    "endTime": "16:00",
    "isAvailable": true
  }'
```

### 2. Advance Notice Test
Create a booking too close to current time:

```bash
curl -X GET "http://localhost:3000/api/availability/check/64a7b8c9d1e2f3a4b5c6d7e8?startDate=$(date +%Y-%m-%d)&endDate=$(date +%Y-%m-%d)" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Holiday Rates Test
Set up holiday rates and check availability on holiday dates:

```bash
# First update settings with holiday rates
curl -X PUT http://localhost:3000/api/availability/settings/64a7b8c9d1e2f3a4b5c6d7e8 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "holidayRates": {
      "enabled": true,
      "percentage": 50,
      "holidays": ["2025-12-25", "2025-01-01"]
    }
  }'

# Check availability on holiday
curl -X GET "http://localhost:3000/api/availability/check/64a7b8c9d1e2f3a4b5c6d7e8?startDate=2025-12-25&endDate=2025-12-25" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Integration with Booking System

When integrating with the existing booking system, you can:

1. **Check Availability Before Booking**: Use the availability check endpoint
2. **Update Slots When Booked**: Mark slots as unavailable and link to booking
3. **Release Slots When Cancelled**: Mark slots as available again

Example booking integration:
```javascript
// 1. Check availability
const availability = await checkAvailability(sitterId, startDate, endDate);

if (availability.isAvailable) {
  // 2. Create booking
  const booking = await createBooking(bookingData);
  
  // 3. Update availability slot
  await updateSlot(sitterId, slotId, {
    isAvailable: false,
    bookingId: booking._id
  });
}
```

## Notes

- Replace `64a7b8c9d1e2f3a4b5c6d7e8` with actual sitter IDs from your database
- Replace `YOUR_JWT_TOKEN` with a valid authentication token
- Replace `SLOT_ID_HERE` with actual slot IDs returned from creation
- Adjust dates to future dates when testing
- Ensure the server is running on the correct port (default: 3000)
