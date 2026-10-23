#!/usr/bin/env bash
# Regenerates the narration clips in public/voice/ (one AAC .m4a per story line, plus manifest.json) from
# components/journey/story.ts, using the macOS `say` voice named in VOICE. macOS only: needs say, afconvert and afinfo.
# macOS system voices are licensed for personal, non-commercial use.
# Usage: scripts/gen-voice.sh [voice-name]   (defaults to VOICE.name in story.ts)
set -euo pipefail
cd "$(dirname "$0")/.."
for t in say afconvert afinfo node; do command -v "$t" >/dev/null || { echo "missing $t" >&2; exit 1; }; done

OUT=public/voice
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

node -e '
const ts = require("typescript"), fs = require("fs");
const js = ts.transpileModule(fs.readFileSync("components/journey/story.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } }).outputText;
const m = { exports: {} }; new Function("module", "exports", "require", js)(m, m.exports, require);
fs.writeFileSync(process.argv[1], JSON.stringify(m.exports));
' "$TMP/story.json"

VOICE_NAME=${1:-$(node -p 'require(process.argv[1]).VOICE.name' "$TMP/story.json")}
RATE=$(node -p 'require(process.argv[1]).VOICE.rate' "$TMP/story.json")
BREATH=$(node -p 'require(process.argv[1]).VOICE.breathMs' "$TMP/story.json")
say -v '?' | grep -q "^$VOICE_NAME " || { echo "voice $VOICE_NAME is not installed (System Settings > Accessibility > Spoken Content)" >&2; exit 1; }

node -e '
const s = require(process.argv[1]);
for (const c of s.STORY.concat(s.TRAVEL || [])) c.lines.forEach((l, i) => console.log([c.id, i, (l.say || l.text).replace(/[\t\n]/g, " ")].join("\t")));
' "$TMP/story.json" > "$TMP/lines.tsv"

mkdir -p "$OUT"
rm -f "$OUT"/*.m4a
: > "$TMP/durations.tsv"
while IFS=$'\t' read -r id i text; do
  say -v "$VOICE_NAME" -r "$RATE" -o "$TMP/line.aiff" -- "$text [[slnc $BREATH]]"
  afconvert -f m4af -d aac -b 64000 -q 127 "$TMP/line.aiff" "$OUT/$id-$i.m4a"
  dur=$(afinfo "$OUT/$id-$i.m4a" | awk '/estimated duration/ { print $3 }')
  printf '%s\t%s\t%s\n' "$id" "$i" "$dur" >> "$TMP/durations.tsv"
  printf '%-12s %s  %6.2fs\n' "$id" "$i" "$dur"
done < "$TMP/lines.tsv"

node -e '
const fs = require("fs"), s = require(process.argv[1]);
const dur = {}; for (const r of fs.readFileSync(process.argv[2], "utf8").trim().split("\n")) { const [id, i, d] = r.split("\t"); dur[id + "-" + i] = Math.round(parseFloat(d) * 1000) / 1000; }
const chapters = s.STORY.concat(s.TRAVEL || []).map((c) => ({ id: c.id, lines: c.lines.map((l, i) => ({ src: "/voice/" + c.id + "-" + i + ".m4a", text: l.text, duration: dur[c.id + "-" + i] })) }));
const total = chapters.reduce((a, c) => a + c.lines.reduce((b, l) => b + l.duration, 0), 0);
fs.writeFileSync(process.argv[3], JSON.stringify({ voice: process.argv[4], rate: s.VOICE.rate, breath: s.VOICE.breathMs / 1000, total: Math.round(total * 10) / 10, chapters }, null, 1) + "\n");
console.log("total " + total.toFixed(1) + "s across " + chapters.reduce((a, c) => a + c.lines.length, 0) + " lines");
' "$TMP/story.json" "$TMP/durations.tsv" "$OUT/manifest.json" "$VOICE_NAME"
