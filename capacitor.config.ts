import type { CapacitorConfig } from "@capacitor/cli";

// VELORA's Android app is a thin native shell around the hosted web app.
// The app renders on the server, so the APK loads the published URL
// instead of bundling a static build. Event photos are never bundled.
// Set VELORA_APP_URL at build time (GitHub Actions variable) to your published URL.
const appUrl = process.env.VELORA_APP_URL || "https://id-preview--1ed4f37c-5fa4-4c16-a84f-c02dfc2c4a6e.lovable.app";

const config: CapacitorConfig = {
  appId: "app.velora.events",
  appName: "VELORA",
  webDir: "capacitor-shell",
  server: {
    url: appUrl,
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
