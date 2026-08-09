"use client";

import { useMemo, useState } from "react";
import {
  Action, Card as CardType, GameState, Hand, allowedActions, basicDecision,
  decisionReason, handValue, initialState, performAction, startRound, updateBet,
} from "./blackjack";

const ACTION_LABELS: Record<Action, string> = {
  hit: "HIT", stand: "STAND", double: "DOUBLE", split: "SPLIT", surrender: "SURRENDER",
};

function Card({ card, hidden = false, index = 0 }: { card: CardType; hidden?: boolean; index?: number }) {
  const red = card.suit === "♥" || card.suit === "♦";
  return (
    <div className={`playing-card ${hidden ? "card-back" : ""} ${red ? "red" : ""}`} style={{ "--card-index": index } as React.CSSProperties}>
      {!hidden && <><span className="rank">{card.rank}</span><span className="suit">{card.suit}</span><span className="suit-large">{card.suit}</span></>}
      {hidden && <span className="back-mark">B</span>}
    </div>
  );
}

function HandCards({ hand, active = false, reveal = true }: { hand: Hand; active?: boolean; reveal?: boolean }) {
  const value = handValue(hand.cards);
  return (
    <div className={`hand ${active ? "active-hand" : ""}`}>
      <div className="cards">
        {hand.cards.map((card, index) => <Card key={card.id} card={card} hidden={!reveal && index === 1} index={index} />)}
      </div>
      {reveal && hand.cards.length > 0 && <span className={`score-chip ${value.total > 21 ? "bust" : ""}`}>{value.total}</span>}
      {hand.bet > 1 && <span className="bet-chip">{hand.bet}u</span>}
      {hand.result && <span className={`result-tag ${hand.delta && hand.delta > 0 ? "win" : hand.delta && hand.delta < 0 ? "lose" : "push"}`}>{hand.result}</span>}
    </div>
  );
}

function SeatView({ seat, position, activeHand = -1 }: { seat: GameState["seats"][number]; position: string; activeHand?: number }) {
  const displayHand = seat.hands[0];
  const score = displayHand ? handValue(displayHand.cards).total : null;
  return (
    <div className={`seat seat-${position}`}>
      <div className="seat-hands">
        {seat.hands.map((hand, index) => <HandCards key={`${seat.id}-${index}`} hand={hand} active={index === activeHand} />)}
      </div>
      <div className={`avatar avatar-${seat.tone}`}>{seat.initials}<span className="status-dot" /></div>
      <div className="seat-copy"><strong>{seat.name}</strong><span>{score ? `${score}${displayHand?.result ? ` · ${displayHand.result}` : ""}` : "WAITING"}</span></div>
    </div>
  );
}

function Advisor({ state, onClose }: { state: GameState; onClose: () => void }) {
  const hand = state.seats[4]?.hands[state.currentHand];
  const upcard = state.dealer[0];
  const allowed = allowedActions(state);
  const decision = hand && upcard && state.phase === "player" ? basicDecision(hand, upcard, allowed) : null;
  const value = hand ? handValue(hand.cards) : null;
  const confidence = decision === "surrender" ? 98 : decision === "split" ? 96 : 94;
  return (
    <aside className="advisor-panel" aria-live="polite">
      <div className="advisor-head"><div><span className="eyebrow">BASIC STRATEGY</span><h2>Best Decision</h2></div><button onClick={onClose} aria-label="Best Decision 패널 닫기">×</button></div>
      {decision && hand && upcard ? <>
        <div className="recommendation">
          <span className="rec-icon">{decision === "hit" ? "+" : decision === "stand" ? "■" : decision === "double" ? "×2" : decision === "split" ? "↔" : "½"}</span>
          <div><span>권장 행동</span><strong>{ACTION_LABELS[decision]}</strong></div>
          <span className="confidence">{confidence}%</span>
        </div>
        <p className="reason">{decisionReason(hand, upcard, decision)}</p>
        <div className="situation-grid">
          <div><span>MY HAND</span><strong>{value?.soft ? "SOFT " : "HARD "}{value?.total}</strong></div>
          <div><span>DEALER</span><strong>{upcard.rank}</strong></div>
        </div>
        <div className="rule-note"><span>i</span><p><strong>8-Deck · H17 · DAS</strong><br />Late Surrender · Blackjack 3:2</p></div>
      </> : <div className="advisor-empty"><span>◎</span><strong>다음 결정을 기다리는 중</strong><p>카드가 배분되면 최적 행동과 근거가 여기에 표시됩니다.</p></div>}
      <div className="advisor-foot"><span>※</span> 조언은 장기 기대값을 기준으로 하며, 개별 결과를 보장하지 않습니다.</div>
    </aside>
  );
}

export default function Home() {
  const [state, setState] = useState<GameState>(() => initialState());
  const [advisorOpen, setAdvisorOpen] = useState(true);
  const [sound, setSound] = useState(true);
  const [statsOpen, setStatsOpen] = useState(false);
  const allowed = useMemo(() => allowedActions(state), [state]);
  const remaining = state.shoe.length ? state.shoe.length - state.dealt : 416;
  const penetration = state.shoe.length ? Math.round((state.dealt / state.cutAt) * 100) : 0;
  const sessionProgress = Math.min(100, (state.stats.rounds / 2100) * 100);
  const profit = state.bankroll - state.startBankroll;

  function act(action: Action) { setState((current) => performAction(current, action)); }
  function deal() { setState((current) => startRound(current)); }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">B</span><div><strong>BLACKJACK</strong><small>8-DECK H17 · LIVE TABLE</small></div></div>
        <div className="session-clock"><span className="live-dot" /><div><small>30H SESSION</small><strong>ROUND {state.stats.rounds.toString().padStart(3, "0")} / 2,100</strong></div><div className="session-line"><i style={{ width: `${sessionProgress}%` }} /></div></div>
        <nav className="top-actions" aria-label="테이블 설정">
          <button className={advisorOpen ? "on" : ""} onClick={() => setAdvisorOpen((open) => !open)} aria-pressed={advisorOpen}><span>✦</span> BEST</button>
          <button onClick={() => setSound((on) => !on)} aria-label={sound ? "사운드 끄기" : "사운드 켜기"}>{sound ? "◖))" : "◖×"}</button>
          <button onClick={() => setStatsOpen((open) => !open)} aria-label="통계 열기">▥</button>
        </nav>
      </header>

      <section className={`game-layout ${advisorOpen ? "with-advisor" : ""}`}>
        <div className="table-column">
          <div className="table-meta">
            <div><span className="meta-icon">▰</span><p><small>SHOE</small><strong>{remaining} CARDS</strong></p></div>
            <div className="penetration"><span><small>PENETRATION</small><strong>{penetration}%</strong></span><div><i style={{ width: `${Math.min(100, penetration)}%` }} /></div></div>
            <div><p><small>TABLE RULES</small><strong>H17 · LS · DAS</strong></p><span className="info-icon">i</span></div>
          </div>

          <div className="casino-table">
            <div className="felt-rings" />
            <div className="table-rule"><span>BLACKJACK PAYS 3 TO 2</span><small>DEALER MUST HIT SOFT 17</small></div>
            <div className="dealer-zone">
              <div className="dealer-label"><span className="dealer-avatar">D</span><div><strong>DEALER</strong><small>{state.dealer.length ? (state.dealerRevealed ? handValue(state.dealer).total : handValue([state.dealer[0]]).total) : "STANDS ON HARD 17"}</small></div></div>
              <div className="dealer-hand">
                {state.dealer.map((card, index) => <Card key={card.id} card={card} hidden={!state.dealerRevealed && index === 1} index={index} />)}
                {!state.dealer.length && <div className="card-placeholder" />}
              </div>
            </div>

            {state.seats[0] && <SeatView seat={state.seats[0]} position="left-top" />}
            {state.seats[1] && <SeatView seat={state.seats[1]} position="left-bottom" />}
            {state.seats[2] && <SeatView seat={state.seats[2]} position="right-top" />}
            {state.seats[3] && <SeatView seat={state.seats[3]} position="right-bottom" />}
            {state.seats[4] && <SeatView seat={state.seats[4]} position="user" activeHand={state.phase === "player" ? state.currentHand : -1} />}

            {state.lastShuffle && state.stats.rounds === 0 && <div className="shuffle-toast">↻ NEW SHOE SHUFFLED</div>}
            <div className="table-message">{state.message}</div>
          </div>

          <div className="controls">
            <div className="bankroll-block"><span className="chip-stack">◉</span><div><small>YOUR BANKROLL</small><strong>{state.bankroll.toFixed(2)} <em>units</em></strong><span className={profit >= 0 ? "positive" : "negative"}>{profit >= 0 ? "+" : ""}{profit.toFixed(2)} session</span></div></div>
            <div className="action-buttons">
              {state.phase !== "player" ? <button className="deal-button" onClick={deal} disabled={state.bankroll < state.baseBet}><span>{state.stats.rounds ? "NEXT ROUND" : "DEAL CARDS"}</span><small>{state.baseBet} UNIT BET</small></button> : <>
                <button onClick={() => act("hit")} disabled={!allowed.hit}><span className="button-icon">＋</span><strong>HIT</strong><small>한 장 더</small></button>
                <button onClick={() => act("stand")} disabled={!allowed.stand}><span className="button-icon square">■</span><strong>STAND</strong><small>그대로</small></button>
                <button onClick={() => act("double")} disabled={!allowed.double}><span className="button-icon">×2</span><strong>DOUBLE</strong><small>베팅 두 배</small></button>
                <button onClick={() => act("split")} disabled={!allowed.split}><span className="button-icon">↔</span><strong>SPLIT</strong><small>페어 분할</small></button>
                <button className="danger" onClick={() => act("surrender")} disabled={!allowed.surrender}><span className="button-icon">½</span><strong>SURRENDER</strong><small>절반 포기</small></button>
              </>}
            </div>
            <div className="bet-block"><small>BET / HAND</small><div className="bet-stepper"><button onClick={() => setState((s) => updateBet(s, s.baseBet - 0.25))} disabled={state.phase === "player"}>−</button><strong>{state.baseBet}<span>u</span></strong><button onClick={() => setState((s) => updateBet(s, s.baseBet + 0.25))} disabled={state.phase === "player"}>＋</button></div><span>1 unit = ₩50,000</span></div>
          </div>
        </div>

        {advisorOpen && <Advisor state={state} onClose={() => setAdvisorOpen(false)} />}
      </section>

      {statsOpen && <div className="stats-drawer">
        <div className="drawer-head"><div><span className="eyebrow">SESSION ANALYTICS</span><h2>당신의 30시간 세션</h2></div><button onClick={() => setStatsOpen(false)}>×</button></div>
        <div className="stat-cards">
          <div><small>PROFIT / LOSS</small><strong className={profit >= 0 ? "positive" : "negative"}>{profit >= 0 ? "+" : ""}{profit.toFixed(2)}u</strong></div>
          <div><small>W / L / PUSH</small><strong>{state.stats.wins} / {state.stats.losses} / {state.stats.pushes}</strong></div>
          <div><small>MAX DRAWDOWN</small><strong>{state.stats.maxDrawdown.toFixed(2)}u</strong></div>
          <div><small>SHUFFLES</small><strong>{state.shuffleCount}</strong></div>
        </div>
        <div className="history"><h3>RECENT ROUNDS</h3>{state.history.length ? state.history.map((item) => <div key={item.round}><span>#{item.round.toString().padStart(3, "0")}</span><strong>{item.result}</strong><em className={item.delta >= 0 ? "positive" : "negative"}>{item.delta >= 0 ? "+" : ""}{item.delta.toFixed(1)}u</em><small>{item.balance.toFixed(1)}u</small></div>) : <p>플레이한 라운드가 아직 없습니다.</p>}</div>
      </div>}
    </main>
  );
}

