# Frontend Development Prompt for Flying Duchess Pet-Sitting Management System

## Overview
I have successfully built a comprehensive backend API for the Flying Duchess Pet-Sitting Management System. The backend now includes extensive functionality for client management, messaging, key security, invoicing, reviews, and informational pages. Below is the complete specification for frontend development to integrate with this enhanced backend.

## Backend Architecture Summary
- **Framework**: NestJS with TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based with role-based access control
- **File Storage**: Cloudinary integration for images/documents
- **Email**: Mailer module for notifications
- **Roles**: admin, client, sitter

## New Backend Features Implemented

### 1. Enhanced User Management System
**Enhanced User Schema includes:**
- Basic profile (name, email, phone, address)
- Emergency contacts (name, relationship, phone)
- Profile photo with Cloudinary integration
- Service preferences and availability
- Address verification workflow
- Role-based permissions

**Frontend Requirements:**
- Enhanced user registration form with emergency contacts
- Profile management page with photo upload
- Address verification status display
- Service preferences configuration
- Emergency contact management interface

### 2. Advanced Messaging System
**Features:**
- Thread-based conversations between clients, sitters, and admins
- File and photo attachments
- Read/unread status tracking
- Message search functionality
- Thread archiving capabilities
- Booking-context messaging

**Frontend Requirements:**
- Real-time messaging interface (consider WebSocket integration)
- Thread list with unread indicators
- Message composer with file attachment support
- Search functionality for messages
- Archive/unarchive thread controls
- Booking-specific messaging context

**Key Endpoints:**
```
POST /messages/threads - Create message thread
POST /messages - Send message
GET /messages/threads - Get user's message threads
GET /messages/threads/:threadId - Get messages in thread
PUT /messages/threads/:threadId/read - Mark thread as read
GET /messages/unread-count - Get unread message count
GET /messages/search - Search messages
```

### 3. Key Security Management System
**Features:**
- Secure storage of client access information
- Lockbox codes and locations
- Alarm system details
- Emergency contact information
- Special access instructions
- Sitter access permissions

**Frontend Requirements:**
- Secure key information form for clients
- Sitter access to authorized key information
- Admin management of all key security records
- Security information display with proper access controls

**Key Endpoints:**
```
POST /key-security/client/:clientId - Create key security info
GET /key-security/client/:clientId - Get client's key security info
PUT /key-security/:id - Update key security info
DELETE /key-security/:id - Delete key security info
```

### 4. Comprehensive Invoice Management
**Features:**
- Automatic invoice numbering
- Line items with descriptions and amounts
- Tax calculations and totals
- Multiple payment methods
- Payment status tracking
- Due date management
- Overdue invoice identification

**Frontend Requirements:**
- Invoice creation form for admins
- Client invoice dashboard with payment history
- Payment processing interface
- Invoice PDF generation/download
- Payment status indicators
- Overdue invoice alerts

**Key Endpoints:**
```
POST /invoices - Create invoice (admin)
GET /invoices/client/:clientId - Get client's invoices
GET /invoices/:id - Get invoice by ID
PUT /invoices/:id/pay - Mark invoice as paid
GET /invoices/stats/:clientId? - Get invoice statistics
```

### 5. Review and Rating System
**Features:**
- 5-star rating system
- Detailed review comments
- Photo attachments for reviews
- Featured reviews for public display
- Admin moderation capabilities
- Review statistics and analytics

**Frontend Requirements:**
- Review submission form with star rating
- Review display with ratings
- Featured reviews section for public pages
- Admin review moderation interface
- Review statistics dashboard

**Key Endpoints:**
```
POST /reviews - Create review
GET /reviews/user/:userId - Get reviews for user
GET /reviews/featured - Get featured reviews (public)
GET /reviews/stats/:userId? - Get review statistics
```

### 6. Information Pages CMS
**Features:**
- Dynamic content management
- Slug-based routing for SEO
- Page categorization (contact, about, services, etc.)
- Rich text content support
- Image management
- Published/draft status

**Frontend Requirements:**
- Admin content management interface
- Public page rendering from CMS
- SEO-friendly routing with slugs
- Rich text editor for content creation
- Image upload and management
- Page categorization interface

**Key Endpoints:**
```
GET /information/pages - Get published pages (public)
GET /information/slug/:slug - Get page by slug (public)
POST /information/pages - Create page (admin)
PUT /information/:id - Update page (admin)
GET /information/admin/all - Get all pages (admin)
```

### 7. Enhanced Booking System
**New Features:**
- Availability checking for dates and sitters
- Available sitter recommendations
- Visit logging with photos and activities
- Comprehensive notes system
- Payment tracking integration
- Booking statistics and history

**Frontend Requirements:**
- Enhanced booking creation with availability checking
- Sitter availability calendar
- Visit log interface with photo upload
- Notes management system
- Booking history with advanced filtering
- Payment status integration

**Key Endpoints:**
```
GET /bookings/availability - Check availability for dates
GET /bookings/available-sitters - Get available sitters for dates
POST /bookings/:id/visit-log - Add visit log to booking
POST /bookings/:id/notes - Add notes to booking
GET /bookings/client/:clientId/history - Get client booking history
GET /bookings/stats/:clientId? - Get booking statistics
```

## Frontend Architecture Recommendations

### 1. **State Management**
- Implement global state for user authentication and role management
- Message state management for real-time updates
- Booking state management for availability and scheduling
- Invoice state management for payment tracking

### 2. **Real-time Features**
- WebSocket integration for messaging system
- Real-time booking availability updates
- Live notification system for new messages/bookings

### 3. **File Upload Integration**
- Cloudinary integration for profile photos
- Message attachment handling
- Review photo uploads
- Visit log photo management

### 4. **Role-Based UI Components**
Create different UI experiences based on user roles:

**Admin Dashboard:**
- Complete system overview
- User management and approval workflows
- Invoice creation and management
- Review moderation
- Content management system
- Key security record management

**Client Dashboard:**
- Personal profile management
- Pet management
- Booking creation and history
- Message center
- Invoice viewing and payment
- Review submission
- Key security information management

**Sitter Dashboard:**
- Assigned booking management
- Visit log creation
- Client messaging
- Key security access (authorized only)
- Earnings overview

### 5. **Security Considerations**
- JWT token management and refresh
- Role-based route protection
- Secure file upload handling
- Input validation and sanitization
- API error handling

## Data Models for Frontend

### Enhanced User Model
```typescript
interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'admin' | 'client' | 'sitter';
  profilePhoto?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    isVerified: boolean;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  servicePreferences?: {
    petTypes: string[];
    serviceTypes: string[];
    maxPetsPerBooking: number;
    travelRadius: number;
  };
  availability?: {
    daysOfWeek: string[];
    timeRanges: Array<{
      start: string;
      end: string;
    }>;
  };
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Message Thread Model
```typescript
interface MessageThread {
  _id: string;
  participants: string[];
  subject: string;
  bookingId?: string;
  lastMessage: {
    content: string;
    sender: string;
    timestamp: Date;
  };
  isArchived: boolean;
  unreadCount: { [userId: string]: number };
  createdAt: Date;
  updatedAt: Date;
}

interface Message {
  _id: string;
  threadId: string;
  sender: string;
  content: string;
  attachments?: Array<{
    type: 'image' | 'document';
    url: string;
    filename: string;
  }>;
  readBy: Array<{
    user: string;
    readAt: Date;
  }>;
  createdAt: Date;
}
```

### Invoice Model
```typescript
interface Invoice {
  _id: string;
  invoiceNumber: string;
  clientId: string;
  bookingId?: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate: Date;
  paidDate?: Date;
  paymentMethod?: 'cash' | 'check' | 'credit_card' | 'bank_transfer';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Review Model
```typescript
interface Review {
  _id: string;
  bookingId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number; // 1-5
  comment: string;
  photos?: string[];
  isFeatured: boolean;
  isVisible: boolean;
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Key Security Model
```typescript
interface KeySecurity {
  _id: string;
  clientId: string;
  lockboxCode?: string;
  lockboxLocation?: string;
  alarmCode?: string;
  alarmInstructions?: string;
  keyLocation?: string;
  specialInstructions?: string;
  emergencyContacts: Array<{
    name: string;
    relationship: string;
    phone: string;
  }>;
  wifiInfo?: {
    network: string;
    password: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### Enhanced Booking Model
```typescript
interface Booking {
  _id: string;
  userId: string;
  sitterId?: string;
  petIds: string[];
  serviceType: string;
  startDate: Date;
  endDate: Date;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  totalAmount: number;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  visitLogs: Array<{
    date: Date;
    notes: string;
    photos?: string[];
    duration?: number;
    activities?: string[];
    createdBy: string;
  }>;
  notes: {
    client: string[];
    sitter: string[];
    admin: string[];
  };
  cancellationReason?: string;
  rating?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

## API Integration Guidelines

### Authentication
```typescript
// Login and store JWT
const login = async (email: string, password: string) => {
  const response = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  localStorage.setItem('token', data.access_token);
  return data;
};

// API call with authentication
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  return fetch(endpoint, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
};
```

### File Upload (Cloudinary)
```typescript
const uploadFile = async (file: File, type: 'profile' | 'message' | 'review' | 'visit') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);
  
  const response = await apiCall('/cloudinary/upload', {
    method: 'POST',
    body: formData
  });
  return response.json();
};
```

## Testing Recommendations

### 1. **Component Testing**
- Test role-based component rendering
- Test form validations
- Test file upload functionality
- Test real-time messaging updates

### 2. **Integration Testing**
- Test API integration with authentication
- Test file upload workflows
- Test role-based access controls
- Test booking flow end-to-end

### 3. **User Experience Testing**
- Test messaging interface usability
- Test booking creation workflow
- Test mobile responsiveness
- Test accessibility compliance

## Deployment Considerations

### Environment Variables
```
REACT_APP_API_URL=http://localhost:8000
REACT_APP_CLOUDINARY_CLOUD_NAME=your_cloud_name
REACT_APP_WEBSOCKET_URL=ws://localhost:8000
```

### Build Optimizations
- Code splitting by routes and user roles
- Lazy loading of heavy components
- Image optimization for Cloudinary uploads
- Bundle size optimization

## Priority Implementation Order

1. **Phase 1**: Enhanced user authentication and profile management
2. **Phase 2**: Messaging system with real-time capabilities
3. **Phase 3**: Enhanced booking system with availability checking
4. **Phase 4**: Invoice management and payment integration
5. **Phase 5**: Review system and key security management
6. **Phase 6**: Information pages CMS and admin dashboard

This comprehensive backend provides a solid foundation for a full-featured pet-sitting management application. The API is production-ready and scalable for business growth.
