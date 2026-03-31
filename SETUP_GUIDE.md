# HSI Alumni Portal - Setup Instructions

## ✅ Complete Registration & Admin Approval System

### Features Implemented:
1. **Registration with OTP Verification**
   - Users provide: Full Name, Username, Email, Password, Confirm Password
   - OTP sent to email upon clicking "Create Account"
   - Modal popup for OTP input
   - Registration set to "Pending" status after successful OTP verification

2. **Admin Dashboard**
   - View all pending registrations
   - Approve or Reject users
   - Real-time statistics (Total, Approved, Pending, Rejected)
   - Email notifications sent automatically

3. **Email Notifications**
   - OTP emails for registration
   - Approval confirmation emails
   - Rejection notification emails with reason

4. **Role-Based Dashboards**
   - Super Admin → Admin Dashboard
   - Approved Alumni → Alumni Dashboard
   - Pending/Rejected users cannot login

---

## 🚀 Setup Instructions

### 1. Configure Email Service

Edit `backend/.env` and add your Gmail credentials:

```env
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_gmail_app_password
DATA_ENCRYPTION_KEY=your_32_byte_secret_or_64_char_hex
## Optional: persistent media storage (recommended on Render)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_UPLOAD_FOLDER=hsialumniportal
LOGIN_MAX_ATTEMPTS=5
LOGIN_LOCK_MINUTES=15
RETENTION_AUDIT_LOG_DAYS=90
RETENTION_FEEDBACK_DAYS=730
RETENTION_MESSAGES_DAYS=365
RETENTION_PROFILE_INACTIVITY_DAYS=365
RETENTION_ANONYMIZE_INACTIVE_PROFILES=true
RETENTION_LOGIN_FAILURE_DAYS=90
RETENTION_JOB_INTERVAL_HOURS=24
ACCOUNT_SOFT_DELETE_GRACE_DAYS=30
ACCOUNT_SOFT_DELETE_FINAL_ACTION=delete
```

`DATA_ENCRYPTION_KEY` is required so `name`, `contactNumber`, `address`, and `profileImage` are encrypted at rest. `email` stays plain-text for search/login lookups.

**To get Gmail App Password:**
1. Go to Google Account settings
2. Security → 2-Step Verification (enable if not enabled)
3. App passwords → Select "Mail" → Generate
4. Copy the 16-character password

---

### 2. Start MongoDB

Make sure MongoDB is running locally or use MongoDB Compass to connect.

---

### 3. Update Super Admin (if needed)

If you need to recreate the super admin, edit `backend/seed.js` and run:

```powershell
cd backend
node seed.js
```

Current super admin:
- Email: `russeldauste.hs@gmail.com`
- Password: `1004200107Rr!`

---

### 4. Start the Backend

```powershell
cd backend
npm start
```

Backend runs on: `http://localhost:5000`

---

### 5. Start the Frontend

In a new terminal:

```powershell
cd ..
npm run dev
```

Frontend runs on: `http://localhost:5173`

---

## 📋 User Flow

### Registration Process:
1. User goes to `/register`
2. Fills in: Full Name, Username, Email, Password, Confirm Password
3. Agrees to Terms of Service
4. Clicks "Create Account" → OTP sent to email
5. Modal appears for OTP input
6. User enters 6-digit OTP
7. Upon successful verification → Registration status set to **Pending**
8. User redirected to login page

### Admin Approval Process:
1. Admin logs in at `/login`
2. Views pending registrations on dashboard
3. Can **Approve** or **Reject** with optional reason
4. **If Approved:**
   - User receives approval email
   - Can now login and access Alumni Dashboard
5. **If Rejected:**
   - User receives rejection email with reason
   - Cannot login

### Login Process:
1. User enters email and password
2. System checks:
   - Super Admin → Admin Dashboard
   - Approved Alumni → Alumni Dashboard
   - Pending → Error message
   - Rejected → Error message

---

## 🔗 API Endpoints

### Registration
- `POST /api/register/send-otp` - Send OTP to email
- `POST /api/register/verify-otp` - Verify OTP and complete registration

### Authentication
- `POST /api/auth/login` - Login (role and status checked)

### Admin (Requires Authorization Header)
- `GET /api/admin/pending-users` - Get all pending users
- `GET /api/admin/all-users` - Get all users
- `GET /api/admin/stats` - Get statistics
- `POST /api/admin/approve/:userId` - Approve user
- `POST /api/admin/reject/:userId` - Reject user with reason

---

## 🎨 Dashboards

### Admin Dashboard (`/admin-dashboard`)
- Pending users table with Approve/Reject buttons
- Statistics cards (Total, Approved, Pending, Rejected)
- Management and Quick Actions sections

### Alumni Dashboard (`/alumni-dashboard`)
- Profile card
- Activity stats
- Feature buttons (Directory, Events, Job Board, News)

---

## 🔧 Testing

1. **Register a new user:**
   - Go to http://localhost:5173/register
   - Fill in all fields
   - Check email for OTP
   - Enter OTP in modal

2. **Admin approval:**
   - Login as super admin
   - View pending user in dashboard
   - Approve or reject

3. **Alumni login:**
   - After approval, login with alumni credentials
   - Should redirect to Alumni Dashboard

---

## ⚠️ Important Notes

- Make sure MongoDB is running before starting the backend
- Configure EMAIL_USER and EMAIL_PASSWORD in backend/.env
- OTP expires in 10 minutes
- Rejected users receive email notification
- Approved users receive email with login link

---

## 📧 Email Templates Included

1. **OTP Email** - Styled verification code
2. **Approval Email** - Congratulations with login button
3. **Rejection Email** - Notification with reason (if provided)

---

Enjoy your fully functional HSI Alumni Portal! 🎉
