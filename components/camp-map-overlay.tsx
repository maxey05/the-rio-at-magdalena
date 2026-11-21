import { CAMP_HULLS, CAMP_LABEL_CURVES, MAP_HEIGHT, MAP_WIDTH, type CampName } from "@/lib/camp-map";

type CampMapOverlayProps = {
  activeCamp: string | null;
};

const CAMPS: readonly CampName[] = ["Camp 2", "Camp 1"];

function curveId(camp: CampName): string {
  return `${camp.toLowerCase().replace(" ", "")}-curve`;
}

export function CampMapOverlay({ activeCamp }: CampMapOverlayProps) {
  return (
    <svg
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute inset-0 block size-full"
    >
      {CAMPS.map((camp) => {
        const active = activeCamp === camp;
        return (
          <path
            key={camp}
            d={CAMP_HULLS[camp]}
            strokeLinejoin="round"
            strokeDasharray="7 5"
            className={`stroke-olive-strong stroke-[1.5px] transition-[fill,stroke-opacity] duration-300 ease-out ${
              active ? "fill-olive-strong/10 [stroke-opacity:0.5]" : "fill-olive-strong/5 [stroke-opacity:0.28]"
            }`}
          />
        );
      })}
      <defs>
        {CAMPS.map((camp) => (
          <path key={camp} id={curveId(camp)} d={CAMP_LABEL_CURVES[camp]} />
        ))}
      </defs>
      {CAMPS.map((camp) => {
        const active = activeCamp === camp;
        return (
          <text
            key={camp}
            strokeLinejoin="round"
            className={`font-brand-body text-[24px] font-semibold italic tracking-[0.12em] stroke-map-field stroke-[5px] transition-[fill,opacity] duration-300 ease-out [font-variant:small-caps] [paint-order:stroke] ${
              active ? "fill-earth-deep opacity-100" : "fill-earth-muted opacity-80"
            }`}
          >
            <textPath href={`#${curveId(camp)}`} startOffset="50%" textAnchor="middle">
              {camp}
            </textPath>
          </text>
        );
      })}
    </svg>
  );
}
