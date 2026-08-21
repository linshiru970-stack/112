"use client";

import {
  CONTENT_DIFFICULTIES,
  FIRST_ACT_CHAPTERS,
  STORY_ROUTES,
  getContentDifficulty,
  getFirstActChapter,
  getStoryRoute,
  type ContentDifficultyId,
  type StoryRouteId,
} from "./story-content";
import type { StoryPayload } from "./story-store";
import type { UnitId } from "./content";

type Props = {
  payload: StoryPayload | null;
  selectedUnit: UnitId;
  formalUnit: UnitId;
  route: StoryRouteId;
  difficulty: ContentDifficultyId;
  loading: boolean;
  busy: boolean;
  error: string;
  onSelectUnit: (unit: UnitId) => void;
  onRouteChange: (route: StoryRouteId) => void;
  onDifficultyChange: (difficulty: ContentDifficultyId) => void;
  onChoose: (unit: UnitId, choiceId: string) => void;
  onStart: (unit: UnitId, route: StoryRouteId, difficulty: ContentDifficultyId) => void;
  onStartCase: (unit: UnitId, route: StoryRouteId, difficulty: ContentDifficultyId) => void;
  onOpenCourse: (unit: UnitId) => void;
};

export function FirstActStoryPreview({ formalUnit, hasStartedOpening, onOpen }: { formalUnit: UnitId; hasStartedOpening: boolean; onOpen: () => void }) {
  const chapter = hasStartedOpening ? getFirstActChapter(formalUnit) ?? FIRST_ACT_CHAPTERS[0] : FIRST_ACT_CHAPTERS[0];
  return (
    <button className="first-act-preview" onClick={onOpen}>
      <span className="first-act-preview-art" style={{ backgroundImage: `url('${chapter.imageSrc}')` }} aria-hidden="true" />
      <span className="first-act-preview-copy">
        <small>ACT I · 回聲航圖 · V33</small>
        <strong>{chapter.unit} · {chapter.title}</strong>
        <span>{hasStartedOpening ? `目前課程在 ${formalUnit}；完整主線仍可從 U01 回顧或往後預覽。` : "完整主線從 U01 開始，依序銜接 U02、U03～U08。"}</span>
      </span>
      <b>打開第一幕 →</b>
    </button>
  );
}

export function FirstActStoryPanel({
  payload,
  selectedUnit,
  formalUnit,
  route,
  difficulty,
  loading,
  busy,
  error,
  onSelectUnit,
  onRouteChange,
  onDifficultyChange,
  onChoose,
  onStart,
  onStartCase,
  onOpenCourse,
}: Props) {
  const chapter = getFirstActChapter(selectedUnit) ?? FIRST_ACT_CHAPTERS[0];
  const selectedIndex = FIRST_ACT_CHAPTERS.findIndex((item) => item.unit === chapter.unit);
  const formalIndex = FIRST_ACT_CHAPTERS.findIndex((item) => item.unit === formalUnit);
  const isAhead = selectedIndex > Math.max(0, formalIndex);
  const isBehind = selectedIndex < Math.max(0, formalIndex);
  const effectiveRoute: StoryRouteId = isAhead ? "leap" : isBehind ? "backtrack" : route;
  const selectedChoiceState = payload?.choices.find((item) => item.unit === chapter.unit);
  const selectedChoice = chapter.choices.find((choice) => choice.id === selectedChoiceState?.choiceId);
  const evidenceIds = new Set(payload?.evidence.map((item) => item.evidenceId) ?? []);
  const exploredUnits = new Set(payload?.units.map((item) => item.unit) ?? []);
  const routeInfo = getStoryRoute(effectiveRoute);
  const difficultyInfo = getContentDifficulty(difficulty);
  const practiceActionLabel = effectiveRoute === "leap"
    ? `躍遷試玩 ${chapter.unit}`
    : effectiveRoute === "backtrack"
      ? `重走 ${chapter.unit} 主線 · 記為複習`
      : `進入 ${chapter.unit} 正式主線`;

  return (
    <section className="first-act-story" aria-labelledby="first-act-story-title">
      <header className="first-act-head">
        <div>
          <span>ACT I · MAIN STORY · U01–U08 · V33</span>
          <h3 id="first-act-story-title">回聲航圖</h3>
          <p>主線從 U01〈名冊上的陌生人〉正式開場，U02 接續失序列車，再銜接 U03～U08。現在每章都有案件行動：英文判斷會直接改變你問誰、去哪裡與留下哪份紀錄。</p>
        </div>
        <div className="first-act-sync">
          <strong>{loading ? "同步中" : `${evidenceIds.size}/8 件證物`}</strong>
          <small>{payload?.synced === false ? "試行裝置" : "跨裝置保存"}</small>
        </div>
      </header>

      <nav className="story-chapter-rail" aria-label="第一幕章節">
        {FIRST_ACT_CHAPTERS.map((item, index) => {
          const formal = item.unit === formalUnit;
          const selected = item.unit === chapter.unit;
          const explored = exploredUnits.has(item.unit) || evidenceIds.has(item.evidence.id);
          const ahead = index > Math.max(0, formalIndex);
          return (
            <button
              key={item.unit}
              className={`${selected ? "story-chapter-active" : ""} ${formal ? "story-chapter-formal" : ""} ${explored ? "story-chapter-explored" : ""}`}
              onClick={() => onSelectUnit(item.unit)}
              aria-pressed={selected}
            >
              <b>{evidenceIds.has(item.evidence.id) ? "✓" : item.number}</b>
              <span>{item.unit}<small>{index === 0 ? "主線開端" : formal ? "目前進度" : explored ? "已探索" : ahead ? "可預覽" : "主線前章"}</small></span>
            </button>
          );
        })}
      </nav>

      {isBehind && (
        <div className="story-continuity-note">
          <b>主線前章</b>
          <span>{chapter.unit} 仍是正式主線的一部分；只是你的課程已在 {formalUnit}，所以重新作答會記為回溯複習，不會倒退正式進度。</span>
        </div>
      )}

      <article className="story-scene" style={{ backgroundImage: `url('${chapter.imageSrc}')` }}>
        <div className="story-scene-shade" />
        <div className="story-scene-copy">
          <span>{chapter.unit} · CHAPTER {chapter.number} · {chapter.companion}</span>
          <h4>{chapter.title}</h4>
          <p>{chapter.subtitle}</p>
          <blockquote>{chapter.coldOpen}</blockquote>
        </div>
        <div className="story-scene-badge">
          <span>LANGUAGE FOCUS</span>
          <strong>{chapter.focus}</strong>
        </div>
      </article>

      <div className="story-thread-grid">
        <div className="story-incident">
          <span>INCIDENT</span>
          <p>{chapter.incident}</p>
          <blockquote>{chapter.characterBeat}</blockquote>
        </div>
        <div className="story-trace">
          <span>ECHO TRACE</span>
          <p>{chapter.echoTrace}</p>
          <small>NEXT · {chapter.nextHook}</small>
        </div>
      </div>

      <div className="story-choice-block">
        <div className="story-block-title">
          <div><span>DECISION</span><strong>你要怎麼留下這一章？</strong></div>
          <small>選擇可改，但只收藏一份章節證物。</small>
        </div>
        <div className="story-choice-grid">
          {chapter.choices.map((choice) => (
            <button
              key={choice.id}
              className={selectedChoice?.id === choice.id ? "story-choice-selected" : ""}
              disabled={busy}
              onClick={() => onChoose(chapter.unit, choice.id)}
              aria-pressed={selectedChoice?.id === choice.id}
            >
              <span>{selectedChoice?.id === choice.id ? "已留下" : "選擇"}</span>
              <strong>{choice.label}</strong>
              <small>{choice.approach}</small>
            </button>
          ))}
        </div>
        {selectedChoice && (
          <div className="story-consequence" aria-live="polite">
            <span>CONSEQUENCE</span><p>{selectedChoice.consequence}</p>
          </div>
        )}
      </div>

      <div className="story-evidence-book">
        <div className="story-block-title">
          <div><span>EVIDENCE BOOK</span><strong>第一幕證物簿</strong></div>
          <small>完成案件或選擇章節決策後收藏；證物不等於正式精通。</small>
        </div>
        <div className="story-evidence-grid">
          {FIRST_ACT_CHAPTERS.map((item) => {
            const unlocked = evidenceIds.has(item.evidence.id);
            return (
              <button key={item.evidence.id} className={unlocked ? "story-evidence-unlocked" : ""} onClick={() => onSelectUnit(item.unit)}>
                <b>{unlocked ? "◆" : "◇"}</b>
                <span><strong>{unlocked ? item.evidence.name : `${item.unit} · 未取得`}</strong><small>{unlocked ? item.evidence.detail : "完成案件或做出章節決策"}</small></span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="story-route-lab">
        <div className="story-route-column">
          <div className="story-block-title"><div><span>ROUTE</span><strong>這次怎麼走</strong></div></div>
          <div className="story-segment" role="group" aria-label="故事路線">
            {STORY_ROUTES.map((item) => {
              const forced = item.id === effectiveRoute;
              return <button key={item.id} className={forced ? "story-segment-active" : ""} onClick={() => onRouteChange(item.id)} aria-pressed={forced}><strong>{item.label}</strong><small>{item.detail}</small></button>;
            })}
          </div>
        </div>
        <div className="story-route-column">
          <div className="story-block-title"><div><span>CONTENT</span><strong>內容難度</strong></div></div>
          <div className="story-segment" role="group" aria-label="內容難度">
            {CONTENT_DIFFICULTIES.map((item) => <button key={item.id} className={difficulty === item.id ? "story-segment-active" : ""} onClick={() => onDifficultyChange(item.id)} aria-pressed={difficulty === item.id}><strong>{item.label}</strong><small>{item.detail}</small></button>)}
          </div>
        </div>
      </div>

      {isAhead && <div className="story-preview-guard"><b>PREVIEW ONLY</b><span>{chapter.unit} 在正式位置 {formalUnit} 之後；本輪只存探索事件，不建立題目狀態、FSRS、能力證據、XP 或旅伴好感。</span></div>}
      {error && <p className="story-error" aria-live="polite">{error}</p>}
      <footer className="story-action-row">
        <div><span>{routeInfo.label} · {difficultyInfo.label}</span><strong>{chapter.evidence.name}</strong><small>{chapter.evidence.detail}</small></div>
        <button className="secondary-button" onClick={() => onOpenCourse(chapter.unit)}>先看 {chapter.unit} 教材</button>
        <button className="secondary-button" disabled={busy} onClick={() => onStart(chapter.unit, effectiveRoute, difficulty)}>{practiceActionLabel}</button>
        <button className="primary-button" disabled={busy} onClick={() => onStartCase(chapter.unit, effectiveRoute, difficulty)}>{busy ? "正在保存路線…" : `進入 ${chapter.unit} 案件行動`}</button>
      </footer>
    </section>
  );
}
