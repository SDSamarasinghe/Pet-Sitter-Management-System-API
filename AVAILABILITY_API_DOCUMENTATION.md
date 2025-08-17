# Availability Management System API Documentation

## Overview

The Availability Management System provides comprehensive APIs for managing pet sitter availability, including weekly schedules, time slots, availability checks, and booking constraints.

## API Endpoints

### 1. Availability Settings Management

#### GET `/api/availability/settings/{sitterId}`
Retrieve availability settings for a specific sitter.

**Parameters:**
- `sitterId` (path): MongoDB ObjectId of the sitter

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "ObjectId",
    "sitterId": "ObjectId",
    "weeklySchedule": {
      "monday": {
        "isAvailable": true,
        "startTime": "09:00",
        "endTime": "17:00"
      },
      "tuesday": {
        "isAvailable": true,
        "startTime": "09:00",
        "endTime": "17:00"
      },
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
    "createdAt": "2025-08-17T00:00:00.000Z",
    "updatedAt": "2025-08-17T00:00:00.000Z"
  },
  "message": "Availability settings retrieved successfully"
}
```

#### POST `/api/availability/settings/{sitterId}`
Create availability settings for a sitter.

**Request Body:**
```json
{
  "weeklySchedule": {
    "monday": {
      "isAvailable": true,
      "startTime": "09:00",
      "endTime": "17:00"
    },
    "tuesday": {
      "isAvailable": true,
      "startTime": "09:00",
      "endTime": "17:00"
    },
    "wednesday": {
      "isAvailable": true,
      "startTime": "09:00",
      "endTime": "17:00"
    },
    "thursday": {
      "isAvailable": true,
      "startTime": "09:00",
      "endTime": "17:00"
    },
    "friday": {
      "isAvailable": true,
      "startTime": "09:00",
      "endTime": "17:00"
    },
    "saturday": {
      "isAvailable": false
    },
    "sunday": {
      "isAvailable": false
    }
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
}
```

#### PUT `/api/availability/settings/{sitterId}`
Update existing availability settings for a sitter.

**Request Body:** Same as POST, but all fields are optional.

### 2. Availability Slots Management

#### GET `/api/availability/slots/{sitterId}`
Retrieve availability slots for a sitter.

**Parameters:**
- `sitterId` (path): MongoDB ObjectId of the sitter
- `startDate` (query, optional): Start date filter (YYYY-MM-DD)
- `endDate` (query, optional): End date filter (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "ObjectId",
      "sitterId": "ObjectId",
      "date": "2025-08-17T00:00:00.000Z",
      "startTime": "09:00",
      "endTime": "12:00",
      "isAvailable": true,
      "notes": "Morning availability",
      "slotType": "regular",
      "createdAt": "2025-08-17T00:00:00.000Z",
      "updatedAt": "2025-08-17T00:00:00.000Z"
    }
  ],
  "message": "Availability slots retrieved successfully"
}
```

#### POST `/api/availability/slots/{sitterId}`
Create a single availability slot.

**Request Body:**
```json
{
  "date": "2025-08-17",
  "startTime": "09:00",
  "endTime": "12:00",
  "isAvailable": true,
  "notes": "Morning availability",
  "slotType": "regular",
  "customRate": 25.00
}
```

#### POST `/api/availability/slots/{sitterId}/bulk`
Create multiple availability slots at once.

**Request Body:**
```json
[
  {
    "date": "2025-08-17",
    "startTime": "09:00",
    "endTime": "12:00",
    "isAvailable": true,
    "slotType": "regular"
  },
  {
    "date": "2025-08-17",
    "startTime": "14:00",
    "endTime": "17:00",
    "isAvailable": true,
    "slotType": "regular"
  }
]
```

#### PUT `/api/availability/slots/{sitterId}`
Update multiple availability slots.

**Request Body:**
```json
[
  {
    "slotId": "ObjectId",
    "updateDto": {
      "isAvailable": false,
      "notes": "Booked"
    }
  }
]
```

### 3. Individual Slot Management

#### GET `/api/availability/slots/{sitterId}/{slotId}`
Retrieve a specific availability slot.

#### PUT `/api/availability/slots/{sitterId}/{slotId}`
Update a specific availability slot.

**Request Body:**
```json
{
  "isAvailable": false,
  "bookingId": "ObjectId",
  "notes": "Slot is now booked"
}
```

#### DELETE `/api/availability/slots/{sitterId}/{slotId}`
Delete a specific availability slot.

#### DELETE `/api/availability/slots/{sitterId}/bulk`
Delete multiple availability slots.

**Request Body:**
```json
["slotId1", "slotId2", "slotId3"]
```

### 4. Availability Check

#### GET `/api/availability/check/{sitterId}`
Check if a sitter is available for specific dates/times.

**Parameters:**
- `sitterId` (path): MongoDB ObjectId of the sitter
- `startDate` (query): Start date (YYYY-MM-DD)
- `endDate` (query): End date (YYYY-MM-DD)
- `startTime` (query, optional): Start time (HH:mm)
- `endTime` (query, optional): End time (HH:mm)

**Response:**
```json
{
  "success": true,
  "data": {
    "isAvailable": true,
    "availableSlots": [
      {
        "_id": "ObjectId",
        "date": "2025-08-17T00:00:00.000Z",
        "startTime": "09:00",
        "endTime": "17:00",
        "isAvailable": true
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

## Data Models

### AvailabilitySettings Schema

```typescript
{
  sitterId: ObjectId (required, unique),
  weeklySchedule: {
    monday: { isAvailable: boolean, startTime?: string, endTime?: string },
    tuesday: { isAvailable: boolean, startTime?: string, endTime?: string },
    wednesday: { isAvailable: boolean, startTime?: string, endTime?: string },
    thursday: { isAvailable: boolean, startTime?: string, endTime?: string },
    friday: { isAvailable: boolean, startTime?: string, endTime?: string },
    saturday: { isAvailable: boolean, startTime?: string, endTime?: string },
    sunday: { isAvailable: boolean, startTime?: string, endTime?: string }
  },
  maxDailyBookings: number (default: 5),
  advanceNoticeHours: number (default: 24),
  travelDistance: number (default: 10),
  holidayRates: {
    enabled: boolean (default: false),
    percentage: number (default: 0),
    holidays: string[]
  },
  unavailableDates: string[],
  isActive: boolean (default: true),
  timestamps: true
}
```

### AvailabilitySlot Schema

```typescript
{
  sitterId: ObjectId (required),
  date: Date (required),
  startTime: string (required, format: "HH:mm"),
  endTime: string (required, format: "HH:mm"),
  isAvailable: boolean (default: true),
  bookingId?: ObjectId,
  notes?: string,
  slotType: string (default: "regular"),
  customRate?: number,
  timestamps: true
}
```

## Validation Rules

### Time Format
- All time fields must be in "HH:mm" format (24-hour)
- Examples: "09:00", "17:30", "23:59"

### Date Format
- All date fields must be in ISO string format
- Examples: "2025-08-17", "2025-12-25T00:00:00.000Z"

### Numeric Constraints
- `maxDailyBookings`: 1-20
- `advanceNoticeHours`: 1-168 (1 week)
- `travelDistance`: 1-100
- `holidayRates.percentage`: 0-100
- `customRate`: minimum 0

## Authentication & Authorization

All endpoints require JWT authentication and appropriate role permissions:

- **Admin**: Full access to all endpoints
- **Sitter**: Can manage their own availability settings and slots
- **Client**: Read-only access to availability checks and slot viewing

## Error Handling

All endpoints return standardized error responses:

```json
{
  "success": false,
  "message": "Error description",
  "statusCode": 400
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

## Business Logic

### Availability Check Logic

1. **Weekly Schedule Check**: Verifies if the day of the week is available
2. **Unavailable Dates Check**: Checks against blacklisted dates
3. **Advance Notice Check**: Ensures booking meets minimum advance notice
4. **Daily Booking Limit Check**: Verifies maximum bookings per day not exceeded
5. **Slot Overlap Check**: Prevents overlapping time slots
6. **Holiday Rate Calculation**: Applies holiday surcharges when applicable

### Default Settings

When a sitter first accesses their availability settings, default values are created:
- Monday-Friday: 09:00-17:00 (available)
- Saturday-Sunday: Not available
- Max daily bookings: 5
- Advance notice: 24 hours
- Travel distance: 10 miles
- Holiday rates: Disabled

## Usage Examples

### Setting Weekly Schedule
```javascript
// Create weekly availability
const weeklySchedule = {
  monday: { isAvailable: true, startTime: "08:00", endTime: "18:00" },
  tuesday: { isAvailable: true, startTime: "08:00", endTime: "18:00" },
  wednesday: { isAvailable: true, startTime: "08:00", endTime: "18:00" },
  thursday: { isAvailable: true, startTime: "08:00", endTime: "18:00" },
  friday: { isAvailable: true, startTime: "08:00", endTime: "18:00" },
  saturday: { isAvailable: true, startTime: "10:00", endTime: "16:00" },
  sunday: { isAvailable: false }
};
```

### Creating Holiday Rates
```javascript
const holidayRates = {
  enabled: true,
  percentage: 25, // 25% surcharge
  holidays: ["2025-12-25", "2025-01-01", "2025-07-04"]
};
```

### Checking Availability
```javascript
// Check if sitter is available for a weekend
GET /api/availability/check/sitterId?startDate=2025-08-16&endDate=2025-08-17
```

This comprehensive system provides all the functionality needed for managing pet sitter availability with flexible scheduling, business rules, and real-time availability checking.
