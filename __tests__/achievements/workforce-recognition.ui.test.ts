// @vitest-environment jsdom
import React from 'react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { VerifiedRoleRecognition } from '@/components/achievements/verified-role-recognition'
import { WorkforceCompletionVerification } from '@/components/achievements/workforce-completion-verification'
const fetchMock = vi.fn()
beforeEach(() => vi.stubGlobal('fetch', fetchMock))
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks() })
function response(data: object, ok = true) { return { ok, json: async () => data } }
describe('verified role recognition display', () => {
 it('shows progression and worker-controlled visibility without award controls', async () => {
   fetchMock.mockResolvedValueOnce(response({ badges: [{ badge_key: 'role:stage-manager', label: 'Stage Manager', level: 1, level_label: 'Qualified', credits: 1, employers: 1, next_level: { label: 'Experienced', credits: 5, employers: 1 } }], endorsements: [], history: [], is_public: false }))
   render(React.createElement(VerifiedRoleRecognition, { userId: 'worker', isOwnProfile: true }))
   expect(await screen.findByText('Stage Manager · Qualified')).toBeTruthy()
   expect(screen.queryByText('Verify successful completion')).toBeNull()
   fetchMock.mockResolvedValueOnce(response({ success: true }))
   fireEvent.click(screen.getByText('Show on profile'))
   await screen.findByText('Hide from profile')
   expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ is_public: true })
 })
 it('does not display unshared experience on another profile', async () => {
   fetchMock.mockResolvedValue(response({ badges: [], endorsements: [], history: [], is_public: false }))
   const { container } = render(React.createElement(VerifiedRoleRecognition, { userId: 'worker' }))
   await waitFor(() => expect(container.textContent).toBe(''))
 })
 it('submits manager evidence and endorsement for the selected assignment', async () => {
   fetchMock.mockResolvedValueOnce(response({ assignments: [{ id: 'assignment', user_id: 'worker', role_title: 'Stage Manager', role_key: 'stage-manager', ends_at: '2026-09-01T12:00:00Z' }], credits: [] }))
   render(React.createElement(WorkforceCompletionVerification, { entityType: 'venue', entityId: 'venue' }))
   await screen.findByText(/Stage Manager · worker/)
   fireEvent.change(screen.getByLabelText('Assignment'), { target: { value: 'assignment' } })
   fireEvent.change(screen.getByLabelText('Role endorsement (shown if worker opts in)'), { target: { value: 'Successfully executed all stage duties' } })
   fireEvent.change(screen.getByLabelText('Private completion evidence and operational references'), { target: { value: 'Signed checkout and handoff log' } })
   fetchMock.mockResolvedValueOnce(response({ success: true })).mockResolvedValueOnce(response({ assignments: [], credits: [] }))
   fireEvent.click(screen.getByText('Verify successful completion'))
   await screen.findByText('Verification records and progression updated.')
   expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ action: 'verify', assignment_id: 'assignment', endorsement: 'Successfully executed all stage duties', evidence: 'Signed checkout and handoff log' })
 })
 it('shows a failed authorization response without claiming completion', async () => {
   fetchMock.mockResolvedValue(response({ error: 'Employer/manager permission required' }, false))
   render(React.createElement(WorkforceCompletionVerification, { entityType: 'venue', entityId: 'other' }))
   await screen.findByText('Employer/manager permission required')
   expect(screen.queryByText('Verification records and progression updated.')).toBeNull()
 })
})
