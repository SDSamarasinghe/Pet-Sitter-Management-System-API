# 🐾 Pet-Sitter Management System - Frontend Development Guide

## 🎯 Project Overview
You need to create a **comprehensive frontend application** for the Whiskarz Pet-Sitting Management System. This system handles booking management, user authentication, email notifications, and admin functionality.

## 🛠️ Technology Stack Recommendations
- **Framework:** React.js with TypeScript (or Next.js for SSR)
- **Styling:** Tailwind CSS + Shadcn/UI components
- **State Management:** React Query/TanStack Query + Zustand
- **Routing:** React Router DOM
- **Forms:** React Hook Form + Zod validation
- **HTTP Client:** Axios
- **Icons:** Lucide React
- **Notifications:** React Hot Toast

## 🎨 Design Requirements

### 🎨 Brand Guidelines
- **Primary Colors:** 
  - Brand Purple: `#667eea` to `#764ba2` (gradient)
  - Success Green: `#10B981`
  - Warning Orange: `#F59E0B`
  - Error Red: `#EF4444`
- **Typography:** Clean, modern fonts (Inter, Roboto, or similar)
- **Theme:** Professional yet warm, pet-friendly atmosphere
- **Icons:** Use pet-related emojis and icons throughout (🐾, 🐱, 🐶, etc.)

## 📋 Core Features to Implement

### 1. 🔐 Authentication System
```typescript
// API Endpoints Available:
POST /auth/login
POST /auth/forgot-password
POST /auth/reset-password

// Required Pages:
- Login Page
- Forgot Password Page
- Reset Password Page (with token from email)
```

**Key Features:**
- Email/password login
- Role-based redirection (client, admin, sitter)
- Forgot password flow with email
- Password reset with secure tokens
- JWT token management
- Auto-logout on token expiry

### 2. 👥 User Management
```typescript
// API Endpoints Available:
GET /users/profile
PUT /users/profile
POST /users (registration)
GET /users/sitters (for booking assignments)
```

**Required Components:**
- User registration form
- Profile management
- Sitter selection interface
- User dashboard with stats

### 3. 📅 Booking Management System
```typescript
// API Endpoints Available:
POST /bookings (create new booking)
POST /bookings/admin (admin creates for client)
GET /bookings (list bookings)
GET /bookings/:id (get booking details)
PUT /bookings/:id (update booking - status changes)
PUT /bookings/:id/payment-status (payment updates)
DELETE /bookings/:id
```

**Required Pages & Components:**
- **Booking Creation Form** (multi-step wizard)
- **Booking Dashboard** (different views for roles)
- **Booking Details Page** (with status updates)
- **Calendar View** (availability checking)
- **Status Management** (admin controls)

### 4. 📧 Email Notification Flow Integration
The backend has a **4-step email workflow** that the frontend should reflect:

**Step 1: Pending Bookings**
- When client creates booking → status "Pending"
- Emails sent to: Client + Admin
- Frontend: Show "Pending Approval" status

**Step 2: Admin Confirmation**
- Admin changes status to "Confirmed"
- No emails sent (admin action only)
- Frontend: Show "Confirmed, Awaiting Payment" status

**Step 3: Payment Confirmation**
- Admin updates payment status to "paid"
- Emails sent to: Client + Admin + Sitter
- Frontend: Show "Paid & Confirmed" status

**Step 4: Rejection**
- Admin changes status to "Rejected"
- Emails sent to: Client + Admin
- Frontend: Show "Booking Rejected" status with reason

### 5. 🎛️ Admin Dashboard
```typescript
// Admin-only features:
- Booking approval/rejection
- Payment status management
- User management (approve sitters)
- System analytics
- Email notification logs
```

### 6. 👤 Role-Based Interfaces

**Client Interface:**
- Create bookings
- View booking history
- Update profile
- View assigned sitters

**Sitter Interface:**
- View assigned bookings
- Update availability
- Manage profile
- Add visit logs/notes

**Admin Interface:**
- Manage all bookings
- User approval workflow
- Payment management
- System oversight

## 🚀 Implementation Priority

### Phase 1: Core Authentication & Navigation
1. Setup project with chosen tech stack
2. Implement login/logout functionality
3. Create protected route wrapper
4. Build main navigation with role-based menus

### Phase 2: Booking System
1. Create booking form (client-facing)
2. Build booking dashboard (role-specific views)
3. Implement status management (admin)
4. Add payment status updates

### Phase 3: User Management
1. User registration/profile management
2. Sitter approval workflow (admin)
3. Profile picture uploads
4. User search and assignment

### Phase 4: Advanced Features
1. Calendar integration
2. Real-time notifications
3. Advanced filtering/search
4. Analytics dashboard
5. Mobile responsiveness

## 🔌 API Integration Examples

### Authentication
```typescript
// Login
const loginUser = async (email: string, password: string) => {
  const response = await axios.post('/auth/login', { email, password });
  return response.data; // { access_token, user }
};

// Forgot Password
const forgotPassword = async (email: string) => {
  const response = await axios.post('/auth/forgot-password', { email });
  return response.data; // { message }
};

// Reset Password
const resetPassword = async (token: string, newPassword: string) => {
  const response = await axios.post('/auth/reset-password', { token, newPassword });
  return response.data; // { message }
};
```

### Booking Management
```typescript
// Create Booking
const createBooking = async (bookingData: CreateBookingDto) => {
  const response = await axios.post('/bookings', bookingData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

// Update Booking Status (Admin)
const updateBookingStatus = async (bookingId: string, status: string) => {
  const response = await axios.put(`/bookings/${bookingId}`, 
    { status },
    { headers: { Authorization: `Bearer ${token}` }}
  );
  return response.data;
};

// Update Payment Status (Admin)
const updatePaymentStatus = async (bookingId: string, paymentStatus: string) => {
  const response = await axios.put(`/bookings/${bookingId}/payment-status`, 
    { paymentStatus },
    { headers: { Authorization: `Bearer ${token}` }}
  );
  return response.data;
};
```

## 🎨 UI/UX Guidelines

### Responsive Design
- Mobile-first approach
- Tablet and desktop breakpoints
- Touch-friendly interactions

### User Experience
- Loading states for all API calls
- Error handling with user-friendly messages
- Success notifications for actions
- Confirmation dialogs for destructive actions

### Status Indicators
```typescript
const BookingStatusBadge = ({ status, paymentStatus }) => {
  const getStatusColor = () => {
    if (status === 'Rejected') return 'bg-red-100 text-red-800';
    if (status === 'Pending') return 'bg-yellow-100 text-yellow-800';
    if (status === 'Confirmed' && paymentStatus === 'paid') return 'bg-green-100 text-green-800';
    if (status === 'Confirmed') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getStatusText = () => {
    if (status === 'Rejected') return 'Rejected';
    if (status === 'Pending') return 'Pending Approval';
    if (status === 'Confirmed' && paymentStatus === 'paid') return 'Confirmed & Paid';
    if (status === 'Confirmed') return 'Confirmed - Awaiting Payment';
    return status;
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
      {getStatusText()}
    </span>
  );
};
```

## 🔒 Security Considerations
- Store JWT tokens securely (httpOnly cookies recommended)
- Implement token refresh mechanism
- Validate user permissions on frontend
- Sanitize user inputs
- Handle API errors gracefully

## 📱 Key Components to Build

### 1. Booking Form Wizard
- Step 1: Service details (dates, pets, etc.)
- Step 2: Sitter selection (if available)
- Step 3: Special instructions
- Step 4: Review and submit

### 2. Dashboard Cards
- Booking statistics
- Recent activities
- Quick actions
- Status summaries

### 3. Admin Tools
- Booking approval interface
- Payment status toggles
- User management table
- Email notification logs

### 4. Notification System
- Success/error toasts
- Email status indicators
- Real-time updates (optional)

## 🧪 Testing Strategy
- Unit tests for components
- Integration tests for API calls
- E2E tests for critical user flows
- Accessibility testing

## 🚀 Deployment Considerations
- Environment-specific API URLs
- Build optimization
- CDN setup for assets
- Error monitoring (Sentry)

## 📞 Support & Resources
- Backend API documentation: Available endpoints listed above
- Email templates: Professional design with pet-themed branding
- Error handling: Backend returns structured error responses
- Status workflow: 4-step booking process with email notifications

## 🎯 Success Metrics
- User can complete full booking flow
- Admin can manage bookings efficiently
- Email notifications work correctly
- Responsive design on all devices
- Fast loading times (< 3 seconds)
- High accessibility scores

---

**Note:** The backend is fully implemented with comprehensive email notifications, booking management, and user authentication. Focus on creating an intuitive, responsive frontend that leverages all available API features while providing an excellent user experience for pet owners, sitters, and administrators.

🐾 **Good luck building the frontend for Whiskarz Pet-Sitting System!** 🐾
