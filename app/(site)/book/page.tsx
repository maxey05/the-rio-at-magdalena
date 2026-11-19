import { Button } from "@/components/button";
import { InfoCallout } from "@/components/info-callout";
import { MessengerButton } from "@/components/messenger-button";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { bookPage, noWalkInsNotice } from "@/lib/content";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Book a stay",
  description:
    "Online booking for The Rio At Magdalena opens soon. Message us on Facebook to ask about dates and slots. No walk-ins: book at least a day ahead.",
  path: "/book",
});

export default function BookPage() {
  return (
    <>
      <PageHeader overline="Book a stay" title={bookPage.title} intro={bookPage.note} />
      <Section labelledBy="book-soon-title">
        <div className="flex max-w-reading flex-col items-start gap-6">
          <h2 id="book-soon-title" className="sr-only">
            How to book for now
          </h2>
          <InfoCallout>
            <p>{bookPage.body}</p>
          </InfoCallout>
          <p>
            {noWalkInsNotice.title} {noWalkInsNotice.body}
          </p>
          <div className="flex flex-wrap gap-3">
            <MessengerButton />
            <Button href="/rates" variant="secondary">
              See rates
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}
