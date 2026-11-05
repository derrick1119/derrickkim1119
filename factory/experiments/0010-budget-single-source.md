# 0010 — 생성 예산 단일 출처

## 가설
생성 예산(attempts)이 generator 기본값 40, build-bank 80, abtest·explore·reverify 각자 상수 40으로 흩어져 있어
0008의 '평가 ≠ 제품' 착시가 다시 생길 수 있다. `engine/generator.ts`에 PLAY/BANK/EVAL 상수를 두고
모든 곳이 그것만 쓰게 하면, **수치는 하나도 바뀌지 않으면서**(리팩터링) 테스트가 '평가 예산 = 플레이테스트 예산 ≤ 은행 예산'을 지킨다.

## 측정
- 전후 동일성: `evaluateRules(fam-d1-xline-notouch, n=6)` fitness·fun이 변경 전과 소수점까지 같다.
- 새 테스트: EVAL_ATTEMPTS === PLAY_ATTEMPTS, BANK_ATTEMPTS ≥ EVAL_ATTEMPTS, evaluateRules 기본값 = EVAL_ATTEMPTS.

## 폐기 기준
- 전후 수치가 다르면 되돌린다 (리팩터링이 동작을 바꿨다는 뜻).

## 결과 → **채택**
- 전후 동일: fam-d1-xline-notouch n=6 fitness 0.5046 / fun 0.676 → 0.5046 / 0.676.
- `engine/generator.ts`에 PLAY_ATTEMPTS=40 · BANK_ATTEMPTS=80 · EVAL_ATTEMPTS=PLAY. build-bank·evaluate·abtest·explore·reverify가 모두 이것을 씀. 흩어진 숫자 40/80 리터럴 0개.
- 새 테스트 1개 (총 54개 통과).
