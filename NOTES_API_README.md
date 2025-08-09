# Notes API Testing Guide

## Overview
The Notes API provides a comprehensive communication system for users to send notes to each other with attachments and replies. This is separate from the booking comments system.

## Available Endpoints

### 1. POST /notes
Create a new note
**Body:**
```json
{
  "recipientId": "USER_ID",
  "text": "Your message here",
  "attachments": [
    {
      "url": "https://cloudinary.com/image.jpg",
      "filename": "image.jpg",
      "fileType": "image/jpeg",
      "fileSize": 1024000
    }
  ]
}
```

### 2. GET /notes/users/available
Get all available users for the recipient dropdown (excludes current user)

### 3. GET /notes?page=1&limit=20&recipientId=USER_ID
Get notes for current user with optional filtering by recipient

### 4. GET /notes/:id
Get a specific note by ID (only if user is involved)

### 5. POST /notes/:id/replies
Add a reply to a note
**Body:**
```json
{
  "text": "Your reply here",
  "attachments": [
    {
      "url": "https://cloudinary.com/reply-image.jpg",
      "filename": "reply.jpg",
      "fileType": "image/jpeg",
      "fileSize": 512000
    }
  ]
}
```

### 6. GET /notes/recent/:limit?
Get recent notes for dashboard (default limit: 10)

## Features
- ✅ User-to-user messaging
- ✅ File attachments support
- ✅ Threaded replies
- ✅ Pagination
- ✅ User filtering
- ✅ Authentication required
- ✅ Authorization (users can only see notes they're involved in)
- ✅ Timestamps (createdAt, updatedAt)
- ✅ User population (sender/recipient details)

## Database Schema
- **Note**: Main note document with sender, recipient, text, attachments
- **NoteReply**: Embedded replies within notes
- **NoteAttachment**: File attachment metadata (URL, filename, type, size)

## Integration with Frontend
The API matches the frontend requirements shown in your image:
- Dropdown for user selection (/notes/users/available)
- Text area for note content
- Image attachment support
- Conversation view with replies

## Testing
All endpoints require JWT authentication. Include the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

The API is now running on port 5001 and ready for testing!
