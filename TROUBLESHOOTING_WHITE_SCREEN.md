# 🔧 Troubleshooting White Screen

## Issue: White Screen When Opening http://localhost:4000

### ✅ Fixed Issues:

1. **MSAL Configuration Error**
   - Made MSAL initialization graceful when Azure config is missing
   - App now works without Azure AD configuration
   - Local login works independently

2. **React Error Handling**
   - Added error boundaries
   - Better error messages

### 🔍 If Still Seeing White Screen:

#### Step 1: Check Browser Console
1. Open http://localhost:4000
2. Press **F12** (or Cmd+Option+I on Mac)
3. Go to **Console** tab
4. Look for red error messages
5. Share any errors you see

#### Step 2: Verify Server is Running
```bash
curl http://localhost:4000/api/health
```
Should return: `{"status":"ok"}`

#### Step 3: Check Network Tab
1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Refresh page (F5)
4. Check if all files load:
   - `index.html` ✅
   - `index-*.js` ✅
   - `index-*.css` ✅
   - Any 404 errors?

#### Step 4: Try Hard Refresh
- **Windows/Linux:** Ctrl + Shift + R
- **Mac:** Cmd + Shift + R

#### Step 5: Check JavaScript File
The app loads `/assets/index-D666MWW4.js`
- Verify it exists: `ls backend/public/assets/`
- Should be ~324KB

### 🛠️ Quick Fixes:

**If MSAL error:**
- Use "Local Login" tab instead
- Or configure Azure AD in `.env` files

**If file not found:**
```bash
cd frontend
npm run build
cd ..
rm -rf backend/public
mkdir -p backend/public
cp -r frontend/dist/* backend/public/
```

**If server not responding:**
```bash
# Restart server
./START_APP.sh
```

### ✅ Current Status:

- ✅ Server running on port 4000
- ✅ Frontend files in place
- ✅ MSAL errors handled gracefully
- ✅ Local login available

**The application should work now!**

If you still see a white screen, please:
1. Open browser console (F12)
2. Check for any error messages
3. Share the error details

---

**Most Common Fix:** Hard refresh (Cmd/Ctrl + Shift + R)

