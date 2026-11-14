"use client";

import { useEffect, useState } from "react";

/**
 * CommandLine — animated terminal prompt that types + erases a rotating
 * list of fake commands. Marked "use client" because it owns animation state.
 */
const COMMANDS = ["whoami", "cat ./now.txt", "ls ./agents/", "ssh edge.lab"];
const TYPE_MS = 70;
const ERASE_MS = 30;
const HOLD_MS = 1500;

export default function CommandLine() {
  const [cmdIdx, setCmdIdx] = useState(0);
  const [text, setText] = useState("");

  useEffect(() => {
    const target = COMMANDS[cmdIdx];
    let i = 0;
    let cancelled = false;

    const typeInterval = setInterval(() => {
      if (cancelled) return;
      i++;
      setText(target.slice(0, i));
      if (i >= target.length) {
        clearInterval(typeInterval);
        setTimeout(() => {
          if (cancelled) return;
          let j = target.length;
          const eraseInterval = setInterval(() => {
            if (cancelled) return;
            j--;
            setText(target.slice(0, j));
            if (j <= 0) {
              clearInterval(eraseInterval);
              setCmdIdx((p) => (p + 1) % COMMANDS.length);
            }
          }, ERASE_MS);
        }, HOLD_MS);
      }
    }, TYPE_MS);

    return () => {
      cancelled = true;
      clearInterval(typeInterval);
    };
  }, [cmdIdx]);

  return (
    <div className="cmdline">
      <span className="prompt">parbat@laptop:~$</span>
      <span className="typed">{text}</span>
      <span className="caret" />
    </div>
  );
}
