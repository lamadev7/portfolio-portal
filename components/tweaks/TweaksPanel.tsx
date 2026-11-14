"use client";

import { useEffect, useRef, useState } from "react";

const TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}
  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;background:rgba(0,0,0,.06)}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2}
  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}
  .twk-chips{display:flex;gap:6px}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;
    padding:0;border:0;border-radius:6px;overflow:hidden;cursor:default;
    box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);
    transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}
  .twk-chip[data-on="1"]{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),0 2px 6px rgba(0,0,0,.15)}
`;

/**
 * TweaksPanel — floating in-page Tweaks shell.
 *
 * Implements the host protocol:
 *   - listens for {type: '__activate_edit_mode'} / '__deactivate_edit_mode'
 *   - posts {type: '__edit_mode_available'} once mounted
 *   - posts {type: '__edit_mode_dismissed'} when the user clicks ✕
 */
export interface TweaksPanelProps {
  title?: string;
  children?: React.ReactNode;
}

export default function TweaksPanel({ title = "tweaks", children }: TweaksPanelProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const t = (e?.data as { type?: string } | null)?.type;
      if (t === "__activate_edit_mode") setOpen(true);
      else if (t === "__deactivate_edit_mode") setOpen(false);
    };
    window.addEventListener("message", onMsg);
    window.parent?.postMessage({ type: "__edit_mode_available" }, "*");
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const dismiss = () => {
    setOpen(false);
    window.parent?.postMessage({ type: "__edit_mode_dismissed" }, "*");
  };

  if (!open) return null;

  return (
    <>
      <style>{TWEAKS_STYLE}</style>
      <div ref={panelRef} className="twk-panel">
        <div className="twk-hd">
          <b>{title}</b>
          <button className="twk-x" aria-label="Close tweaks" onClick={dismiss}>
            ✕
          </button>
        </div>
        <div className="twk-body">{children}</div>
      </div>
    </>
  );
}

/* ----- Layout helpers ----- */

export function TweakSection({ label }: { label: string }) {
  return <div className="twk-sect">{label}</div>;
}

interface TweakRowProps {
  label: string;
  children: React.ReactNode;
  inline?: boolean;
}
export function TweakRow({ label, children, inline = false }: TweakRowProps) {
  return (
    <div className={inline ? "twk-row twk-row-h" : "twk-row"}>
      <div className="twk-lbl">
        <span>{label}</span>
      </div>
      {children}
    </div>
  );
}

/* ----- Controls ----- */

interface TweakRadioProps<T extends string> {
  label: string;
  value: T;
  options: T[];
  onChange: (v: T) => void;
}
export function TweakRadio<T extends string>({ label, value, options, onChange }: TweakRadioProps<T>) {
  const idx = Math.max(0, options.indexOf(value));
  const n = options.length;
  return (
    <TweakRow label={label}>
      <div className="twk-seg" role="radiogroup">
        <div
          className="twk-seg-thumb"
          style={{
            left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
            width: `calc((100% - 4px) / ${n})`,
          }}
        />
        {options.map((o) => (
          <button key={o} type="button" role="radio" aria-checked={o === value} onClick={() => onChange(o)}>
            {o}
          </button>
        ))}
      </div>
    </TweakRow>
  );
}

interface TweakToggleProps {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}
export function TweakToggle({ label, value, onChange }: TweakToggleProps) {
  return (
    <div className="twk-row twk-row-h">
      <div className="twk-lbl">
        <span>{label}</span>
      </div>
      <button
        type="button"
        className="twk-toggle"
        data-on={value ? "1" : "0"}
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
      >
        <i />
      </button>
    </div>
  );
}

interface TweakColorProps {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}
export function TweakColor({ label, value, options, onChange }: TweakColorProps) {
  return (
    <TweakRow label={label}>
      <div className="twk-chips" role="radiogroup">
        {options.map((c) => (
          <button
            key={c}
            type="button"
            className="twk-chip"
            role="radio"
            aria-checked={c.toLowerCase() === value.toLowerCase()}
            data-on={c.toLowerCase() === value.toLowerCase() ? "1" : "0"}
            style={{ background: c }}
            aria-label={c}
            onClick={() => onChange(c)}
          />
        ))}
      </div>
    </TweakRow>
  );
}
