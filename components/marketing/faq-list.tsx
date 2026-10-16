import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export interface FaqItem {
  q: string
  a: string
}

export function FaqList({ items }: { items: FaqItem[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.q,
      acceptedAnswer: { "@type": "Answer", text: i.a },
    })),
  }

  return (
    <>
      <Accordion type="single" collapsible className="w-full space-y-3">
        {items.map((item, i) => (
          <AccordionItem
            key={item.q}
            value={`faq-${i}`}
            className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 data-[state=open]:bg-white/[0.06]"
          >
            <AccordionTrigger className="py-4 text-left text-base font-medium text-white hover:no-underline">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="pb-4 text-sm leading-relaxed text-slate-300">{item.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  )
}
