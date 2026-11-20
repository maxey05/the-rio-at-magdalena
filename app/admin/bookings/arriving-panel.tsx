import Link from "next/link";
import { arrivingDates, guestBreakdown, listArriving } from "@/lib/admin";
import { bookingSlotLabels } from "@/lib/bookings";
import { formatPeso } from "@/lib/rules";
import { formatDayLong } from "@/lib/stay";
import type { Booking } from "@/lib/supabase";
import { PrintButton } from "./print-button";

type Arrival = { booking: Booking; slots: string };

const COLUMNS = ["Ref", "Guest", "Mobile", "Slots", "Guests", "Tents", "Balance due"];

function ArrivalTable({ date, arrivals }: { date: string; arrivals: Arrival[] }) {
  return (
    <div className="arriving-scroll overflow-x-auto">
      <table className="w-full min-w-[42rem] border-collapse text-left">
        <caption className="sr-only">Confirmed arrivals on {formatDayLong(date)}</caption>
        <thead>
          <tr className="border-b border-line text-small text-ink-muted">
            {COLUMNS.map((column) => (
              <th key={column} scope="col" className="py-2 pr-3 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {arrivals.map(({ booking, slots }) => (
            <tr key={booking.id} className="border-b border-line align-top">
              <td className="py-2 pr-3 font-bold tabular-nums">
                <Link href={`/admin/bookings/${booking.id}`} className="underline">
                  {booking.ref}
                </Link>
              </td>
              <td className="py-2 pr-3">{booking.guest_name}</td>
              <td className="py-2 pr-3 tabular-nums">{booking.mobile}</td>
              <td className="py-2 pr-3">{booking.kind === "day_tour" ? "Day tour" : slots}</td>
              <td className="py-2 pr-3">
                <span className="font-bold">{booking.guests}</span> ({guestBreakdown(booking)})
              </td>
              <td className="py-2 pr-3 tabular-nums">{booking.tents}</td>
              <td className="py-2 font-bold tabular-nums">{formatPeso(booking.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export async function ArrivingPanel({ today }: { today: string }) {
  const bookings = await listArriving(today);
  const slotNames = await Promise.all(bookings.map((booking) => bookingSlotLabels(booking)));
  const arrivals: Arrival[] = bookings.map((booking, index) => ({ booking, slots: slotNames[index].join(", ") }));
  const [first, second] = arrivingDates(today);
  const days = [
    { title: "Today", date: first },
    { title: "Tomorrow", date: second },
  ];

  return (
    <section aria-labelledby="arriving-title" className="arriving flex flex-col gap-4 rounded-card border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="arriving-title">Arriving today and tomorrow</h2>
          <p className="text-ink-muted">Confirmed bookings only. Balance due is collected at check-in.</p>
        </div>
        <div className="print-hide">
          <PrintButton />
        </div>
      </div>
      {days.map((day) => {
        const rows = arrivals.filter(({ booking }) => booking.check_in === day.date);
        return (
          <div key={day.date} className="flex flex-col gap-2">
            <h3>
              {day.title} · {formatDayLong(day.date)}
            </h3>
            {rows.length === 0 ? (
              <p className="text-ink-muted">No confirmed arrivals.</p>
            ) : (
              <ArrivalTable date={day.date} arrivals={rows} />
            )}
          </div>
        );
      })}
    </section>
  );
}
