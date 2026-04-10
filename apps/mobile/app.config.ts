import type { ExpoConfig } from "expo/config"

const appConfig: ExpoConfig = {
  name: "Tourify",
  slug: "tourify-mobile",
  version: "1.0.0",
  icon: "./assets/launch/app-icon-1024-v1.png",
  scheme: "tourify",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  splash: {
    image: "./assets/launch/splash-image-1242x2436-v1.png",
    resizeMode: "contain",
    backgroundColor: "#0f172a"
  },
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
      foregroundImage: "./assets/launch/adaptive-foreground-1024-v1.png",
      monochromeImage: "./assets/launch/adaptive-foreground-1024-v1.png",
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
    "expo-asset",
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
