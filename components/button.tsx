import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ArrowRightIcon } from "@/components/icons";

export type ButtonVariant = "primary" | "secondary" | "danger" | "cream" | "ghost-light" | "olive" | "ghost-olive" | "earth" | "ghost-earth" | "ghost-danger";
type ButtonSize = "default" | "small";

type ButtonOwnProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  arrow?: boolean;
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
  "group/btn inline-flex items-center justify-center gap-2 rounded-xs font-bold transition-colors duration-300 ease-out disabled:cursor-not-allowed disabled:opacity-50";

const brandStyles = "gap-2.5 font-brand-label font-semibold uppercase tracking-button";

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-moss-strong text-surface hover:bg-forest",
  secondary: "border border-moss bg-surface text-moss-strong hover:bg-moss-soft",
  danger: "border border-line bg-surface text-danger hover:bg-bg",
  cream: "border border-cream bg-cream text-earth hover:border-oatmeal hover:bg-oatmeal focus-visible:outline-cream",
  "ghost-light": "border border-cream/70 text-cream hover:bg-cream/12 focus-visible:outline-cream",
  olive: "border border-olive-strong bg-olive-strong text-cream hover:border-olive-deep hover:bg-olive-deep",
  "ghost-olive": "border border-olive-strong text-olive-strong hover:bg-olive-strong hover:text-cream",
  earth: "border border-cream/55 bg-earth text-cream hover:bg-earth-deep focus-visible:outline-cream",
  "ghost-earth": "border border-earth text-earth hover:bg-earth hover:text-cream",
  "ghost-danger": "border border-danger text-danger hover:bg-danger hover:text-cream focus-visible:outline-danger",
};

const brandVariants: readonly ButtonVariant[] = ["cream", "ghost-light", "olive", "ghost-olive", "earth", "ghost-earth", "ghost-danger"];

const sizeStyles: Record<ButtonSize, string> = {
  default: "min-h-12 px-6 text-body",
  small: "min-h-11 px-5 text-small",
};

const brandSizeStyles: Record<ButtonSize, string> = {
  default: "min-h-12 px-6 text-button",
  small: "min-h-11 px-5 text-button",
};

export function Button({
  variant = "primary",
  size = "default",
  arrow = false,
  className,
  children,
  ...props
}: ButtonProps) {
  const isBrand = brandVariants.includes(variant);
  const classes = [
    baseStyles,
    isBrand ? brandStyles : "",
    variantStyles[variant],
    isBrand ? brandSizeStyles[size] : sizeStyles[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {children}
      {arrow ? (
        <ArrowRightIcon
          width={14}
          height={14}
          strokeWidth={1.6}
          className="transition-transform duration-300 ease-out group-hover/btn:translate-x-1"
        />
      ) : null}
    </>
  );

  if (props.href !== undefined) {
    return (
      <Link {...props} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" {...props} className={classes}>
      {content}
    </button>
  );
}
