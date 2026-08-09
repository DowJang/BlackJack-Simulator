# Blackjack Live Table

실제 8덱 슈와 5인 테이블 흐름을 사용하는 인터랙티브 2D 블랙잭 시뮬레이터입니다. 사용자는 다섯 번째 좌석에서 직접 의사결정을 내리고, 나머지 네 좌석은 기본 전략으로 자동 플레이합니다.

## 구현 규칙

- 8 decks / 416 cards, 75% penetration with ±10-card cut variance
- Dealer H17, peek, late surrender, DAS
- Blackjack 3:2, maximum four split hands
- Resplit aces off, hit split aces off
- Four NPC players using full basic strategy
- Hit, stand, double, split, surrender controls
- Toggleable Best Decision advisor
- 30-hour / 2,100-round live session tracking

## 실행

```bash
npm install
npm run dev
```

검증은 `npm test`, 배포 빌드는 `npm run build`로 실행합니다.

GitHub Pages용 정적 번들은 `npm run build:pages`로 `docs/`에 생성됩니다. `main` 브랜치에 push하면 `.github/workflows/pages.yml`이 자동 배포합니다.
