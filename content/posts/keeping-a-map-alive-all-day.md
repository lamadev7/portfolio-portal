---
title: Keeping a map alive all day
summary: Memory, WebGL contexts and screens that never close.
date: 2026-08-14
tags: [frontend, webgl, performance]
art: s22
---

Most performance work assumes a page loads, gets used, and goes away. Some screens never go away. A live map can stay open for a whole working day, and every small leak gets eight hours to grow.

## Create the map once

The most expensive mistake is re-creating the map on a re-render. Keep the map instance in a ref, create it in a mount effect, and update it through its own API: `setData`, `setFilter`, `setPaintProperty`. React state should describe what the map shows, not own the map.

## Clean up what you added

Every source, layer, marker and event handler you add has to have a matching removal. On unmount, call `map.remove()`. It releases the WebGL context, and browsers only allow a handful of those per page.

```ts
useEffect(() => {
  const map = new mapboxgl.Map({ container: ref.current!, style });
  return () => map.remove();
}, []);
```

## Watch the heap, not the frame rate

A leak doesn't show up as jank at first. Take a heap snapshot, leave the screen running, take another, and compare. Detached DOM nodes and growing arrays of listeners are the usual suspects.

## Stream big data in

Large uploads and imports should stream and render in chunks instead of landing as one giant array. The tab stays responsive, and memory stays flat.
