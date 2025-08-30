# 🧪 Email Notification System Testing Guide

## Prerequisites
- Server running on `http://localhost:8000`
- Valid user authentication (JWT token)
- Email credentials configured in environment variables

## 📧 Environment Variables Check
First, ensure these email settings are configured in your `.env` file:
```bash
ADMIN_EMAIL=admin@flyingduchess.com
MAIL_HOST=your-smtp-host
MAIL_PORT=587
MAIL_USER=your-email@domain.com
MAIL_PASS=your-email-password
```

## 🚀 Test Methods

### **Method 1: Create New Booking (Client Flow)**
This tests the complete email workflow for new bookings.

**Endpoint:** `POST http://localhost:8000/bookings`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

**Request Body:**
```json
{
  "userId": "USER_ID_HERE",
  "startDate": "2025-08-25",
  "endDate": "2025-08-27",
  "serviceType": "Pet Sitting",
  "numberOfPets": 2,
  "petTypes": ["Dog", "Cat"],
  "serviceAddress": "123 Pet Street, Animal City, AC 12345",
  "totalAmount": 150,
  "notes": "My pets are very friendly and love attention!",
  "specialInstructions": "Please feed the cat at 6 AM and 6 PM. Dog needs a walk twice daily."
}
```

**Expected Emails:**
- ✅ Admin receives booking notification
- ✅ Client receives booking confirmation

---

### **Method 2: Admin Create Booking**
Test admin-created bookings with immediate sitter assignment.

**Endpoint:** `POST http://localhost:8000/bookings/admin`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer ADMIN_JWT_TOKEN
```

**Request Body:**
```json
{
  "userId": "CLIENT_USER_ID",
  "sitterId": "SITTER_USER_ID",
  "startDate": "2025-08-30",
  "endDate": "2025-09-02",
  "serviceType": "Pet Sitting",
  "numberOfPets": 1,
  "petTypes": ["Dog"],
  "serviceAddress": "456 Dog Lane, Pet City, PC 67890",
  "totalAmount": 200,
  "status": "assigned",
  "notes": "Admin created booking for regular client"
}
```

**Expected Emails:**
- ✅ Admin receives booking notification
- ✅ Client receives booking confirmation  
- ✅ Sitter receives assignment notification

---

### **Method 3: Assign Sitter to Existing Booking**
Test sitter assignment notifications.

**Endpoint:** `PUT http://localhost:8000/bookings/{BOOKING_ID}/assign-sitter`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer ADMIN_JWT_TOKEN
```

**Request Body:**
```json
{
  "sitterId": "SITTER_USER_ID"
}
```

**Expected Emails:**
- ✅ Sitter receives assignment notification

---

## 🎯 Quick Testing Steps

### **Step 1: Get Valid User IDs**
```bash
# Get clients
GET http://localhost:8000/users/admin/clients

# Get sitters  
GET http://localhost:8000/users/admin/sitters
```

### **Step 2: Create Test Booking**
Use the booking creation endpoint with valid user IDs from Step 1.

### **Step 3: Check Email Delivery**
- Check admin email inbox
- Check client email inbox
- Check server logs for email sending confirmation

---

## 🔍 Debugging & Logs

### **Check Server Logs**
Monitor the terminal running your dev server for:
```
Email notifications sent for booking [BOOKING_ID]
Sitter assignment notification sent for booking [BOOKING_ID]
```

### **Error Handling**
If emails fail, check for errors like:
```
Failed to send booking notification emails: [error details]
Failed to send sitter assignment notification: [error details]
```

---

## 📱 Testing with Real Email

### **Gmail Configuration Example:**
```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-gmail@gmail.com
MAIL_PASS=your-app-password
MAIL_FROM=your-gmail@gmail.com
ADMIN_EMAIL=admin@yourdomain.com
```

### **Test Email Recipients:**
- Set `ADMIN_EMAIL` to your test email
- Use your own email as client email for testing
- Use different email for sitter testing

---

## 🛠️ Advanced Testing

### **Load Testing:**
Create multiple bookings rapidly to test email queue handling.

### **Email Template Testing:**
- Test with empty fields (notes, specialInstructions)
- Test with very long content
- Test with special characters

### **Error Scenarios:**
- Test with invalid user IDs
- Test without email configuration
- Test with network connectivity issues

---

## 📋 Test Checklist

- [ ] Admin notification email sent
- [ ] Client confirmation email sent  
- [ ] Sitter assignment email sent
- [ ] Email templates render correctly
- [ ] All booking details included
- [ ] Contact information present
- [ ] Professional styling applied
- [ ] No server errors in logs
- [ ] Booking created successfully in database
- [ ] Email failure doesn't break booking creation

---

## 🎨 Email Template Preview

The emails include:
- **Professional HTML styling** with Whiskarz branding
- **Responsive design** for mobile/desktop
- **Color-coded sections** for easy reading
- **Clear action items** and next steps
- **Complete booking details** and contact info
