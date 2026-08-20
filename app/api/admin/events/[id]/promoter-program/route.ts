import {
  organizerProgramGetRoute,
  organizerProgramPatchRoute,
  organizerProgramPostRoute,
} from '@/lib/promoter-network/organizer-program-route'

export const GET = organizerProgramGetRoute()
export const POST = organizerProgramPostRoute()
export const PATCH = organizerProgramPatchRoute()
