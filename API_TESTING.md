# Fl## Prerequisites

1. Ensure the API is running on `http://localhost:5001### Register a Client
```bash
curl -X POST http://localhost:5001/users 
  -H "Content-Type: application/json" 
  -d '{
    "email": "client@### Add a Pet (Authenticated)
```bash
curl -X P### Create a Booking
```bash
curl -X POST http://localhost:5001/bookings 
  -H "Content-Type: application/json" 
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" 
  -d '{
    "startDate": "2025-08-15T10:00:00.000Z",
    "endDate": "2025-08-20T18:00:00.000Z",
    "serviceType": "Daily Care",
    "numberOfPets": 2,
    "petTypes": ["Cat(s)", "Dog(s)"],
    "notes": "Please give Fluffy her medication at 9 AM and 6 PM. She hides under the bed sometimes. Dog needs daily walks."
  }'
```lhost:5001/pets 
  -H "Content-Type: application/json" 
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" 
  -d '{
    "name": "Fluffy",
    "type": "Cat(s)",
    "photo": "https://res.cloudinary.com/your_cloud/image/upload/v1234567890/pets/fluffy.jpg",
    "breed": "Persian",
    "age": "3 years",
    "species": "Cat",
    "weight": 4.5,
    "microchipNumber": "123456789012345",
    "vaccinations": "Up to date - last vaccination: 2025-01-15",
    "medications": "Thyroid medication once daily",
    "allergies": "None known",
    "dietaryRestrictions": "No fish products",
    "behaviorNotes": "Very friendly but shy with strangers",
    "emergencyContact": "+1-416-555-0123",
    "veterinarianInfo": "Dr. Smith, Pet Care Clinic, +1-416-555-0199",
    "careInstructions": "Needs medication twice daily at 9 AM and 6 PM",
    "info": "Persian cat, 3 years old, very friendly but shy with strangers. Needs medication twice daily."
  }'
```   "password": "password123",
    "firstName": "Jane",
    "lastName": "Smith",
    "phoneNumber": "+1-416-555-0123",
    "role": "client",
    "address": "123 Main St, Toronto, ON",
    "emergencyContact": "+1-416-555-0123",
    "homeCareInfo": "Two cats, one dog. Cats are indoor only.",
    "customerType": "new"
  }'
```

### Register a Sitter
```bash
curl -X POST http://localhost:5001/users 
  -H "Content-Type: application/json" 
  -d '{
    "email": "sitter@example.com",
    "password": "password123",
    "firstName": "Mike",
    "lastName": "Johnson",
    "phoneNumber": "+1-416-555-0456",
    "role": "sitter",
    "address": "456 Oak Ave, Toronto, ON",
    "emergencyContact": "+1-416-555-0456",
    "homeCareInfo": "Experienced with dogs and cats. Available weekends.",
    "customerType": "existing"
  }'
```

### Register an Admin
```bash
curl -X POST http://localhost:5001/users 
  -H "Content-Type: application/json" 
  -d '{
    "email": "admin@flyingduchess.com",
    "password": "admin123",
    "firstName": "Admin",
    "lastName": "User",
    "phoneNumber": "+1-416-555-0789",
    "role": "admin",
    "address": "789 Admin Blvd, Toronto, ON",
    "emergencyContact": "+1-416-555-0789",
    "homeCareInfo": "Flying Duchess administrator",
    "customerType": "existing"
  }'
```DB instance connected
3. Use a tool like Postman, curl, or any REST client

## 0. Service Inquiry (Public Endpoint)

### Submit Service Inquiry Form
```bash
curl -X POST http://localhost:5001/bookings/service-inquiry \
  -H "Content-Type: application/json" \
  -d '{
    "customerType": "new",
    "firstName": "John",
    "lastName": "Doe",
    "address": "123 Main St, Unit 4B, Toronto, ON M5V 3A8",
    "numberOfPets": 2,
    "petTypes": ["Cat(s)", "Dog(s)"],
    "startDate": "2025-08-15T09:00:00.000Z",
    "endDate": "2025-08-20T18:00:00.000Z",
    "phoneNumber": "+1-416-555-0123",
    "email": "john.doe@example.com",
    "additionalDetails": "Cat needs medication twice daily. Dog is very energetic and needs daily walks."
  }'
```

**Response:**
```json
{
  "message": "Service inquiry submitted successfully. We will contact you soon!",
  "bookingId": "booking_id_here",
  "customerType": "new"
}
```Duchess Pet-Sitting API - Sample API Calls

This document provides sample API calls to test the Flying Duchess Pet-Sitting System API.

## Prerequisites

1. Ensure the API is running on `http://localhost:5001`
2. Have a MongoDB instance connected
3. Use a tool like Postman, curl, or any REST client

## 0. Service Inquiry (Public Endpoint)

### Submit Service Inquiry Form
```bash
curl -X POST http://localhost:5001/bookings/service-inquiry \
  -H "Content-Type: application/json" \
  -d '{
    "customerType": "new",
    "firstName": "Jane",
    "lastName": "Smith",
    "address": "123 Pet Lane, Toronto, ON M5V 3A8",
    "numberOfPets": 2,
    "petTypes": ["Cat(s)", "Dog(s)"],
    "startDate": "2025-08-15T00:00:00.000Z",
    "endDate": "2025-08-20T00:00:00.000Z",
    "phoneNumber": "+1-416-555-0123",
    "email": "jane.smith@example.com",
    "additionalDetails": "My cat needs medication twice daily, and my dog requires daily walks."
  }'
```

**Response:**
```json
{
  "message": "Service inquiry submitted successfully. We will contact you soon!",
  "bookingId": "booking_id_here",
  "customerType": "new"
}
```

## 1. User Registration

### Register a Client
```bash
curl -X POST http://localhost:5001/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "client@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+1-416-555-0123",
    "role": "client",
    "address": "123 Main St, Toronto, ON",
    "emergencyContact": "+1-416-555-0123",
    "homeCareInfo": "Two cats, one dog. Cats are indoor only.",
    "customerType": "new"
  }'
```

### Register a Sitter
```bash
curl -X POST http://localhost:5001/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sitter@example.com",
    "password": "password123",
    "firstName": "Sarah",
    "lastName": "Wilson",
    "phoneNumber": "+1-416-555-0456",
    "role": "sitter",
    "address": "456 Oak Ave, Toronto, ON",
    "emergencyContact": "+1-416-555-0456",
    "homeCareInfo": "Experienced with dogs and cats. Available weekends.",
    "customerType": "new"
  }'
```

### Register an Admin
```bash
curl -X POST http://localhost:5001/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@flyingduchess.com",
    "password": "admin123",
    "firstName": "Flying",
    "lastName": "Duchess",
    "phoneNumber": "+1-416-555-0789",
    "role": "admin",
    "address": "789 Admin Blvd, Toronto, ON",
    "emergencyContact": "+1-416-555-0789",
    "homeCareInfo": "Flying Duchess administrator",
    "customerType": "existing"
  }'
```

## 2. Authentication

### Login
```bash
curl -X POST http://localhost:5001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "client@example.com",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id_here",
    "email": "client@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+1-416-555-0123",
    "role": "client",
    "address": "123 Main St, Toronto, ON",
    "emergencyContact": "+1-416-555-0123",
    "homeCareInfo": "Two cats, one dog. Cats are indoor only.",
    "customerType": "new"
  }
}
```

**Note:** Save the `access_token` for subsequent authenticated requests.

## 3. Pet Management

### Add a Pet (Authenticated)
```bash
curl -X POST http://localhost:5001/pets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Fluffy",
    "type": "Cat(s)",
    "breed": "Persian",
    "age": "3 years",
    "photo": "https://res.cloudinary.com/your_cloud/image/upload/v1234567890/pets/fluffy.jpg",
    "medication": "Medication twice daily at 9 AM and 6 PM",
    "info": "Very friendly but shy with strangers. Needs medication twice daily."
  }'
```

### Get User's Pets
```bash
curl -X GET http://localhost:5001/pets/user/USER_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 4. Booking Management

### Create a Booking
```bash
curl -X POST http://localhost:5001/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "startDate": "2025-08-15T10:00:00.000Z",
    "endDate": "2025-08-20T18:00:00.000Z",
    "serviceType": "Daily Care",
    "numberOfPets": 2,
    "petTypes": ["Cat(s)", "Dog(s)"],
    "notes": "Please give Fluffy her medication at 9 AM and 6 PM. She hides under the bed sometimes. Walk the dog twice daily."
  }'
```

### Get User's Bookings
```bash
curl -X GET http://localhost:5001/bookings/user/USER_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Admin: Assign Sitter to Booking
```bash
curl -X PUT http://localhost:5001/bookings/BOOKING_ID/assign-sitter \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -d '{
    "sitterId": "SITTER_USER_ID"
  }'
```

## 5. Reports (Sitter)

### Create a Report
```bash
curl -X POST http://localhost:5001/reports \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SITTER_ACCESS_TOKEN" \
  -d '{
    "userId": "CLIENT_USER_ID",
    "bookingId": "BOOKING_ID",
    "date": "2025-08-15T18:00:00.000Z",
    "details": "Fluffy was very well behaved today. She ate all her food and took her medication without issues. We played with her favorite feather toy for 20 minutes. She seemed happy and content.",
    "photos": [
      "https://res.cloudinary.com/your_cloud/image/upload/v1234567890/reports/fluffy_playing.jpg",
      "https://res.cloudinary.com/your_cloud/image/upload/v1234567890/reports/fluffy_sleeping.jpg"
    ],
    "rating": "excellent",
    "recommendations": "Continue current feeding schedule. Fluffy seems to enjoy interactive play sessions."
  }'
```

### Get Reports for a User
```bash
curl -X GET http://localhost:5001/reports/user/USER_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 6. User Profile Management

### Update Profile (Client)
```bash
curl -X PUT http://localhost:5001/users/USER_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+1-416-555-9999",
    "emergencyContact": "+1-416-555-9999",
    "homeCareInfo": "Two cats, one dog. Cats are indoor only. Dog needs to be walked twice daily.",
    "pendingAddress": "456 New Street, Toronto, ON"
  }'
```

### Admin: Approve Address Change
```bash
curl -X PUT http://localhost:5001/users/USER_ID/approve-address \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

### Admin: Get Pending Address Requests
```bash
curl -X GET http://localhost:5001/users/admin/pending-addresses \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

## 7. Admin Operations

### Get All Bookings (Admin)
```bash
curl -X GET http://localhost:5001/bookings \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

### Get All Reports (Admin)
```bash
curl -X GET http://localhost:5001/reports \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

## Error Responses

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "You can only view your own profile"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "User not found"
}
```

### 400 Bad Request (Validation Error)
```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "password should not be empty"
  ],
  "error": "Bad Request"
}
```

## Notes

1. Replace `YOUR_ACCESS_TOKEN` with the actual token received from login
2. Replace `USER_ID`, `BOOKING_ID`, etc. with actual IDs from your database
3. Ensure MongoDB is connected and running
4. The API includes CORS enabled for frontend integration
5. All endpoints requiring authentication need the `Authorization: Bearer TOKEN` header
6. Admin endpoints require admin role authentication
7. Sitter endpoints require sitter role authentication
