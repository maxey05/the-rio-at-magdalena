"use client";

import { useState } from "react";
import { CampMapArt } from "@/components/camp-map-art";
import { CampMapOverlay } from "@/components/camp-map-overlay";
import { LABEL, SECTION_TITLE } from "@/components/brand-styles";
import { MAP_HEIGHT, MAP_WIDTH, PIN_POSITIONS } from "@/lib/camp-map";
import type { SlotAvailability } from "@/lib/stay";

type CampMapProps = {
  slots: readonly SlotAvailability[] | null;
  selected: readonly number[];
  slotCapacity: number;
  note: string | null;
  onToggle: (id: number) => void;
};

const CAMP_TEXT: Readonly<Record<string, string>> = {
  "Camp 1": "On the clifftop above the river.",
  "Camp 2": "On the low ground beside the river.",
};

const LEGEND = [
  { label: "Free", swatch: "border-2 border-olive-strong bg-cream-light" },
  { label: "Selected", swatch: "bg-olive-strong" },
  { label: "Taken", swatch: "border border-sand-deep bg-sand" },
] as const;

function pinPosition(code: string): { left: string; top: string } {
  const [x, y] = PIN_POSITIONS[code];
  return { left: `${(x / MAP_WIDTH) * 100}%`, top: `${(y / MAP_HEIGHT) * 100}%` };
}

function pinStyle(state: "selected" | "taken" | "free" | "idle"): string {
  if (state === "selected") {
    return "border-2 border-cream bg-olive-strong text-cream ring-2 ring-olive-strong";
  }
  if (state === "taken") {
    return "cursor-not-allowed border border-sand-deep bg-sand text-earth line-through";
  }
  if (state === "idle") {
    return "cursor-not-allowed border-2 border-sand-line bg-cream-light text-earth-muted opacity-70";
  }
  return "border-2 border-olive-strong bg-cream-light text-earth shadow-sm hover:scale-110";
}

export function CampMap({ slots, selected, slotCapacity, note, onToggle }: CampMapProps) {
  const [focusId, setFocusId] = useState<number | null>(null);
  const pins = slots?.filter((slot) => PIN_POSITIONS[slot.code] !== undefined) ?? null;
  const focus = slots?.find((slot) => slot.id === (focusId ?? selected[0])) ?? null;

  function toggle(id: number) {
    setFocusId(id);
    onToggle(id);
  }

  return (
    <section aria-labelledby="map-title" className="flex min-w-0 flex-col gap-2.5 rounded-sm border border-oatmeal bg-cream-light px-4 pb-3 pt-3.5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id="map-title" className={SECTION_TITLE}>
          Choose your camp slots
        </h2>
        <ul aria-label="Map legend" className={`flex flex-wrap gap-x-4 gap-y-1.5 text-earth-muted ${LABEL}`}>
          {LEGEND.map((item) => (
            <li key={item.label} className="flex items-center gap-1.5">
              <span aria-hidden="true" className={`size-3.5 rounded-full ${item.swatch}`} />
              {item.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="overflow-x-auto">
        <div className="relative aspect-[1000/600] min-w-150 overflow-hidden rounded-xs bg-map-ground">
          <CampMapArt />
          <CampMapOverlay activeCamp={focus?.camp ?? null} />
          {pins
            ? pins.map((slot) => {
                const isSelected = selected.includes(slot.id);
                const state = isSelected ? "selected" : slot.free ? "free" : "taken";
                return (
                  <button
                    key={slot.id}
                    type="button"
                    aria-label={`Slot ${slot.code}, ${slot.camp}, ${slot.free ? (isSelected ? "selected" : "free") : "taken"}`}
                    aria-pressed={isSelected}
                    disabled={!slot.free}
                    onClick={() => toggle(slot.id)}
                    onMouseEnter={() => setFocusId(slot.id)}
                    onFocus={() => setFocusId(slot.id)}
                    style={pinPosition(slot.code)}
                    className={`absolute grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full p-0 font-brand-label font-semibold transition-transform duration-150 ease-out md:size-10 ${
                      slot.code.length > 1 ? "text-xs" : "text-sm"
                    } ${pinStyle(state)}`}
                  >
                    {slot.code}
                  </button>
                );
              })
            : Object.keys(PIN_POSITIONS).map((code) => (
                <span
                  key={code}
                  aria-hidden="true"
                  style={pinPosition(code)}
                  className={`absolute grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full font-brand-label font-semibold md:size-10 ${
                    code.length > 1 ? "text-xs" : "text-sm"
                  } ${pinStyle("idle")}`}
                >
                  {code}
                </span>
              ))}
        </div>
      </div>

      {note ? (
        <p role="status" className="text-[1.0625rem] text-earth-muted">
          {note}
        </p>
      ) : focus ? (
        <p aria-live="polite" className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[1.0625rem] text-earth-muted">
          <span className="inline-flex h-6.5 min-w-8 items-center justify-center rounded-xs bg-chartreuse px-2 font-brand-label text-xs font-semibold tracking-wide text-earth">
            {focus.code}
          </span>
          <span className="font-semibold text-earth">
            {focus.camp}
            {focus.free ? "" : " · Taken on your dates"}
          </span>
          <span>
            {CAMP_TEXT[focus.camp] ?? ""} Up to {slotCapacity} campers.
          </span>
        </p>
      ) : (
        <p aria-live="polite" className="text-[1.0625rem] text-earth-muted">
          Pick a free slot on the map. Up to {slotCapacity} campers fit in each one.
        </p>
      )}
    </section>
  );
}
