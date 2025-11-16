# Timezone Fix Documentation

## Problem
The system is designed for Canadian users, but developers in different timezones (e.g., Sri Lanka) were experiencing time display inconsistencies. Bookings showed different times for different users.

## Backend Changes Implemented

### 1. UTC Enforcement (`src/main.ts`)
- Set `process.env.TZ = 'UTC'` to force the Node.js server to operate in UTC
- All dates are now stored and processed in UTC timezone
- MongoDB stores dates in UTC by default (no changes needed)

### 2. Date Calculation Fixes (`src/bookings/bookings.service.ts`)
- **Changed**: `setDate()` method usage that could cause timezone shifts
- **To**: Direct timestamp addition using `getTime()` + milliseconds
- This prevents JavaScript Date object from applying local timezone adjustments

**Before:**
```typescript
const currentDate = new Date(startDate);
currentDate.setDate(startDate.getDate() + i); // Can cause timezone shifts
```

**After:**
```typescript
const currentDate = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000)); // UTC safe
```

### 3. Multiple Bookings Per Day
- System now creates individual booking records for each day in a date range
- Example: Dec 26 - Jan 9 = 15 separate booking records
- Each booking preserves the exact time slot (e.g., 09:00 - 09:30)

## Frontend Requirements

### ⚠️ IMPORTANT: Frontend Must Handle Timezone Display

The backend now stores **all dates in UTC**. The frontend **MUST** convert these to the user's local timezone for display.

### Recommended Approach

#### Option 1: Use `toLocaleString()` with Canadian Timezone
```javascript
// When displaying a date from the API
const bookingDate = new Date(booking.startDate); // Already in UTC from backend

// Display in Eastern Time (most of Canada)
const displayDate = bookingDate.toLocaleString('en-CA', {
  timeZone: 'America/Toronto', // Or 'America/Vancouver' for Pacific
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});
```

#### Option 2: Use a Library (Recommended)
Use `date-fns-tz` or `luxon` for better timezone handling:

```javascript
import { formatInTimeZone } from 'date-fns-tz';

const displayDate = formatInTimeZone(
  booking.startDate, 
  'America/Toronto', 
  'yyyy-MM-dd HH:mm'
);
```

### When Sending Dates to Backend

**Always send ISO 8601 strings:**
```javascript
// ✅ Correct - sends as ISO string (UTC)
const bookingData = {
  startDate: new Date('2025-12-26T09:00:00').toISOString(), // "2025-12-26T09:00:00.000Z"
  endDate: new Date('2025-12-26T09:30:00').toISOString(),
};
```

**Don't send local timestamp numbers or formatted strings:**
```javascript
// ❌ Wrong - can cause timezone issues
startDate: new Date().getTime(), // timestamp
startDate: '12/26/2025 9:00 AM', // formatted string
```

## Canadian Timezones Reference

Canada has multiple timezones:
- **Pacific**: `America/Vancouver` (UTC-8/-7)
- **Mountain**: `America/Edmonton` (UTC-7/-6)
- **Central**: `America/Winnipeg` (UTC-6/-5)
- **Eastern**: `America/Toronto` (UTC-5/-4)
- **Atlantic**: `America/Halifax` (UTC-4/-3)
- **Newfoundland**: `America/St_Johns` (UTC-3:30/-2:30)

### User Location Detection
Consider adding a timezone selector in user profile or auto-detect:
```javascript
// Auto-detect user's timezone
const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
// Store in user profile or localStorage
```

## Testing Checklist

### Backend (Already Fixed)
- ✅ Server runs in UTC timezone
- ✅ Date calculations use timestamp math (no `setDate()`)
- ✅ Multiple bookings per day range
- ✅ MongoDB stores dates in UTC

### Frontend (Action Required)
- [ ] Convert UTC dates to local timezone for display
- [ ] Send dates to API as ISO strings
- [ ] Test with users in different Canadian timezones
- [ ] Verify calendar displays correct dates/times
- [ ] Check booking creation shows correct time slots

## Example API Response

```json
{
  "startDate": "2025-12-26T14:00:00.000Z",  // UTC format
  "endDate": "2025-12-26T14:30:00.000Z"
}
```

**Frontend should display as:**
- Toronto (EST): Dec 26, 2025 09:00 AM - 09:30 AM
- Vancouver (PST): Dec 26, 2025 06:00 AM - 06:30 AM

## Common Issues & Solutions

### Issue: Times still showing wrong
- **Check**: Frontend is converting UTC to local timezone
- **Fix**: Use `toLocaleString()` or timezone library

### Issue: Calendar shows wrong dates
- **Check**: Calendar component timezone configuration
- **Fix**: Configure calendar to use Canadian timezone

### Issue: Creating booking shows wrong time
- **Check**: Date picker sends ISO string format
- **Fix**: Ensure `.toISOString()` is called before sending

## Need Help?
If frontend continues to show incorrect times after these changes, the issue is in the frontend timezone conversion logic, not the backend.
