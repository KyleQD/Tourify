#!/bin/bash

# Quick test script for follow/friend request system
# This script helps you verify the system is working correctly

echo "🚀 Testing Follow/Friend Request System"
echo "========================================"
echo ""

# Check if migration file exists
if [ ! -f "supabase/migrations/20250210000000_complete_follow_friend_system.sql" ]; then
    echo "❌ Migration file not found!"
    echo "   Expected: supabase/migrations/20250210000000_complete_follow_friend_system.sql"
    exit 1
fi

echo "✅ Migration file found"
echo ""

# Check if test script exists
if [ ! -f "test-friend-request-flow.js" ]; then
    echo "⚠️  Test script not found: test-friend-request-flow.js"
    echo "   Skipping automated test..."
else
    echo "📝 Running automated test..."
    echo ""
    node test-friend-request-flow.js
    echo ""
fi

echo "========================================"
echo "📚 Next Steps:"
echo ""
echo "1. Apply the migration:"
echo "   - Option A: supabase db push"
echo "   - Option B: Copy SQL to Supabase Dashboard"
echo ""
echo "2. Test in the application:"
echo "   - Log in as User A"
echo "   - Send follow request to User B"
echo "   - Log in as User B"
echo "   - Check notification bell"
echo "   - Accept the request"
echo ""
echo "3. Verify database state:"
echo "   - Check triggers are installed"
echo "   - Verify notifications table schema"
echo "   - Review RLS policies"
echo ""
echo "📖 For detailed instructions, see:"
echo "   - APPLY_FOLLOW_SYSTEM_FIX.md"
echo "   - FOLLOW_FRIEND_REQUEST_SYSTEM_SETUP.md"
echo ""
echo "========================================"

