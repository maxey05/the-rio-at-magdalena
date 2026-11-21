import { MAP_HEIGHT, MAP_WIDTH, TREES, type MapTree } from "@/lib/camp-map";

const FIELD_ONE = "M 150 330 C 220 230, 300 140, 380 120 C 440 105, 470 150, 470 220 C 470 300, 430 380, 380 440 C 320 500, 220 520, 160 470 C 120 430, 120 380, 150 330 Z";
const FIELD_TWO = "M 300 -10 C 330 40, 360 60, 400 40 C 430 20, 450 -5, 460 -10 Z";
const FAR_FOREST = "M 548.0 -30.0 C 551.7 -16.7, 563.0 23.3, 570.0 50.0 C 577.0 76.7, 583.0 104.2, 590.0 130.0 C 597.0 155.8, 601.2 179.2, 612.0 205.0 C 622.8 230.8, 637.8 260.0, 655.0 285.0 C 672.2 310.0, 693.3 333.3, 715.0 355.0 C 736.7 376.7, 760.8 395.8, 785.0 415.0 C 809.2 434.2, 835.0 451.7, 860.0 470.0 C 885.0 488.3, 906.7 505.0, 935.0 525.0 C 963.3 545.0, 1014.2 579.2, 1030.0 590.0 L 1030 -30 Z";
const ROAD = "M 300 640 C 330 560, 360 520, 420 500 S 520 470, 560 430";
const BIG_RIVER = "M -40.0 420.0 C -26.7 406.7, 15.0 368.3, 40.0 340.0 C 65.0 311.7, 88.3 281.7, 110.0 250.0 C 131.7 218.3, 150.0 183.3, 170.0 150.0 C 190.0 116.7, 212.5 81.7, 230.0 50.0 C 247.5 18.3, 267.5 -25.0, 275.0 -40.0";
const SMALL_RIVER = "M 548.0 -30.0 C 551.7 -16.7, 563.0 23.3, 570.0 50.0 C 577.0 76.7, 583.0 104.2, 590.0 130.0 C 597.0 155.8, 601.2 179.2, 612.0 205.0 C 622.8 230.8, 637.8 260.0, 655.0 285.0 C 672.2 310.0, 693.3 333.3, 715.0 355.0 C 736.7 376.7, 760.8 395.8, 785.0 415.0 C 809.2 434.2, 835.0 451.7, 860.0 470.0 C 885.0 488.3, 906.7 505.0, 935.0 525.0 C 963.3 545.0, 1014.2 579.2, 1030.0 590.0";
const CLIFF_EDGE = "587,223 591,232 596,242 601,252 605,261 611,270 616,280 622,289 627,298 634,307 640,315 647,324 653,332 660,340 667,348 674,356 681,364 689,371 696,379 704,386 712,393 719,400 727,407 735,414 743,420 751,426 759,433 767,439 775,445 783,452 792,458 800,464 808,470 816,476 825,481 833,487 840,493 848,499 856,505 864,511 872,517 881,523 889,529 897,535 905,540 913,546 922,552 930,558 938,564 947,570 955,575 963,581 971,587 980,592 988,598 996,603 1005,609";

const TREE_FILL = ["fill-olive", "fill-map-tree-b", "fill-map-tree-c", "fill-map-tree-d"] as const;

function Tree({ tree }: { tree: MapTree }) {
  const [x, y, radius, shade] = tree;
  return (
    <>
      <circle cx={x + 2} cy={y + 3} r={radius} className="fill-olive-deep opacity-[0.28]" />
      <circle cx={x} cy={y} r={radius} className={TREE_FILL[shade]} />
    </>
  );
}

export function CampMapArt() {
  return (
    <svg
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      className="absolute inset-0 block size-full"
    >
      <rect width={MAP_WIDTH} height={MAP_HEIGHT} className="fill-map-ground" />
      <path d={FIELD_ONE} className="fill-map-field" />
      <path d={FIELD_TWO} className="fill-map-field" />
      <path d={FAR_FOREST} className="fill-map-forest" />
      <ellipse cx="470" cy="110" rx="150" ry="95" transform="rotate(-8 470 110)" className="fill-map-clearing" />
      <ellipse cx="640" cy="410" rx="215" ry="92" transform="rotate(38 640 410)" className="fill-map-clearing" />
      <path d={ROAD} fill="none" strokeWidth="14" strokeLinecap="round" className="stroke-map-road-edge" />
      <path d={ROAD} fill="none" strokeWidth="8" strokeLinecap="round" className="stroke-map-road" />
      <path d={BIG_RIVER} fill="none" strokeWidth="150" strokeLinecap="round" className="stroke-map-bank" />
      <path d={BIG_RIVER} fill="none" strokeWidth="104" strokeLinecap="round" className="stroke-river-mist" />
      <path d={SMALL_RIVER} fill="none" strokeWidth="64" strokeLinecap="round" className="stroke-map-bank" />
      <path d={SMALL_RIVER} fill="none" strokeWidth="34" strokeLinecap="round" className="stroke-river-mist" />
      <polyline
        points={CLIFF_EDGE}
        fill="none"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-map-cliff"
      />
      {TREES.map((tree) => (
        <Tree key={`${tree[0]}-${tree[1]}`} tree={tree} />
      ))}
    </svg>
  );
}
