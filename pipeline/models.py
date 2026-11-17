"""Single source of truth for storyboard.json. renderer/src/types.ts mirrors these by hand."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

Accent = Literal["blue", "green", "red"]
Theme = Literal["whiteboard", "illustrated", "shorts", "dark", "paper", "papershorts", "cartoon"]
Tone = Literal["blue", "teal", "amber", "red", "green"]
Mark = Literal["check", "cross", "rupee", "user", "debt"]
from pathlib import Path as _P
_DF = _P(__file__).resolve().parent.parent / "input" / "disclaimer.txt"  # per-project override of the end-card text
DEFAULT_DISCLAIMER = _DF.read_text().strip() if _DF.exists() else ""  # no end card unless this file exists


class P(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class Bubble(P):
    text: str = Field(max_length=24)
    anchor_asset: str | None = None


class TitleCard(P):
    title: str = Field(max_length=90)
    subtitle: str | None = Field(None, max_length=140)


class QuoteTitle(P):
    number: int | None = None
    quote: str = Field(max_length=140)
    body: str | None = Field(None, max_length=260)
    bubble: Bubble | None = None


class IllustrationScene(P):
    heading: str | None = Field(None, max_length=100)
    body: str = Field(max_length=260)
    bubble: Bubble | None = None


class Side(P):
    label: str = Field(max_length=30)
    items: list[str] = Field(max_length=5)
    accent: Accent = "blue"


class ComparisonSplit(P):
    left: Side
    right: Side


class Node(P):
    id: str
    label: str = Field(max_length=30)


class Edge(P):
    from_: str = Field(alias="from")
    to: str


class FlowchartNodes(P):
    nodes: list[Node] = Field(min_length=2, max_length=6)
    edges: list[Edge] = []


class Bar(P):
    label: str = Field(max_length=20)
    value: float = Field(gt=0)
    color: Accent = "blue"


class Callout(P):
    bar: str
    text: str = Field(max_length=40)


class BarChartAnimated(P):
    bars: list[Bar] = Field(min_length=2, max_length=6)
    unit: str = ""
    callouts: list[Callout] = []


class Step(P):
    expr: str = Field(max_length=60)
    note: str | None = Field(None, max_length=60)


class MathFormulaBox(P):
    steps: list[Step] = Field(min_length=1, max_length=5)
    highlight_last: bool = True


class ChecklistCard(P):
    items: list[str] = Field(min_length=1, max_length=6)
    disclaimer: str | None = None


# ---- shorts (vertical 1080x1920, dark glass cards, all drawn in code) ----
class ShortHook(P):
    tag: str = Field(max_length=24)
    title: str = Field(max_length=60)
    accent: str | None = Field(None, max_length=30)  # substring of title shown in amber
    icon: Literal["vault", "building", "bank", "person", "coins"] = "building"  # building says IPO, bank is the same without text


class Card(P):
    label: str | None = Field(None, max_length=30)
    text: str = Field(max_length=60)
    tone: Tone = "blue"
    mark: Mark | None = None


class ShortCards(P):
    cards: list[Card] = Field(min_length=1, max_length=3)


class Slice(P):
    label: str = Field(max_length=20)
    pct: float = Field(gt=0, le=100)
    tone: Tone = "blue"


class Donut(P):
    title: str = Field(max_length=16)
    pill: str = Field(max_length=10)
    pill_tone: Tone = "blue"
    slices: list[Slice] = Field(min_length=2, max_length=4)


class ShortDonut(P):
    before: Donut
    after: Donut
    answer: str | None = Field(None, max_length=40)


class ShortLine(P):
    label: str = Field(max_length=40)
    points: list[float] = Field(min_length=4, max_length=14)
    tag: str | None = Field(None, max_length=40)
    tone: Tone = "teal"


class ShortStat(P):  # one big number
    label: str = Field(max_length=30)
    value: str = Field(max_length=14)
    sub: str | None = Field(None, max_length=60)
    tone: Tone = "amber"


class ShortList(P):  # 2-5 key points
    title: str | None = Field(None, max_length=40)
    items: list[str] = Field(min_length=2, max_length=5)
    tone: Tone = "teal"


# ---- cartoon (16:9, stick figure in code) ----
class Char(P):
    mood: Literal["happy", "shocked", "thinking", "sad", "angry", "excited", "worried"] = "happy"
    pose: Literal["down", "cheer", "shrug", "point", "think", "wide", "kneel", "bend", "sit"] = "down"
    hat: Literal["none", "cap", "explorer"] = "none"
    hair: Literal["none", "messy"] = "none"
    outfit: Literal["none", "fur", "suit"] = "none"
    shake: bool = False  # motion lines around the body (effort, fear, speed)
    say: str | None = Field(None, max_length=24)


class Item(P):
    kind: Literal["coin", "dollar", "bag", "chart_up", "chart_down", "car", "house", "bank", "laptop", "clock", "shield", "doc", "bulb",
                  "campfire", "rock", "spear", "crate", "bone"]
    label: str | None = Field(None, max_length=16)
    arrow: Literal["up", "down"] | None = None


class VsSide(P):
    mark: Literal["check", "cross"] | None = None
    label: str | None = Field(None, max_length=20)
    character: Char | None = None
    items: list[Item] = Field([], max_length=2)


class Versus(P):
    first: VsSide   # drawn on the left
    second: VsSide  # drawn on the right


class CartoonScene(P):
    layout: Literal["stage", "versus"] = "stage"
    place: Literal["room", "outdoor", "office", "city", "plain", "desert", "sunset", "night"] = "room"
    characters: list[Char] = Field([], max_length=2)
    items: list[Item] = Field([], max_length=4)
    caption: str | None = Field(None, max_length=60)
    versus: Versus | None = None  # used when layout == "versus" (two sides, ✓ / ✗, white background)

    @model_validator(mode="after")
    def _layout_needs(self):
        if self.layout == "versus" and not self.versus:
            raise ValueError("layout versus needs a 'versus' object with 'first' and 'second'")
        if self.layout == "stage" and not self.characters:
            raise ValueError("layout stage needs at least one character")
        return self


PROPS_MODEL: dict[str, type[P]] = {
    m.__name__: m
    for m in (TitleCard, QuoteTitle, IllustrationScene, ComparisonSplit, FlowchartNodes,
              BarChartAnimated, MathFormulaBox, ChecklistCard, ShortHook, ShortCards, ShortDonut, ShortLine, ShortStat, ShortList, CartoonScene)
}
SceneType = Literal[tuple(PROPS_MODEL)]  # type: ignore[valid-type]


class Asset(BaseModel):
    id: str
    query: str
    prompt: str | None = None
    cue_word: str | None = None
    path: str | None = None  # relative to renderer/public, set by stage 2b


class Cue(BaseModel):
    ref: str
    word: str
    offset_frames: int


class Scene(BaseModel):
    id: str
    type: SceneType
    narration: str
    props: dict
    assets: list[Asset] = []
    cues: list[Cue] = []
    words: list[tuple[str, int]] = []  # (caption word, frame offset in scene), shorts only
    start_frame: int = 0
    duration_frames: int = 0

    @model_validator(mode="after")
    def _check_props(self):
        m = PROPS_MODEL[self.type].model_validate(self.props)
        self.props = m.model_dump(by_alias=True, exclude_none=True)
        if len(self.assets) > 6:
            raise ValueError("max 6 assets per scene")
        return self


class Meta(BaseModel):
    fps: int = 30  # slides/icons look the same as 60 and render in half the time
    width: int = 1920
    height: int = 1080
    theme: Theme = "whiteboard"
    audio: str = "mixed.wav"
    disclaimer: str = DEFAULT_DISCLAIMER
    disclaimer_seconds: float = 4.0 if DEFAULT_DISCLAIMER else 0.0
    total_frames: int = 0


class Storyboard(BaseModel):
    meta: Meta
    scenes: list[Scene] = Field(min_length=1)


    @model_validator(mode="after")
    def _cartoon_only(self):
        bad = [x.id for x in self.scenes if self.meta.theme == "cartoon" and x.type != "CartoonScene"]
        if bad:
            raise ValueError(f"theme cartoon allows only type CartoonScene; change scenes {bad}")
        return self

    @model_validator(mode="after")
    def _vertical(self):
        if self.meta.theme.endswith("shorts"):
            self.meta.width, self.meta.height = 1080, 1920
        return self


THEME_TYPES = {  # scene types the planner may use per theme (keeps the planner prompt small)
    "cartoon": ["CartoonScene"],
    "shorts": ["ShortHook", "ShortStat", "ShortCards", "ShortList", "ShortDonut", "ShortLine"], "papershorts": ["ShortHook", "ShortStat", "ShortCards", "ShortList", "ShortDonut", "ShortLine"],
    "dark": ["ShortHook", "ShortStat", "ShortCards", "ShortList", "ShortDonut", "ShortLine", "BarChartAnimated"],
    "paper": ["ShortHook", "ShortStat", "ShortCards", "ShortList", "ShortDonut", "ShortLine", "BarChartAnimated"],
    "whiteboard": ["TitleCard", "ChecklistCard", "ComparisonSplit", "FlowchartNodes", "BarChartAnimated", "MathFormulaBox"],
    "illustrated": ["TitleCard", "QuoteTitle", "IllustrationScene", "ComparisonSplit", "BarChartAnimated"],
}


def schema_text(theme: str | None = None) -> str:
    """Compact description of per-type props, embedded in the planner prompt (only the types this theme can use)."""
    import json

    props = {k: PROPS_MODEL[k].model_json_schema(by_alias=True) for k in THEME_TYPES.get(theme or "", list(PROPS_MODEL))}
    return json.dumps({"scene_props_by_type": props, "asset": Asset.model_json_schema()}, separators=(",", ":"))
