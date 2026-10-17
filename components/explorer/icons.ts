import type { PlaceKind } from "@/lib/data/places";

const KIND_PATHS: Record<PlaceKind, string> = {
  home: '<path d="M4 11.5 12 5l8 6.5"/><path d="M6.5 10v9.5h11V10"/><path d="M10.5 19.5V15h3v4.5"/>',
  city: '<path d="M3.5 20.5h17"/><path d="M5 20.5V9l5-2.5v14"/><path d="M10 20.5V4.5l5.5 2.5v13.5"/><path d="M15.5 20.5v-8h4v8"/><path d="M7.5 11.5v.01M7.5 15v.01M12.8 10v.01M12.8 13.5v.01"/>',
  heritage: '<path d="M4.5 20.5h15"/><path d="M6.5 20.5v-2.5h11v2.5"/><path d="M7.5 18a4.5 4.5 0 0 1 9 0"/><path d="M12 13.5V6"/><path d="M10.6 8.5h2.8M10.9 11h2.2"/><path d="M12 6V3.5"/>',
  nature: '<path d="M12 3.5 7 10.5h3l-4 6h12l-4-6h3z"/><path d="M12 16.5v4"/>',
  trek: '<path d="M4 20.5c3.5-.5 4-5 8-5.5s4.5-5 8-6"/><path d="M17 3.5v6"/><path d="M17 3.8h3.5L19.6 5.2l.9 1.5H17"/>',
  ride: '<circle cx="6" cy="16" r="3.2"/><circle cx="18" cy="16" r="3.2"/><path d="M6 16l3.8-6h4.7l3.5 6"/><path d="M13.5 7h3"/>',
  viewpoint: '<path d="M2.5 19.5 8.5 10l4 5.5 2.5-3 6.5 7z"/><circle cx="17" cy="6" r="2"/>',
  dream: '<path d="M2.5 20.5 10 8.5l3 4.5 2-2.5 6.5 10z"/><path d="M10 8.5V3.5l4.2 1.6L10 6.7"/>',
};

const ATTRS = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';

export function kindSvg(kind: PlaceKind, size = 16): string {
  return `<svg width="${size}" height="${size}" ${ATTRS}>${KIND_PATHS[kind]}</svg>`;
}

export const ICON = {
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.4 2.3 3.6 5.1 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.1-3.6-8.5S9.6 5.8 12 3.5z"/>',
  peaks: '<path d="M2.5 19.5 9 9l3.5 5 2.5-3.5 6.5 9z"/><path d="M7.3 11.8 9 9l1.6 2.3"/>',
  replay: '<path d="M4.5 12a7.5 7.5 0 1 0 2.3-5.4"/><path d="M4.5 4.5v4h4"/><path d="M10.5 9.3v5.4l4.3-2.7z"/>',
  plus: '<path d="M12 5.5v13M5.5 12h13"/>',
  minus: '<path d="M5.5 12h13"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  prev: '<path d="M14.5 6 8.5 12l6 6"/>',
  next: '<path d="M9.5 6l6 6-6 6"/>',
  list: '<path d="M8.5 7h11M8.5 12h11M8.5 17h11"/><path d="M4.5 7v.01M4.5 12v.01M4.5 17v.01"/>',
  collapse: '<path d="M14.5 6 8.5 12l6 6"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.01"/>',
} as const;

export function iconSvg(name: keyof typeof ICON, size = 16): string {
  return `<svg width="${size}" height="${size}" ${ATTRS}>${ICON[name]}</svg>`;
}
