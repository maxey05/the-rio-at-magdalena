import { pageMetadata } from "@/lib/metadata";
import { manilaToday } from "@/lib/rules";
import { getSettings } from "@/lib/settings";
import { parseSelection } from "@/lib/stay";
import { BookingWorkspace } from "./booking-workspace";

export const metadata = pageMetadata({
  title: "Book your stay",
  description:
    "Book an overnight stay or a day tour at The Rio At Magdalena. Pick your dates and camp slot, then hold them for 30 minutes while you pay the 50% downpayment by GCash.",
  path: "/book",
});

export default async function BookPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [settings, params] = await Promise.all([getSettings(), searchParams]);
  const today = manilaToday();
  return (
    <BookingWorkspace settings={settings} today={today} initial={parseSelection(params, today, settings)} />
  );
}
