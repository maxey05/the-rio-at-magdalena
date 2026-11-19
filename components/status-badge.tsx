import type { ReactNode } from "react";
import { BanIcon, CheckIcon, ClockIcon, InfoIcon, TentIcon } from "@/components/icons";
import { statusLabel, type BookingStatus } from "@/lib/rules";

type BadgeStyle = {
  classes: string;
  icon: ReactNode;
};

const iconProps = { width: 16, height: 16 } as const;
const quiet = "border border-line bg-bg text-ink-muted";

const badgeStyles: Record<BookingStatus, BadgeStyle> = {
  awaiting_payment: { classes: "bg-warning-soft text-warning-strong", icon: <ClockIcon {...iconProps} /> },
  payment_review: { classes: "bg-river-soft text-river-strong", icon: <InfoIcon {...iconProps} /> },
  confirmed: { classes: "bg-moss-soft text-moss-strong", icon: <CheckIcon {...iconProps} /> },
  checked_in: { classes: "bg-moss-soft text-moss-strong", icon: <TentIcon {...iconProps} /> },
  completed: { classes: quiet, icon: <CheckIcon {...iconProps} /> },
  expired: { classes: quiet, icon: <ClockIcon {...iconProps} /> },
  rejected: { classes: quiet, icon: <BanIcon {...iconProps} /> },
  cancelled: { classes: quiet, icon: <BanIcon {...iconProps} /> },
  no_show: { classes: quiet, icon: <BanIcon {...iconProps} /> },
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  const style = badgeStyles[status];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-small font-bold ${style.classes}`}
    >
      {style.icon}
      {statusLabel(status)}
    </span>
  );
}
