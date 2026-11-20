import { AdminMonthGrid } from "@/components/admin-month-grid";
import { Button } from "@/components/button";
import { TrashIcon } from "@/components/icons";
import { listUpcomingClosures, loadMonth, parseDay, parseMonth } from "@/lib/calendar";
import { manilaToday } from "@/lib/rules";
import { formatDayWithYear } from "@/lib/stay";
import { requireAdmin } from "@/lib/supabase";
import { removeClosure } from "./actions";
import { ClosureForm } from "./closure-form";
import { DayView } from "./day-view";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const params = await searchParams;
  const today = manilaToday();
  const day = parseDay(firstParam(params.d));
  if (day) {
    return <DayView date={day} />;
  }
  const month = parseMonth(firstParam(params.m), today);
  const [cells, closures] = await Promise.all([loadMonth(month), listUpcomingClosures(today)]);

  return (
    <div className="flex flex-col gap-6">
      <h1>Calendar</h1>
      <AdminMonthGrid month={month} cells={cells} today={today} />
      <section aria-labelledby="closures-title" className="flex flex-col gap-5 rounded-card border border-line bg-surface p-5">
        <h2 id="closures-title">Closed dates</h2>
        <p className="text-ink-muted">
          Closed dates cannot be booked. Closing does not cancel bookings that already exist, and removing a closure
          does not bring cancelled bookings back.
        </p>
        <ClosureForm />
        <div className="flex flex-col gap-2">
          <h3>Upcoming closures</h3>
          {closures.length === 0 ? (
            <p className="text-ink-muted">No upcoming closures.</p>
          ) : (
            <ul>
              {closures.map((closure) => (
                <li
                  key={closure.id}
                  className="flex flex-col gap-2 border-t border-line py-3 first:border-t-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col">
                    <span className="font-bold">
                      {closure.start_date === closure.end_date
                        ? formatDayWithYear(closure.start_date)
                        : `${formatDayWithYear(closure.start_date)} to ${formatDayWithYear(closure.end_date)}`}
                    </span>
                    <span className="text-ink-muted">{closure.reason}</span>
                  </div>
                  <form action={removeClosure}>
                    <input type="hidden" name="id" value={closure.id} />
                    <Button type="submit" variant="danger" size="small">
                      <TrashIcon width={18} height={18} />
                      Remove
                      <span className="sr-only">closure for {closure.reason}</span>
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
