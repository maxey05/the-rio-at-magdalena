import type { ReactNode } from "react";
import { Button } from "@/components/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CopyButton } from "@/components/copy-button";
import { CANCELLABLE_STATUSES } from "@/lib/cancellations";
import { canMarkNoShow, formatPeso } from "@/lib/rules";
import { formatDayWithYear } from "@/lib/stay";
import type { Booking } from "@/lib/supabase";
import { cancelBooking, checkIn, markCompleted, markNoShow, recordRefund } from "../actions";

type ActionProps = { booking: Booking };

function CheckInAction({ booking }: ActionProps) {
  return (
    <ConfirmDialog
      trigger="Check in"
      title="Check in this guest?"
      description={<p>Record what you collected from {booking.guest_name} at the gate.</p>}
      confirmLabel="Check in"
      pendingLabel="Checking in..."
      fields={[
        {
          kind: "number",
          name: "balanceCollected",
          label: "Balance collected (₱)",
          hint: `Balance due: ${formatPeso(booking.balance)}. Change it if the guest paid a different amount.`,
          defaultValue: String(booking.balance),
        },
        {
          kind: "number",
          name: "deposit",
          label: "Security deposit amount (₱)",
          hint: "Enter 0 if no deposit was taken.",
          placeholder: "0",
        },
      ]}
      hidden={{ bookingId: booking.id }}
      action={checkIn}
    />
  );
}

function CompleteAction({ booking }: ActionProps) {
  const deposit = booking.deposit_amount ?? 0;
  return (
    <ConfirmDialog
      trigger="Mark completed"
      title="Mark this stay completed?"
      description={<p>{deposit > 0 ? `Security deposit taken: ${formatPeso(deposit)}.` : "No security deposit was recorded."}</p>}
      confirmLabel="Mark completed"
      pendingLabel="Saving..."
      fields={[{ kind: "checkbox", name: "depositReturned", label: "Deposit returned?" }]}
      hidden={{ bookingId: booking.id }}
      action={markCompleted}
    />
  );
}

function NoShowAction({ booking, today }: ActionProps & { today: string }) {
  if (!canMarkNoShow(booking.check_in, today)) {
    return (
      <div className="flex flex-col gap-1">
        <Button variant="danger" size="small" disabled aria-describedby="no-show-hint">
          Mark no-show
        </Button>
        <p id="no-show-hint" className="text-small text-ink-muted">
          Available from {formatDayWithYear(booking.check_in)}.
        </p>
      </div>
    );
  }
  return (
    <ConfirmDialog
      trigger="Mark no-show"
      triggerVariant="danger"
      title="Mark this guest as a no-show?"
      description={<p>The guest did not arrive. Their slots are released. No email is sent.</p>}
      confirmLabel="Mark no-show"
      pendingLabel="Saving..."
      danger
      hidden={{ bookingId: booking.id }}
      action={markNoShow}
    />
  );
}

function CancelAction({ booking }: ActionProps) {
  const paid = booking.status !== "awaiting_payment";
  return (
    <ConfirmDialog
      trigger="Cancel booking"
      triggerVariant="danger"
      title="Cancel this booking?"
      description={
        <p>
          The slots are freed right away and {booking.guest_name} is emailed your reason.{" "}
          {paid
            ? `Payment was already sent, so a full refund of ${formatPeso(booking.downpayment)} is flagged as due.`
            : "No payment was sent yet, so no refund is needed."}
        </p>
      }
      confirmLabel="Cancel this booking"
      pendingLabel="Cancelling..."
      danger
      reasonLabel="Reason (the guest will see this)"
      reasonHint="10 to 300 characters. For example: high river, camp closed."
      hidden={{ bookingId: booking.id }}
      action={cancelBooking}
    />
  );
}

function RefundAction({ booking }: ActionProps) {
  const amount = formatPeso(booking.downpayment);
  return (
    <div className="flex w-full flex-col gap-3 rounded-input bg-moss-soft p-4">
      <p className="font-bold">
        Refund <span className="tabular-nums">{amount}</span> to <span className="tabular-nums">{booking.mobile}</span> by
        GCash
      </p>
      <p className="text-small text-ink-muted">Send it in GCash first, then record the reference number here.</p>
      <div className="flex flex-wrap items-start gap-3">
        <CopyButton text={booking.mobile} label="Copy number" />
        <ConfirmDialog
          trigger="Record refund sent"
          title="Record this refund?"
          description={
            <p>
              Confirm you sent {amount} to {booking.mobile} by GCash. {booking.guest_name} is emailed with the reference
              number.
            </p>
          }
          confirmLabel="Record refund"
          pendingLabel="Saving..."
          fields={[
            {
              kind: "text",
              name: "ref",
              label: "GCash refund reference number",
              hint: "13 digits, printed on the GCash receipt of the refund.",
            },
          ]}
          hidden={{ bookingId: booking.id }}
          action={recordRefund}
        />
      </div>
    </div>
  );
}

export function BookingActions({ booking, today }: { booking: Booking; today: string }) {
  const items: ReactNode[] = [];

  if (booking.refund_status === "due") {
    items.push(<RefundAction key="refund" booking={booking} />);
  }
  if (booking.status === "payment_review") {
    items.push(
      <Button key="review" href="/admin/payments" variant="secondary" size="small">
        Review this payment
      </Button>,
    );
  }
  if (booking.status === "confirmed") {
    items.push(<CheckInAction key="check-in" booking={booking} />);
    items.push(<NoShowAction key="no-show" booking={booking} today={today} />);
  }
  if (booking.status === "checked_in") {
    items.push(<CompleteAction key="complete" booking={booking} />);
  }
  if (CANCELLABLE_STATUSES.includes(booking.status)) {
    items.push(<CancelAction key="cancel" booking={booking} />);
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="actions-title" className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5">
      <h2 id="actions-title">Actions</h2>
      <div className="flex flex-wrap items-start gap-3">{items}</div>
    </section>
  );
}
