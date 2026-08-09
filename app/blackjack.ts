export type Suit = "♠" | "♥" | "♦" | "♣";
export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
export type Action = "hit" | "stand" | "double" | "split" | "surrender";
export type HandStatus = "playing" | "stood" | "busted" | "blackjack" | "surrendered";

export interface Card {
  id: string;
  rank: Rank;
  suit: Suit;
}

export interface Hand {
  cards: Card[];
  bet: number;
  status: HandStatus;
  fromSplit?: boolean;
  splitAces?: boolean;
  result?: string;
  delta?: number;
}

export interface Seat {
  id: string;
  name: string;
  initials: string;
  hands: Hand[];
  tone: string;
}

export interface HistoryItem {
  round: number;
  result: string;
  delta: number;
  balance: number;
}

export interface Stats {
  rounds: number;
  wins: number;
  losses: number;
  pushes: number;
  blackjacks: number;
  surrenders: number;
  doubles: number;
  splits: number;
  peak: number;
  maxDrawdown: number;
}

export interface GameState {
  shoe: Card[];
  dealt: number;
  cutAt: number;
  shuffleCount: number;
  seats: Seat[];
  dealer: Card[];
  dealerRevealed: boolean;
  phase: "ready" | "player" | "settled";
  currentHand: number;
  bankroll: number;
  startBankroll: number;
  baseBet: number;
  message: string;
  lastShuffle: boolean;
  history: HistoryItem[];
  stats: Stats;
}

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export const NPCS = [
  { id: "mina", name: "MINA", initials: "MI", tone: "coral" },
  { id: "james", name: "JAMES", initials: "JA", tone: "blue" },
  { id: "alex", name: "ALEX", initials: "AL", tone: "purple" },
  { id: "sora", name: "SORA", initials: "SO", tone: "amber" },
];

export function cardPoint(card: Card): number {
  if (card.rank === "A") return 11;
  if (["10", "J", "Q", "K"].includes(card.rank)) return 10;
  return Number(card.rank);
}

export function handValue(cards: Card[]): { total: number; soft: boolean } {
  let total = cards.reduce((sum, card) => sum + cardPoint(card), 0);
  let aces = cards.filter((card) => card.rank === "A").length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return { total, soft: aces > 0 };
}

export function isBlackjack(hand: Hand): boolean {
  return !hand.fromSplit && hand.cards.length === 2 && handValue(hand.cards).total === 21;
}

export function isPair(cards: Card[]): boolean {
  return cards.length === 2 && cardPoint(cards[0]) === cardPoint(cards[1]);
}

export function dealerUpValue(card?: Card): number {
  return card ? cardPoint(card) : 0;
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function makeShoe(): { cards: Card[]; cutAt: number } {
  const cards: Card[] = [];
  let id = 0;
  for (let deck = 0; deck < 8; deck += 1) {
    for (const suit of SUITS) {
      for (const rank of RANKS) cards.push({ id: `c${id++}`, rank, suit });
    }
  }
  // 75% penetration with a real-casino style ±10-card cut-card variance.
  const cutAt = Math.max(270, Math.min(350, 312 + Math.floor(Math.random() * 21) - 10));
  return { cards: shuffle(cards), cutAt };
}

export function initialState(): GameState {
  return {
    shoe: [], dealt: 0, cutAt: 312, shuffleCount: 0,
    seats: NPCS.map((npc) => ({ ...npc, hands: [] })),
    dealer: [], dealerRevealed: false, phase: "ready", currentHand: 0,
    bankroll: 100, startBankroll: 100, baseBet: 1,
    message: "베팅을 확인하고 첫 라운드를 시작하세요.", lastShuffle: false,
    history: [],
    stats: { rounds: 0, wins: 0, losses: 0, pushes: 0, blackjacks: 0, surrenders: 0, doubles: 0, splits: 0, peak: 100, maxDrawdown: 0 },
  };
}

function canSurrender(hand: Hand): boolean {
  return hand.cards.length === 2 && !hand.fromSplit;
}

export function basicDecision(hand: Hand, upcard: Card, available: Partial<Record<Action, boolean>> = {}): Action {
  const { total, soft } = handValue(hand.cards);
  const up = dealerUpValue(upcard);
  const firstTwo = hand.cards.length === 2;
  const allowed = (action: Action) => available[action] !== false;

  // 8-deck H17, DAS, late-surrender advisor.
  if (firstTwo && canSurrender(hand) && allowed("surrender") && !soft) {
    if (total === 16 && up >= 9) return "surrender";
    if (total === 15 && up === 10) return "surrender";
  }

  if (firstTwo && isPair(hand.cards) && allowed("split")) {
    const pair = cardPoint(hand.cards[0]);
    if (pair === 11 || pair === 8) return "split";
    if ([2, 3, 7].includes(pair) && up >= 2 && up <= 7) return "split";
    if (pair === 4 && up >= 5 && up <= 6) return "split";
    if (pair === 6 && up >= 2 && up <= 6) return "split";
    if (pair === 9 && ((up >= 2 && up <= 6) || up === 8 || up === 9)) return "split";
  }

  if (soft) {
    if (total <= 17) {
      const ranges: Record<number, [number, number]> = { 13: [5, 6], 14: [5, 6], 15: [4, 6], 16: [4, 6], 17: [3, 6] };
      const range = ranges[total];
      if (firstTwo && range && up >= range[0] && up <= range[1] && allowed("double")) return "double";
      return "hit";
    }
    if (total === 18) {
      if (firstTwo && up >= 2 && up <= 6 && allowed("double")) return "double";
      return up === 7 || up === 8 ? "stand" : "hit";
    }
    if (total === 19 && firstTwo && up === 6 && allowed("double")) return "double";
    return "stand";
  }

  if (total <= 8) return "hit";
  if (total === 9) return firstTwo && up >= 3 && up <= 6 && allowed("double") ? "double" : "hit";
  if (total === 10) return firstTwo && up >= 2 && up <= 9 && allowed("double") ? "double" : "hit";
  if (total === 11) return firstTwo && allowed("double") ? "double" : "hit";
  if (total === 12) return up >= 4 && up <= 6 ? "stand" : "hit";
  if (total <= 16) return up >= 2 && up <= 6 ? "stand" : "hit";
  return "stand";
}

export function decisionReason(hand: Hand, upcard: Card, action: Action): string {
  const { total, soft } = handValue(hand.cards);
  const up = upcard.rank;
  const names: Record<Action, string> = { hit: "히트", stand: "스탠드", double: "더블", split: "스플릿", surrender: "서렌더" };
  if (action === "surrender") return `딜러 ${up}에 맞선 하드 ${total}은 장기 손실을 절반으로 제한하는 편이 유리합니다.`;
  if (action === "split") return `이 페어는 한 손으로 유지하기보다 두 번의 유리한 출발점으로 나누는 편이 좋습니다.`;
  if (action === "double") return `${soft ? "소프트" : "하드"} ${total}은 딜러 ${up}에 대해 한 장만 받고 베팅을 늘릴 가치가 있습니다.`;
  if (action === "stand") return `현재 ${total}은 딜러 ${up}에 비해 추가 카드의 버스트 위험이 더 큽니다.`;
  return `딜러 ${up}에 비해 ${total}은 충분하지 않아 한 장 더 받는 것이 기본 전략입니다.`;
}

function draw(state: GameState): Card {
  const card = state.shoe[state.dealt];
  state.dealt += 1;
  return card;
}

function settleStatus(hand: Hand): Hand {
  const value = handValue(hand.cards).total;
  if (value > 21) return { ...hand, status: "busted" };
  if (isBlackjack(hand)) return { ...hand, status: "blackjack" };
  return hand;
}

function playNpcHand(state: GameState, hand: Hand, allHands: Hand[]): Hand[] {
  let current = settleStatus({ ...hand, cards: [...hand.cards] });
  if (current.status !== "playing") return [current];
  while (current.status === "playing") {
    const action = basicDecision(current, state.dealer[0], {
      surrender: false,
      split: allHands.length < 4 && !(current.fromSplit && current.cards[0].rank === "A"),
    });
    if (action === "split" && allHands.length < 4) {
      const aceSplit = current.cards[0].rank === "A";
      const left: Hand = { cards: [current.cards[0], draw(state)], bet: 1, status: aceSplit ? "stood" : "playing", fromSplit: true, splitAces: aceSplit };
      const right: Hand = { cards: [current.cards[1], draw(state)], bet: 1, status: aceSplit ? "stood" : "playing", fromSplit: true, splitAces: aceSplit };
      return [...playNpcHand(state, left, [...allHands, right]), ...playNpcHand(state, right, [...allHands, left])].slice(0, 4);
    }
    if (action === "hit") {
      current.cards.push(draw(state));
      current = settleStatus(current);
      continue;
    }
    if (action === "double") {
      current.bet *= 2;
      current.cards.push(draw(state));
      current = settleStatus({ ...current, status: "stood" });
      continue;
    }
    current.status = "stood";
  }
  return [current];
}

function dealerPlay(state: GameState): void {
  state.dealerRevealed = true;
  while (true) {
    const { total, soft } = handValue(state.dealer);
    if (dealerShouldHit(state.dealer)) state.dealer.push(draw(state));
    else break;
  }
}

export function dealerShouldHit(cards: Card[]): boolean {
  const { total, soft } = handValue(cards);
  return total < 17 || (total === 17 && soft);
}

export function outcome(hand: Hand, dealer: Card[]): { result: string; delta: number } {
  const playerTotal = handValue(hand.cards).total;
  const dealerTotal = handValue(dealer).total;
  const dealerBj = dealer.length === 2 && dealerTotal === 21;
  if (hand.status === "surrendered") return { result: "SURRENDER", delta: -hand.bet / 2 };
  if (hand.status === "busted" || playerTotal > 21) return { result: "BUST", delta: -hand.bet };
  if (isBlackjack(hand)) return dealerBj ? { result: "PUSH", delta: 0 } : { result: "BLACKJACK", delta: hand.bet * 1.5 };
  if (dealerBj) return { result: "LOSE", delta: -hand.bet };
  if (dealerTotal > 21 || playerTotal > dealerTotal) return { result: "WIN", delta: hand.bet };
  if (playerTotal === dealerTotal) return { result: "PUSH", delta: 0 };
  return { result: "LOSE", delta: -hand.bet };
}

function settleRound(state: GameState, dealerNatural = false): GameState {
  if (!dealerNatural) dealerPlay(state);
  else state.dealerRevealed = true;
  const user = state.seats[4];
  let roundDelta = 0;
  const labels: string[] = [];
  user.hands = user.hands.map((hand) => {
    const result = outcome(hand, state.dealer);
    roundDelta += result.delta;
    labels.push(result.result);
    // Bets were removed as actions occurred; return the unlost stake plus profit.
    if (result.delta === 0) state.bankroll += hand.bet;
    else if (result.delta > 0) state.bankroll += hand.bet + result.delta;
    else if (result.result === "SURRENDER") state.bankroll += hand.bet / 2;
    return { ...hand, ...result };
  });
  for (let i = 0; i < 4; i += 1) {
    state.seats[i].hands = state.seats[i].hands.map((hand) => ({ ...hand, ...outcome(hand, state.dealer) }));
  }
  const stats = { ...state.stats, rounds: state.stats.rounds + 1 };
  for (const hand of user.hands) {
    if (hand.result === "WIN") stats.wins += 1;
    if (hand.result === "BLACKJACK") { stats.wins += 1; stats.blackjacks += 1; }
    if (["LOSE", "BUST"].includes(hand.result || "")) stats.losses += 1;
    if (hand.result === "PUSH") stats.pushes += 1;
    if (hand.result === "SURRENDER") stats.surrenders += 1;
  }
  stats.peak = Math.max(stats.peak, state.bankroll);
  stats.maxDrawdown = Math.max(stats.maxDrawdown, stats.peak - state.bankroll);
  state.stats = stats;
  state.phase = "settled";
  state.message = roundDelta > 0 ? `+${roundDelta.toFixed(1)} 유닛 승리` : roundDelta < 0 ? `${roundDelta.toFixed(1)} 유닛 손실` : "푸시 — 베팅금 반환";
  state.history = [{ round: stats.rounds, result: labels.join(" · "), delta: roundDelta, balance: state.bankroll }, ...state.history].slice(0, 8);
  return { ...state };
}

export function startRound(source: GameState): GameState {
  const state: GameState = structuredClone(source);
  if (state.bankroll < state.baseBet) return { ...state, message: "최소 베팅금이 부족합니다." };
  let shuffled = false;
  if (!state.shoe.length || state.dealt >= state.cutAt || state.shoe.length - state.dealt < 50) {
    const next = makeShoe();
    state.shoe = next.cards;
    state.cutAt = next.cutAt;
    state.dealt = 0;
    state.shuffleCount += 1;
    shuffled = true;
  }
  state.seats = [...NPCS.map((npc) => ({ ...npc, hands: [{ cards: [], bet: 1, status: "playing" as HandStatus }] })), { id: "user", name: "YOU", initials: "ME", tone: "green", hands: [{ cards: [], bet: state.baseBet, status: "playing" }] }];
  state.dealer = [];
  state.dealerRevealed = false;
  state.currentHand = 0;
  state.bankroll -= state.baseBet;
  state.lastShuffle = shuffled;
  // Casino order: one card around the table, dealer, then repeat.
  for (let pass = 0; pass < 2; pass += 1) {
    for (const seat of state.seats) seat.hands[0].cards.push(draw(state));
    state.dealer.push(draw(state));
  }
  for (let i = 0; i < 4; i += 1) {
    const seed = state.seats[i].hands[0];
    state.seats[i].hands = playNpcHand(state, seed, [seed]);
  }
  const userHand = settleStatus(state.seats[4].hands[0]);
  state.seats[4].hands[0] = userHand;
  state.phase = "player";
  state.message = shuffled ? "새 8덱 슈를 셔플했습니다." : "당신의 차례입니다.";
  const dealerNatural = state.dealer.length === 2 && handValue(state.dealer).total === 21;
  const peek = [10, 11].includes(dealerUpValue(state.dealer[0]));
  if (dealerNatural && peek) return settleRound(state, true);
  if (userHand.status === "blackjack") return settleRound(state);
  return { ...state };
}

function nextOrSettle(state: GameState): GameState {
  const next = state.seats[4].hands.findIndex((hand, index) => index > state.currentHand && hand.status === "playing");
  if (next >= 0) {
    state.currentHand = next;
    state.message = `분할 핸드 ${next + 1}을 플레이하세요.`;
    return { ...state };
  }
  return settleRound(state);
}

export function allowedActions(state: GameState): Record<Action, boolean> {
  const hand = state.seats[4]?.hands[state.currentHand];
  const active = state.phase === "player" && hand?.status === "playing";
  return {
    hit: Boolean(active), stand: Boolean(active),
    double: Boolean(active && hand.cards.length === 2 && state.bankroll >= hand.bet),
    split: Boolean(active && isPair(hand.cards) && state.seats[4].hands.length < 4 && state.bankroll >= hand.bet && !(hand.fromSplit && hand.cards[0].rank === "A")),
    surrender: Boolean(active && canSurrender(hand)),
  };
}

export function performAction(source: GameState, action: Action): GameState {
  const state: GameState = structuredClone(source);
  const allowed = allowedActions(state);
  if (!allowed[action]) return state;
  const hands = state.seats[4].hands;
  let hand = hands[state.currentHand];
  if (action === "hit") {
    hand.cards.push(draw(state));
    hand = settleStatus(hand);
    hands[state.currentHand] = hand;
    if (hand.status === "busted" || handValue(hand.cards).total === 21) {
      if (handValue(hand.cards).total === 21) hand.status = "stood";
      return nextOrSettle(state);
    }
    state.message = "한 장 더 받았습니다. 다음 결정을 선택하세요.";
    return { ...state };
  }
  if (action === "stand") {
    hand.status = "stood";
    return nextOrSettle(state);
  }
  if (action === "surrender") {
    hand.status = "surrendered";
    return nextOrSettle(state);
  }
  if (action === "double") {
    state.bankroll -= hand.bet;
    state.stats.doubles += 1;
    hand.bet *= 2;
    hand.cards.push(draw(state));
    hand = settleStatus({ ...hand, status: "stood" });
    hands[state.currentHand] = hand;
    return nextOrSettle(state);
  }
  // split
  state.bankroll -= hand.bet;
  state.stats.splits += 1;
  const aceSplit = hand.cards[0].rank === "A";
  const left: Hand = { cards: [hand.cards[0], draw(state)], bet: hand.bet, status: aceSplit ? "stood" : "playing", fromSplit: true, splitAces: aceSplit };
  const right: Hand = { cards: [hand.cards[1], draw(state)], bet: hand.bet, status: aceSplit ? "stood" : "playing", fromSplit: true, splitAces: aceSplit };
  hands.splice(state.currentHand, 1, left, right);
  if (aceSplit) return nextOrSettle(state);
  state.message = "핸드를 나눴습니다. 첫 번째 핸드부터 플레이하세요.";
  return { ...state };
}

export function updateBet(state: GameState, bet: number): GameState {
  if (state.phase === "player") return state;
  if (!Number.isFinite(bet)) return state;
  const safe = Math.round(Math.max(1, Math.min(500, bet)) * 4) / 4;
  return { ...state, baseBet: safe, message: `기본 베팅을 ${safe} 유닛으로 설정했습니다.` };
}
