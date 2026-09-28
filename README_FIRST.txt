KRISHIONGO - FINAL CORE APP PACK
================================

IMPORTANT:
The App.js you most recently uploaded is an older/partial version.
Use the App.js in this pack instead. It includes the complete core mobile upgrades.

MOBILE FILES
------------
Copy these files into your existing KrishiOnGo/mobile folder:

App.js
LoginScreen.js
api.js
app.json

Then install:

npx expo install expo-location react-native-maps @react-native-async-storage/async-storage

BACKEND FILES
-------------
Copy these into your existing KrishiOnGo/backend folder:

models/User.js
middleware/authMiddleware.js
routes/auth.js
routes/locationRoutes.js
routes/profileRoutes.js
routes/adminRoutes.js

Then open server.js and apply the contents of server-additions.js.txt.
DO NOT remove your existing jobRoutes.js, matchRoutes.js, applicationRoutes.js,
requestRoutes.js or userRoutes.js.

FEATURES INCLUDED
-----------------
- Farmer registration/login
- Worker registration/login
- Persistent login
- Logout
- JWT authentication
- Foreground GPS tracking
- GPS location sync to MongoDB
- GPS-based job creation
- Nearby-job filtering by distance
- Map screen
- Job/application/matching flow
- Profile editing
- Admin API endpoints

TEST BEFORE CLOUD DEPLOYMENT
----------------------------
1. Start backend: node server.js
2. Run mobile with Expo Go: npx expo start
3. Test Farmer registration/login
4. Test Worker registration/login
5. Allow GPS permission
6. Check MongoDB users.location
7. Create a job and check its GPS location
8. Test nearby jobs, applications and matching

MAP
---
app.json contains YOUR_GOOGLE_MAPS_API_KEY.
Replace it with your Android Google Maps API key before a standalone Android build.

CLOUD INDEPENDENCE
------------------
The app is NOT independent from the laptop until you:
1. Move MongoDB to MongoDB Atlas.
2. Deploy the Express backend to a public HTTPS URL.
3. Change mobile/api.js API_BASE from the laptop IP to that HTTPS URL.

Do not put database passwords or JWT secrets in the mobile app.

FINAL ANDROID BUILD
-------------------
After the cloud API works:

eas build -p android --profile preview

For store distribution, create the production Android App Bundle separately.
