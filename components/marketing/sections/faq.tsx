import { FaqList, type FaqItem } from "@/components/marketing/faq-list"
import { GradientText, SectionHeading } from "@/components/marketing/section-heading"

const faqs: FaqItem[] = [
  {
    q: "What is Tourify?",
    a: "Tourify is a platform where artists, venues, crews, promoters, organizers and fans plan, book and experience live events from one workspace.",
  },
  {
    q: "Is Tourify free right now?",
    a: "Yes. The open beta is free with no credit card required. We will share pricing details before general release.",
  },
  {
    q: "Are all features ready to use?",
    a: "Not yet. Every feature on this site carries a status badge: Available, Beta, In development or Planned. We update them as we ship.",
  },
  {
    q: "Can I look around before signing up?",
    a: "Yes. Use the Try the Beta button to open the demo, or create a free account to start with your own data.",
  },
  {
    q: "Which account type should I choose?",
    a: "Pick the role that matches how you work today. Each solutions page shows what Tourify does for that role, and you can explore all of them before deciding.",
  },
  {
    q: "Are the charts and numbers on this page real?",
    a: "No. Charts, routes and rosters on this page are labeled sample data. They illustrate what you will see in the product.",
  },
]

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 border-t border-white/[0.06] bg-slate-950/50 py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="FAQ"
          title={
            <>
              Questions, <GradientText>answered</GradientText>
            </>
          }
        />
        <div className="mt-12">
          <FaqList items={faqs} />
        </div>
      </div>
    </section>
  )
}
