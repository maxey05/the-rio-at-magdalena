import { Button } from "@/components/button";
import { MessageIcon } from "@/components/icons";
import { messengerAction, site } from "@/lib/content";

type MessengerButtonProps = {
  variant?: "primary" | "secondary";
  label?: string;
  className?: string;
};

export function MessengerButton({ variant = "primary", label = messengerAction.label, className }: MessengerButtonProps) {
  return (
    <Button href={site.messengerUrl} variant={variant} className={className} target="_blank" rel="noopener noreferrer">
      <MessageIcon />
      {label}
      <span className="sr-only">(opens in a new tab)</span>
    </Button>
  );
}
