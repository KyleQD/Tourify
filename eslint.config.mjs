import path from "node:path"
import { fileURLToPath } from "node:url"
import { FlatCompat } from "@eslint/eslintrc"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

export default [
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
      "react/no-unescaped-entities": "warn",
      "@next/next/no-html-link-for-pages": "warn",
      "react/jsx-no-comment-textnodes": "warn",
      "react/display-name": "warn",
      "react-hooks/rules-of-hooks": "warn",
    },
  }),
]
