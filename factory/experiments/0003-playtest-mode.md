# 0003 — 플레이테스트 모드

## 가설
웹에서 `?play=<규칙id>&seed=<n>&tier=<난이도>`로 등록된 어떤 규칙(echo, fam-*)이든 브라우저에서 즉석 생성해
데일리와 같은 UI로 플레이할 수 있게 하면, 오너가 후보 규칙(fam-d3-cheb-no2x2 등)을 링크 하나로 직접 만져볼 수 있다.
번들 증가는 생성기·솔버 코드(수 KB)뿐이라 gzip 30KB 예산 안에 든다.

## 측정
- e2e: 플레이 모드 1케이스(fam-d3-cheb-no2x2, easy)를 실제 브라우저에서 생성→풀이→승리 화면, 콘솔 에러 0.
- 같은 (규칙, seed, tier)는 Node와 브라우저에서 같은 퍼즐(결정성) — e2e가 Node에서 만든 정답으로 클릭해 승리하면 증명.
- 번들 JS gzip 크기 (0002: ~6KB).
- 브라우저 생성 시간 (easy/hard).

## 폐기 기준
- 번들 gzip > 30KB, 또는 데일리 e2e가 깨짐, 또는 플레이 모드 생성이 브라우저에서 5초를 넘는 경우(easy 기준).

## 결과 → **가설 채택**
- e2e 플레이테스트 케이스 통과: 브라우저 생성 단서 = Node 생성 단서(결정성 증명), Node 정답 클릭으로 승리, 콘솔 에러 0, 390px 가로 스크롤 없음.
- 번들 JS gzip 6KB → **8.27KB** (생성기·솔버·추론기 포함). 예산 30KB의 28%.
- 브라우저 생성 시간(ms, seed 1/2/3): fam-d3-cheb-no2x2 easy 7–9 · hard 176/142/200 · expert 100/136/128 · echo hard 874/317/164 · fam-d3-cheb-none hard 10/71/437. 전부 1초 미만.
- 부수 개선: 위반 칸 빨간 표시를 echo 전용(맞닿기) 코드에서 **모델 제약 기반 범용 판정**으로 교체 → no2x2 등 모든 전역 규칙에 자동 적용. 패밀리 규칙 설명을 사람이 읽는 문장으로. 긴 메타 문구에서 타이머 줄바꿈 버그 수정.

## 배운 것
- d=3 6×6 easy 퍼즐은 단서 10/36(28%)로, 7×7 테두리가 판 대부분을 덮어 "판 가장자리 세기"에 가깝다는 0002의 우려가 화면으로도 보인다 → 인지 부하 지표가 다음 우선순위로 맞다.
- 힌트 설명문은 아직 echo 문구("고리") 중심이라 다른 규칙에서도 대체로 통하지만, 규칙별 설명 훅(RuleSet.explain)이 있으면 더 낫다.

## 플레이 링크
- https://derrick1119.github.io/derrickkim1119/?play=fam-d3-cheb-no2x2&seed=1&tier=medium
- https://derrick1119.github.io/derrickkim1119/?play=fam-d3-cheb-none&seed=1&tier=medium
- https://derrick1119.github.io/derrickkim1119/?play=echo&seed=1&tier=medium (기준)
