import 'expo-router/entry';

// The background tasks (incoming Android pushes, notification buttons, the
// mail check) must be defined when the bundle loads. When the OS wakes a
// closed app for one of them, nothing is rendered, so a definition reached
// only through a route or component (src/app/_layout.tsx) never runs and the
// push or button press is dropped. Importing it here defines them either way.
import './src/features/notifications/background-check';
