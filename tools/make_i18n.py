#!/usr/bin/env python3
"""Write src/i18n.js from the table below.

Each row is (Korean as written in the source, or its unique beginning; English; optional size factor).
Run from the repository root:  python3 tools/make_i18n.py
It checks every row against the strings actually present in src/ and lists the ones with no English.
"""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
LIT = re.compile(r"'((?:[^'\\\n]|\\.)*)'|\"((?:[^\"\\\n]|\\.)*)\"")
HAN = re.compile(r"[가-힣]")


def source_strings():
    seen = []
    for f in sorted((ROOT / "src").rglob("*.js")):
        if f.name in ("i18n.js", "devmenu.js"):   # the test menu is not shipped, and stays in Korean
            continue
        for ln in f.read_text(encoding="utf-8").split("\n"):
            if "T.announce(" in ln or ln.strip().startswith("/*") or ln.strip().startswith("*"):
                continue
            for m in LIT.finditer(ln):
                s = (m.group(1) or m.group(2) or "").replace("\\n", "\n").replace("\\'", "'")
                if HAN.search(s) and s not in seen:
                    seen.append(s)
    return seen


T = [
    # ---- title, menus, hints
    ("천천히 와", "Take Your Time", 0.62), ("화면을 눌러 시작", "Tap to begin"), ("소리를 켜면 더 좋아요", "Better with the sound on"),
    ("장 바로 가기", "CHAPTERS"), ("눌러서 이어하기 · ", "Tap to continue · "), ("처음부터 시작하기", "Start from the beginning"),
    ("프롤로그", "Prologue"), ("1장 「항구」", "Chapter 1: The Harbor"), ("2장 「약속 목록」", "Chapter 2: The List"), ("3장 「꿈」", "Chapter 3: The Dream"),
    ("4장 「이웃들」", "Chapter 4: The Neighbors"), ("5장 「꽃길」", "Chapter 5: The Flower Road"), ("6장 「다 지킨 약속」", "Chapter 6: Promises Kept"),
    ("마지막 장 「마중」", "Last Chapter: Welcome"),
    ("1장", "Chapter 1", 0.86), ("2장", "Chapter 2", 0.86), ("3장", "Chapter 3", 0.86), ("4장", "Chapter 4", 0.86), ("5장", "Chapter 5", 0.86),
    ("6장", "Chapter 6", 0.86), ("마지막 장", "Last Chapter", 0.86),
    ("1장 끝", "End of Chapter 1"), ("2장 끝", "End of Chapter 2"), ("3장 끝", "End of Chapter 3"), ("4장 끝", "End of Chapter 4"),
    ("5장 끝", "End of Chapter 5"), ("6장 끝", "End of Chapter 6"),
    ("프롤로그 끝", "End of the Prologue"), ("끝", "The End"), ("이어서 보기", "Continue"), ("처음으로 돌아가기", "Back to the beginning"),
    ("처음부터 다시 보기", "Watch again from the start"),
    ("항구", "The Harbor", 0.9), ("약속 목록", "The List"), ("꿈", "The Dream", 0.8), ("이웃들", "The Neighbors", 0.72), ("꽃길", "The Flower Road", 0.56),
    ("다 지킨 약속", "Promises Kept", 0.9), ("마중", "Welcome"), ("마중 나루", "Welcome Harbor", 0.8), ("약속", "PROMISES"),
    ("빛나는 것을 만져 보세요", "Tap what glows"), ("릴리의 손을 잡아 주세요", "Take Lily's hand"), ("공책을 펼쳐 보세요", "Open the notebook"),
    ("꾹 누른 채로, 릴리 곁을 걸어 주세요", "Press and hold to walk beside Lily"),
    ("늦가을, 병실", "Late autumn. A hospital room."),
    ("레오는 아나 몰래, 남기고 갈 레시피를 적고 있다", "In secret, Leo is writing down the recipes he will leave for Ana"),
    ("장례를 마친 밤", "The night after the funeral"),
    # ---- names
    ("레오", "Leo"), ("아나", "Ana"), ("릴리", "Lily"), ("브램 선장", "Captain Bram"), ("로사", "Rosa"),
    ("레오와 아나", "Leo and Ana"), ("엄마", "Mom"), ("아빠", "Dad"), ("빈", "Bean"), ("나", "me"),
    # ---- prologue
    ("언젠가, 마당 있는 넓은 집에서 살자.", "Someday, a big house with a yard.", 0.84), ("평생 밥은 내가 해줄게.", "I'll cook for you, all my life.", 0.86),
    ("아빠가 그네 만들어줄게.", "Daddy will build you a swing.", 0.86), ("오로라, 꼭 같이 보러 가자.", "Let's go and see the northern lights, together.", 0.64),
    ("넓은 부엌", "a big kitchen", 0.8), ("마당", "a yard"), ("더 높이!", "Higher!"),
    ("우리,\n같이 늙자.", "Let's grow old\ntogether.", 0.74),
    ("내가 어릴 적, 엄마가 돌아가실 때", "When I was little, and my mom was dying,\nshe told me something."),
    ("먼저 가서 넓은 집도 짓고,", "That she'd go on ahead and build a big house,\nand have plenty of good things cooking."), ("그러니까 천천히 오라고.", "So I should take my time."),
    ("어린 내가 울까 봐 한 말이었겠지.", "I suppose she only said it so I wouldn't cry.\nBut I was less afraid because of it."),
    ("나도 먼저 가서 그렇게 해놓을게.", "I'll go on ahead and do the same.\nSo we can be happy there, when you come."), ("…엄마 말이, 정말이면 좋겠다.", "…I hope what Mom said is true."),
    ("…여긴 어디지?", "…Where is this?"), ("…설마.", "…It can't be."), ("…엄마?", "…Mom?"), ("엄마… 그 말, 진짜였어?", "Mom… what you told me. It was true?\nI thought you only said it so I wouldn't cry."), ("나도 그런 줄 알았지.", "So did I.\nThen I got here, and here it was."),
    ("…아나한테도 똑같이 말하고 왔는데.", "…I told Ana the very same thing."), ("그럼 이제 지키면 되지.", "Then now you keep it."),
    ("그러니까…", "So…  take your time."),
    ("약속했다.", "That's a promise, then.\nA big house. Good food."), ("응, 약속.", "A promise."),
    ("마당 있는 넓은 집", "A big house with a yard", 0.74), ("평생 밥해주기", "Always cook for you", 0.8), ("오로라 보러 가기", "See the northern lights", 0.74),
    ("릴리의 그네", "A swing for Lily", 0.8), ("같이 늙기", "Grow old together", 0.8),
    # ---- chapter 1
    ("레오표 스튜", "Leo's Stew"), ("감자 셋", "Three potatoes"), ("당근 둘", "Two carrots"), ("양파 하나", "An onion"), ("토마토 넷", "Four tomatoes"),
    ("약한 불에, 오래오래", "Low heat, nice and slow", 0.8), ("소금은 조금만!", "Less salt!"), ("끼니 거르지 마.", "Don't skip meals.", 0.9),
    ("왜 이렇게 빨리 왔니.", "Why have you come so soon?"), ("천천히 오라고 했는데.", "I told you to take your time."),
    ("여긴 마중 나루란다.", "This is Welcome Harbor. Those who came first\nwait here for the ones still to come."),
    ("브램 선장은 배를 짓는단다.", "Captain Bram is building a boat\nto take his wife out in. Sixty years now."),
    ("로사는 아들 줄 담요를 뜨지.", "Rosa is knitting a blanket for her son.\nEveryone here is making something for someone."),
    ("저기가 네 자리야.", "That spot is yours.\nFor when your someone comes."),
    # ---- chapter 2
    ("오늘로 꼭 일 년이구나.", "A year ago today.\nCome with me, if you want to see her."),
    ("소금을 두 번 넣었네.", "She salted it twice."), ("아나가 한 대로, 레오의 냄비에도 소금을 두 번 넣어 주세요", "Do as Ana did: tap Leo's pot to salt it, twice."), ("기다리는 장면에서는 화면을 길게 누르거나 톡톡 두드리면 빨리 지나가요", "Where a scene is only passing time, hold the screen down or tap to move it along."), ("볼 수는 있어도, 닿지는 않아.", "You can look. You cannot reach them."),
    ("기둥의 등불, 냄비, 레오를 좌우로 끌어 보세요.", "Slide the lamp post, the pot and Leo along the bank. Each shadow settles when it finds its place."),
    ("올해도 호수에서 본 대로 끓였어, 빈.", "Made it the way I watched her make it, Bean. Same as every year."),
    ("…올해는 뭘 넣은 거지? 내 공책엔 없는 건데.", "…What did she put in this year?\nThat isn't in my notebook."),
    ("종이 사람 때문에만 울리는 건 아니란다.", "The bell doesn't only ring for people.\nWhat someone needs to tell you comes by boat too."),
    ("이 호수엔 두고 온 사람들이 비친단다.", "This lake shows the ones we left behind.\nIt's where I watched you grow up."),
    # ---- chapter 3
    ("꿈으로 한 번은 다녀올 수 있단다.", "You may visit her once, in a dream.\nOnly once. Keep it for the day it is needed."),
    ("혼자서는 못 하겠어.", "I can't do this alone."), ("할 수 있어.", "You can."),
    ("릴리랑 맛있는 거 많이 먹고, 많이 웃고,", "Eat well with Lily. Laugh a lot.\nAnd tell me all of it, later."),
    ("그 말, 진짜였어.", "It was true, what I told you.\nI'm over there, building our house."), ("천천히 와.", "Take your time."),
    # ---- chapter 4
    ("종이 울리면 누가 오는 거란다.", "When the bell rings, someone is coming.\nWho it is, we find out on the pier."),
    ("저 애는 집 보러 온 게 아니라", "He didn't come to see the house.\nHe came to see you."),
    ("그 사람은 원래 뭐든 천천히 했어.", "She always did take her time."), ("우리 아기.", "My baby."), ("같이 늙자고 했는데.", "We said we would grow old together."),
    # ---- chapter 5
    ("아빠,", "Dad,"), ("나 결혼해.", "I'm getting married.", 0.56), ("보러 와 줄 거지?", "You'll come, won't you?", 0.8),
    
    # ---- chapter 6
    ("아나표 스튜", "Ana's Stew"), ("토마토는 넉넉히", "Plenty of tomatoes", 0.9), ("불은 약하게, 오래오래", "Low heat, nice and slow", 0.82),
    ("처음 보는 풀 한 줌", "A handful of something new", 0.76), ("이번엔 내가 배운다", "This time I learn from her", 0.74),
    # ---- last chapter
    ("우리 집", "Our home"),
    ("엄마 먼저 가서, 아빠랑 맛있는 거 해놓을게.", "I'll go on ahead, and Dad and I\nwill have something good on the table."),
    ("그러니까 천천히 와.", "So take your time."), ("…당신, 왜 이렇게 늙었어?", "…Look at you. When did you get so old?"),
    ("같이 늙자며.", "You said we would grow old together."), ("기다리는 동안…", "While I waited… I did so many things for you."),
    ("내가 끓인 게 더 맛있는데?", "Mine tastes better, you know."), ("알아. 45년 동안 따라 끓였어.", "I know. I've been copying yours for 45 years."),
    ("릴리 방도 만들어야지.", "We'll need a room for Lily, too."),
    # ---- puzzles
    ("종이 부르는 차례를 한 번 더 들어 보세요", "Listen to the bell once more."), ("같은 차례로 등불을 눌러 대답해 주세요", "Answer the bell. Tap the lanterns in the same order."),
    ("종이 부르는 차례를 들어 보세요", "Listen to the bell."),
    ("줄보다 솟거나 꺼진 돌이 있어요.", "A stone stands above the string, or falls short. Tap a placed stone to lift it out."),
    ("돌마다 높이가 달라요.", "Every stone is a different height. Set them so all four tops meet the string."),
    ("그건 아직 받쳐 줄 것이 없어요", "Nothing is standing yet to carry that one."),
    ("아래에서부터, 서로 받쳐 주는 차례대로 세워 주세요", "Build from the ground up. A timber can go up only once its support is standing."),
    ("맨 나중에 감긴, 가장 위의 고리부터 풀려요", "It comes off from the top: the last turn first."),
    ("감긴 차례를 거꾸로 따라가며,", "Tap the posts to unwind the rope, last turn first."),
    ("반쯤 닮았어요.", "Halfway there. One of the two is right."), ("전혀 다른 빛깔이에요", "Nothing like it."),
    ("두 가지를 골라 넣어 보세요.", "Choose two to put in. The yellow dots show how near it looks to Ana's, down in the lake."),
    ("앞에서부터 되풀이되는 차례를 살펴보세요", "Look at how the flowers repeat from the start."),
    ("꽃이 놓이는 차례를 보고,", "Read the order of the flowers and choose what fills the gap."),
    ("고리를 눌러 돌려 주세요.", "Tap a ring to turn it. An outer ring carries the inner one along."),
    ("물결의 고리를 눌러 돌려서,", "Turn the rings in the water until the picture is whole."),
    # ---- settings and system
    ("설정", "SETTINGS"), ("음악", "Music"), ("효과음과 주변 소리", "Effects and ambience"), ("전체 화면 켜기 / 끄기", "Full screen: on / off"),
    ("닫고 계속하기", "Back to the story"), ("저장을 지우고 처음부터", "Erase my progress and start over"),
    ("정말 지울까요? 한 번 더 누르면 지워져요", "Really erase it? Tap once more to confirm"),
    ("소리 켜기", "Turn sound on"), ("소리 끄기", "Turn sound off"),
    ("잠깐 문제가 있었지만 계속 진행합니다.", "Something went wrong for a moment; carrying on. (tap to close)\n"),
]

HEAD = """/* Take Your Time — a second language. Written by tools/make_i18n.py: edit the table there, not this file.
   Every string the game draws passes through T.tr on its way to the screen; in English it is looked up
   here by its Korean original, and some lines are set a little smaller because they run longer. */
(function () {
  'use strict';
  const T = window.TYT;
  const EN = %s;
  /* hand-lettered lines that need less room than they were given */
  const SMALLER = %s;
  const saved = (T.store.get('tyt-set') || {}).lang;
  T.lang = saved || ((navigator.language || 'ko').toLowerCase().startsWith('ko') ? 'ko' : 'en');
  T.tr = function (s) {
    if (T.lang !== 'en' || typeof s !== 'string') return s;
    if (EN[s] != null) return EN[s];
    const m = /^아나, (\\d+)$/.exec(s);
    if (m) return 'Ana, ' + m[1];
    if (s === 'TAKE YOUR TIME') return '천천히 와';
    if (s === 'WELCOME HARBOR') return '마중 나루';
    return s;
  };
  T.trScale = (s) => (T.lang === 'en' && SMALLER[s]) || 1;
  /* what is read aloud: a line with no English yet is left unsaid rather than said in the wrong language */
  const say = T.announce;
  T.announce = function (text) {
    if (T.lang === 'en') { const e = T.tr(text); if (e === text && /[\\uac00-\\ud7a3]/.test(text)) return; text = e; }
    say(text);
  };
  T.setLang = function (lang) {
    T.lang = lang === 'en' ? 'en' : 'ko';
    document.documentElement.lang = T.lang;
    const turn = document.getElementById('turn'), stage = document.getElementById('stage');
    if (turn) turn.textContent = T.lang === 'en' ? 'Turn the screen sideways for a wider view.' : '화면을 가로로 돌리면 더 넓게 볼 수 있어요.';
    if (stage) stage.setAttribute('aria-label', T.lang === 'en' ? 'Take Your Time. A story that begins in a hospital room in late autumn and goes on to the harbor of those who came first.' : 'Take Your Time, 천천히 와. 늦가을 병실에서 시작해 먼저 온 사람들의 항구로 이어지는 이야기.');
    if (T.P && T.P.clearLayout) T.P.clearLayout();
  };
  T.setLang(T.lang);
})();
"""


def main():
    keys = source_strings()
    out, scale, used = {}, {}, set()
    for row in T:
        ko = row[0]
        if ko not in keys:
            cand = [k for k in keys if k.startswith(ko)]
            if len(cand) != 1:
                raise SystemExit(f"no single source string for {ko!r}: {cand}")
            ko = cand[0]
        out[ko] = row[1]
        used.add(ko)
        if len(row) > 2:
            scale[ko] = row[2]
    missing = [k for k in keys if k not in used and not re.fullmatch(r"아나, \d+", k)]
    (ROOT / "src" / "i18n.js").write_text(HEAD % (json.dumps(out, ensure_ascii=False, indent=1), json.dumps(scale, ensure_ascii=False)), encoding="utf-8")
    print(f"{len(out)} strings in English; {len(missing)} left in Korean")
    for k in missing:
        print("  ", k.replace("\n", "\\n"))


if __name__ == "__main__":
    main()
