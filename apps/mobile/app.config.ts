import type { ExpoConfig } from "expo/config"

const appConfig: ExpoConfig = {
  name: "Tourify",
  slug: "tourify-mobile",
  version: "1.0.0",
  scheme: "tourify",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.tourify.mobile",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false
    },
    associatedDomains: ["applinks:tourify.app"]
  },
  android: {
    package: "com.tourify.mobile",
    adaptiveIcon: {
      backgroundColor: "#0f172a"
    },
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: "https",
            host: "tourify.app",
            pathPrefix: "/auth/mobile-callback"
          }
        ],
        category: ["BROWSABLE", "DEFAULT"]
      }
    ]
  },
  plugins: [
    "expo-router",
    [
      "expo-location",
      {
        locationWhenInUsePermission: "Tourify uses your location to personalize discover results."
      }
    ]
  ],
  experiments: {
    typedRoutes: true
  },
  extra: {
    eas: {
      projectId: "3513f490-15b3-407d-9045-46453b553baf"
    },
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  }
}

export default appConfig
