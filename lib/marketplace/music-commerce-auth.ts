import "server-only"

import { NextResponse, type NextRequest } from "next/server"
import { jsonError } from "@/lib/api/route-helpers"
import {
  resolveActingContext,
  type ActingContext,
} from "@/lib/auth/acting-context"
import type { ProfileType } from "@/lib/accounts/account-types"

export interface MarketplaceAccountAccess {
  userId: string
  accountType: ProfileType
  profileId: string
  supabase: ActingContext["supabase"]
}

export type MarketplaceAccountAuthResult =
  | { success: true; account: MarketplaceAccountAccess }
  | { success: false; response: NextResponse }

/**
 * Canonical server boundary for Marketplace-owned financial routes.
 *
 * `resolveActingContext` verifies the Supabase identity and checks ownership
 * of any requested artist, venue, service, or organization persona before it
 * returns. No client-supplied account header is trusted without that check.
 * Native checkout intentionally has a separate optional-auth contract because
 * guest checkout is an existing Marketplace feature; orders and music-marketplace
 * operations should use this required-auth gate.
 */
export async function requireMarketplaceAccount(
  request: NextRequest,
  options: { allowedAccountTypes?: readonly ProfileType[] } = {},
): Promise<MarketplaceAccountAuthResult> {
  const context = await resolveActingContext(request)
  if (context instanceof NextResponse) {
    return { success: false, response: context }
  }

  if (
    options.allowedAccountTypes &&
    !options.allowedAccountTypes.includes(context.accountType)
  ) {
    return {
      success: false,
      response: jsonError({
        status: 403,
        code: "marketplace_account_type_not_allowed",
        message: "This account type cannot use the requested marketplace operation.",
        retryable: false,
      }),
    }
  }

  return {
    success: true,
    account: {
      userId: context.userId,
      accountType: context.accountType,
      profileId: context.profileId,
      supabase: context.supabase,
    },
  }
}

