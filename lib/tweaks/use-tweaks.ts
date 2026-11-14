/**
 * useTweaks — single source of truth for live-tweakable values.
 * Persists changes via the host postMessage protocol so they survive reload.
 */
import { useCallback, useState } from "react";

export function useTweaks<T extends Record<string, unknown>>(defaults: T) {
  const [values, setValues] = useState<T>(defaults);

  const setTweak = useCallback(
    <K extends keyof T>(keyOrEdits: K | Partial<T>, val?: T[K]) => {
      const edits: Partial<T> =
        typeof keyOrEdits === "object" && keyOrEdits !== null
          ? (keyOrEdits as Partial<T>)
          : ({ [keyOrEdits as K]: val } as Partial<T>);
      setValues((prev) => ({ ...prev, ...edits }));
      window.parent?.postMessage({ type: "__edit_mode_set_keys", edits }, "*");
      window.dispatchEvent(new CustomEvent("tweakchange", { detail: edits }));
    },
    [],
  );

  return [values, setTweak] as const;
}
