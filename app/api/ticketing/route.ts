/**
 * Legacy `/api/ticketing` — thin proxy to enhanced v2 handlers.
 * Clients should migrate to `/api/ticketing/enhanced`.
 */
export { GET, POST } from './enhanced/route'
