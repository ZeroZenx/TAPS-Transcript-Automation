# 🔐 Local Login Feature Added

## ✅ New Feature: Local Authentication

Your TAPS application now supports **both** Microsoft 365 and local username/password login!

## 🎯 How to Use

### Login Page
When you visit http://localhost:4000/login, you'll see two tabs:

1. **Microsoft 365** (default) - Original Azure AD login
2. **Local Login** - New username/password option

### Creating a Local Account

1. Go to: http://localhost:4000/register
2. Fill in:
   - Full Name
   - Email
   - Password (min 8 characters)
   - Confirm Password
3. Click "Create Account"
4. You'll be redirected to login

### Logging In Locally

1. Go to: http://localhost:4000/login
2. Click "Local Login" tab
3. Enter your email and password
4. Click "Sign In"

## 🔒 Security Features

- ✅ Password hashing with bcrypt
- ✅ JWT token authentication
- ✅ Secure password storage
- ✅ Token expiration (7 days)
- ✅ Password validation

## 📋 API Endpoints

### Register
```
POST /api/auth/register
Body: { email, name, password, role? }
```

### Local Login
```
POST /api/auth/login-local
Body: { email, password }
Returns: { user, token }
```

### Change Password
```
POST /api/auth/change-password
Body: { email, currentPassword, newPassword }
```

## 🎯 Use Cases

- **When to use Local Login:**
  - Azure AD is unavailable
  - Testing without Azure setup
  - Quick development access
  - Backup authentication method

- **When to use Microsoft 365:**
  - Production environment
  - Enterprise authentication
  - Single sign-on (SSO)
  - Organization integration

## 🔧 Configuration

### Environment Variables

Add to `backend/.env`:
```env
JWT_SECRET=your-secret-key-here-change-in-production
```

### Database Schema

The User model now includes:
- `passwordHash` - Hashed password for local auth
- `authMethod` - "AZURE" or "LOCAL"

## ✅ Status

**Local login is now active and ready to use!**

Visit http://localhost:4000/login and try the "Local Login" tab.

---

**Note:** Both authentication methods work independently. Users can choose whichever is available or preferred.

