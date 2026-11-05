# 공장 상태

상태: RUNNING
마지막 사이클: 0005 (2026-11-05, 상위 4개 재검증)
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

## 규칙 후보 (top.json, n=20 × 시드 집합 4개, 평균 ± sd)
| 규칙 | fitness | 상태 |
|---|---|---|
| fam-d1-cheb-notouch | 0.4832 ± 0.0040 | 점수 1위 — 지뢰찾기 변형류라 오리지널 판정 보류 |
| fam-d3-manh-notouch | 0.4829 ± 0.0012 | **오리지널 후보 1순위** (sd 최소) |
| fam-d2-manh-notouch | 0.4758 ± 0.0052 | 후보 (echo 대비 경계) |
| fam-d3-cheb-no2x2 | 0.4613 ± 0.0084 | 0002 1위였으나 운이었음 — 노이즈 안 |
| echo | 0.4399 ± 0.0182 | **출시 중** |

## 다음 할 일
BACKLOG 맨 위 `[ ]` — explore 기본을 다중 시드(n=10 × 2)로 바꾸고 sd 함께 보고.

## 오너에게
- **플레이테스트 모드가 생겼어요.** 아래 링크로 후보 규칙을 직접 풀어보고, 어느 쪽이 재미있는지 한 줄만 남겨주세요 (seed 숫자를 바꾸면 새 퍼즐).
  - 이전 1위(재검증 후 4위): https://derrick1119.github.io/derrickkim1119/?play=fam-d3-cheb-no2x2&seed=1&tier=medium
  - 후보 2위: https://derrick1119.github.io/derrickkim1119/?play=fam-d3-cheb-none&seed=1&tier=medium
  - **오리지널 후보 1순위**(마름모 고리+맞닿기 금지, 재검증으로 확정): https://derrick1119.github.io/derrickkim1119/?play=fam-d3-manh-notouch&seed=1&tier=medium
  - 현재 제품(비교용): https://derrick1119.github.io/derrickkim1119/?play=echo&seed=1&tier=medium
- 배포가 안 보이면 Settings → Pages → Source를 "GitHub Actions"로 설정해야 합니다.
