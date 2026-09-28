import { redirect } from "next/navigation"

interface ProfileIndexPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function ProfileIndexPage({
  searchParams,
}: ProfileIndexPageProps) {
  const params = (await searchParams) ?? {}
  const createType = first(params.create)

  if (createType && ["artist", "venue", "admin", "organization"].includes(createType)) {
    const type = createType === "admin" ? "organization" : createType
    redirect(`/create?type=${encodeURIComponent(type)}`)
  }

  redirect("/settings/profile")
}
