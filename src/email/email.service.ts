import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  constructor(private mailerService: MailerService) {}

  /**
   * 📧 STEP 1: Send pending booking emails (Client + Admin)
   */
  async sendPendingBookingEmails(booking: any, client: any): Promise<void> {
    try {
      console.log(`📧 Sending pending booking emails for booking ${booking._id}`);
      
      // Send to client
      await this.sendClientPendingBookingEmail(booking, client);
      
      // Send to admin
      await this.sendAdminPendingBookingEmail(booking, client);
      
      console.log(`✅ Pending booking emails sent successfully for booking ${booking._id}`);
    } catch (error) {
      console.error(`❌ Failed to send pending booking emails for booking ${booking._id}:`, error);
      throw error;
    }
  }

  /**
   * 📧 STEP 3: Send booking confirmed & paid emails (Client + Admin + Sitter)
   */
  async sendBookingConfirmedPaidEmails(booking: any, client: any, sitter: any): Promise<void> {
    try {
      console.log(`📧 Sending booking confirmed & paid emails for booking ${booking._id}`);
      
      // Send to client
      await this.sendClientBookingConfirmedPaidEmail(booking, client, sitter);
      
      // Send to sitter
      if (sitter) {
        await this.sendSitterBookingConfirmedPaidEmail(booking, client, sitter);
      }
      
      // Send to admin
      await this.sendAdminBookingConfirmedPaidEmail(booking, client, sitter);
      
      console.log(`✅ Booking confirmed & paid emails sent successfully for booking ${booking._id}`);
    } catch (error) {
      console.error(`❌ Failed to send booking confirmed & paid emails for booking ${booking._id}:`, error);
      throw error;
    }
  }

  /**
   * 📧 STEP 4: Send booking rejected emails (Client + Admin)
   */
  async sendBookingRejectedEmails(booking: any, client: any, rejectionReason?: string): Promise<void> {
    try {
      console.log(`📧 Sending booking rejected emails for booking ${booking._id}`);
      
      // Send to client
      await this.sendClientBookingRejectedEmail(booking, client, rejectionReason);
      
      // Send to admin
      await this.sendAdminBookingRejectedEmail(booking, client, rejectionReason);
      
      console.log(`✅ Booking rejected emails sent successfully for booking ${booking._id}`);
    } catch (error) {
      console.error(`❌ Failed to send booking rejected emails for booking ${booking._id}:`, error);
      throw error;
    }
  }

  // ===========================
  // CLIENT EMAIL TEMPLATES
  // ===========================

  /**
   * Client: Pending booking confirmation
   */
  private async sendClientPendingBookingEmail(booking: any, client: any): Promise<void> {
    const startDate = new Date(booking.startDate).toLocaleDateString();
    const endDate = new Date(booking.endDate).toLocaleDateString();
    const startTime = new Date(booking.startDate).toLocaleTimeString();
    const endTime = new Date(booking.endDate).toLocaleTimeString();

    await this.mailerService.sendMail({
      to: client.email,
      subject: '⏳ Booking Pending Review - Whiskarz Pet-Sitting',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Booking Pending Review</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px; background-color: #f9f9f9; }
            .booking-details { background-color: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #FF9800; }
            .status-badge { background-color: #FFF3E0; color: #F57C00; padding: 8px 16px; border-radius: 20px; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            .highlight { background-color: #FFF3E0; padding: 2px 6px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏳ Booking Received!</h1>
              <p>Your booking is pending review</p>
            </div>
            <div class="content">
              <p>Dear <strong>${client.firstName} ${client.lastName}</strong>,</p>
              <p>Thank you for choosing Whiskarz Pet-Sitting! We have received your booking request and it is currently <span class="status-badge">PENDING REVIEW</span>.</p>
              
              <div class="booking-details">
                <h3>📋 Your Booking Details</h3>
                <p><strong>Service Dates:</strong> <span class="highlight">${startDate} to ${endDate}</span></p>
                <p><strong>Service Times:</strong> ${startTime} - ${endTime}</p>
                <p><strong>Service Type:</strong> ${booking.serviceType}</p>
                <p><strong>Number of Pets:</strong> ${booking.numberOfPets}</p>
                <p><strong>Pet Types:</strong> ${booking.petTypes?.join(', ')}</p>
                <p><strong>Total Amount:</strong> <strong>$${booking.totalAmount}</strong></p>
                <p><strong>Booking Reference:</strong> ${booking._id}</p>
                
                ${booking.notes ? `<p><strong>Your Notes:</strong> ${booking.notes}</p>` : ''}
                ${booking.specialInstructions ? `<p><strong>Special Instructions:</strong> ${booking.specialInstructions}</p>` : ''}
                ${booking.clientNotes ? `<p><strong>Additional Notes:</strong> ${booking.clientNotes}</p>` : ''}
              </div>

              <div style="background-color: #E8F5E8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4>🔔 What happens next?</h4>
                <ul>
                  <li><strong>Review:</strong> Our team will review your booking request within 24 hours</li>
                  <li><strong>Confirmation:</strong> You'll receive an email once your booking is confirmed</li>
                  <li><strong>Payment:</strong> Payment instructions will be provided upon confirmation</li>
                  <li><strong>Sitter Assignment:</strong> We'll assign the best available sitter for your pets</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <p><strong>Questions or need to make changes?</strong></p>
                <p>Contact us at: <a href="mailto:${process.env.ADMIN_EMAIL || 'admin@flyingduchess.com'}">${process.env.ADMIN_EMAIL || 'admin@flyingduchess.com'}</a></p>
              </div>
            </div>
            <div class="footer">
              <p><strong>Whiskarz Pet-Sitting</strong></p>
              <p>Where your pets are treated like royalty! 👑</p>
              <p>This is an automated notification. Please save this email for your records.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  }

  /**
   * Client: Booking confirmed & paid
   */
  private async sendClientBookingConfirmedPaidEmail(booking: any, client: any, sitter: any): Promise<void> {
    const startDate = new Date(booking.startDate).toLocaleDateString();
    const endDate = new Date(booking.endDate).toLocaleDateString();
    const startTime = new Date(booking.startDate).toLocaleTimeString();
    const endTime = new Date(booking.endDate).toLocaleTimeString();

    await this.mailerService.sendMail({
      to: client.email,
      subject: '✅ Booking Confirmed & Paid - Whiskarz Pet-Sitting',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Booking Confirmed & Paid</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px; background-color: #f9f9f9; }
            .booking-details { background-color: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #4CAF50; }
            .sitter-info { background-color: #E3F2FD; padding: 20px; border-radius: 8px; margin: 15px 0; }
            .status-badge { background-color: #E8F5E8; color: #2E7D32; padding: 8px 16px; border-radius: 20px; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            .highlight { background-color: #E8F5E8; padding: 2px 6px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Booking Confirmed!</h1>
              <p>Payment received & sitter assigned</p>
            </div>
            <div class="content">
              <p>Dear <strong>${client.firstName} ${client.lastName}</strong>,</p>
              <p>Excellent news! Your booking has been <span class="status-badge">CONFIRMED & PAID</span> and we've assigned a wonderful sitter for your pets!</p>
              
              <div class="booking-details">
                <h3>📋 Confirmed Booking Details</h3>
                <p><strong>Service Dates:</strong> <span class="highlight">${startDate} to ${endDate}</span></p>
                <p><strong>Service Times:</strong> ${startTime} - ${endTime}</p>
                <p><strong>Service Type:</strong> ${booking.serviceType}</p>
                <p><strong>Number of Pets:</strong> ${booking.numberOfPets}</p>
                <p><strong>Pet Types:</strong> ${booking.petTypes?.join(', ')}</p>
                <p><strong>Total Amount:</strong> <strong>$${booking.totalAmount} ✅ PAID</strong></p>
                <p><strong>Booking Reference:</strong> ${booking._id}</p>
              </div>

              ${sitter ? `
              <div class="sitter-info">
                <h3>👤 Your Assigned Sitter</h3>
                <p><strong>Name:</strong> ${sitter.firstName} ${sitter.lastName}</p>
                <p><strong>Email:</strong> ${sitter.email}</p>
                ${sitter.phoneNumber ? `<p><strong>Phone:</strong> ${sitter.phoneNumber}</p>` : ''}
                <p><em>Your sitter will contact you soon to coordinate the service details!</em></p>
              </div>
              ` : ''}

              <div style="background-color: #E8F5E8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4>🎉 You're all set! What's next?</h4>
                <ul>
                  <li><strong>Sitter Contact:</strong> Your assigned sitter will reach out within 24 hours</li>
                  <li><strong>Service Coordination:</strong> Discuss any last-minute details or special instructions</li>
                  <li><strong>Service Day:</strong> Your sitter will arrive at the scheduled time</li>
                  <li><strong>Updates:</strong> You may receive updates during the service period</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <p><strong>Need support or have questions?</strong></p>
                <p>Contact us at: <a href="mailto:${process.env.ADMIN_EMAIL || 'admin@flyingduchess.com'}">${process.env.ADMIN_EMAIL || 'admin@flyingduchess.com'}</a></p>
              </div>
            </div>
            <div class="footer">
              <p><strong>Whiskarz Pet-Sitting</strong></p>
              <p>Your pets are in excellent hands! 🐾✨</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  }

  /**
   * Client: Booking rejected
   */
  private async sendClientBookingRejectedEmail(booking: any, client: any, rejectionReason?: string): Promise<void> {
    const startDate = new Date(booking.startDate).toLocaleDateString();
    const endDate = new Date(booking.endDate).toLocaleDateString();

    await this.mailerService.sendMail({
      to: client.email,
      subject: '❌ Booking Request Update - Whiskarz Pet-Sitting',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Booking Request Update</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #F44336; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px; background-color: #f9f9f9; }
            .booking-details { background-color: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #F44336; }
            .status-badge { background-color: #FFEBEE; color: #C62828; padding: 8px 16px; border-radius: 20px; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            .reason-box { background-color: #FFF3E0; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #FF9800; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>❌ Booking Update</h1>
              <p>Unfortunately, we cannot accommodate this request</p>
            </div>
            <div class="content">
              <p>Dear <strong>${client.firstName} ${client.lastName}</strong>,</p>
              <p>We sincerely apologize, but your booking request has been <span class="status-badge">REJECTED</span>. We understand this may be disappointing and we're sorry we cannot accommodate this particular request.</p>
              
              <div class="booking-details">
                <h3>📋 Booking Request Details</h3>
                <p><strong>Service Dates:</strong> ${startDate} to ${endDate}</p>
                <p><strong>Service Type:</strong> ${booking.serviceType}</p>
                <p><strong>Number of Pets:</strong> ${booking.numberOfPets}</p>
                <p><strong>Pet Types:</strong> ${booking.petTypes?.join(', ')}</p>
                <p><strong>Booking Reference:</strong> ${booking._id}</p>
              </div>

              ${rejectionReason ? `
              <div class="reason-box">
                <h4>📝 Reason for Rejection:</h4>
                <p>${rejectionReason}</p>
              </div>
              ` : ''}

              <div style="background-color: #E3F2FD; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4>💡 What you can do next:</h4>
                <ul>
                  <li><strong>Alternative dates:</strong> Try booking for different dates when we have availability</li>
                  <li><strong>Contact us:</strong> Discuss alternative arrangements or solutions</li>
                  <li><strong>Future bookings:</strong> We'd love to serve you when circumstances align better</li>
                  <li><strong>Feedback:</strong> Let us know if you have any questions about this decision</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <p><strong>We value your interest in our services!</strong></p>
                <p>Please don't hesitate to contact us: <a href="mailto:${process.env.ADMIN_EMAIL || 'admin@flyingduchess.com'}">${process.env.ADMIN_EMAIL || 'admin@flyingduchess.com'}</a></p>
              </div>
            </div>
            <div class="footer">
              <p><strong>Whiskarz Pet-Sitting</strong></p>
              <p>Thank you for considering our services 🐾</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  }

  // ===========================
  // ADMIN EMAIL TEMPLATES
  // ===========================

  /**
   * Admin: New pending booking notification
   */
  private async sendAdminPendingBookingEmail(booking: any, client: any): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@flyingduchess.com';
    const startDate = new Date(booking.startDate).toLocaleDateString();
    const endDate = new Date(booking.endDate).toLocaleDateString();
    const startTime = new Date(booking.startDate).toLocaleTimeString();
    const endTime = new Date(booking.endDate).toLocaleTimeString();

    await this.mailerService.sendMail({
      to: adminEmail,
      subject: `⏳ NEW BOOKING PENDING: ${client.firstName} ${client.lastName} - ${startDate}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>New Pending Booking</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 700px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px; background-color: #f9f9f9; }
            .booking-details { background-color: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #2196F3; }
            .client-info { background-color: #E3F2FD; padding: 20px; border-radius: 8px; margin: 15px 0; }
            .action-needed { background-color: #FFF3E0; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #FF9800; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            .highlight { background-color: #FFEB3B; padding: 2px 6px; border-radius: 4px; }
            .amount { font-size: 1.2em; color: #4CAF50; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏳ NEW BOOKING PENDING REVIEW</h1>
              <p>Action required: Booking needs confirmation</p>
            </div>
            <div class="content">
              
              <div class="booking-details">
                <h3>📋 Booking Information</h3>
                <p><strong>Service Dates:</strong> <span class="highlight">${startDate} to ${endDate}</span></p>
                <p><strong>Service Times:</strong> ${startTime} - ${endTime}</p>
                <p><strong>Service Type:</strong> ${booking.serviceType}</p>
                <p><strong>Number of Pets:</strong> ${booking.numberOfPets}</p>
                <p><strong>Pet Types:</strong> ${booking.petTypes?.join(', ')}</p>
                <p><strong>Service Address:</strong> ${booking.serviceAddress || client.address || 'Not provided'}</p>
                <p><strong>Total Amount:</strong> <span class="amount">$${booking.totalAmount}</span></p>
                <p><strong>Status:</strong> <strong>PENDING</strong></p>
                <p><strong>Booking ID:</strong> ${booking._id}</p>
                
                ${booking.notes ? `<p><strong>Client Notes:</strong> ${booking.notes}</p>` : ''}
                ${booking.specialInstructions ? `<p><strong>Special Instructions:</strong> ${booking.specialInstructions}</p>` : ''}
                ${booking.clientNotes ? `<p><strong>Additional Client Notes:</strong> ${booking.clientNotes}</p>` : ''}
              </div>

              <div class="client-info">
                <h3>👤 Client Information</h3>
                <p><strong>Name:</strong> ${client.firstName} ${client.lastName}</p>
                <p><strong>Email:</strong> ${client.email}</p>
                <p><strong>Phone:</strong> ${client.phoneNumber || 'Not provided'}</p>
                <p><strong>Address:</strong> ${client.address || 'Not provided'}</p>
                <p><strong>Emergency Contact:</strong> ${client.emergencyContact || 'Not provided'}</p>
              </div>

              <div class="action-needed">
                <h4>🎯 ACTION REQUIRED:</h4>
                <ul>
                  <li><strong>REVIEW:</strong> Check availability and sitter assignments</li>
                  <li><strong>CONFIRM:</strong> Update booking status to "Confirmed" if accepting</li>
                  <li><strong>REJECT:</strong> Update status to "Rejected" if cannot accommodate</li>
                  <li><strong>ASSIGN SITTER:</strong> Select appropriate sitter for the service</li>
                  <li><strong>PAYMENT:</strong> Process payment when confirmed</li>
                </ul>
                <p><strong>📅 Response needed within 24 hours</strong></p>
              </div>
            </div>
            <div class="footer">
              <p><strong>Whiskarz Pet-Sitting Admin System</strong></p>
              <p>Booking management dashboard notification</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  }

  /**
   * Admin: Booking confirmed & paid notification
   */
  private async sendAdminBookingConfirmedPaidEmail(booking: any, client: any, sitter: any): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@flyingduchess.com';
    const startDate = new Date(booking.startDate).toLocaleDateString();
    const endDate = new Date(booking.endDate).toLocaleDateString();

    await this.mailerService.sendMail({
      to: adminEmail,
      subject: `✅ BOOKING CONFIRMED & PAID: ${client.firstName} ${client.lastName} - ${startDate}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Booking Confirmed & Paid</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 700px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px; background-color: #f9f9f9; }
            .booking-details { background-color: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #4CAF50; }
            .status-box { background-color: #E8F5E8; padding: 20px; border-radius: 8px; margin: 15px 0; text-align: center; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            .amount { font-size: 1.3em; color: #4CAF50; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ BOOKING CONFIRMED & PAID</h1>
              <p>Service ready to proceed</p>
            </div>
            <div class="content">
              
              <div class="status-box">
                <h2>🎉 PAYMENT RECEIVED & SERVICE CONFIRMED</h2>
                <p>All parties have been notified. Service is ready to proceed.</p>
              </div>

              <div class="booking-details">
                <h3>📋 Confirmed Booking Details</h3>
                <p><strong>Client:</strong> ${client.firstName} ${client.lastName} (${client.email})</p>
                <p><strong>Service Dates:</strong> ${startDate} to ${endDate}</p>
                <p><strong>Service Type:</strong> ${booking.serviceType}</p>
                <p><strong>Pets:</strong> ${booking.numberOfPets} ${booking.petTypes?.join(', ')}</p>
                <p><strong>Amount:</strong> <span class="amount">$${booking.totalAmount} ✅ PAID</span></p>
                <p><strong>Booking ID:</strong> ${booking._id}</p>
                
                ${sitter ? `
                <h4>👤 Assigned Sitter</h4>
                <p><strong>Sitter:</strong> ${sitter.firstName} ${sitter.lastName}</p>
                <p><strong>Email:</strong> ${sitter.email}</p>
                ${sitter.phoneNumber ? `<p><strong>Phone:</strong> ${sitter.phoneNumber}</p>` : ''}
                ` : '<p><strong>⚠️ Sitter:</strong> Not yet assigned</p>'}
              </div>

              <div style="background-color: #E3F2FD; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4>📋 Admin Summary:</h4>
                <ul>
                  <li>✅ Client confirmed and paid</li>
                  <li>✅ Client notification sent</li>
                  <li>${sitter ? '✅ Sitter notification sent' : '⚠️ Sitter assignment pending'}</li>
                  <li>✅ Service ready to proceed</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <p><strong>Whiskarz Pet-Sitting Admin System</strong></p>
              <p>Revenue tracking and service management</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  }

  /**
   * Admin: Booking rejected notification
   */
  private async sendAdminBookingRejectedEmail(booking: any, client: any, rejectionReason?: string): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@flyingduchess.com';
    const startDate = new Date(booking.startDate).toLocaleDateString();

    await this.mailerService.sendMail({
      to: adminEmail,
      subject: `❌ BOOKING REJECTED: ${client.firstName} ${client.lastName} - ${startDate}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Booking Rejected</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 700px; margin: 0 auto; padding: 20px; }
            .header { background-color: #F44336; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px; background-color: #f9f9f9; }
            .booking-details { background-color: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #F44336; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>❌ BOOKING REJECTED</h1>
              <p>Client has been notified</p>
            </div>
            <div class="content">
              
              <div class="booking-details">
                <h3>📋 Rejected Booking Details</h3>
                <p><strong>Client:</strong> ${client.firstName} ${client.lastName} (${client.email})</p>
                <p><strong>Service Dates:</strong> ${startDate}</p>
                <p><strong>Amount:</strong> $${booking.totalAmount}</p>
                <p><strong>Booking ID:</strong> ${booking._id}</p>
                <p><strong>Status:</strong> REJECTED</p>
                
                ${rejectionReason ? `
                <h4>📝 Rejection Reason:</h4>
                <p>${rejectionReason}</p>
                ` : ''}
              </div>

              <div style="background-color: #FFEBEE; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4>📋 Actions Completed:</h4>
                <ul>
                  <li>✅ Booking status updated to "Rejected"</li>
                  <li>✅ Client rejection notification sent</li>
                  <li>✅ Admin rejection confirmation sent</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <p><strong>Whiskarz Pet-Sitting Admin System</strong></p>
              <p>Booking management record</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  }

  // ===========================
  // SITTER EMAIL TEMPLATES
  // ===========================

  /**
   * Sitter: Booking confirmed & paid notification
   */
  private async sendSitterBookingConfirmedPaidEmail(booking: any, client: any, sitter: any): Promise<void> {
    const startDate = new Date(booking.startDate).toLocaleDateString();
    const endDate = new Date(booking.endDate).toLocaleDateString();
    const startTime = new Date(booking.startDate).toLocaleTimeString();
    const endTime = new Date(booking.endDate).toLocaleTimeString();

    await this.mailerService.sendMail({
      to: sitter.email,
      subject: `🎉 Confirmed Assignment: ${client.firstName} ${client.lastName} - ${startDate}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Confirmed Pet-Sitting Assignment</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px; background-color: #f9f9f9; }
            .booking-details { background-color: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #4CAF50; }
            .client-info { background-color: #E3F2FD; padding: 20px; border-radius: 8px; margin: 15px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            .highlight { background-color: #E8F5E8; padding: 2px 6px; border-radius: 4px; font-weight: bold; }
            .amount { font-size: 1.2em; color: #4CAF50; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Confirmed Assignment!</h1>
              <p>Your pet-sitting service is confirmed & paid</p>
            </div>
            <div class="content">
              <p>Dear <strong>${sitter.firstName}</strong>,</p>
              <p>Great news! Your pet-sitting assignment has been <span class="highlight">CONFIRMED & PAID</span>. The client is ready for your services!</p>
              
              <div class="booking-details">
                <h3>📅 Service Details</h3>
                <p><strong>Service Dates:</strong> <span class="highlight">${startDate} to ${endDate}</span></p>
                <p><strong>Service Times:</strong> ${startTime} - ${endTime}</p>
                <p><strong>Service Type:</strong> ${booking.serviceType}</p>
                <p><strong>Number of Pets:</strong> ${booking.numberOfPets}</p>
                <p><strong>Pet Types:</strong> ${booking.petTypes?.join(', ')}</p>
                <p><strong>Service Address:</strong> ${booking.serviceAddress || client.address}</p>
                <p><strong>Payment:</strong> <span class="amount">$${booking.totalAmount} ✅ CONFIRMED</span></p>
                
                ${booking.specialInstructions ? `
                <h4>⚠️ Special Instructions:</h4>
                <p>${booking.specialInstructions}</p>
                ` : ''}
                
                ${booking.notes ? `
                <h4>📝 Service Notes:</h4>
                <p>${booking.notes}</p>
                ` : ''}
              </div>

              <div class="client-info">
                <h3>👤 Client Contact Information</h3>
                <p><strong>Name:</strong> ${client.firstName} ${client.lastName}</p>
                <p><strong>Email:</strong> ${client.email}</p>
                <p><strong>Phone:</strong> ${client.phoneNumber || 'Contact via email'}</p>
                <p><strong>Emergency Contact:</strong> ${client.emergencyContact || 'Contact client for details'}</p>
              </div>

              <div style="background-color: #E8F5E8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4>📞 Next Steps:</h4>
                <ul>
                  <li><strong>Contact Client:</strong> Reach out within 24 hours to coordinate details</li>
                  <li><strong>Confirm Arrangements:</strong> Verify timing, access, and any special requirements</li>
                  <li><strong>Prepare for Service:</strong> Review pet care instructions and gather necessary supplies</li>
                  <li><strong>Day of Service:</strong> Arrive on time and provide excellent care</li>
                  <li><strong>Report:</strong> Update client and admin as needed during service</li>
                </ul>
                <p><strong>Booking Reference:</strong> ${booking._id}</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <p><strong>Questions or concerns?</strong></p>
                <p>Contact admin: <a href="mailto:${process.env.ADMIN_EMAIL || 'admin@flyingduchess.com'}">${process.env.ADMIN_EMAIL || 'admin@flyingduchess.com'}</a></p>
              </div>
            </div>
            <div class="footer">
              <p><strong>Whiskarz Pet-Sitting Team</strong></p>
              <p>Thank you for providing excellent pet care! 🐾❤️</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  }
}
