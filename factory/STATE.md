# 공장 상태

상태: RUNNING
마지막 사이클: 0004 (2026-11-04, 인지 부하 지표)
연속 실패: 0

## 제품
- **메아리 (Echo)** — 숫자는 두 칸 너머(5×5 테두리)의 칠한 칸 수. 칠한 칸은 맞닿을 수 없음.
- 데일리 은행: 2026-11-05 ~ 2027-01-03 (60일). 요일별 난이도: 월·화 쉬움 / 수·목 보통 / 금·토 어려움 / 일 지옥.
- 플레이테스트: `?play=<규칙id>&seed=<n>&tier=<easy|medium|hard|expert>` — 아무 규칙이나 브라우저 즉석 생성 (번들 gzip 8.27KB).
- 배포: `factory` 브랜치 → GitHub Pages (오너가 Settings → Pages → Source: GitHub Actions 설정 필요)

## 계기판 (echo, n=15) — fitness 0.4637 (v1 0.5202 × 부하 0.892)
| 난이도 | 크기 | 적중률 | 생성(ms) | 단서 밀도 | 기법 혼합 | 평균 점수 | 세는 칸 |
|---|---|---|---|---|---|---|---|
| easy | 6 | 1.00 | 4 | 0.307 | 0.00 | 15.7 | 9.4 |
| medium | 7 | 1.00 | 18 | 0.264 | 0.24 | 43.9 | 10.2 |
| hard | 7 | 0.93 | 917 | 0.239 | 0.27 | 61.1 | 10.3 |
| expert | 8 | 1.00 | 142 | 0.249 | 0.37 | 161.9 | 10.5 |

## 규칙 후보 (family.json, n=6, fitness v2 = 인지 부하 반영)
| 규칙 | fitness | v1 | 세는 칸 | 상태 |
|---|---|---|---|---|
| fam-d3-cheb-no2x2 | 0.4883 | 0.5748 | 11.1 | 후보 — 1~4위 동률(노이즈), 재검증 필요 |
| fam-d1-cheb-notouch | 0.4876 | 0.4876 | 6.4 | 후보 |
| fam-d3-manh-notouch | 0.4873 | 0.4873 | 7.3 | 후보 (신규 부상) |
| fam-d2-manh-notouch | 0.4862 | 0.4862 | 5.8 | 후보 |
| echo | 0.4632 | 0.5166 | 10.0 | **출시 중** |

## 다음 할 일
BACKLOG 맨 위 `[ ]` — 상위 4개 n=20 재검증 (현재 순위는 노이즈 안 동률).

## 오너에게
- **플레이테스트 모드가 생겼어요.** 아래 링크로 후보 규칙을 직접 풀어보고, 어느 쪽이 재미있는지 한 줄만 남겨주세요 (seed 숫자를 바꾸면 새 퍼즐).
  - 후보 1위: https://derrick1119.github.io/derrickkim1119/?play=fam-d3-cheb-no2x2&seed=1&tier=medium
  - 후보 2위: https://derrick1119.github.io/derrickkim1119/?play=fam-d3-cheb-none&seed=1&tier=medium
  - 신규 후보(마름모 고리+맞닿기 금지): https://derrick1119.github.io/derrickkim1119/?play=fam-d3-manh-notouch&seed=1&tier=medium
  - 현재 제품(비교용): https://derrick1119.github.io/derrickkim1119/?play=echo&seed=1&tier=medium
- 배포가 안 보이면 Settings → Pages → Source를 "GitHub Actions"로 설정해야 합니다.
