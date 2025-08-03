# Flying Duchess Pet-Sitting System API

A comprehensive NestJS backend API for managing in-home pet care services in Toronto. This system provides user authentication, profile management, pet management, bookings, and sitter reports with role-based access control.

## Features

- **User Management**: Registration, authentication, and profile management
- **Role-Based Access Control (RBAC)**: Client, Admin, and Sitter roles
- **Pet Management**: Add, update, and manage pet profiles with Cloudinary image storage
- **Booking System**: Create and manage pet-sitting appointments
- **Sitter Reports**: Detailed reports for each pet care session
- **Address Management**: Admin approval system for address changes
- **JWT Authentication**: Secure token-based authentication
- **MongoDB Integration**: Scalable document database storage

## Tech Stack

- **Framework**: NestJS (Node.js)
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with Passport
- **Image Storage**: Cloudinary
- **Language**: TypeScript
- **Validation**: Class Validator
- **Environment**: dotenv configuration

## Project Structure

```
src/
├── auth/                 # Authentication module
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   ├── jwt-auth.guard.ts
│   ├── jwt.strategy.ts
│   ├── roles.guard.ts
│   ├── roles.decorator.ts
│   └── dto/
│       └── login.dto.ts
├── users/                # User management module
│   ├── users.controller.ts
│   ├── users.service.ts
│   ├── users.module.ts
│   ├── schemas/
│   │   └── user.schema.ts
│   └── dto/
│       ├── create-user.dto.ts
│       └── update-user.dto.ts
├── pets/                 # Pet management module
│   ├── pets.controller.ts
│   ├── pets.service.ts
│   ├── pets.module.ts
│   ├── schemas/
│   │   └── pet.schema.ts
│   └── dto/
│       └── create-pet.dto.ts
├── bookings/             # Booking management module
│   ├── bookings.controller.ts
│   ├── bookings.service.ts
│   ├── bookings.module.ts
│   ├── schemas/
│   │   └── booking.schema.ts
│   └── dto/
│       ├── create-booking.dto.ts
│       └── update-booking.dto.ts
├── reports/              # Report management module
│   ├── reports.controller.ts
│   ├── reports.service.ts
│   ├── reports.module.ts
│   ├── schemas/
│   │   └── report.schema.ts
│   └── dto/
│       └── create-report.dto.ts
├── app.module.ts
└── main.ts
```

## Setup Instructions

### 1. Prerequisites

- Node.js (v18 or higher)
- MongoDB Atlas account or local MongoDB instance
- Cloudinary account for image storage

### 2. Installation

```bash
# Clone the repository
git clone https://github.com/SDSamarasinghe/Pet-Sitter-Management-System-API.git
cd Pet-Sitter-Management-System-API

# Install dependencies
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Update the environment variables:

```env
# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster0.mongodb.net/flyingduchess?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=24h

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Application Configuration
PORT=3000
NODE_ENV=development
```

### 4. Run the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /auth/login` - User login

### Users
- `POST /users` - Register new user
- `GET /users/:id` - Get user profile
- `PUT /users/:id` - Update user profile
- `PUT /users/:id/approve-address` - Approve address change (Admin)
- `PUT /users/:id/reject-address` - Reject address change (Admin)
- `GET /users/admin/pending-addresses` - Get pending address requests (Admin)

### Pets
- `POST /pets` - Create new pet
- `GET /pets/user/:userId` - Get user's pets
- `GET /pets/:id` - Get pet by ID
- `PUT /pets/:id` - Update pet
- `DELETE /pets/:id` - Delete pet

### Bookings
- `POST /bookings` - Create new booking
- `GET /bookings` - Get all bookings (Admin)
- `GET /bookings/user/:userId` - Get user's bookings
- `GET /bookings/sitter/:sitterId` - Get sitter's bookings
- `GET /bookings/:id` - Get booking by ID
- `PUT /bookings/:id` - Update booking
- `DELETE /bookings/:id` - Delete booking
- `PUT /bookings/:id/assign-sitter` - Assign sitter (Admin)

### Reports
- `POST /reports` - Create new report (Sitter)
- `GET /reports` - Get all reports (Admin)
- `GET /reports/user/:userId` - Get user's reports
- `GET /reports/sitter/:sitterId` - Get sitter's reports
- `GET /reports/:id` - Get report by ID
- `PUT /reports/:id` - Update report
- `DELETE /reports/:id` - Delete report

## User Roles & Permissions

### Client
- Register and manage profile
- Request address changes (requires admin approval)
- Add and manage pets
- Create and manage bookings
- View reports about their pets

### Sitter
- View assigned bookings
- Submit reports for completed sessions
- Manage own reports

### Admin
- Approve/reject address changes
- Manage all users, pets, bookings, and reports
- Assign sitters to bookings
- Full system access

## Data Models

### User Schema
```typescript
{
  email: string,
  password: string,
  role: 'client' | 'admin' | 'sitter',
  address: string,
  pendingAddress: string,
  emergencyContact: string,
  homeCareInfo: string,
  createdAt: Date,
  updatedAt: Date
}
```

### Pet Schema
```typescript
{
  userId: ObjectId,
  name: string,
  photo: string, // Cloudinary URL
  info: string,
  createdAt: Date,
  updatedAt: Date
}
```

### Booking Schema
```typescript
{
  userId: ObjectId,
  sitterId: ObjectId,
  date: Date,
  serviceType: string,
  status: 'pending' | 'confirmed' | 'assigned' | 'completed' | 'cancelled',
  notes: string,
  adminNotes: string,
  createdAt: Date,
  updatedAt: Date
}
```

### Report Schema
```typescript
{
  userId: ObjectId,
  sitterId: ObjectId,
  bookingId: ObjectId,
  date: Date,
  details: string,
  photos: string[],
  rating: 'excellent' | 'good' | 'fair' | 'poor',
  recommendations: string,
  createdAt: Date,
  updatedAt: Date
}
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the Flying Duchess team.
