# Ghost Twin Arena — Mobile (Expo)

This folder contains a minimal Expo React Native app scaffold implementing the `HomeScreen` and `MatchScreen` UI that match the provided design and respect the architecture in the doc (mobile → backend → Claude/ElevenLabs).

Quick start (from this folder):

```bash
cd mobile
npm install
npx expo start
```

Notes:
- Replace `API_BASE` in `screens/MatchScreen.jsx` with your machine IP (e.g. `http://192.168.1.42:8000`).
- Install dependencies with `npm install` or `yarn`.
- The app uses `expo-av` to play base64 or remote audio URLs returned by the backend.
