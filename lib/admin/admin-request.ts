/**
 * Shared client helpers for Admin Work Mode fetches.
 * Keeps acting-header wiring and scope-error copy consistent across surfaces.
 */

export function buildAdminRequest(
  actingHeaders: Record<string, string>,
  input?: RequestInit,
): RequestInit {
  return {
    credentials: 'include',
    cache: 'no-store',
    ...input,
    headers: {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      ...actingHeaders,
      ...(input?.headers || {}),
    },
  }
}

export function buildAdminJsonRequest(
  actingHeaders: Record<string, string>,
  input?: RequestInit,
): RequestInit {
  return buildAdminRequest(actingHeaders, {
    ...input,
    headers: {
      'Content-Type': 'application/json',
      ...(input?.headers || {}),
    },
  })
}

export interface AdminScopeErrorCopy {
  title: string
  message: string
  actionHint?: string
}

export function mapAdminScopeError(
  status: number,
  code?: string | null,
  fallbackMessage?: string | null,
): AdminScopeErrorCopy {
  if (status === 401) {
    return {
      title: 'Sign in required',
      message: 'Your session expired. Sign in again to continue.',
      actionHint: 'Sign in',
    }
  }

  if (status === 409 || code === 'acting_context_required' || code === 'organization_scope_required') {
    return {
      title: 'Organization account required',
      message:
        fallbackMessage ||
        'Select an organization account before continuing. Personal accounts cannot run Admin operations.',
      actionHint: 'Switch account',
    }
  }

  if (
    status === 403
    || code === 'capability_required'
    || code === 'capability_denied'
    || code === 'organization_access_denied'
  ) {
    return {
      title: 'Access denied',
      message:
        fallbackMessage ||
        'You do not have permission for this action in the selected organization.',
      actionHint: 'Ask an org owner for access',
    }
  }

  if (status === 400 || code === 'invalid_acting_context') {
    return {
      title: 'Workspace not ready',
      message:
        fallbackMessage ||
        'No active organization workspace was found. Switch to an organization account and try again.',
      actionHint: 'Switch account',
    }
  }

  if (status === 404 || code === 'entity_not_found') {
    return {
      title: 'Not found',
      message: fallbackMessage || 'This record is not available in the selected organization.',
    }
  }

  return {
    title: 'Unable to load',
    message: fallbackMessage || 'Something went wrong loading this Admin view.',
  }
}

export async function readAdminErrorMessage(response: Response): Promise<string | null> {
  try {
    const payload = await response.clone().json()
    if (typeof payload?.error === 'string') return payload.error
    if (typeof payload?.details === 'string') return payload.details
    if (typeof payload?.message === 'string') return payload.message
    return null
  } catch {
    return null
  }
}
