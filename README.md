# Take Your Time (천천히 와)

먼저 떠나는 사람이 남은 사람에게 건네는 한마디를 따라가는 짧은 이야기 게임입니다.
지금 들어 있는 것은 **프롤로그 「천천히 와」** 한 편이고, 5~6분이면 끝납니다.

## 실행

설치할 것이 없습니다. `index.html`을 브라우저로 열면 됩니다.
로컬 서버로 보고 싶다면:

```bash
python3 -m http.server 8000
```

그다음 `http://localhost:8000`을 엽니다. 소리를 켜고 가로 화면으로 보는 것을 권합니다.

## 프롤로그의 흐름

늦가을 병실. 레오가 몰래 레시피 공책을 쓰고 있습니다. 빛나는 물건을 만지면 기억이 펼쳐지고,
기억 하나가 끝날 때마다 창밖의 시간이 저녁에서 아침 쪽으로 한 칸씩 흐릅니다.

| 물건 | 기억 | 손으로 하는 일 | 떠오르는 약속 |
| --- | --- | --- | --- |
| 사진 | 처음 살던 좁은 집 | 벽을 옆으로 끌어 분필로 꿈꾸는 집을 그린다 | 마당 있는 넓은 집 |
| 레시피 공책 | 눈 오는 밤의 부엌 | 냄비를 둥글게 젓는다 | 평생 밥해주기 |
| 릴리의 그림 | 크레파스 그림 속 우리 집 | 그네를 당겼다 놓는다 | 릴리의 그네 |
| 빈의 목줄 | 저녁 언덕 산책 | 언덕을 끌어 길을 잇고, 밤하늘에 오로라를 그린다 | 오로라 보러 가기 |

네 기억을 다 보면 사진 뒷면에서 다섯 번째 약속 「같이 늙기」가 나오고,
아침이 되어 마지막 대화로 이어집니다.

조작은 마우스나 손가락으로 누르고 끄는 것이 전부입니다.
키보드로는 `Space`/`Enter`와 방향키로 모든 장면을 지날 수 있고, `M`은 소리를 끕니다.

## 구조

빌드 과정 없이 `<script>` 태그로 읽는 순수 캔버스 게임입니다. 그림과 음악은 모두 코드로 만듭니다.

```
index.html            화면 틀
src/core.js           화면 크기, 시간, 입력, 장면 전환
src/paint.js          손그림 느낌의 도형, 분필, 크레파스, 종이결, 글씨
src/figures.js        레오, 아나, 릴리, 빈을 그리는 인형 리그
src/audio.js          자장가 한 곡과 효과음 (전부 합성)
src/scenes/room.js    병실: 제목, 물건 고르기, 사진 뒷면, 마지막 대화
src/scenes/mem_*.js   기억 네 개
src/scenes/ending.js  약속 목록, 제목, 구름바다
tools/subset_fonts.py 글꼴을 쓰는 글자만 남겨 fonts.css로 묶기
```

주소 끝에 `#hub`, `#night`, `#dawn`, `#final`, `#home`, `#stew`, `#swing`, `#walk`, `#ending`을 붙이면
그 장면부터 볼 수 있습니다.

화면에 나오는 글자를 바꾸면 글꼴 묶음을 다시 만들어야 합니다.

```bash
pip install fonttools brotli
```

```bash
python3 tools/subset_fonts.py NanumPenScript-Regular.ttf GowunBatang-Regular.ttf
```

## 글꼴

손글씨는 나눔손글씨 펜(Nanum Pen Script), 본문은 고운바탕(Gowun Batang)에서
필요한 글자만 남긴 것입니다. 둘 다 SIL Open Font License 1.1을 따르며,
전문은 `assets/fonts/OFL-*.txt`에 있습니다.
