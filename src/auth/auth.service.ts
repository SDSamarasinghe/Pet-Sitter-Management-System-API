import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  /**
   * Validate user credentials and return user if valid
   */
  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    
    if (user && await bcrypt.compare(password, user.password)) {
      const { password: userPassword, ...result } = user.toObject();
      return result;
    }
    return null;
  }

  /**
   * Login user and return JWT token
   */
  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user account is approved (only for sitters - admins and clients can login regardless of status)
    if (user.role === 'sitter' && user.status !== 'active') {
      if (user.status === 'pending') {
        throw new UnauthorizedException('Your sitter account is pending approval. Please wait for admin approval.');
      } else if (user.status === 'rejected') {
        throw new UnauthorizedException('Your sitter account has been rejected. Please contact support.');
      } else {
        throw new UnauthorizedException('Your sitter account is not active. Please contact support.');
      }
    }

    const payload = { 
      email: user.email, 
      userId: user._id, 
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        address: user.address,
        emergencyContact: user.emergencyContact,
        homeCareInfo: user.homeCareInfo,
        pendingAddress: user.pendingAddress,
        firstTimeLogin: user.firstTimeLogin,
      },
    };
  }

  /**
   * Send forgot password email
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    try {
      const token = await this.usersService.generatePasswordResetToken(forgotPasswordDto.email);
      
      // Send password reset email
      await this.emailService.sendPasswordResetEmail(forgotPasswordDto.email, token);
      
      return {
        message: 'Password reset email sent. Please check your email for instructions.',
      };
    } catch (error) {
      // Don't reveal if email exists or not for security
      return {
        message: 'If an account with that email exists, a password reset email has been sent.',
      };
    }
  }

  /**
   * Reset password using token
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    await this.usersService.resetPassword(resetPasswordDto.token, resetPasswordDto.newPassword);
    
    return {
      message: 'Password has been reset successfully. You can now login with your new password.',
    };
  }
}
