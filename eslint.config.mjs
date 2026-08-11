import path from "node:path"
import { fileURLToPath } from "node:url"
import { FlatCompat } from "@eslint/eslintrc"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const config = [
  {
    ignores: [
      ".next/**",
      "coverage/**",
      "dist/**",
      "build/**",
      "docs/**",
      "lib/generated/**",
      "apps/mobile/**",
      "apps/mobile/dist/**",
      "apps/mobile/node_modules/**",
    ],
  },
  ...compat.config({
    extends: ["next/core-web-vitals"],
    plugins: ["@typescript-eslint"],
    overrides: [
      {
        files: ["app/api/**/*.{ts,tsx}"],
        rules: {
          "no-restricted-imports": [
            "error",
            {
              paths: [
                {
                  name: "@/lib/supabase",
                  message:
                    "Route Handlers must use @/lib/supabase/server (cookie session) or @/lib/supabase/service-role (elevated). The @/lib/supabase barrel is for browser-safe exports only.",
                },
              ],
            },
          ],
        },
      },
    ],
    rules: {
      // Intentionally disabled: high-volume stylistic rules. The codebase
      // deliberately uses raw <img> for dynamic/external URLs and relies on
      // mount-effect patterns that predate exhaustive-deps; these rules add
      // noise (~600 warnings) without catching real defects here.
      "react-hooks/exhaustive-deps": "off",
      "@next/next/no-img-element": "off",
      "react/no-unescaped-entities": "off",
      "react/display-name": "off",
      // alt-text flags lucide-react `Image` icons and @react-pdf/renderer
      // `Image` (12+ files, 17 warnings) - none are real <img> elements.
      "jsx-a11y/alt-text": "off",
      "@next/next/no-html-link-for-pages": "warn",
      "react/jsx-no-comment-textnodes": "warn",
      "react-hooks/rules-of-hooks": "warn",
    },
  }),
]

export default config
