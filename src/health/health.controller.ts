import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  // Root endpoint for base URL access
  @Get()
  getRoot() {
    return {
      message: 'Flying Duchess Pet-Sitting API',
      status: 'running',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      endpoints: {
        health: '/api/health',
        auth: '/auth',
        users: '/users',
        pets: '/pets',
        bookings: '/bookings',
        reports: '/reports',
      }
    };
  }

  // Health check endpoint
  @Get('api/health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '0.0.1',
      port: process.env.PORT || 3000,
    };
  }
}
