"use client";

import { Button } from "@/components/button";

export function PrintButton() {
  return (
    <Button variant="secondary" size="small" onClick={() => window.print()}>
      Print
    </Button>
  );
}
