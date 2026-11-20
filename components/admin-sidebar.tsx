"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/admin/login/actions";
import { CloseIcon, MenuIcon } from "@/components/icons";
import { Wordmark } from "@/components/wordmark";

type AdminSidebarProps = {
  paymentsWaiting: number | null;
};

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/calendar", label: "Calendar" },
  { href: "/admin/inquiries", label: "Inquiries" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/email-log", label: "Email log" },
];

const itemStyles =
  "flex min-h-11 w-full items-center justify-between gap-3 rounded-input px-3 text-body hover:bg-moss-strong";

type NavProps = {
  label: string;
  pathname: string;
  paymentsWaiting: number | null;
  onNavigate?: () => void;
};

function Nav({ label, pathname, paymentsWaiting, onNavigate }: NavProps) {
  return (
    <nav aria-label={label} className="flex flex-1 flex-col gap-1">
      <ul className="flex flex-col gap-1">
        {links.map((link) => {
          const isCurrent = pathname === link.href || (link.href !== "/admin" && pathname.startsWith(`${link.href}/`));
          const showBadge = link.href === "/admin/payments" && paymentsWaiting !== null && paymentsWaiting > 0;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={onNavigate}
                aria-current={isCurrent ? "page" : undefined}
                className={`${itemStyles} ${isCurrent ? "bg-moss font-bold" : "text-moss-tint"}`}
              >
                <span>{link.label}</span>
                {showBadge ? (
                  <span className="rounded-full bg-ember-soft px-2 text-small font-bold text-ember-strong">
                    {paymentsWaiting}
                    <span className="sr-only"> waiting</span>
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
      <form action={signOut} className="mt-auto pt-4">
        <button type="submit" className={`${itemStyles} text-moss-tint`}>
          Sign out
        </button>
      </form>
    </nav>
  );
}

export function AdminSidebar({ paymentsWaiting }: AdminSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-forest px-4 text-surface lg:hidden">
        <Link href="/admin" className="flex min-h-11 items-center">
          <Wordmark />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="admin-drawer"
          aria-label="Open admin menu"
          className="inline-flex size-11 items-center justify-center rounded-full"
        >
          <MenuIcon />
        </button>
      </header>
      <dialog
        ref={dialogRef}
        id="admin-drawer"
        aria-label="Admin menu"
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            setOpen(false);
          }
        }}
        className="m-0 mr-auto h-dvh max-h-none w-72 max-w-[85vw] bg-forest p-0 text-surface backdrop:bg-ink/60"
      >
        <div className="flex h-full flex-col gap-6 overflow-y-auto p-4">
          <div className="flex items-center justify-between">
            <Wordmark />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close admin menu"
              className="inline-flex size-11 items-center justify-center rounded-full"
            >
              <CloseIcon />
            </button>
          </div>
          <Nav label="Admin mobile" pathname={pathname} paymentsWaiting={paymentsWaiting} onNavigate={() => setOpen(false)} />
        </div>
      </dialog>
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-8 overflow-y-auto bg-forest p-4 text-surface lg:flex">
        <Link href="/admin" className="flex min-h-11 items-center px-3">
          <Wordmark />
        </Link>
        <Nav label="Admin" pathname={pathname} paymentsWaiting={paymentsWaiting} />
      </aside>
    </>
  );
}
