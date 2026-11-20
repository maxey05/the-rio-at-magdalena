import { BanIcon, CheckIcon } from "@/components/icons";
import type { EmailLogRow } from "@/lib/admin";

const iconProps = { width: 16, height: 16 } as const;

export function EmailStatus({ status }: { status: EmailLogRow["status"] }) {
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-danger bg-surface px-3 py-1 text-small font-bold text-danger">
        <BanIcon {...iconProps} />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-moss-soft px-3 py-1 text-small font-bold text-moss-strong">
      <CheckIcon {...iconProps} />
      {status === "resent" ? "Resent" : "Sent"}
    </span>
  );
}

export function emailErrorText(error: string | null): string | null {
  if (error === null) {
    return null;
  }
  return error === "dev-preview" ? "Not sent: email is not set up on this server, so it was only printed to the server log." : error;
}
