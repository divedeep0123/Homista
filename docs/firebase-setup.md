# Firebase setup for Homista

Homista uses the Firebase project `home-1-3119d` (display name **Home-1**). The web, Android (`com.homista.app`), and iOS (`com.homista.app`) clients are registered, and Phone sign-in is enabled. The console currently reports a limit of 10 sent SMS messages per day. Firebase's current pricing says those first 10 SMS are not billed; additional India SMS are listed at $0.07 each. Real SMS sign-in requires a billing account, while configured test phone numbers do not send SMS. See [Firebase phone-auth pricing](https://cloud.google.com/identity-platform/pricing) and the [billing requirement](https://firebase.google.com/docs/auth/faq-and-troubleshooting#what_happened_to_the_no-cost_sms_on_the_spark_pricing_plan). The web and native app configs are stored in ignored local files.

## Development setup

1. For development, add a Firebase test phone number and fixed test code so you can verify the flow without sending real SMS messages.
2. The Android and iOS configuration files are in `mobile/google-services.json` and `mobile/GoogleService-Info.plist`; both paths are ignored by Git. The registered Android app may also need the development signing certificate's SHA-1 fingerprint for phone verification.
3. In `backend/.env`, `FIREBASE_PROJECT_ID` and a unique `JWT_SECRET` of at least 32 bytes are set locally. Backend Firebase token verification still needs Application Default Credentials or `GOOGLE_APPLICATION_CREDENTIALS` pointing to a local Firebase Admin service-account file. Keep private credentials outside the repository; in a deployed environment use workload identity or Application Default Credentials.

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
