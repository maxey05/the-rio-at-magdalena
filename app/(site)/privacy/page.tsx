import { MessengerButton } from "@/components/messenger-button";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { privacy } from "@/lib/content";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Privacy notice",
  description:
    "How The Rio At Magdalena collects, uses and protects your personal information when you book, in line with the Data Privacy Act of 2012.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <>
      <PageHeader overline="Privacy" title="Privacy notice" intro={privacy.intro} />
      <Section labelledBy="privacy-body-title">
        <h2 id="privacy-body-title" className="sr-only">
          Privacy details
        </h2>
        <div className="flex max-w-reading flex-col gap-10">
          <p className="text-small text-ink-muted">Last updated {privacy.updated}</p>
          {privacy.sections.map((section) => (
            <div key={section.heading} className="flex flex-col gap-3">
              <h3 className="text-h2 font-display font-semibold">{section.heading}</h3>
              {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.items ? (
                <ul className="flex list-disc flex-col gap-2 pl-5">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
          <div>
            <MessengerButton />
          </div>
        </div>
      </Section>
    </>
  );
}
