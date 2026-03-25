#!/bin/bash

# Project Migration Helper Script
# This script helps migrate code safely to a new project

set -e  # Exit on error

echo "================================================"
echo "   PROJECT MIGRATION HELPER"
echo "================================================"
echo ""
echo "⚠️  WARNING: This script will help migrate your project"
echo "    to a new location. Make sure you've completed"
echo "    Phase 1 & 2 from PROJECT_MIGRATION_GUIDE.md"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get current directory
OLD_PROJECT=$(pwd)

# Ask for new project location
echo -e "${YELLOW}Enter the full path for your new project:${NC}"
echo "Example: /Users/kyledaley/Developer/myproject/tourify-v2"
read -r NEW_PROJECT

# Validate input
if [ -z "$NEW_PROJECT" ]; then
    echo -e "${RED}Error: Project path cannot be empty${NC}"
    exit 1
fi

# Check if directory already exists
if [ -d "$NEW_PROJECT" ]; then
    echo -e "${YELLOW}Directory already exists. Continue anyway? (y/n)${NC}"
    read -r confirm
    if [ "$confirm" != "y" ]; then
        echo "Aborted."
        exit 0
    fi
else
    # Create new directory
    echo -e "${GREEN}Creating new project directory...${NC}"
    mkdir -p "$NEW_PROJECT"
fi

echo ""
echo -e "${GREEN}Starting migration from:${NC}"
echo "  $OLD_PROJECT"
echo -e "${GREEN}to:${NC}"
echo "  $NEW_PROJECT"
echo ""

# Function to copy with feedback
copy_item() {
    local item=$1
    local description=$2
    
    if [ -e "$OLD_PROJECT/$item" ]; then
        echo -e "${GREEN}✓${NC} Copying $description..."
        cp -r "$OLD_PROJECT/$item" "$NEW_PROJECT/"
    else
        echo -e "${YELLOW}⊘${NC} $description not found, skipping..."
    fi
}

# Copy safe application code
echo "================================================"
echo "Copying Application Code"
echo "================================================"

copy_item "app" "Next.js app directory"
copy_item "components" "Components"
copy_item "lib" "Library code"
copy_item "hooks" "React hooks"
copy_item "utils" "Utilities"
copy_item "types" "TypeScript types"
copy_item "styles" "Styles"
copy_item "contexts" "React contexts"
copy_item "context" "Context (alternate location)"
copy_item "services" "Services"

echo ""
echo "================================================"
echo "Copying Configuration Files"
echo "================================================"

copy_item "package.json" "Package configuration"
copy_item "tsconfig.json" "TypeScript configuration"
copy_item "tailwind.config.ts" "Tailwind configuration"
copy_item "next.config.ts" "Next.js configuration"
copy_item "next.config.js" "Next.js configuration (JS)"
copy_item "next.config.mjs" "Next.js configuration (MJS)"
copy_item "postcss.config.mjs" "PostCSS configuration"
copy_item "components.json" "Shadcn components config"
copy_item "middleware.ts" "Next.js middleware"

echo ""
echo "================================================"
echo "Copying Database Files"
echo "================================================"

copy_item "supabase" "Supabase migrations"
copy_item "prisma" "Prisma schema"

echo ""
echo "================================================"
echo "Copying Public Assets"
echo "================================================"

copy_item "public" "Public assets"

echo ""
echo "================================================"
echo "Creating Security Files"
echo "================================================"

# Create .gitignore
echo -e "${GREEN}✓${NC} Creating .gitignore..."
cat > "$NEW_PROJECT/.gitignore" << 'EOF'
# Dependencies
/node_modules
/.pnp
.pnp.js

# Testing
/coverage

# Next.js
/.next/
/out/

# Production
/build
dist/

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env
.env*.local
.env.development.local
.env.test.local
.env.production.local
.env.local

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Logs
logs
*.log

# Secrets
secrets/
*.key
*.pem

# OS
Thumbs.db
EOF

# Create .env.example
echo -e "${GREEN}✓${NC} Creating .env.example..."
cat > "$NEW_PROJECT/.env.example" << 'EOF'
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

# Database (if using Prisma directly)
DATABASE_URL=your-postgres-connection-string

# Stripe (if applicable)
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# AWS S3 (if applicable)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_BUCKET_NAME=

# Resend Email (if applicable)
RESEND_API_KEY=

# Upstash Redis (if applicable)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Other API Keys
# Add your other service API keys here
EOF

echo ""
echo "================================================"
echo "Creating New README"
echo "================================================"

echo -e "${GREEN}✓${NC} Creating README.md..."
cat > "$NEW_PROJECT/README.md" << 'EOF'
# New Project

This project was migrated from a previous codebase for security reasons.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env.local
```

3. Fill in your new credentials in `.env.local`

4. Set up the database (see DATABASE_SETUP.md)

5. Run development server:
```bash
npm run dev
```

## Security Notes

- All credentials have been rotated
- Never commit `.env.local` or any secrets
- Enable 2FA on all services
- Review SECURITY.md for best practices

## Migration Date

Migrated on: $(date)

## Documentation

See PROJECT_MIGRATION_GUIDE.md for complete migration documentation.
EOF

# Create security checklist
echo -e "${GREEN}✓${NC} Creating SECURITY_CHECKLIST.md..."
cat > "$NEW_PROJECT/SECURITY_CHECKLIST.md" << 'EOF'
# Security Checklist

## Before First Commit

- [ ] Review all code for hardcoded secrets
- [ ] Ensure `.env.local` is in `.gitignore`
- [ ] Generate new `NEXTAUTH_SECRET`
- [ ] Set up new Supabase project
- [ ] Get new Supabase API keys
- [ ] Update all environment variables

## Before First Deploy

- [ ] Set all environment variables in hosting platform
- [ ] Test all authentication flows
- [ ] Verify RLS policies are enabled
- [ ] Test file uploads with new storage buckets
- [ ] Verify all API endpoints work
- [ ] Check no secrets in client-side code

## After Deploy

- [ ] Enable 2FA on GitHub
- [ ] Enable 2FA on Supabase  
- [ ] Enable 2FA on Vercel/hosting
- [ ] Set up monitoring
- [ ] Configure alerts
- [ ] Document incident (if applicable)

## Monthly

- [ ] Review access logs
- [ ] Check for unused API keys
- [ ] Update dependencies
- [ ] Review user sessions

## Quarterly

- [ ] Rotate all API keys
- [ ] Security audit
- [ ] Review and update RLS policies
- [ ] Penetration testing (if applicable)
EOF

echo ""
echo "================================================"
echo "Finalizing"
echo "================================================"

# Initialize git
echo -e "${YELLOW}Initialize git repository? (y/n)${NC}"
read -r init_git

if [ "$init_git" = "y" ]; then
    cd "$NEW_PROJECT"
    git init
    git branch -M main
    echo -e "${GREEN}✓${NC} Git repository initialized"
    
    echo ""
    echo -e "${YELLOW}Create initial commit? (y/n)${NC}"
    read -r initial_commit
    
    if [ "$initial_commit" = "y" ]; then
        git add .
        git commit -m "Initial commit - migrated project"
        echo -e "${GREEN}✓${NC} Initial commit created"
    fi
fi

echo ""
echo "================================================"
echo "Migration Complete!"
echo "================================================"
echo ""
echo -e "${GREEN}Your new project is ready at:${NC}"
echo "  $NEW_PROJECT"
echo ""
echo -e "${YELLOW}IMPORTANT NEXT STEPS:${NC}"
echo ""
echo "1. ${RED}DO NOT COPY .env or .env.local files${NC}"
echo ""
echo "2. Generate new secrets:"
echo "   cd $NEW_PROJECT"
echo "   openssl rand -base64 32  # for NEXTAUTH_SECRET"
echo ""
echo "3. Create .env.local with NEW credentials:"
echo "   cp .env.example .env.local"
echo "   # Edit .env.local with your editor"
echo ""
echo "4. Set up new Supabase project:"
echo "   - Go to https://supabase.com"
echo "   - Create new project"
echo "   - Copy new credentials to .env.local"
echo ""
echo "5. Install dependencies:"
echo "   npm install"
echo ""
echo "6. Review the following files for any old references:"
echo "   - middleware.ts"
echo "   - next.config.ts"
echo "   - All files in app/api/"
echo ""
echo "7. Set up new database:"
echo "   - Review supabase/migrations/ files"
echo "   - Remove any test data or secrets"
echo "   - Apply migrations to new Supabase project"
echo ""
echo "8. Test locally:"
echo "   npm run dev"
echo ""
echo "9. Review complete guide:"
echo "   Read PROJECT_MIGRATION_GUIDE.md for detailed steps"
echo ""
echo "10. Complete SECURITY_CHECKLIST.md before deploying"
echo ""
echo -e "${RED}Remember: NEVER commit secrets to git!${NC}"
echo ""


