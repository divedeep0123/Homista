# Firebase setup for Homista

Homista does not have a Firebase project configured yet. The app's phone sign-in is implemented, but Firebase will not send SMS codes until these project steps are complete.

## Create and configure the project

1. Create a Firebase project in the [Firebase console](https://console.firebase.google.com/).
2. In **Authentication → Sign-in method**, enable **Phone**. For development, add a Firebase test phone number and fixed test code so you can verify the flow without sending real SMS messages.
3. Register an Android app with package `com.homista.app` and an iOS app with bundle ID `com.homista.app`. Download their Firebase app configuration files into `mobile/google-services.json` and `mobile/GoogleService-Info.plist`. These files are ignored by Git.
4. Register a Web app in the same Firebase project. Copy its web configuration into `mobile/.env`, based on `mobile/.env.example`. The project ID must match the backend's Firebase project ID.
5. In `backend/.env`, set `FIREBASE_PROJECT_ID` to that same project ID, set `GOOGLE_APPLICATION_CREDENTIALS` to the local path of a Firebase Admin service-account file, and set `JWT_SECRET` to a unique random value of at least 32 bytes. Keep the service-account file outside the repository; in a deployed environment use workload identity or Application Default Credentials.

## Build and run the native app

With Xcode or Android Studio installed and the Firebase files in place:

```bash
cd mobile
npm ci
npx expo prebuild
npx expo run:ios
```

Use `npx expo run:android` for Android. Rebuild the native app after changing Firebase native configuration. For an Android device, register the development signing certificate's SHA-1 in Firebase if phone verification asks for it.

## Run browser preview

Set `EXPO_PUBLIC_API_URL` in `mobile/.env` to `http://127.0.0.1:8000` when the browser and API run on the same Mac. Start the API from `backend/`, then start Expo's web app from `mobile/` with `npm run web`. A physical device needs the Mac's reachable LAN address for `EXPO_PUBLIC_API_URL`.

Phone numbers are sent to Firebase as part of SMS authentication. Use Firebase test numbers while developing; live SMS availability and limits depend on Firebase project configuration.
