# Flying Duchess Pet-Sitting API Endpoints

The comprehensive pet sitter management system is now running with the following endpoints:

## Authentication Endpoints
- `POST /auth/login` - User login

## User Management Endpoints
- `POST /users` - Create new user
- `GET /users/profile` - Get current user profile (authenticated)
- `GET /users/:id` - Get user by ID
- `PUT /users/:id` - Update user
- `GET /users/pending` - Get pending user approvals (admin)
- `PUT /users/:id/approve` - Approve user (admin)
- `PUT /users/:id/reject` - Reject user (admin)
- `GET /users/admin/sitters` - Get all sitters (admin)
- `GET /users/admin/clients` - Get all clients (admin)
- `GET /users/admin/pending-addresses` - Get pending address approvals (admin)
- `PUT /users/:id/approve-address` - Approve address (admin)
- `PUT /users/:id/reject-address` - Reject address (admin)

## Pet Management Endpoints
- `GET /pets` - Get all pets (admin)
- `POST /pets` - Create new pet (authenticated)
- `GET /pets/user/:userId` - Get pets by user
- `GET /pets/:id` - Get pet by ID
- `PUT /pets/:id` - Update pet
- `DELETE /pets/:id` - Delete pet

## Booking Management Endpoints
- `POST /bookings/service-inquiry` - Submit service inquiry (public)
- `GET /bookings/availability` - Check availability for dates
- `GET /bookings/available-sitters` - Get available sitters for dates
- `POST /bookings` - Create new booking (authenticated)
- `GET /bookings/client/:clientId/history` - Get client booking history
- `POST /bookings/:id/visit-log` - Add visit log to booking
- `POST /bookings/:id/notes` - Add notes to booking
- `GET /bookings/stats/:clientId?` - Get booking statistics
- `GET /bookings/user/:userId` - Get user's bookings
- `GET /bookings/sitter/:sitterId` - Get sitter's assigned bookings
- `GET /bookings` - Get all bookings (admin)
- `GET /bookings/:id` - Get booking by ID
- `PUT /bookings/:id` - Update booking
- `DELETE /bookings/:id` - Delete booking
- `PUT /bookings/:id/assign-sitter` - Assign sitter to booking (admin)

## Messaging System Endpoints
- `POST /messages/threads` - Create message thread
- `POST /messages` - Send message
- `GET /messages/threads` - Get user's message threads
- `GET /messages/threads/:threadId` - Get messages in thread
- `PUT /messages/threads/:threadId/read` - Mark thread as read
- `GET /messages/unread-count` - Get unread message count
- `GET /messages/search` - Search messages
- `PUT /messages/threads/:threadId/archive` - Archive thread
- `DELETE /messages/:messageId` - Delete message

## Key Security Management Endpoints
- `POST /key-security/client/:clientId` - Create key security info
- `GET /key-security/client/:clientId` - Get client's key security info
- `PUT /key-security/:id` - Update key security info
- `DELETE /key-security/:id` - Delete key security info
- `GET /key-security/admin/all` - Get all key security records (admin)

## Invoice Management Endpoints
- `POST /invoices` - Create invoice (admin)
- `GET /invoices/client/:clientId` - Get client's invoices
- `GET /invoices/:id` - Get invoice by ID
- `PUT /invoices/:id` - Update invoice
- `PUT /invoices/:id/pay` - Mark invoice as paid
- `GET /invoices/admin/all` - Get all invoices (admin)
- `GET /invoices/stats/:clientId?` - Get invoice statistics
- `DELETE /invoices/:id` - Delete invoice (admin)
- `POST /invoices/admin/mark-overdue` - Mark overdue invoices (admin)

## Review System Endpoints
- `POST /reviews` - Create review
- `GET /reviews/user/:userId` - Get reviews for user
- `GET /reviews/by-user/:userId` - Get reviews by user
- `GET /reviews/featured` - Get featured reviews (public)
- `GET /reviews/:id` - Get review by ID
- `PUT /reviews/:id` - Update review
- `DELETE /reviews/:id` - Delete review
- `GET /reviews/admin/all` - Get all reviews (admin)
- `GET /reviews/stats/:userId?` - Get review statistics

## Information Pages Endpoints
- `GET /information/pages` - Get published pages (public)
- `GET /information/contact` - Get contact page (public)
- `GET /information/meet-sitters` - Get meet-sitters page (public)
- `GET /information/relocation-notice` - Get relocation notice (public)
- `GET /information/type/:type` - Get pages by type (public)
- `GET /information/slug/:slug` - Get page by slug (public)
- `POST /information/pages` - Create page (admin)
- `GET /information/:id` - Get page by ID (admin)
- `PUT /information/:id` - Update page (admin)
- `DELETE /information/:id` - Delete page (admin)
- `GET /information/admin/all` - Get all pages (admin)
- `POST /information/admin/initialize` - Initialize default pages (admin)

## Reports Endpoints
- `POST /reports` - Create report (authenticated)
- `GET /reports/user/:userId` - Get reports by user
- `GET /reports/sitter/:sitterId` - Get reports by sitter
- `GET /reports` - Get all reports (admin)
- `GET /reports/:id` - Get report by ID
- `PUT /reports/:id` - Update report
- `DELETE /reports/:id` - Delete report

## Key Features Implemented

### 1. **Comprehensive Booking System**
- Availability checking for dates and sitters
- Visit logging with photos and activities
- Payment tracking and status management
- Booking history and statistics
- Notes system for clients, sitters, and admins

### 2. **Advanced Messaging System**
- Thread-based messaging between clients, sitters, and admins
- Attachment support for photos and files
- Read/unread status tracking
- Message search functionality
- Thread archiving capabilities

### 3. **Secure Key Management**
- Client key and security information storage
- Lockbox codes and alarm system details
- Emergency contact information
- Sitter access control and special instructions

### 4. **Complete Invoice Management**
- Automatic invoice numbering
- Line items and tax calculations
- Multiple payment methods support
- Payment tracking and due date management
- Overdue invoice identification

### 5. **Review and Rating System**
- Star ratings (1-5) for services
- Detailed review comments
- Featured reviews for public display
- Admin moderation capabilities
- Review statistics and analytics

### 6. **Information Pages CMS**
- Dynamic content management
- Slug-based routing for SEO
- Page categorization (contact, about, services, etc.)
- Admin content management interface
- Auto-initialization of default pages

### 7. **Enhanced User Profiles**
- Comprehensive client and sitter profiles
- Address verification workflow
- Emergency contact information
- Service preferences and availability
- Profile photo management with Cloudinary

### 8. **Security & Authentication**
- JWT-based authentication
- Role-based access control (admin, client, sitter)
- Protected endpoints with proper authorization
- Secure data access patterns

## Environment Requirements

Make sure your `.env` file contains:
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_email
MAIL_PASS=your_email_password
MAIL_FROM=noreply@flyingduchess.com
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

## Server Status
✅ Server running on port 5001
✅ All modules loaded successfully
✅ All routes mapped correctly
✅ MongoDB connection established
✅ Authentication system ready
✅ File upload system ready

The comprehensive pet sitter management system is now fully operational!
