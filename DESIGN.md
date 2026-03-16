DESIGN_DOC
game_name: seal-of-office
display_name: Seal of Office

---

## Identity

**Game Name:** Seal of Office
**Tagline:** *The empire runs on ink. Don't waste a drop.*

**Protagonist:**
Aldric, the Imperial Seal-Bearer — a middle-aged court clerk in a high-collared ink-stained tunic, slightly hunched, one hand always hovering over the stamp. He is not a warrior. He is a bureaucrat who has made bureaucracy into a martial art.

**Backstory:**
The Emperor signs nothing. That's Aldric's job. Every decree, land grant, and trade charter that flows through the Imperial Chancery must bear his wax seal before it exits the building — or it's void. The forgeries started six months ago. Someone is slipping fake charters into the pile, trying to steal the Northern Provinces. Aldric noticed. Nobody else did. He says nothing. He stamps faster.

**World Description:**
A heavy oak desk in the Imperial Chancery, viewed from slightly above — as if you're leaning over Aldric's shoulder. The desk surface is worn smooth in two arcs where his elbows rest. Documents slide in from the left edge, drift across the desk surface, and tumble off the right edge or bottom if not caught. The room beyond the desk is dim — a high stone window with cold afternoon light, a inkwell that never runs dry, walls of filing shelves receding into shadow.

**World Feel:**
The desk is the entire world — everything that matters happens in this 2-foot rectangle of worn oak. The atmosphere is oppressive calm: the scratch of quills elsewhere, the distant murmur of petitioners, but Aldric's corner is silent except for the thwack of the stamp.

**Emotional Experience:** *Bureaucratic mastery* — the feeling of being the only competent person in the building

**Reference Games:**
- **Papers, Please** — same desk-top scanning discipline, same low-grade paranoia about forgeries, same satisfaction of a correct decision made fast
- **Zuma / Bust-a-Move** — the pre-positioning loop: you don't react to where the ball is, you predict where it will be; replace that with a stamp and documents
- **Metal Slug** — instant sprite-reading of threat type; here you read document validity in one fast scan, same cognitive snap

---

## Visual Spec

| Property | Value |
|---|---|
| Background color | `#C8A96E` (aged parchment, the desk surface) |
| Primary color | `#1A3A5C` (imperial ink blue — valid stamp ink, text) |
| Secondary color | `#F2E8D5` (cream — document face color) |
| Accent color | `#D64E2A` (forgery red — only appears on condemned docs) |
| Danger highlight | `#8B1A1A` (deep crimson — forgery watermark glow) |
| Desk wood trim | `#7A5230` (dark oak border around play area) |
| Wax seal color | `#C8102E` (cardinal red — the valid stamp impression) |
| Bloom | Yes — strength 0.4, threshold 0.85, only on stamp impact flash |
| Vignette | Yes — soft, 35% opacity, darkens all four corners |
| Camera | Top-down, tilted 12° toward viewer (isometric lean), fixed position |

**Player Silhouette (Stamp Tool):**
Broad flat rectangular head, long cylindrical handle, ink-wet base edge, slightly angled in hand

The stamp is Aldric's hand — the player never sees Aldric's face. The stamp IS the player. It's a heavy brass cylinder with a carved imperial eagle on the base, held vertically. When it moves, it moves like a fist about to land.

**Document Silhouette:**
Rectangular cream paper sheets, slightly yellowed, with visible text lines (3–4 thin horizontal rules), a faint decorative border. Valid documents have a faint blue watermark (the Imperial Eagle, centered). Forgeries have the same eagle but with a second mark — a tiny crown-less variant — visible for exactly 0.8 seconds as the document enters the frame, before it slides under other documents.

**Stack Depth Illusion:**
Documents in the stack show 3px drop shadows per layer. Bottom document in a stack of 4 is at 85% opacity. Top document is full opacity. Stamping the top document causes it to flash (white bloom, 80ms) then slide off the right edge. The document beneath rises to full opacity over 150ms.

---

## Sound Spec

**Music Identity:**
Genre: Dry chamber minimalism — think Philip Glass scoring a DMV waiting room. Woodblock, prepared piano, low brass drones. The music is the sound of a man who has done this ten thousand times and will do it ten thousand more.

**Character of the music:**
Relentless, unhurried patience — a metronome that knows it will outlive you.

**The Hook:**
Every 4 bars, a single prepared-piano note lands on beat 3 like a rubber stamp — slightly ahead of where you expect it, which makes you lean forward. That's the pulse you're stamping to.

**BPM:** 92
**Bar Length:** 4/4
**Loop Length:** 16 bars

**Arrangement:**

| Instrument | Tone.js Synth | Role | Entry / Exit |
|---|---|---|---|
| Woodblock | `MembraneSynth` (pitchDecay: 0.05, octaves: 2) | Primary pulse, beats 2 and 4 | Enters immediately, never exits |
| Low drone | `AMSynth` (harmonicity: 0.5, modType: "sine") | Floor tension, sustained low C | Enters at level start, fades on level complete |
| Prepared piano | `Sampler` or `MetalSynth` (envelope: short, resonance: 0.7) | The Hook note, beat 3 of bar 2 and 4 | Enters after 4 bars, exits during danger state |
| High strings | `PolySynth` (oscillator: "sawtooth", envelope: slow attack 0.4s) | Harmonic tension layer | Enters at Level 3, exits during level complete |
| Quill scratch loop | `Noise` (type: "brown", gain: 0.08) | Ambient texture | Always present, very low |
| Low brass swell | `Synth` (oscillator: "sine", portamento: 0.2) | Danger swell | Enters only in Danger state |

**Dynamic Music States:**

| State | Music Change |
|---|---|
| Normal gameplay | Full arrangement as above, woodblock steady at 92 BPM |
| Danger (3+ documents approaching edge simultaneously) | Prepared piano drops out; low brass swell enters; woodblock gains a ghost 16th-note offbeat at half volume; tempo stays fixed but feels faster due to added subdivision |
| Near win (last document of wave, stamp in position) | All layers except woodblock fade to 20% volume; silence expands; the next woodblock hit is 40ms late (a held breath) |
| Player dies (document crumbles / forgery stamped) | All music cuts instantly; single low drone note decays over 2.5 seconds; silence |
| Level complete | Woodblock plays a 4-hit flourish pattern (quarter, quarter, eighth+eighth, quarter); strings resolve to major chord over 1.2 seconds; then loops to start screen music |
| Forgery caught correctly | Extra woodblock accent + a single high prepared-piano ping, 200ms after stamp impact |

**Start Screen Music:**
Slow, sparse. Just the woodblock at half tempo (46 BPM), occasional prepared piano note every 6–8 seconds, low drone at 30% volume. Sounds like a clock in a empty office at the end of the day.

**Sound Effects (Tone.js):**

| SFX | Description | Implementation |
|---|---|---|
| Stamp Valid | Deep THWACK — satisfying, weighted, slightly wet | `MembraneSynth` pitchDecay: 0.08, frequency: 80Hz, decay: 0.3s; followed by `Reverb` room: 0.1 (very dry) |
| Stamp Forgery Caught | Hollow CLONK — gavel-like, resonant, triumphant | `MetalSynth` frequency: 200Hz, resonance: 0.9, envelope: attack 0ms decay 0.5s; `Reverb` room: 0.3 |
| Stamp Miss (air stamp) | Dry puff + faint whiff | `Noise` burst type "pink", 80ms, gain 0.3 |
| Document Crumble | Papery crinkle fade | `Noise` type "brown", 400ms, with `AutoFilter` freq sweeping 800Hz→80Hz |
| Document Slide In | Light paper whisper | `Noise` type "white", 150ms, very low gain 0.15 |
| Forgery Detected (watermark flash moment) | Faint high sting — barely audible, a question mark | `Synth` oscillator "triangle", frequency: 880Hz, envelope: attack 0ms decay 0.15s, gain: 0.25 |
| Score Reverse (traitor brand) | Descending chromatic brass fall over 0.8s | `AMSynth` portamento 0.8s, start freq 400Hz, end freq 100Hz, modulation increases |
| Level Complete Seal | Wax drip sizzle + stamp resonance | `MetalSynth` high freq 600Hz + `Noise` burst "brown" 200ms layered |

---

## Mechanic Spec

**Core Loop (one sentence):**
Move the stamp to where a document *will be*, press to stamp it before it drifts off the desk edge — documents overlap and each stamp reshuffles the stack, so your next target changes with every action.

**Primary Input:**
- `pointermove` — stamp follows cursor/finger at 1:1 ratio, no lag, no smoothing. The stamp moves exactly where the player points.
- `pointerdown` — stamp descends (animation: 60ms drop, 20ms hold, 80ms rise). If base of stamp overlaps ≥60% of the topmost document in that position, stamp triggers. If a forgery is on top and player stamps it: TRAITOR event. If valid document on top: valid stamp.
- `pointerup` — stamp rises immediately if held down somehow (max hold 300ms then auto-releases)
- No drag. No hold-to-charge. You move, you press, it stamps or misses.

**Key Timing Values:**
- Document entry interval (Level 1): 3.2 seconds between new documents
- Document drift speed (Level 1): 48px/second leftward + 12px/second downward (diagonal drift, slight variation ±8px/s per doc)
- Document drift speed (Level 5): 110px/second leftward + 35px/second downward
- Document width: 180px, height: 240px
- Stamp base hitbox: 80px × 80px (centered on cursor)
- Forgery watermark visible window: 0.8 seconds from document entry
- Stack reshuffle animation: 150ms (document slides off, next rises)
- Document crumble trigger: when leading edge exits play area (right or bottom)
- Lives: 3 documents crumbled = game over (forgeries stamped wrong = instant game over)
- Stamp cooldown after press: 220ms (prevents tap-spam)

**Difficulty Curve Per Level:**

| Level | Docs simultaneous | Entry interval | Speed range (px/s) | Forgeries per wave | Stack max depth |
|---|---|---|---|---|---|
| 1 — The Morning Pile | 1–2 | 3.2s | 40–56 | 0 | 2 |
| 2 — The Afternoon Rush | 2–3 | 2.6s | 56–72 | 0 | 3 |
| 3 — The Evening Chaos | 3–4 | 2.0s | 64–88 | 1 | 4 |
| 4 — The Forgery | 4–5 | 1.8s | 72–96 | 2 (one is THE forgery) | 4 |
| 5 — The Coup | 5–6 | 1.4s | 88–110 | 2–3 | 5 |

**Win Condition:** Clear all documents in a wave (each level has a fixed wave of 12–18 documents). All valid docs stamped, all forgeries identified and *not* stamped, or correctly stamped with the REJECT stamp (see below).

**Lose Condition:** 3 valid documents crumble off the edge (wasted), OR stamp a forgery as valid (TRAITOR event — score reversal + level restart), OR 1 valid document crumbles in Level 5 (no mercy mode).

**Score System:**
- Valid stamp, perfect position (stamp centered within 20px of document center): +100 points
- Valid stamp, acceptable position: +50 points
- Forgery rejected correctly (player avoids stamping it — it slides off marked): +200 points
- Forgery caught with REJECT stamp action (double-tap on forgery): +500 points, the CLONK sound
- Document crumbled: -75 points
- TRAITOR event (forged doc stamped): ALL current wave points set to negative (score × -1), not just zeroed
- Combo multiplier: 4 consecutive correct actions (stamps + avoids) = ×2; 8 consecutive = ×3; resets on any miss

**REJECT Stamp mechanic (Level 4+):**
Double-tap (two presses within 200ms on same document) = REJECT action. This marks the document with the red DENY stamp and slides it to a discard pile (left edge). Use this on forgeries for bonus points. Using REJECT on a valid document costs -300 points and uses one life.

---

## Level Design

### Level 1 — "The Morning Pile"
**What's new:** Everything — first contact with the mechanic. One document at a time, slow drift, no forgeries.
**Parameters:** 1–2 docs simultaneous, 3.2s entry, 40–56px/s drift, 0 forgeries, 12 total documents
**Goal:** Stamp 10 of 12 without crumbling (2 crumbles forgiven, tutorial grace)
**New mechanic introduced:** Basic stamp press, document drift direction, stack depth 2
**Duration:** ~60–80 seconds
**Designer note:** The first stamp must feel like a revelation. The bloom flash, the THWACK, the ink blooming on the document. The player should go "oh." This is the entire game's promise in one interaction.

---

### Level 2 — "The Afternoon Rush"
**What's new:** Three simultaneous documents at different drift speeds. Player must choose order.
**Parameters:** 2–3 docs, 2.6s entry, 56–72px/s, 0 forgeries, 14 documents, stacks up to depth 3
**Goal:** Stamp 12 of 14, score ≥600 points
**New mechanic introduced:** Stack depth — documents overlap. Stamping one reveals the one beneath.
**Duration:** ~75–90 seconds
**Designer note:** This is where pre-positioning becomes mandatory. Two documents drifting at different speeds means the player must decide which to chase and which to lead. Wrong call = crumble.

---

### Level 3 — "The Evening Chaos"
**What's new:** First forgery appears. Forgery watermark system introduced via tutorial flash (UI text: "WAIT — inspect before you stamp").
**Parameters:** 3–4 docs, 2.0s entry, 64–88px/s, 1 forgery (clearly different watermark), 15 documents, stacks up to depth 4
**Goal:** Stamp 12 of 14 valid docs, do NOT stamp the forgery, score ≥900
**New mechanic introduced:** Watermark flash (0.8s window on entry), REJECT stamp (double-tap), red accent color appears for first time
**Duration:** ~80–100 seconds
**Designer note:** The forgery in Level 3 is easy — the watermark is distinctly different (crown present vs. absent is obvious). This is the tutorial for the mechanic. Level 4 is where it kills you.

---

### Level 4 — "The Forgery" ⭐ THE MOMENT
**What's new:** THE WOW MOMENT. Two forgeries in the wave. One is obvious (Level 3 difficulty). One is THE forgery — identical to a valid document in every way except for a tiny detail in the watermark, visible only for 0.8 seconds on entry, that then slides under the pile.
**Parameters:** 4–5 docs, 1.8s entry, 72–96px/s, 2 forgeries (1 easy, 1 THE forgery), 16 documents, stacks up to depth 4
**Goal:** Clear all valid docs, correctly reject both forgeries, score ≥1500
**The Tell:** THE forgery's watermark shows the Imperial Eagle with a left-facing head (all valid docs have right-facing). The player has exactly 0.8 seconds on document entry to catch this. After it slides under the pile, the only way to find it is by reading stack order — it'll surface when stamped documents above it are cleared.

**TRAITOR event trigger:**
If the player stamps THE forgery as valid: the music cuts, the screen flashes crimson, and a second stamp appears on the document — a branded red TRAITOR mark. Score for the entire wave reverses. The level restarts. The word "TRAITOR" burns onto the screen in imperial ink blue for 1.2 seconds, then fades. No other feedback. The silence is the judgment.

**Duration:** ~90–120 seconds
**Designer note:** This is the level that defines the game. Players will tell friends about it. The paranoia of "was that the forgery?" after every document entry is the entire point. The 0.8 second window means you cannot afford to blink.

---

### Level 5 — "The Coup"
**What's new:** Maximum chaos. 5–6 simultaneous documents. 2–3 forgeries. Stack depth 5. One document crumble = game over (no mercy).
**Parameters:** 5–6 docs, 1.4s entry, 88–110px/s, 2–3 forgeries (all subtle, THE forgery variant), 18 documents, stacks up to depth 5, 0 crumbles permitted
**Goal:** Clear all 18 documents with no crumbles, no incorrectly stamped forgeries, score ≥3000
**New mechanic introduced:** Documents now drift in TWO possible directions (some drift right-to-left, some drift top-to-bottom — two entry edges). Player must manage both axes simultaneously.
**Duration:** ~120–150 seconds
**Designer note:** The 10x player has been practicing reading stack collapse order since Level 2. This is their exam. The 1x player will die here repeatedly until they learn to plan two moves ahead. The entry from two edges is the final cognitive load — your spatial model of the desk must be 3D now.

---

## The Moment

**Wave 4, document 9 of 16.**

Three documents are drifting across the desk. You've been stamping well — rhythm established, hands moving before your brain catches up. A new document slides in from the left. Your eye flicks to the watermark — *right-facing eagle* — valid. You start moving the stamp.

Then you notice. The head is facing left.

You have 0.8 seconds from the moment you noticed. The document is already overlapping two others. The stamp is halfway there. If you stamp it, you've just handed the Northern Provinces to a traitor. If you stop and double-tap (REJECT), you need to do it in the next 400ms while the other two documents approach their edges.

You stop. You double-tap. The CLONK sounds. The screen doesn't react — just the sound, and the document sliding to the discard pile with a red REJECT stamp on its face.

You exhale.

The two other documents are now at the edge. You pivot and stamp them both in the next 3 seconds.

You're reading chaos. And you're winning.

---

## Emotional Arc

**First 30 seconds:**
One document slides in from the left. Slow. You move the stamp to where it's going, not where it is. You press. The THWACK hits. Ink blooms in a brief circular flash. It's *heavy*. It feels like something real just happened. Another document appears. You're getting it.

**After 2 minutes (Level 2–3):**
Three documents at three speeds. You've stopped thinking about individual stamps — you're reading the whole desk. Your hand is moving before the decision forms. When you miss, you know you missed before the crumble animation plays. The woodblock rhythm has become your heartbeat. You are Aldric. This is Tuesday.

**Near Win (Level 5, final 3 documents):**
The music thins. Silence expands. One forgery left in the stack somewhere — you're counting. You know it's document 3 from the bottom of the pile because you tracked it since it entered. You're not reacting. You're *orchestrating*. The last stamp lands. Level complete flourish. You sit back. That was work. Good work.

---

## This Game's Identity In One Line

**"This is the game where you stamp documents for an empire that's already falling — and you're the only one who knows it."**

---

## Start Screen

**Idle Animation (Three.js canvas):**

Objects present:
- `deskSurface` — fills canvas, `#C8A96E` with subtle wood-grain noise texture (Perlin, grain scale 0.003, amplitude 0.04)
- `inkwell` — top-right corner, 40px diameter dark glass vessel, static
- `stampHolder` — left side of desk, cylindrical brass stamp resting in a wooden cradle, slight specular highlight
- `documentPile` — center desk, 5 stacked documents visible as offset rectangles (each 180×240px, `#F2E8D5`, stacked 6px apart in x and y)
- `quillPen` — diagonal across bottom-left, static, decorative

Motion:
- `documentPile`: breathes — entire pile scales between 1.0 and 1.02 with a 4-second sinusoidal period, as if weighted by an unseen hand
- `stampHolder`: very slight pendulum rotation, ±1.2°, 3.5-second period, pivot at cradle base
- `inkwell`: no motion — stillness is weighted
- Every 7 seconds: a single document slides in from the left at 80px/s, drifts across the pile, and slowly crumbles off the right edge — no stamp catches it. A ghost. An unanswered question.
- Every 14 seconds: a faint red watermark (the forgery mark, 15% opacity) pulses on the top document of the pile for 0.8 seconds, then fades. The player sees it. They don't yet know what it means.

**SVG Overlay Spec:**

**Option A (required) — Title treatment:**
```
Text: "SEAL OF OFFICE"
Font: serif, letter-spacing: 0.18em, all caps
Fill: #1A3A5C
feGaussianBlur glow filter: stdDeviation="3.5", flood-color="#C8A96E", flood-opacity="0.6"
Title text size: 52px
Animation: opacity pulses between 0.85 and 1.0 over 3.2 seconds (matching woodblock tempo)
Position: centered, upper third of screen
```

**Option B — Imperial Eagle silhouette:**
```
3 SVG primitives:
1. Main body: <ellipse> cx="50%" cy="50%" rx="18" ry="22" stroke="#1A3A5C" fill="none" stroke-width="1.5"
2. Wings: <path> two symmetrical bezier arcs extending 60px each side, stroke="#1A3A5C" fill="none" stroke-width="1.5"
3. Crown above head: <polygon> 5 points, 18px wide, stroke="#1A3A5C" fill="none" stroke-width="1.5"
drop-shadow: dx=0, dy=2, blur=4, color="#00000033"
Size: 80×80px, centered beneath title
Opacity: 0.65 — present but subtle
```

**Option C — Corner brackets (tactical feel):**
```
All four corners, 28px per side
Stroke: #1A3A5C, stroke-width: 1.5
Fill: none
Inset: 16px from edge
These are imperial document corner brackets — the same ones visible on document borders in gameplay
Static, no animation
```

Subtitle line below title:
```
"Stamp them before they crumble."
Font: serif italic, 18px, #1A3A5C at 70% opacity, letter-spacing: 0.08em
```

Press/tap prompt:
```
"PRESS TO BEGIN"
16px, all caps, letter-spacing 0.25em, #1A3A5C
Blinks: opacity 1.0 → 0.2 → 1.0, period 1.6s
Positioned: lower third, centered
```

---

END_DESIGN_DOC
