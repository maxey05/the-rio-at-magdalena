import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon, LockIcon } from "@/components/icons";
import { mondayWeeks, type MonthCell } from "@/lib/calendar";
import { formatDayLong, monthLabel, shiftMonth } from "@/lib/stay";

type AdminMonthGridProps = {
  month: string;
  cells: readonly MonthCell[];
  today: string;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const navStyles =
  "inline-flex size-11 items-center justify-center rounded-full border border-line bg-surface text-moss-strong hover:bg-moss-soft";

function cellLabel(cell: MonthCell): string {
  const tours = `${cell.dayTours} day ${cell.dayTours === 1 ? "tour" : "tours"}`;
  const parts = [
    formatDayLong(cell.d),
    `${cell.guests} of ${cell.siteCap} guests`,
    `${cell.slotsTaken} of ${cell.slotsTotal} slots taken`,
    tours,
  ];
  if (cell.closed) {
    parts.push("closed");
  }
  return parts.join(", ");
}

export function AdminMonthGrid({ month, cells, today }: AdminMonthGridProps) {
  const byDate = new Map(cells.map((cell) => [cell.d, cell]));
  const slots = mondayWeeks(month).flat();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <Link href={`/admin/calendar?m=${shiftMonth(month, -1)}`} aria-label="Previous month" className={navStyles}>
          <ChevronLeftIcon />
        </Link>
        <h2 className="text-center">{monthLabel(month)}</h2>
        <Link href={`/admin/calendar?m=${shiftMonth(month, 1)}`} aria-label="Next month" className={navStyles}>
          <ChevronRightIcon />
        </Link>
      </div>
      <p className="text-small text-ink-muted">
        Guests on site that night out of the site cap. Slots taken out of all open slots. Tours are day-tour bookings.
        Select a date to see who is in each slot.
      </p>
      <div
        role="region"
        aria-label="Occupancy calendar, scrolls sideways on small screens"
        tabIndex={0}
        className="overflow-x-auto rounded-card border border-line bg-surface"
      >
        <div className="min-w-[56rem]">
          <div aria-hidden="true" className="grid grid-cols-7 border-b border-line bg-bg text-center text-small font-medium text-ink-muted">
            {WEEKDAYS.map((name) => (
              <div key={name} className="py-2">
                {name}
              </div>
            ))}
          </div>
          <ul className="grid grid-cols-7 gap-px bg-line">
            {slots.map((date, index) => {
              const cell = date ? byDate.get(date) : undefined;
              if (!date || !cell) {
                return <li key={date ?? `blank-${index}`} aria-hidden="true" className="min-h-28 bg-bg" />;
              }
              const isToday = date === today;
              return (
                <li key={date} className="flex">
                  <Link
                    href={`/admin/calendar?d=${date}`}
                    aria-label={cellLabel(cell)}
                    aria-current={isToday ? "date" : undefined}
                    className={`flex min-h-28 flex-1 flex-col gap-1 p-2 text-small tabular-nums hover:bg-moss-soft ${
                      cell.closed ? "bg-bg" : "bg-surface"
                    } ${isToday ? "ring-2 ring-inset ring-moss" : ""}`}
                  >
                    <span className="flex items-center justify-between gap-1">
                      <span className="text-body font-bold">
                        {Number(date.slice(8))}
                        {isToday ? <span className="ml-1 text-small font-medium">Today</span> : null}
                      </span>
                      {cell.closed ? (
                        <span className="inline-flex items-center gap-1 font-bold">
                          <LockIcon width={14} height={14} />
                          Closed
                        </span>
                      ) : null}
                    </span>
                    <span>
                      Guests {cell.guests}/{cell.siteCap}
                    </span>
                    <span>
                      Slots {cell.slotsTaken}/{cell.slotsTotal}
                    </span>
                    <span>Tours {cell.dayTours}</span>
                    <span aria-hidden="true" className="mt-auto block h-2 overflow-hidden rounded-full border border-line bg-bg">
                      <span className="block h-full bg-moss-tint" style={{ width: `${cell.fillPercent}%` }} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
