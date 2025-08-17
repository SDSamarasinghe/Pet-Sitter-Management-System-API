# Profile Picture API Documentation

## Overview
The Pet Sitter Management System now supports profile picture upload and management functionality. Users can upload, view, and remove their profile pictures through secure API endpoints.

## New API Endpoints

### 1. Upload Profile Picture
**Endpoint:** `POST /users/profile/picture`  
**Authentication:** Required (JWT Token)  
**Content-Type:** `multipart/form-data`

#### Request
```bash
curl -X POST http://localhost:8000/users/profile/picture \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "profilePicture=@/path/to/your/image.jpg"
```

#### Form Data
- `profilePicture`: Image file (required)

#### Validation Rules
- **File Types:** JPEG, PNG, GIF, WebP only
- **File Size:** Maximum 5MB
- **Authentication:** User must be logged in

#### Response (Success - 201)
```json
{
  "_id": "60f1b2e8d4f6c7a8b9e0f1a2",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "client",
  "phoneNumber": "416-555-0123",
  "address": "123 Main St, Toronto, ON",
  "emergencyContact": "Jane Doe - 416-555-0124",
  "homeCareInfo": "Alarm code: 1234",
  "profilePicture": "https://yourstorageaccount.blob.core.windows.net/pet-images/profile_1234567890_image.jpg",
  "createdAt": "2023-07-16T10:30:00.000Z",
  "updatedAt": "2023-07-16T11:45:00.000Z"
}
```

#### Error Responses
```json
// No file uploaded (400)
{
  "statusCode": 400,
  "message": "No file uploaded",
  "error": "Bad Request"
}

// Invalid file type (400)
{
  "statusCode": 400,
  "message": "Only image files are allowed (JPEG, PNG, GIF, WebP)",
  "error": "Bad Request"
}

// File too large (400)
{
  "statusCode": 400,
  "message": "File size must be less than 5MB",
  "error": "Bad Request"
}

// Unauthorized (401)
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 2. Remove Profile Picture
**Endpoint:** `DELETE /users/profile/picture`  
**Authentication:** Required (JWT Token)

#### Request
```bash
curl -X DELETE http://localhost:8000/users/profile/picture \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Response (Success - 200)
```json
{
  "_id": "60f1b2e8d4f6c7a8b9e0f1a2",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "client",
  "phoneNumber": "416-555-0123",
  "address": "123 Main St, Toronto, ON",
  "emergencyContact": "Jane Doe - 416-555-0124",
  "homeCareInfo": "Alarm code: 1234",
  // profilePicture field is removed
  "createdAt": "2023-07-16T10:30:00.000Z",
  "updatedAt": "2023-07-16T11:45:00.000Z"
}
```

### 3. Get User Profile (Updated)
**Endpoint:** `GET /users/profile`  
**Authentication:** Required (JWT Token)

#### Response (Success - 200)
```json
{
  "_id": "60f1b2e8d4f6c7a8b9e0f1a2",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "client",
  "phoneNumber": "416-555-0123",
  "address": "123 Main St, Toronto, ON",
  "emergencyContact": "Jane Doe - 416-555-0124",
  "homeCareInfo": "Alarm code: 1234",
  "profilePicture": "https://yourstorageaccount.blob.core.windows.net/pet-images/profile_1234567890_image.jpg",
  "createdAt": "2023-07-16T10:30:00.000Z",
  "updatedAt": "2023-07-16T11:45:00.000Z"
}
```

## Frontend Integration

### React/Next.js Implementation Example

```typescript
// Upload profile picture
const uploadProfilePicture = async (file: File) => {
  const formData = new FormData();
  formData.append('profilePicture', file);

  const response = await api.post('/users/profile/picture', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

// Remove profile picture
const removeProfilePicture = async () => {
  const response = await api.delete('/users/profile/picture');
  return response.data;
};
```

## Backend Implementation

### Database Schema
The `profilePicture` field in the User schema stores the Azure Blob Storage URL:

```typescript
@Prop()
profilePicture: string; // Azure Blob Storage URL for profile picture
```

### File Storage
- **Storage Service:** Azure Blob Storage
- **Container:** `pet-images`
- **File Naming:** `profile_{timestamp}_{originalname}`
- **Access:** Public read access via URL

### Security Features
- **Authentication Required:** All endpoints require valid JWT token
- **File Validation:** Type and size validation on server
- **User Isolation:** Users can only manage their own profile pictures

## Error Handling

### Common Error Scenarios
1. **File Upload Failures:**
   - Network interruption during upload
   - Azure storage service unavailable
   - Invalid file format or size

2. **Authentication Issues:**
   - Expired or invalid JWT token
   - Missing authorization header

3. **Server Errors:**
   - Database connection issues
   - Storage service configuration problems

### Best Practices for Frontend
1. **File Validation:** Validate file type and size on frontend before upload
2. **Progress Indicators:** Show upload progress for better UX
3. **Error Messages:** Display user-friendly error messages
4. **Retry Logic:** Implement retry for failed uploads
5. **Image Optimization:** Consider resizing images before upload

## Testing

### Manual Testing
```bash
# Test upload
curl -X POST http://localhost:8000/users/profile/picture \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "profilePicture=@test-image.jpg"

# Test get profile (should include profilePicture URL)
curl -X GET http://localhost:8000/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test remove
curl -X DELETE http://localhost:8000/users/profile/picture \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Automated Testing
Consider adding tests for:
- File upload with valid images
- File type validation
- File size validation
- Authentication requirements
- Profile picture removal
- Database updates

## Notes
- The existing `/upload/profile-picture` endpoint is still available for general image uploads
- User profile pictures are automatically included in profile responses
- Old profile picture URLs are not automatically deleted from storage (consider cleanup strategy)
- The `profilePicture` field is optional and not required for user registration
