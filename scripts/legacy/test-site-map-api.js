// Test script to verify site map API is working
// Run this in the browser console

async function testSiteMapAPI() {
  console.log('🧪 Testing Site Map API...')
  
  try {
    // Test 1: GET request to load site maps
    console.log('1. Testing GET /api/admin/logistics/site-maps...')
    const getResponse = await fetch('/api/admin/logistics/site-maps?includeData=true')
    console.log('GET Response Status:', getResponse.status)
    console.log('GET Response Headers:', Object.fromEntries(getResponse.headers.entries()))
    
    if (getResponse.ok) {
      const getData = await getResponse.json()
      console.log('GET Response Data:', getData)
      console.log('✅ GET request successful - found', getData.data?.length || 0, 'site maps')
    } else {
      const getError = await getResponse.text()
      console.log('❌ GET request failed:', getError)
    }
    
    // Test 2: POST request to create a test site map
    console.log('2. Testing POST /api/admin/logistics/site-maps...')
    const testSiteMap = {
      name: 'Test Site Map',
      description: 'Test site map created via API test',
      environment: 'outdoor',
      width: 1000,
      height: 1000,
      scale: 1.0,
      backgroundColor: '#f8f9fa',
      gridEnabled: true,
      gridSize: 20,
      isPublic: false,
      eventId: null,
      tourId: null
    }
    
    const postResponse = await fetch('/api/admin/logistics/site-maps', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testSiteMap)
    })
    
    console.log('POST Response Status:', postResponse.status)
    console.log('POST Response Headers:', Object.fromEntries(postResponse.headers.entries()))
    
    if (postResponse.ok) {
      const postData = await postResponse.json()
      console.log('POST Response Data:', postData)
      console.log('✅ POST request successful - created site map:', postData.data?.id)
    } else {
      const postError = await postResponse.text()
      console.log('❌ POST request failed:', postError)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testSiteMapAPI()
