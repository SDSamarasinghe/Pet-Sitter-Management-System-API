# Copilot Instructions - Pet Sitter Management System API

## Project Overview

This is the **backend API** for the Whiskarz Pet Sitter Management System, built with **NestJS** (v10) and **MongoDB** (via Mongoose). It serves as the core backend for managing pet sitting operations including user management, bookings, scheduling, payments, and communications.

**Production URL:** https://www.whiskarz.com  
**Port:** 8000 (production) / 3000 (development)  
**Database:** MongoDB Atlas  
**Deployment:** Docker on Azure VM via GitHub Actions

---

## Tech Stack

- **Framework:** NestJS 10 (TypeScript)
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (Passport.js) + bcrypt
- **Email:** Nodemailer with Handlebars templates (Gmail SMTP)
- **File Storage:** Cloudinary (images) + Azure Blob Storage
- **Validation:** class-validator + class-transformer
- **Date Handling:** date-fns-tz (timezone-aware)
- **Containerization:** Docker + Docker Compose

---

## Architecture & Conventions

### Module Structure
Each feature follows the NestJS module pattern:
```
src/<feature>/
  ├── <feature>.module.ts      # Module definition
  ├── <feature>.controller.ts  # Route handlers
  ├── <feature>.service.ts     # Business logic
  ├── dto/                     # Data Transfer Objects (validation)
  └── schemas/                 # Mongoose schemas
```

### Authentication & Authorization
- JWT Bearer token extracted from `Authorization` header
- Guards: `@UseGuards(JwtAuthGuard)` for protected routes
- Role-based: `@UseGuards(JwtAuthGuard, RolesGuard)` with `@Roles('admin', 'sitter', 'client')`
- JWT payload contains: `email`, `userId`, `role`, `firstName`, `lastName`
- User roles: `admin`, `sitter`, `client`
- User statuses: `active`, `pending`, `rejected`

### Validation
- Global ValidationPipe with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
- DTOs use class-validator decorators (`@IsString()`, `@IsEmail()`, `@IsOptional()`, etc.)
- File uploads limited to 10MB (body parser) / 5MB (profile pictures)

### API Patterns
- RESTful endpoints with proper HTTP methods
- Controllers use dependency injection via constructor
- Services handle business logic and database operations
- Mongoose schemas define data models with virtuals and timestamps
- CORS enabled for all origins with credentials

---

## Key Modules

| Module | Purpose | Key Endpoints |
|--------|---------|---------------|
| Auth | Login, password reset, JWT | POST /auth/login, /auth/forgot-password, /auth/reset-password |
| Users | User CRUD, profiles, admin actions | GET/PUT /users/profile, admin approval/rejection |
| Pets | Pet management with medical/care info | CRUD /pets, /pets/:id/medical, /pets/:id/care |
| Bookings | Booking lifecycle, service inquiries | CRUD /bookings, /bookings/service-inquiry |
| Availability | Sitter schedules, time slots | GET/PUT /availability/settings, /availability/slots |
| Invoices | Invoice generation and management | CRUD /invoices |
| Comments | Booking comments/updates | CRUD /comments |
| Notes | Internal notes/messages | CRUD /notes |
| Messages | User messaging | CRUD /messages |
| Reviews | Client/sitter reviews | CRUD /reviews |
| Reports | System reports | GET /reports |
| Key-Security | Key handling tracking | CRUD /key-security |
| Information | Info pages/content | CRUD /information |
| Email | Transactional emails | Internal service (not exposed) |
| Upload | File upload handling | POST /upload |
| Cloudinary | Image CDN integration | Internal service |
| Azure-Blob | Blob storage integration | Internal service |

---

## Data Models

### User Roles & Flows
- **Client:** Registers → Pending → Admin approves with password → Active
- **Sitter:** Registers → Pending → Admin approves → Active
- **Admin:** Full system access

### Key Schemas
- **User:** Comprehensive profile with address, emergency contact, home care info, key handling
- **Pet:** Name, type, breed, medical info, care instructions, photos
- **Booking:** Service dates, sitter assignment, payment tracking, visit logs
- **Availability:** Weekly schedule, unavailable dates, holiday/weekend rates

---

## Environment Variables

```env
MONGODB_URI=            # MongoDB connection string
JWT_SECRET=             # JWT signing secret
JWT_EXPIRES_IN=24h      # Token expiration
PORT=8000               # Server port
NODE_ENV=               # development | production

# Storage
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
AZURE_STORAGE_CONNECTION_STRING=
AZURE_STORAGE_CONTAINER_NAME=pet-images

# Email (Gmail SMTP)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=
MAIL_PASS=              # Gmail App Password
MAIL_FROM=
```

---

## Code Style Guidelines

- Use TypeScript strict mode
- Follow NestJS conventions (decorators, DI, modules)
- DTOs for all request validation
- Mongoose schemas with proper types and defaults
- Async/await for all async operations
- Proper error handling with NestJS exceptions (NotFoundException, UnauthorizedException, etc.)
- Use `@Injectable()` for services
- Use `@Controller('route')` with proper HTTP method decorators
- Prefix admin routes with role guards
- Always validate ObjectId references

---

## Testing

- Unit tests: `npm run test`
- Watch mode: `npm run test:watch`
- Coverage: `npm run test:cov`
- E2E tests: `npm run test:e2e`

---

## Docker Commands

```bash
# Development
npm run start:dev

# Production build
npm run build && npm run start:prod

# Docker
docker-compose up --build
docker-compose down
```
