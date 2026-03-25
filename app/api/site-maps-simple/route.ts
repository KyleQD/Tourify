import { NextRequest, NextResponse } from 'next/server'

// Simple site map API without authentication for testing
export async function GET(request: NextRequest) {
  try {
    console.log('[Simple Site Maps API] GET request received')
    
    // Return mock data for testing
    const mockSiteMaps = [
      {
        id: 'test-1',
        name: 'Test Site Map 1',
        description: 'Test description',
        width: 1000,
        height: 1000,
        created_at: new Date().toISOString(),
        status: 'draft'
      },
      {
        id: 'test-2', 
        name: 'Test Site Map 2',
        description: 'Another test',
        width: 2000,
        height: 1500,
        created_at: new Date().toISOString(),
        status: 'published'
      }
    ]
    
    return NextResponse.json({
      success: true,
      data: mockSiteMaps,
      count: mockSiteMaps.length,
      message: 'Mock site maps loaded successfully'
    })
  } catch (error: any) {
    console.error('[Simple Site Maps API] GET Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Simple Site Maps API] POST request received')
    
    // Parse the request body
    const contentType = request.headers.get('content-type')
    let body: any = {}
    
    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData()
      body = {
        name: formData.get('name'),
        description: formData.get('description') || formData.get('environment'),
        width: parseInt(formData.get('width') as string) || 1000,
        height: parseInt(formData.get('height') as string) || 1000,
        scale: parseFloat(formData.get('scale') as string) || 1.0,
        backgroundColor: formData.get('backgroundColor') || '#f8f9fa',
        gridEnabled: formData.get('gridEnabled') === 'true',
        gridSize: parseInt(formData.get('gridSize') as string) || 20,
        isPublic: formData.get('isPublic') === 'true',
        eventId: formData.get('eventId') || null,
        tourId: formData.get('tourId') || null
      }
    } else {
      body = await request.json()
    }
    
    console.log('[Simple Site Maps API] Request body:', body)
    
    // Validate required fields
    if (!body.name) {
      return NextResponse.json({ 
        error: 'Name is required' 
      }, { status: 400 })
    }
    
    // Create mock site map
    const newSiteMap = {
      id: `simple-${Date.now()}`,
      name: body.name,
      description: body.description || '',
      width: body.width || 1000,
      height: body.height || 1000,
      scale: body.scale || 1.0,
      background_color: body.backgroundColor || '#f8f9fa',
      grid_enabled: body.gridEnabled ?? true,
      grid_size: body.gridSize || 20,
      is_public: body.isPublic ?? false,
      event_id: body.eventId || null,
      tour_id: body.tourId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'simple-api-user',
      status: 'draft'
    }
    
    console.log('[Simple Site Maps API] Created site map:', newSiteMap)
    
    return NextResponse.json({
      success: true,
      data: newSiteMap,
      message: 'Site map created successfully (mock)'
    })
  } catch (error: any) {
    console.error('[Simple Site Maps API] POST Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
