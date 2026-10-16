import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { PersonaPage } from "@/components/marketing/persona/persona-page"
import { getPersona, personas } from "@/lib/marketing/personas"

export function generateStaticParams() {
  return personas.map((p) => ({ persona: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ persona: string }> }): Promise<Metadata> {
  const { persona: slug } = await params
  const persona = getPersona(slug)
  if (!persona) return {}
  const title = `Tourify for ${persona.name}`
  return {
    title,
    description: persona.metaDescription,
    alternates: { canonical: `/solutions/${persona.slug}` },
    openGraph: { title, description: persona.metaDescription, type: "website" },
  }
}

export default async function SolutionPage({ params }: { params: Promise<{ persona: string }> }) {
  const { persona: slug } = await params
  const persona = getPersona(slug)
  if (!persona) notFound()
  return <PersonaPage persona={persona} />
}
