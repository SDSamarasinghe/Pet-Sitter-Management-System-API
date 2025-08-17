# Weekend Rates API Update

## Updated Features

The Availability Settings API now supports `weekendRates` functionality alongside the existing `holidayRates`.

## Updated DTOs

### WeekendRatesDto
```typescript
{
  "enabled": boolean,    // Whether weekend rates are active
  "percentage": number   // Additional percentage charge (0-100)
}
```

### Example API Request for PUT /api/availability/settings/{sitterId}

```json
{
  "weeklySchedule": {
    "monday": { "isAvailable": true, "startTime": "09:00", "endTime": "17:00" },
    "tuesday": { "isAvailable": true, "startTime": "09:00", "endTime": "17:00" },
    "wednesday": { "isAvailable": true, "startTime": "09:00", "endTime": "17:00" },
    "thursday": { "isAvailable": true, "startTime": "09:00", "endTime": "17:00" },
    "friday": { "isAvailable": true, "startTime": "09:00", "endTime": "17:00" },
    "saturday": { "isAvailable": true, "startTime": "10:00", "endTime": "16:00" },
    "sunday": { "isAvailable": true, "startTime": "10:00", "endTime": "16:00" }
  },
  "maxDailyBookings": 5,
  "advanceNoticeHours": 24,
  "travelDistance": 15,
  "holidayRates": {
    "enabled": true,
    "percentage": 25,
    "holidays": ["2026-12-25", "2026-01-01", "2026-07-04"]
  },
  "weekendRates": {
    "enabled": true,
    "percentage": 15
  },
  "unavailableDates": ["2026-02-10", "2026-02-11"],
  "isActive": true
}
```

## Fixed Issues

✅ **"property weekendRates should not exist" error**: Added proper DTO validation for weekendRates
✅ **Schema Support**: Updated MongoDB schema to store weekendRates data
✅ **Default Values**: Default settings now include weekendRates (disabled by default)
✅ **Type Safety**: Full TypeScript support with proper validation decorators

## API Endpoints Supporting weekendRates

1. **GET /api/availability/settings/{sitterId}**
   - Returns current settings including weekendRates

2. **POST /api/availability/settings/{sitterId}**
   - Creates new settings with weekendRates support

3. **PUT /api/availability/settings/{sitterId}**
   - Updates existing settings, weekendRates is optional

## Default Values

When creating new availability settings, the system defaults to:
```json
{
  "weekendRates": {
    "enabled": false,
    "percentage": 0
  }
}
```

## Validation Rules

- `enabled`: Must be a boolean value
- `percentage`: Must be a number between 0 and 100
- `weekendRates` is optional in all update operations

## Usage Examples

### Enable 20% weekend surcharge:
```json
{
  "weekendRates": {
    "enabled": true,
    "percentage": 20
  }
}
```

### Disable weekend rates:
```json
{
  "weekendRates": {
    "enabled": false,
    "percentage": 0
  }
}
```

Your PUT request to `/api/availability/settings/688f2368d9ab7e18b048a578` should now work correctly with the `weekendRates` property included!
