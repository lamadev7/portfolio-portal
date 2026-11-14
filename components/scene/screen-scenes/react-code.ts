import { drawCodeWith, tokensToRows, type SceneParams, type Token } from "./helpers";

const TOKENS: (Token | "\n")[] = [
  { c: "kw", t: "import" }, { c: "tx", t: " " }, { c: "id", t: "React" }, { c: "tx", t: " " },
    { c: "kw", t: "from" }, { c: "st", t: " 'react'" }, { c: "tx", t: ";" }, "\n",
  { c: "kw", t: "import" }, { c: "tx", t: " { " }, { c: "id", t: "useFleet" }, { c: "tx", t: " } " },
    { c: "kw", t: "from" }, { c: "st", t: " '@/hooks/useFleet'" }, { c: "tx", t: ";" }, "\n",
  "\n",
  { c: "kw", t: "export function " }, { c: "fn", t: "FleetDashboard" }, { c: "tx", t: "() {" }, "\n",
  { c: "tx", t: "  " }, { c: "kw", t: "const" }, { c: "tx", t: " { " }, { c: "id", t: "trucks, stats, agents" },
    { c: "tx", t: " } = " }, { c: "fn", t: "useFleet" }, { c: "tx", t: "();" }, "\n",
  "\n",
  { c: "tx", t: "  " }, { c: "kw", t: "return" }, { c: "tx", t: " (" }, "\n",
  { c: "tx", t: "    <" }, { c: "tg", t: "Layout" }, { c: "tx", t: " " }, { c: "id", t: "theme" }, { c: "tx", t: "=" },
    { c: "st", t: "\"ops\"" }, { c: "tx", t: ">" }, "\n",
  { c: "tx", t: "      <" }, { c: "tg", t: "StatsRow" }, { c: "tx", t: " " }, { c: "id", t: "data" }, { c: "tx", t: "={" },
    { c: "id", t: "stats" }, { c: "tx", t: "} />" }, "\n",
  { c: "tx", t: "      <" }, { c: "tg", t: "MapPanel" }, { c: "tx", t: " " }, { c: "id", t: "trucks" }, { c: "tx", t: "={" },
    { c: "id", t: "trucks" }, { c: "tx", t: "} />" }, "\n",
  { c: "tx", t: "      <" }, { c: "tg", t: "AgentFeed" }, { c: "tx", t: " " }, { c: "id", t: "live" },
    { c: "tx", t: " events" }, { c: "tx", t: "={" }, { c: "id", t: "agents" }, { c: "tx", t: "} />" }, "\n",
  { c: "tx", t: "    </" }, { c: "tg", t: "Layout" }, { c: "tx", t: ">" }, "\n",
  { c: "tx", t: "  );" }, "\n",
  { c: "tx", t: "}" }, "\n",
  { c: "cm", t: "// → rendering live next ↓" },
];
const ROWS = tokensToRows(TOKENS);

export function drawReactCode(ctx: CanvasRenderingContext2D, t: number, p: SceneParams) {
  drawCodeWith(
    ctx, t, p,
    "src/dashboards/FleetDashboard.tsx — VS Code",
    "● TypeScript · 2 sp · UTF-8 · main · FleetDashboard.tsx",
    ROWS,
    { revealS: 4.2, cycleS: 6.0 },
  );
}
