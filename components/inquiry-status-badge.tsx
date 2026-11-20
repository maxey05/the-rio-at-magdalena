import type { ReactNode } from "react";
import { BanIcon, CheckIcon, InfoIcon } from "@/components/icons";
import { inquiryStatusLabel } from "@/lib/inquiries";
import type { InquiryStatus } from "@/lib/supabase";

const iconProps = { width: 16, height: 16 } as const;

const badgeStyles: Record<InquiryStatus, { classes: string; icon: ReactNode }> = {
  new: { classes: "bg-warning-soft text-warning-strong", icon: <InfoIcon {...iconProps} /> },
  replied: { classes: "bg-moss-soft text-moss-strong", icon: <CheckIcon {...iconProps} /> },
  closed: { classes: "border border-line bg-bg text-ink-muted", icon: <BanIcon {...iconProps} /> },
};

export function InquiryStatusBadge({ status }: { status: InquiryStatus }) {
  const style = badgeStyles[status];
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-small font-bold ${style.classes}`}>
      {style.icon}
      {inquiryStatusLabel(status)}
    </span>
  );
}
