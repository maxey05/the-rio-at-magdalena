import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger";
type ButtonSize = "default" | "small";

type ButtonOwnProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
};

type ButtonAsButtonProps = ButtonOwnProps &
  Omit<ComponentProps<"button">, keyof ButtonOwnProps> & {
    href?: undefined;
  };

type ButtonAsLinkProps = ButtonOwnProps &
  Omit<ComponentProps<typeof Link>, keyof ButtonOwnProps | "href"> & {
    href: string;
  };

export type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

const baseStyles =
  "inline-flex items-center justify-center gap-2 rounded-full font-bold transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50";

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-moss-strong text-surface hover:bg-forest",
  secondary: "border border-moss bg-surface text-moss-strong hover:bg-moss-soft",
  danger: "border border-line bg-surface text-danger hover:bg-bg",
};

const sizeStyles: Record<ButtonSize, string> = {
  default: "min-h-12 px-6 text-body",
  small: "min-h-11 px-5 text-small",
};

export function Button({ variant = "primary", size = "default", className, children, ...props }: ButtonProps) {
  const classes = [baseStyles, variantStyles[variant], sizeStyles[size], className].filter(Boolean).join(" ");

  if (props.href !== undefined) {
    return (
      <Link {...props} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" {...props} className={classes}>
      {children}
    </button>
  );
}
