import assert from "node:assert/strict";
import test from "node:test";
import {
  basicDecision, dealerShouldHit, handValue, isBlackjack, makeShoe, outcome,
} from "../app/blackjack.ts";

let id = 0;
const card = (rank, suit = "♠") => ({ id: `t${id++}`, rank, suit });
const hand = (ranks, extra = {}) => ({ cards: ranks.map((rank) => card(rank)), bet: 1, status: "playing", ...extra });

test("creates a physical 8-deck, 416-card shoe", () => {
  const { cards, cutAt } = makeShoe();
  assert.equal(cards.length, 416);
  assert.ok(cutAt >= 302 && cutAt <= 322);
  assert.equal(cards.filter((item) => item.rank === "A").length, 32);
});

test("converts multiple aces without exceeding 21 unnecessarily", () => {
  assert.deepEqual(handValue([card("A"), card("A"), card("9")]), { total: 21, soft: true });
  assert.deepEqual(handValue([card("A"), card("6")]), { total: 17, soft: true });
  assert.deepEqual(handValue([card("10"), card("7")]), { total: 17, soft: false });
});

test("dealer hits soft 17 and stands on hard 17", () => {
  assert.equal(dealerShouldHit([card("A"), card("6")]), true);
  assert.equal(dealerShouldHit([card("10"), card("7")]), false);
});

test("recognizes only an unsplit two-card natural blackjack", () => {
  assert.equal(isBlackjack(hand(["A", "K"])), true);
  assert.equal(isBlackjack(hand(["A", "K"], { fromSplit: true })), false);
  assert.equal(isBlackjack(hand(["A", "5", "5"])), false);
});

test("settles blackjack, push, surrender and double-sized exposure", () => {
  assert.deepEqual(outcome(hand(["A", "K"]), [card("10"), card("8")]), { result: "BLACKJACK", delta: 1.5 });
  assert.deepEqual(outcome(hand(["10", "Q"]), [card("K"), card("J")]), { result: "PUSH", delta: 0 });
  assert.deepEqual(outcome(hand(["10", "6"], { status: "surrendered" }), [card("10"), card("7")]), { result: "SURRENDER", delta: -0.5 });
  assert.deepEqual(outcome(hand(["10", "9"], { bet: 2, status: "stood" }), [card("10"), card("8")]), { result: "WIN", delta: 2 });
});

test("follows H17 basic strategy priority", () => {
  assert.equal(basicDecision(hand(["10", "6"]), card("9")), "surrender");
  assert.equal(basicDecision(hand(["8", "8"]), card("10"), { surrender: false }), "split");
  assert.equal(basicDecision(hand(["10", "A"]), card("6")), "stand");
  assert.equal(basicDecision(hand(["6", "6"]), card("2")), "split");
  assert.equal(basicDecision(hand(["10", "2"]), card("4")), "stand");
  assert.equal(basicDecision(hand(["5", "4"]), card("3")), "double");
  assert.equal(basicDecision(hand(["5", "5"]), card("9")), "double");
});

