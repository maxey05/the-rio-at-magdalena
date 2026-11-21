import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";

type TextLinkProps = {
  href: string;
  children: string;
};

export function TextLink({ href, children }: TextLinkProps) {
  return (
    <Link
      href={href}
      className="group/link relative inline-flex min-h-11 items-center gap-2.5 font-brand-label text-button font-semibold uppercase tracking-button text-olive-strong transition-colors duration-400 after:absolute after:inset-x-0 after:bottom-2 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-500 after:ease-out hover:text-olive-deep hover:after:scale-x-100 focus-visible:after:scale-x-100"
    >
      {children}
      <ArrowRightIcon
        width={14}
        height={14}
        strokeWidth={1.6}
        className="transition-transform duration-300 ease-out group-hover/link:translate-x-1"
      />
    </Link>
  );
}
