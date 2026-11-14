---
title: Keeping a map alive all day
summary: Thousands of moving markers, listeners and a screen that never closes.
date: 2026-08-14
tags: [frontend, leaflet, performance]
art: s22
---

Most performance work assumes a page loads, gets used, and goes away. Some screens never go away. A live tracking map stays open for a whole working day with thousands of trucks moving on it, and every small leak gets eight hours to grow.

## Move markers, don't re-render them

The most expensive mistake is letting React re-render the marker list every time a position arrives. Keep each Leaflet marker in a ref keyed by driver id and move it with `setLatLng`. React state should describe which drivers are shown, not carry every GPS fix.

```ts
const markers = useRef(new Map<string, L.Marker>());

useEffect(() => {
  const stop = onPosition(({ id, lat, lng }) => {
    markers.current.get(id)?.setLatLng([lat, lng]);
  });
  return stop;
}, []);
```

## Update at the speed people read

Positions can arrive faster than anyone can follow them. Apply them on a short interval instead of per message, and skip markers outside the current view.

## Clean up what you added

Every layer, marker, realtime subscription and event handler needs a matching removal. On unmount, remove the layers, call `off` for each handler and close the subscription. A listener left behind keeps its marker, and everything it references, alive.

## Watch the heap, not the frame rate

A leak doesn't show up as jank at first. Take a heap snapshot, leave the screen running, take another, and compare. Detached DOM nodes and growing arrays of listeners are the usual suspects.

## Load the rest when it's needed

Panels, filters and modals that only open on a click don't belong in the first download. Split them into lazy chunks so the page stays light.
