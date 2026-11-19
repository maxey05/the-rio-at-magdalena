import type { SVGProps } from "react";
import { BanIcon, LeafIcon, LockIcon, MoonIcon, PawIcon, TrashIcon, TreeIcon, WaterIcon } from "@/components/icons";
import type { FactIcon, RuleIcon } from "@/lib/content";

type IconProps = SVGProps<SVGSVGElement>;

export function FactIconView({ icon, ...props }: IconProps & { icon: FactIcon }) {
  switch (icon) {
    case "water":
      return <WaterIcon {...props} />;
    case "tree":
      return <TreeIcon {...props} />;
    case "paw":
      return <PawIcon {...props} />;
    case "moon":
      return <MoonIcon {...props} />;
  }
}

export function RuleIconView({ icon, ...props }: IconProps & { icon: RuleIcon }) {
  switch (icon) {
    case "leaf":
      return <LeafIcon {...props} />;
    case "trash":
      return <TrashIcon {...props} />;
    case "paw":
      return <PawIcon {...props} />;
    case "lock":
      return <LockIcon {...props} />;
    case "ban":
      return <BanIcon {...props} />;
    case "moon":
      return <MoonIcon {...props} />;
  }
}
