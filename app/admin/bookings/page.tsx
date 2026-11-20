import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/button";
import { Field } from "@/components/field";
import { InfoIcon } from "@/components/icons";
import { InfoCallout } from "@/components/info-callout";
import { StatusBadge } from "@/components/status-badge";
import { BOOKING_LIMIT, BOOKING_TABS, bookingsHref, listBookings, parseListParams, staySummary } from "@/lib/admin";
import { formatPeso, manilaToday } from "@/lib/rules";
import { requireAdmin, type Booking } from "@/lib/supabase";
import { ArrivingPanel } from "./arriving-panel";
import "../print.css";

export const metadata: Metadata = { title: "Bookings" };

type BookingsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function BookingRow({ booking }: { booking: Booking }) {
  return (
    <li>
      <Link
        href={`/admin/bookings/${booking.id}`}
        className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 transition-colors duration-150 ease-out hover:bg-moss-soft md:flex-row md:items-center md:justify-between"
      >
        <span className="flex flex-col gap-1">
          <span className="font-bold tabular-nums">{booking.ref}</span>
          <span>
            {booking.guest_name} · <span className="tabular-nums">{booking.mobile}</span>
          </span>
          <span className="text-small text-ink-muted">
            {staySummary(booking)} · {booking.guests} {booking.guests === 1 ? "guest" : "guests"}
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-3 md:flex-col md:items-end md:gap-2">
          <StatusBadge status={booking.status} />
          {booking.refund_status === "due" ? (
            <span className="inline-flex items-center gap-1 text-small font-bold text-ember-strong">
              <InfoIcon width={16} height={16} />
              Refund due: <span className="tabular-nums">{formatPeso(booking.downpayment)}</span>
            </span>
          ) : null}
          <span className="font-bold tabular-nums">{formatPeso(booking.total)}</span>
        </span>
      </Link>
    </li>
  );
}

export default async function BookingsPage({ searchParams }: BookingsPageProps) {
  await requireAdmin();
  const params = parseListParams(await searchParams);
  const tab = BOOKING_TABS.find((candidate) => candidate.id === params.tab) ?? BOOKING_TABS[0];
  const { rows, capped } = await listBookings({ ...tab.filter, q: params.q, from: params.from, to: params.to });
  const filtered = params.q !== "" || params.from !== null || params.to !== null;

  return (
    <div className="flex flex-col gap-6">
      <div className="print-hide">
        <h1>Bookings</h1>
      </div>

      <ArrivingPanel today={manilaToday()} />

      <div className="print-hide flex flex-col gap-6">
        <form method="get" action="/admin/bookings" className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5">
          {tab.id === "all" ? null : <input type="hidden" name="tab" value={tab.id} />}
          <Field
            id="q"
            name="q"
            type="search"
            label="Search"
            hint="Reference, guest name, email or mobile (09... or +639...)."
            defaultValue={params.q}
            maxLength={80}
            autoComplete="off"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="from" name="from" type="date" label="Check-in from" defaultValue={params.from ?? ""} />
            <Field id="to" name="to" type="date" label="Check-in to" defaultValue={params.to ?? ""} />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="submit">Search</Button>
            {filtered ? (
              <Button href={bookingsHref({ tab: tab.id })} variant="secondary">
                Clear search
              </Button>
            ) : null}
          </div>
        </form>

        <nav aria-label="Booking status">
          <ul className="flex flex-wrap gap-2">
            {BOOKING_TABS.map((candidate) => {
              const current = candidate.id === tab.id;
              return (
                <li key={candidate.id}>
                  <Link
                    href={bookingsHref({ ...params, tab: candidate.id })}
                    aria-current={current ? "page" : undefined}
                    className={`inline-flex min-h-11 items-center rounded-full px-4 text-small font-bold transition-colors duration-150 ease-out ${
                      current
                        ? "bg-moss-strong text-surface"
                        : "border border-line bg-surface text-ink hover:bg-moss-soft"
                    }`}
                  >
                    {candidate.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <p role="status" className="text-ink-muted">
          {rows.length === 0
            ? "No bookings match."
            : `${capped ? `Showing the newest ${BOOKING_LIMIT}` : rows.length} ${rows.length === 1 ? "booking" : "bookings"}, newest first.`}
        </p>
        {capped ? (
          <InfoCallout title="Only the newest 500 are shown">
            <p>Narrow the search, the status tab or the check-in dates to see older bookings.</p>
          </InfoCallout>
        ) : null}
        {rows.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {rows.map((booking) => (
              <BookingRow key={booking.id} booking={booking} />
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
