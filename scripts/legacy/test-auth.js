// Simple authentication test script
// Run this in the browser console to test authentication state

async function testAuth() {
  console.log('🔍 Testing Authentication State...')
  
  try {
    // Test 1: Check if user is logged in via auth context
    console.log('1. Checking auth context...')
    const authElements = document.querySelectorAll('[data-testid="user-info"], .user-profile, [class*="user"]')
    console.log('Auth elements found:', authElements.length)
    
    // Test 2: Check cookies
    console.log('2. Checking authentication cookies...')
    const cookies = document.cookie.split(';').map(c => c.trim())
    const authCookies = cookies.filter(c => 
      c.includes('supabase') || 
      c.includes('sb-') || 
      c.includes('auth') ||
      c.includes('session')
    )
    console.log('Auth cookies:', authCookies)
    
    // Test 3: Test API endpoint
    console.log('3. Testing API endpoint...')
    const response = await fetch('/api/admin/events')
    console.log('API Response Status:', response.status)
    console.log('API Response Headers:', Object.fromEntries(response.headers.entries()))
    
    if (response.ok) {
      const data = await response.json()
      console.log('API Response Data:', data)
    } else {
      const errorData = await response.text()
      console.log('API Error:', errorData)
    }
    
    // Test 4: Test site maps endpoint
    console.log('4. Testing site maps endpoint...')
    const siteMapResponse = await fetch('/api/admin/logistics/site-maps')
    console.log('Site Maps API Status:', siteMapResponse.status)
    
    if (siteMapResponse.ok) {
      const siteMapData = await siteMapResponse.json()
      console.log('Site Maps Data:', siteMapData)
    } else {
      const siteMapError = await siteMapResponse.text()
      console.log('Site Maps Error:', siteMapError)
    }
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

// Run the test
testAuth()
