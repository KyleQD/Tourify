import { publishJobTemplateToBoardSurfaces } from '../publish-template-to-board'

describe('publishJobTemplateToBoardSurfaces', () => {
  it('inserts into job_board_postings and organization_job_postings', async () => {
    const inserted: { table: string; row: Record<string, unknown> }[] = []
    const supabase = {
      from(table: string) {
        return {
          insert: (row: Record<string, unknown>) => {
            inserted.push({ table, row })
            return { error: null }
          },
          delete: () => ({
            eq: () => ({ error: null }),
          }),
        }
      },
    }

    const result = await publishJobTemplateToBoardSurfaces(supabase as any, {
      template: {
        id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        venue_id: '11111111-2222-3333-4444-555555555555',
        title: 'Test role',
        description: 'Desc',
        department: 'Ops',
        position: 'Tech',
        employment_type: 'contractor',
        location: 'NYC',
        number_of_positions: 2,
        experience_level: 'mid',
        status: 'published',
      },
      userId: 'user-1',
      organizationId: '11111111-2222-3333-4444-555555555555',
      organizationName: 'Test Venue',
    })

    expect(result.ok).toBe(true)
    expect(inserted.map((i) => i.table)).toEqual(['job_board_postings', 'organization_job_postings'])
    expect(inserted[0].row.template_id).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')
    expect(inserted[0].row.is_featured).toBe(false)
    expect(inserted[1].row).not.toHaveProperty('is_featured')
  })
})
