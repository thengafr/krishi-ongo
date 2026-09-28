# KrishiOnGo – completion pack

This pack adds the remaining core mobile-app pieces without replacing your existing job/matching/application route logic.

## Mobile files

Copy these into `KrishiOnGo/mobile/`:
- `App.js`
- `LoginScreen.js`
- `api.js`
- `app.json`

Install:
`npx expo install expo-location react-native-maps @react-native-async-storage/async-storage`

The mobile update includes:
- Farmer/Worker login + registration
- persistent login using AsyncStorage
- logout
- foreground GPS tracking
- location sync to backend
- current location display
- GPS-based job creation
- nearby-job filtering by distance
- map screen with user/job markers
- profile editing
- existing job/application/matching flow

## Backend files

Copy these into the matching folders:
- `models/User.js`
- `middleware/authMiddleware.js`
- `routes/auth.js`
- `routes/locationRoutes.js`
- `routes/profileRoutes.js`
- `routes/adminRoutes.js`

Then apply `server-additions.js.txt` to your EXISTING `server.js`.

Do NOT delete your existing jobRoutes.js, matchRoutes.js, applicationRoutes.js, requestRoutes.js or userRoutes.js.

## Cloud independence

You still need to move MongoDB to MongoDB Atlas and deploy the Express backend to a public HTTPS host. Do not put the Atlas username/password or JWT secret in the mobile app.

After deployment, change `mobile/api.js` from the laptop IP to your public HTTPS API base URL.

## Important

The map configuration contains `YOUR_GOOGLE_MAPS_API_KEY`. Replace that with your own Android Maps API key before a production Android build.

GPS tracking in this pack is foreground tracking while the app is open. Background/closed-app tracking is a separate native-permission step.
