import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { StatusBadge } from "@/components/status-badge";
import { loadDay, type DayBooking } from "@/lib/calendar";
import { addDays } from "@/lib/rules";
import { formatDayLong, monthOf } from "@/lib/stay";

const navStyles =
  "inline-flex size-11 items-center justify-center rounded-full border border-line bg-surface text-moss-strong hover:bg-moss-soft";

function BookingLine({ booking }: { booking: DayBooking }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <Link href={`/admin/bookings/${booking.id}`} className="inline-flex min-h-11 items-center font-bold underline">
        {booking.ref}
      </Link>
      <span>{booking.guest_name}</span>
      <span className="text-ink-muted">
        {booking.guests} {booking.guests === 1 ? "guest" : "guests"}
      </span>
      <StatusBadge status={booking.status} />
    </div>
  );
}

export async function DayView({ date }: { date: string }) {
  const { camps, bySlot, dayTours } = await loadDay(date);

  return (
    <div className="flex flex-col gap-6">
      <Link href={`/admin/calendar?m=${monthOf(date)}`} className="inline-flex min-h-11 items-center gap-1 font-medium text-moss-strong underline">
        <ChevronLeftIcon width={18} height={18} />
        Back to the month
      </Link>
      <div className="flex items-center justify-between gap-3">
        <Link href={`/admin/calendar?d=${addDays(date, -1)}`} aria-label="Previous day" className={navStyles}>
          <ChevronLeftIcon />
        </Link>
        <h1 className="text-center">{formatDayLong(date)}</h1>
        <Link href={`/admin/calendar?d=${addDays(date, 1)}`} aria-label="Next day" className={navStyles}>
          <ChevronRightIcon />
        </Link>
      </div>
      <p className="text-small text-ink-muted">
        Each row is the booking that holds the slot for the night starting on this date. Guests checking out this
        morning are not listed.
      </p>
      {camps.map((camp) => (
        <section
          key={camp.id}
          aria-labelledby={`camp-${camp.id}`}
          className="flex flex-col gap-2 rounded-card border border-line bg-surface p-5"
        >
          <h2 id={`camp-${camp.id}`}>{camp.name}</h2>
          {camp.slots.length === 0 ? (
            <p className="text-ink-muted">No active slots.</p>
          ) : (
            <ul>
              {camp.slots.map((slot) => {
                const booking = bySlot.get(slot.id);
                return (
                  <li
                    key={slot.id}
                    className="flex flex-col gap-1 border-t border-line py-2 first:border-t-0 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <span className="w-20 shrink-0 font-bold">Slot {slot.code}</span>
                    {booking ? <BookingLine booking={booking} /> : <span className="text-ink-muted">Free</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
      <section aria-labelledby="day-tours" className="flex flex-col gap-2 rounded-card border border-line bg-surface p-5">
        <h2 id="day-tours">Day tours</h2>
        {dayTours.length === 0 ? (
          <p className="text-ink-muted">No day tours on this date.</p>
        ) : (
          <ul>
            {dayTours.map((booking) => (
              <li key={booking.id} className="border-t border-line py-2 first:border-t-0">
                <BookingLine booking={booking} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
