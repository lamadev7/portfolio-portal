import { drawCodeWith, tokensToRows, type SceneParams, type Token } from "./helpers";

const TOKENS: (Token | "\n")[] = [
  { c: "kw", t: "import" }, { c: "tx", t: " { " },
    { c: "id", t: "SubAgent1, SubAgent2, SubAgent3" },
    { c: "tx", t: " } " }, { c: "kw", t: "from" }, { c: "st", t: " './agents'" }, { c: "tx", t: ";" }, "\n",
  { c: "kw", t: "import" }, { c: "tx", t: " { " }, { c: "id", t: "ClaudeAgent" }, { c: "tx", t: " } " },
    { c: "kw", t: "from" }, { c: "st", t: " '@anthropic/claude-agents'" }, { c: "tx", t: ";" }, "\n",
  "\n",
  { c: "kw", t: "export class " }, { c: "ty", t: "Orchestrator" }, { c: "tx", t: " {" }, "\n",
  { c: "tx", t: "  " }, { c: "kw", t: "private " }, { c: "id", t: "agents" }, { c: "tx", t: " = {" }, "\n",
  { c: "tx", t: "    sub_agent_1: " }, { c: "kw", t: "new " }, { c: "ty", t: "SubAgent1" }, { c: "tx", t: "()," }, "\n",
  { c: "tx", t: "    sub_agent_2: " }, { c: "kw", t: "new " }, { c: "ty", t: "SubAgent2" }, { c: "tx", t: "()," }, "\n",
  { c: "tx", t: "    sub_agent_3: " }, { c: "kw", t: "new " }, { c: "ty", t: "SubAgent3" }, { c: "tx", t: "()," }, "\n",
  { c: "tx", t: "  };" }, "\n",
  "\n",
  { c: "tx", t: "  " }, { c: "kw", t: "async " }, { c: "fn", t: "dispatch" }, { c: "tx", t: "(" },
    { c: "id", t: "input" }, { c: "tx", t: ": " }, { c: "ty", t: "string" }, { c: "tx", t: ") {" }, "\n",
  { c: "tx", t: "    " }, { c: "kw", t: "const " }, { c: "id", t: "plan" }, { c: "tx", t: " = " },
    { c: "kw", t: "await " }, { c: "id", t: "this" }, { c: "tx", t: "." }, { c: "fn", t: "plan" },
    { c: "tx", t: "(" }, { c: "id", t: "input" }, { c: "tx", t: ");" }, "\n",
  { c: "tx", t: "    " }, { c: "kw", t: "return " }, { c: "id", t: "Promise" }, { c: "tx", t: "." },
    { c: "fn", t: "all" }, { c: "tx", t: "(" }, "\n",
  { c: "tx", t: "      " }, { c: "id", t: "plan" }, { c: "tx", t: "." }, { c: "fn", t: "map" },
    { c: "tx", t: "(" }, { c: "id", t: "step" }, { c: "tx", t: " => " },
    { c: "id", t: "this" }, { c: "tx", t: ".agents[" }, { c: "id", t: "step" }, { c: "tx", t: ".agent]." },
    { c: "fn", t: "run" }, { c: "tx", t: "(" }, { c: "id", t: "step" }, { c: "tx", t: "))" }, "\n",
  { c: "tx", t: "    );" }, "\n",
  { c: "tx", t: "  }" }, "\n",
  { c: "tx", t: "}" }, "\n",
  { c: "cm", t: "// boundaries: each agent has its own memory + tool scope." },
];
const ROWS = tokensToRows(TOKENS);

export function drawAgentsCode(ctx: CanvasRenderingContext2D, t: number, p: SceneParams) {
  drawCodeWith(
    ctx, t, p,
    "src/agents/orchestrator.ts — VS Code",
    "● TypeScript · MCP + Claude Agents · main · orchestrator.ts",
    ROWS,
    { revealS: 4.5, cycleS: 6.0 },
  );
}
