import { drawCodeWith, tokensToRows, type SceneParams, type Token } from "./helpers";

const TOKENS: (Token | "\n")[] = [
  { c: "kw", t: "import" }, { c: "tx", t: " " }, { c: "id", t: "express" }, { c: "tx", t: " " },
    { c: "kw", t: "from" }, { c: "st", t: " 'express'" }, { c: "tx", t: ";" }, "\n",
  { c: "kw", t: "import" }, { c: "tx", t: " " }, { c: "id", t: "mongoose" }, { c: "tx", t: " " },
    { c: "kw", t: "from" }, { c: "st", t: " 'mongoose'" }, { c: "tx", t: ";" }, "\n",
  { c: "kw", t: "import" }, { c: "tx", t: " { " }, { c: "id", t: "Truck" }, { c: "tx", t: " } " },
    { c: "kw", t: "from" }, { c: "st", t: " './models/Truck'" }, { c: "tx", t: ";" }, "\n",
  "\n",
  { c: "kw", t: "await " }, { c: "id", t: "mongoose" }, { c: "tx", t: "." }, { c: "fn", t: "connect" }, { c: "tx", t: "(" },
    { c: "id", t: "MONGO_URI" }, { c: "tx", t: ");" }, "\n",
  { c: "kw", t: "const" }, { c: "tx", t: " " }, { c: "id", t: "app" }, { c: "tx", t: " = " }, { c: "fn", t: "express" }, { c: "tx", t: "();" }, "\n",
  "\n",
  { c: "id", t: "app" }, { c: "tx", t: "." }, { c: "fn", t: "get" }, { c: "tx", t: "(" }, { c: "st", t: "'/api/loads'" },
    { c: "tx", t: ", " }, { c: "kw", t: "async" }, { c: "tx", t: " (" }, { c: "id", t: "req, res" }, { c: "tx", t: ") => {" }, "\n",
  { c: "tx", t: "  " }, { c: "kw", t: "const" }, { c: "tx", t: " " }, { c: "id", t: "t0" }, { c: "tx", t: " = " },
    { c: "id", t: "Date" }, { c: "tx", t: "." }, { c: "fn", t: "now" }, { c: "tx", t: "();" }, "\n",
  { c: "tx", t: "  " }, { c: "kw", t: "const" }, { c: "tx", t: " " }, { c: "id", t: "loads" }, { c: "tx", t: " = " },
    { c: "kw", t: "await " }, { c: "ty", t: "Truck" }, { c: "tx", t: "." }, { c: "fn", t: "find" }, { c: "tx", t: "({ " },
    { c: "id", t: "active" }, { c: "tx", t: ": " }, { c: "kw", t: "true" }, { c: "tx", t: " })." },
    { c: "fn", t: "lean" }, { c: "tx", t: "();" }, "\n",
  { c: "tx", t: "  " }, { c: "id", t: "res" }, { c: "tx", t: "." }, { c: "fn", t: "json" }, { c: "tx", t: "({ " },
    { c: "id", t: "loads" }, { c: "tx", t: ", " }, { c: "id", t: "ms" }, { c: "tx", t: ": " }, { c: "id", t: "Date" }, { c: "tx", t: "." },
    { c: "fn", t: "now" }, { c: "tx", t: "() - " }, { c: "id", t: "t0" }, { c: "tx", t: " });" }, "\n",
  { c: "tx", t: "});" }, "\n",
  "\n",
  { c: "id", t: "app" }, { c: "tx", t: "." }, { c: "fn", t: "listen" }, { c: "tx", t: "(" }, { c: "id", t: "8080" }, { c: "tx", t: ");" }, "\n",
  { c: "cm", t: "// → mongoose lean() drops Mongoose magic, 4× faster reads." },
];
const ROWS = tokensToRows(TOKENS);

export function drawExpressCode(ctx: CanvasRenderingContext2D, t: number, p: SceneParams) {
  drawCodeWith(
    ctx, t, p,
    "src/server/index.ts — VS Code",
    "● TypeScript · express + mongoose · main · index.ts",
    ROWS,
    { revealS: 4.2, cycleS: 6.0 },
  );
}
