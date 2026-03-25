#!/bin/bash

# Secret Scanner - Scans codebase for potential secrets before migration
# Run this in your OLD project before migrating

echo "================================================"
echo "   SECRET SCANNER"
echo "================================================"
echo ""
echo "Scanning codebase for potential secrets..."
echo "Review any findings carefully before migration."
echo ""

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

FOUND_ISSUES=0

# Function to search and report
search_for() {
    local pattern=$1
    local description=$2
    local results
    
    results=$(grep -r -n -i "$pattern" \
        --exclude-dir={node_modules,.next,build,dist,.git} \
        --exclude={*.log,*.lock,package-lock.json,pnpm-lock.yaml} \
        . 2>/dev/null || true)
    
    if [ -n "$results" ]; then
        echo -e "${RED}⚠ Found: $description${NC}"
        echo "$results" | head -10  # Show first 10 matches
        if [ $(echo "$results" | wc -l) -gt 10 ]; then
            echo "  ... and more"
        fi
        echo ""
        FOUND_ISSUES=$((FOUND_ISSUES + 1))
    fi
}

echo "Scanning for common secret patterns..."
echo ""

# Supabase keys
search_for "eyJ[a-zA-Z0-9_-]{30,}" "Supabase JWT tokens"
search_for "sb[a-z]-[a-zA-Z0-9-]+" "Supabase project references"

# API Keys
search_for "['\"]sk_live_[a-zA-Z0-9]{24,}['\"]" "Stripe live secret keys"
search_for "['\"]pk_live_[a-zA-Z0-9]{24,}['\"]" "Stripe live publishable keys"
search_for "['\"]sk_test_[a-zA-Z0-9]{24,}['\"]" "Stripe test secret keys"
search_for "AKIA[0-9A-Z]{16}" "AWS Access Key IDs"

# Generic API key patterns
search_for "['\"][a-zA-Z0-9_-]{32,}['\"].*[Kk]ey" "Potential API keys"
search_for "api[_-]?key['\"]?\s*[:=]\s*['\"][^'\"]{20,}" "API key assignments"
search_for "secret['\"]?\s*[:=]\s*['\"][^'\"]{20,}" "Secret assignments"
search_for "token['\"]?\s*[:=]\s*['\"][^'\"]{30,}" "Token assignments"

# Passwords
search_for "password['\"]?\s*[:=]\s*['\"][^'\"]+['\"]" "Hardcoded passwords"
search_for "passwd['\"]?\s*[:=]\s*['\"][^'\"]+['\"]" "Hardcoded passwords (passwd)"

# Database URLs
search_for "postgres://[^'\"]*:[^'\"]*@" "PostgreSQL connection strings"
search_for "postgresql://[^'\"]*:[^'\"]*@" "PostgreSQL connection strings"
search_for "mysql://[^'\"]*:[^'\"]*@" "MySQL connection strings"

# Private keys
search_for "-----BEGIN.*PRIVATE KEY-----" "Private key files"

# OAuth
search_for "client_secret" "OAuth client secrets"

# Email service keys
search_for "re_[a-zA-Z0-9]{24,}" "Resend API keys"

# Redis
search_for "redis://:[^'\"@]*@" "Redis URLs with passwords"

# JWT secrets
search_for "jwt[_-]?secret" "JWT secrets"

# Environment variable assignments with values
search_for "^[A-Z_]+=['\"]?[a-zA-Z0-9-_]{32,}" "Environment variables with long values" || true

echo "================================================"
echo ""

if [ $FOUND_ISSUES -gt 0 ]; then
    echo -e "${RED}⚠️  WARNING: Found $FOUND_ISSUES potential security issues${NC}"
    echo ""
    echo "IMPORTANT:"
    echo "1. Review each finding carefully"
    echo "2. Remove any hardcoded secrets"
    echo "3. Move secrets to environment variables"
    echo "4. Ensure secrets are in .gitignore"
    echo "5. These credentials should NOT be migrated"
    echo ""
    echo "Next steps:"
    echo "- Fix issues in code"
    echo "- Run this script again until clean"
    echo "- Then proceed with migration"
else
    echo -e "${GREEN}✓ No obvious secrets found in scan${NC}"
    echo ""
    echo "Note: This is not a comprehensive security audit."
    echo "Manual review is still recommended."
fi

echo ""
echo "================================================"
echo "Additional checks to perform manually:"
echo "================================================"
echo ""
echo "1. Check all .env files (should not be in git):"
echo "   find . -name '.env*' -type f"
echo ""
echo "2. Check git history for secrets:"
echo "   git log -p | grep -i 'password\\|secret\\|key'"
echo ""
echo "3. Review all files in app/api/ directory"
echo ""
echo "4. Review middleware.ts for auth logic"
echo ""
echo "5. Check for commented-out secrets"
echo ""
echo "6. Review all configuration files"
echo ""

exit $FOUND_ISSUES


