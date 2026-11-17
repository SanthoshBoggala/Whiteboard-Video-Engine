You turn a story into a storyboard for a short explainer video. Output ONLY JSON, no prose, no code fences.

Theme: {{THEME}}
- whiteboard: hand-drawn shapes and text only. Prefer ChecklistCard, ComparisonSplit, FlowchartNodes, BarChartAnimated, MathFormulaBox.
- illustrated: bold lettering plus flat colour illustrations. Prefer IllustrationScene and QuoteTitle, and give each one 2-6 assets.
- shorts: vertical 60-second Short, dark cards, NO assets (leave "assets" empty). Use ONLY ShortHook, ShortStat (one big number: label, value, sub), ShortCards, ShortList (2-5 short points), ShortDonut, ShortLine.
  Rules for shorts (they override rules 2 and 5): one scene per story line, 8-18 words each; first scene and last scene are ShortHook (tag = series label, title = 2-5 words, accent = the key words inside title);
  ShortCards = 1-3 cards for a comparison or an answer (label = 1-3 words, text = 2-5 words from that line); ShortDonut only for a before/after ownership split (pct must add to 100); ShortLine only for a price moving up and down. Every text comes from the spoken line.
- dark: 16:9 long video in the same dark card style as shorts, NO assets (leave "assets" empty). Normal scene rules apply (rule 2: 10-30 words per scene). Use ONLY these types, and vary them, never the same type 3 scenes in a row:
  ShortHook (first scene; also section openers; tag = 1-3 word section label, title = 2-5 words, accent = key words inside title), ShortStat (one key number: label, value like "+60%" or "₹320", sub = short context),
  ShortCards (1-3 cards for a comparison, steps or an answer; label = 1-3 words, text = 2-5 words), ShortList (2-5 short points from the sentence), ShortDonut (before/after ownership split, pct add to 100), ShortLine (a price moving), BarChartAnimated (compare several numbers, rule 5c).
  Every text comes from the spoken sentence. Use only numbers that appear in the story.
- paper: same scene types and rules as `dark` (16:9, no assets), only the look differs (cream paper). papershorts: same rules as `shorts` (vertical, one scene per story line).
- cartoon: 16:9 stick-figure explainer, NO assets (leave "assets" empty). EVERY scene, including the first, MUST be type CartoonScene (never ShortHook or any other type). Normal rule 2 applies (10-30 words per scene).
  CartoonScene props: layout "stage" (default) or "versus".
  * layout stage: place (room, outdoor, office, city, plain, desert, sunset, night), characters (1-2), items (0-4), caption (max 45 chars, the key idea).
  * layout versus: USE IT whenever the sentence compares two things (myth vs reality, before vs after, regular job vs real estate, right way vs wrong way, rich vs poor). Props: {"layout":"versus","versus":{"first":{...},"second":{...}}}. Each side: mark ("check" for the good/true/right side, "cross" for the bad/false/wrong side), label (max 16 chars), optional character, items (max 2). The first side is drawn on the left.
  * place by mood: room/office/city for everyday money or work, outdoor for general, desert for digging/exploring/searching, sunset for endings, reflection or calm conclusions, night for secrets, mystery, danger or deadlines, plain for an intro or abstract ideas.
  * characters: mood happy/shocked/thinking/sad/angry/excited/worried; pose down/cheer/shrug/point/think/wide (arms spread, excited)/kneel (digging, picking up)/bend (pushing, struggling, working hard)/sit (resting, waiting); hat none/cap/explorer; hair none/messy; outfit none/fur (ancient or primitive people)/suit (business, finance, officials); shake true for effort, fear or shock (motion lines); say = max 18 chars the character speaks.
    Match mood and pose to the sentence (shocked + point for a surprise, thinking + think for a question, cheer or excited for a win, worried for a risk, angry + bend + shake for a struggle). One character unless the sentence has two people.
  * items (max 3 per scene is best): kind coin, dollar, bag, chart_up, chart_down, car, house, bank, laptop, clock, shield, doc, bulb, campfire, rock, spear, crate, bone. campfire/rock/spear/crate/bone are drawn on the ground next to the characters, the others float above them. label max 12 chars; arrow up/down when something rises or falls.
  * Intro: the first scene uses place plain or room, one character (happy or shocked), and caption = a 2-5 word title for the video.
  * Variety: never the same place or the same layout three scenes in a row; vary mood, pose and items; use versus for about 1 scene in 6 when the story has comparisons.

Output shape:
{"meta": {"theme": "{{THEME}}"}, "scenes": [
  {"id": "s01", "type": "<one of the types below>", "narration": "...", "props": {...}, "assets": [{"id": "a1", "query": "one or two keywords for an icon e.g. store", "prompt": "image prompt if no icon fits", "cue_word": "word in the narration that triggers the pop-in"}]}
]}

Rules:
1. The first scene is a TitleCard. Scene ids are s01, s02, ...
2. Split the story into SHORT scenes: 10-30 words of narration each (1-2 sentences, never more than 35 words), so no slide stays on screen longer than ~12 seconds. Concatenated, the narrations MUST contain the whole story, in order, with the original wording. Never summarise, drop or reorder text.
2b. The first scene (TitleCard) narration is ONLY the first one or two short sentences of the story (at least 3 seconds of speech), so the title is on screen for 3-5 seconds. {{TITLE_HINT}}
2c. On-screen text must come from the sentence spoken in that scene: `heading` is 2-5 words naming the idea (never a whole sentence), `body` is the key phrase or number from that exact sentence (max 12 words). Never write generic captions that are not in the narration.
2d. Never create a scene for a disclaimer or legal notice.
3. `props` must match the schema for its `type` exactly (no extra keys). Keep texts short, they must fit on screen.
4. Use the visual type that fits the content: comparisons -> ComparisonSplit, steps/process -> FlowchartNodes, numbers to compare -> BarChartAnimated, calculations -> MathFormulaBox, lists/takeaways -> ChecklistCard, a key quote or idea -> QuoteTitle/IllustrationScene.
5. For each asset, `query` is a SPECIFIC 1-3 word search for an illustration that matches the sentence, e.g. "lottery ticket", "bank building", "money refund", "hourglass", "handshake", "stock market crash", "calculator", "red flag". Concrete things, not abstract ideas. `assets` only for IllustrationScene/QuoteTitle. `bubble.anchor_asset` must be an asset id from the same scene.
5b. Pick the most specific query for each sentence; avoid generic ones (chart, money, person, warning) unless the sentence is literally about them. When the same idea comes back later, REUSE the exact same query (the same picture is fine). Use 1-3 assets per scene.
5c. In the illustrated theme, use ONE BarChartAnimated scene where the story compares several multiples side by side (e.g. 3x, 5.4x, 15x), using only numbers from the story. Use IllustrationScene or QuoteTitle for everything else.
6. For FlowchartNodes every edge must use node ids. For BarChartAnimated use only numbers that appear in the story.

Schemas:
{{SCHEMA}}

Story:
{{STORY}}
