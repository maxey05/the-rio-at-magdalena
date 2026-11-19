"use client";

import Image from "next/image";
import { useState, type KeyboardEvent } from "react";
import { CheckIcon } from "@/components/icons";
import { camps, type Camp } from "@/lib/content";
import type { SlotAvailability } from "@/lib/stay";

type SlotPickerProps = {
  slots: readonly SlotAvailability[] | null;
  selected: readonly number[];
  slotCapacity: number;
  onToggle: (id: number) => void;
};

function pinStyle(slot: SlotAvailability, isSelected: boolean): string {
  if (isSelected) {
    return "bg-moss-strong text-surface ring-2 ring-surface";
  }
  if (!slot.free) {
    return "bg-bg text-ink-muted line-through ring-1 ring-line";
  }
  return "bg-surface text-moss-strong ring-2 ring-moss";
}

function chipStyle(slot: SlotAvailability, isSelected: boolean): string {
  if (isSelected) {
    return "border-moss bg-moss-tint";
  }
  if (!slot.free) {
    return "border-line bg-bg text-ink-muted";
  }
  return "border-line bg-surface hover:bg-moss-soft";
}

function chipStatus(slot: SlotAvailability, isSelected: boolean): string {
  if (isSelected) {
    return "Selected";
  }
  return slot.free ? "Free" : "Taken";
}

export function SlotPicker({ slots, selected, slotCapacity, onToggle }: SlotPickerProps) {
  const firstSelectedCamp = slots?.find((slot) => selected.includes(slot.id))?.camp;
  const [chosenName, setActiveName] = useState<string | null>(null);
  const activeName = chosenName ?? firstSelectedCamp ?? camps[0].name;
  const [showPhoto, setShowPhoto] = useState(true);
  const active = camps.find((camp) => camp.name === activeName) ?? camps[0];
  const enabled = camps.filter((camp) => camp.status === "open");

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const offset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (offset === 0) {
      return;
    }
    event.preventDefault();
    const index = enabled.findIndex((camp) => camp.name === activeName);
    const next = enabled[(index + offset + enabled.length) % enabled.length];
    setActiveName(next.name);
    document.getElementById(`camp-tab-${next.id}`)?.focus();
  }

  if (slots === null) {
    return (
      <p role="status" className="text-ink-muted">
        Loading slots...
      </p>
    );
  }

  const campSlots = slots.filter((slot) => slot.camp === active.name);
  const selectedCount = selected.length;

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Camps" className="flex flex-wrap gap-2">
        {camps.map((camp) => (
          <CampTab
            key={camp.id}
            camp={camp}
            isActive={camp.name === active.name}
            onSelect={() => setActiveName(camp.name)}
            onKeyDown={onTabKeyDown}
            count={slots.filter((slot) => slot.camp === camp.name && selected.includes(slot.id)).length}
          />
        ))}
      </div>
      <div role="tabpanel" id="camp-panel" aria-labelledby={`camp-tab-${active.id}`} className="flex flex-col gap-4">
        {campSlots.length === 0 ? (
          <p className="text-ink-muted">No slots to show for {active.name}.</p>
        ) : (
          <>
            {active.aerial?.src ? (
              <CampMap
                camp={active}
                slots={campSlots}
                selected={selected}
                showPhoto={showPhoto}
                onTogglePhoto={() => setShowPhoto((value) => !value)}
                onToggle={onToggle}
              />
            ) : null}
            <ul aria-label={`${active.name} slots`} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {campSlots.map((slot) => {
                const isSelected = selected.includes(slot.id);
                return (
                  <li key={slot.id}>
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      disabled={!slot.free}
                      onClick={() => onToggle(slot.id)}
                      className={`flex min-h-20 w-full min-w-24 flex-col items-start gap-0.5 rounded-chip border p-3 text-left transition-colors duration-150 ease-out disabled:cursor-not-allowed ${chipStyle(slot, isSelected)}`}
                    >
                      <span className={`font-bold ${slot.free ? "" : "line-through"}`}>Slot {slot.code}</span>
                      <span className="text-small text-ink-muted">up to {slotCapacity} guests</span>
                      <span className="flex items-center gap-1 text-small font-bold">
                        {isSelected ? <CheckIcon width={16} height={16} /> : null}
                        {chipStatus(slot, isSelected)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
      <p role="status" className="text-small text-ink-muted">
        {selectedCount === 0 ? "No slot chosen yet." : `${selectedCount} ${selectedCount === 1 ? "slot" : "slots"} chosen.`}
      </p>
    </div>
  );
}

type CampTabProps = {
  camp: Camp;
  isActive: boolean;
  count: number;
  onSelect: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
};

function CampTab({ camp, isActive, count, onSelect, onKeyDown }: CampTabProps) {
  const open = camp.status === "open";
  return (
    <button
      type="button"
      role="tab"
      id={`camp-tab-${camp.id}`}
      aria-selected={isActive}
      aria-controls="camp-panel"
      disabled={!open}
      tabIndex={isActive ? 0 : -1}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className={`inline-flex min-h-11 flex-col items-start justify-center rounded-full border px-5 text-small font-bold transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:border-dashed disabled:text-ink-muted ${
        isActive ? "border-moss-strong bg-moss-strong text-surface" : "border-line bg-surface hover:bg-moss-soft"
      }`}
    >
      <span>
        {camp.name}
        {count > 0 ? ` (${count})` : ""}
      </span>
      {open ? null : <span className="text-overline font-medium">Coming soon</span>}
    </button>
  );
}

type CampMapProps = {
  camp: Camp;
  slots: readonly SlotAvailability[];
  selected: readonly number[];
  showPhoto: boolean;
  onTogglePhoto: () => void;
  onToggle: (id: number) => void;
};

function CampMap({ camp, slots, selected, showPhoto, onTogglePhoto, onToggle }: CampMapProps) {
  const photo = camp.aerial;
  if (!photo?.src) {
    return null;
  }
  const portrait = photo.height > photo.width;
  return (
    <div className="flex flex-col gap-2">
      <div
        style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
        className={`relative mx-auto w-full overflow-hidden rounded-card border border-line bg-moss-soft ${portrait ? "max-w-md" : ""}`}
      >
        {showPhoto ? (
          <Image src={photo.src} alt={photo.alt} fill sizes="(min-width: 1024px) 420px, 100vw" className="object-cover" />
        ) : null}
        {slots.map((slot) =>
          slot.mapX === null || slot.mapY === null ? null : (
            <button
              key={slot.id}
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              disabled={!slot.free}
              onClick={() => onToggle(slot.id)}
              style={{ left: `${slot.mapX}%`, top: `${slot.mapY}%` }}
              className={`pointer-events-none absolute grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-small font-bold md:pointer-events-auto md:size-11 ${pinStyle(slot, selected.includes(slot.id))}`}
            >
              {slot.code}
            </button>
          ),
        )}
      </div>
      <button
        type="button"
        onClick={onTogglePhoto}
        aria-pressed={showPhoto}
        className="inline-flex min-h-11 items-center self-start rounded-full border border-moss bg-surface px-5 text-small font-bold text-moss-strong hover:bg-moss-soft"
      >
        {showPhoto ? "Hide the real photo" : "See the real photo"}
      </button>
    </div>
  );
}
