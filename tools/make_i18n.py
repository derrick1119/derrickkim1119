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
        # ---- chapter 2: Bram and the handcart
    ("주춧돌 놓을 자리는 봐 뒀나?", "Picked out where the cornerstones go?"),
    ("돌을 어디서 구해야 할지 모르겠어요.", "I don't know where to find the stones."),
    ("바닷가에 둥근 돌이 많아.", "Plenty of round stones down by the shore.\nYou'll not get them up alone. Take my cart."),
    ("나도 처음엔 혼자 다 하려고 했지.", "I tried to do it all alone at first, too."),
    ("선장님은 왜 배를 지으세요?", "Captain, why do you build a boat?"),
    ("바다에 나갔다가 못 돌아왔어.", "I went out to sea and never came back.\nThirty-two, I was."),
    ("그 사람은 아직 저쪽에 있고.", "She's still over there.\nI'm building it to take her out when she comes."),
    ("…육십 년이나요?", "…For sixty years?"),
    ("기다리는 동안 손이 놀면,", "Leave your hands idle while you wait,\nand your heart gives out first."),
    ("자네도 뭐든 지어. 천천히.", "Build something, son. Take your time."),
    # ---- chapter 3: the saw, the storm, the rope, Rosa
    ("기둥 될 나무는 바다에서 건져 왔네.", "Fished the timber for the posts out of the sea."),
    ("배 짓는 거나 집 짓는 거나,", "Boat or house, sawing's the same.\nPush hard, and rest on the pull."),
    ("손이 제법이야.", "You've got the hands for it."),
    ("…삼 년을 지은 건데.", "…Three years of work."),
    ("밤새 바람이 엄청났지.", "What a wind that was last night."),
    ("줄 가져왔네.", "Brought rope.\nNo sense grunting at it on your own."),
    ("나도 당길래!", "I want to pull too!"),
    ("다 같이 하면 금방이야.", "All together, it won't take a minute."),
    ("…고맙습니다.", "…Thank you."),
    ("고마우면 나랑 호수 좀 같이 가 줘.", "If you're grateful, come to the lake with me.\nI'd rather not look on my own today."),
    ("로사, 실바구니, 등불을 좌우로 끌어 보세요.", "Slide Rosa, the yarn basket and the lamp along the bank. Each shadow settles when it finds its place."),
    ("로사의 아들, 72", "Rosa's son, 72"),
    ("백일도 못 넘기고 두고 왔어.", "I left him before he was a hundred days old.\nAnd look, he's a grandfather."),
    ("아이고, 울지 마라….", "Oh, hush now, don't cry…."),
    ("그가 자장가를 흥얼거린다.", "He hums a lullaby. Tap Rosa to hum along."),
    ("저 담요… 백일 때 내가 떠 준 거야.", "That blanket… I knitted it for his hundredth day."),
    ("아직도 갖고 있었네.", "He still has it."),
    ("그 사람도 언젠가 오겠죠.", "He'll come one day too."),
    ("다 늙어서 오겠지.", "An old man, he'll be.\nI'll still know him in a heartbeat."),
    ("너도 아나 보고 가렴.", "Go on, see Ana too."),
    # ---- chapter 4: Bean, Bram's wife, Rosa's son
    ("저건… 무지개 다리구나.", "That's… the rainbow bridge."),
    ("짐승들은 배를 안 타고,", "Animals don't come by boat.\nThey run down that."),
    ("빈… 너 왜 이렇게 늙었어.", "Bean… when did you get so old?"),
    ("빈도 두고 온 사람이 있지.", "Bean left someone behind too.\nCome."),
    ("빈, 공, 등불을 좌우로 끌어 보세요.", "Slide Bean, the ball and the lamp along the bank. Each shadow settles when it finds its place."),
    ("릴리, 11", "Lily, 11"),
    ("릴리가 빈을 부른다.", "Lily is calling Bean. Tap Bean on the bank to answer."),
    ("들었지? 빈이 대답한 거야.", "Did you hear? That was Bean answering."),
    ("닿지는 않아도,", "It never reaches them,\nbut something gets across, it seems."),
    ("망치를 어디 뒀더라….", "Where did I put the mallet…."),
    ("모자는 또 어디 갔지?", "And where's my cap got to?"),
    ("…뼈다귀는 누구 거야?", "…And whose bone is that?"),
    ("자네, 나랑 호수 좀 같이 가 주겠나.", "Would you come to the lake with me?"),
    ("오늘이 그 사람 생일이야.", "It's her birthday today."),
    ("브램, 배, 등불을 좌우로 끌어 보세요.", "Slide Bram, the boat and the lamp along the bank. Each shadow settles when it finds its place."),
    ("마르타, 98", "Marta, 98"),
    ("서른둘에 두고 왔는데,", "I left her at thirty-two,\nand she's ninety-eight."),
    ("저 노래…", "That song…\nshe sang it every time a boat went in."),
    ("마르타의 박자에 맞춰,", "Keep time with Marta: tap Bram to knock on the boat."),
    ("…곧 오겠구먼.", "…She'll be along soon."),
    ("그 사람 오면,", "When she comes,\nhelp me put the boat in, will you."),
    ("네. 꼭요.", "I will. I promise."),
    ("육십 년 동안", "Sixty years,\nand all you did was build a boat?"),
    ("오늘은 꼭 그 애일 것 같아.", "I've a feeling it's him today."),
    # ---- chapter 5: the roof
    ("마룻대 올린다며?", "Putting up the ridge beam?\nThat's no job for one."),
    ("우리 배 띄울 때", "You helped us\nput our boat in."),
    ("어머니가 그러시더라고요.", "Mother says\nthe whole town raises a roof."),
    ("이번엔 나 맨 앞!", "I'm at the front this time!"),
    ("이제 지붕이 생겼어.", "There's a roof on it now."),
    ("아나 오면", "Ana won't get rained on\nwhen she comes."),
    ("빈 방엔 뭘 들일 거야?", "What'll you put in the spare room?"),
    ("…그건 아나가 정하게 둘래요.", "…I'll leave that to Ana."),
    # ---- chapter 6 and the last chapter
    ("등불, 냄비, 레오를 좌우로 끌어 보세요. 이번에도", "Slide the lamp, the pot and Leo along the bank. Once more, each shadow settles when it finds its place."),
    ("아나가 스튜를 젓는다.", "Ana stirs the stew. Tap Leo's pot to stir along with her."),
    ("…이번엔 웃네.", "…She smiles, this time."),
    ("어서 와라, 아가.", "Welcome, dear.\nThank you for taking your time."),
    ("…어머님?", "…You're his mother?"),
    ("우리 레오,", "Thank you\nfor making my Leo laugh so."),
    ("얘기 많이 들었어요!", "We've heard all about you!"),
    ("집 짓는 거,", "We watched him build it,\nevery beam."),
    ("…이 사람, 혼자가 아니었네요.", "…So he wasn't on his own."),
    # ---- the years, the dream, the jobs of work
    ("마중 나루에 온 지", "Since he came to Welcome Harbor"), ("년", "years"), ("아나, ", "Ana, "),
    ("꿈속에서는 아무것도 제자리에 있지 않아요.", "Nothing in a dream stays where it belongs. Tap the floating things to put them back."),
    ("숨이 턱까지 찼어요.", "Out of breath. Rest a moment, then push."),
    ("숨", "Breath"),
    ("눌러서 돌을 밀어 올리세요.", "Tap to push the stone uphill. When you run out of breath, rest a moment."),
    ("톱은 밀고 당기기예요.", "A saw goes push and pull. Tap the other side."),
    ("왼쪽, 오른쪽을 번갈아 눌러 통나무를 켜세요", "Tap left and right in turn to saw through the log."),
    ("혼자서는 꿈쩍도 안 해요.", "It won't budge for one. All together, on \"Three!\""),
    ("하나", "One"), ("둘", "Two"), ("셋!", "Three!"),
    ("「셋!」에 맞춰 눌러서,", "Tap on \"Three!\" so everyone pulls it up together."),
    ("꼬리가 세차게 흔들려요.", "His tail is going like mad. It's right next to him."),
    ("꼬리가 살랑거려요.", "His tail is wagging. Not far now."),
    ("빈이 고개를 갸웃해요.", "Bean tilts his head. Not here."),
    ("풀숲을 눌러 빈을 보내세요.", "Tap a tuft of grass to send Bean. The closer he is, the harder he wags."),
    ("레오 아저씨, 종이 울렸어!", "Mr Leo, the bell rang!\nIt's my mom and dad this time. I just know it."),
    ("그래. 등불 켜 드리자.", "Then let's light the lamps for them."),
    ("엄마! 아빠!", "Mom! Dad!"),
    ("…우리 피피, 그대로구나.", "…Our Pippi. Just the same."),
    ("나 기다리는 동안", "While I waited,\nI helped Mr Leo build his house!"),
    ("…고맙습니다.\n우리 애랑", "…Thank you,\nfor playing with our girl."),
    ("제가 도움을 받았는걸요.", "She's the one who helped me."),
    ("피피의 엄마", "Pippi's mom"), ("피피의 아빠", "Pippi's dad"),
    # ---- the harbour's rule, his mother crossing
    ("…아빠는요?", "…And Dad?"),
    ("네 아빠는 먼저 건너갔지.", "Your dad crossed over first.\nPast the cloud sea. He said he'd build a house there and wait."),
    ("여긴 기다릴 사람이 있는 동안만 머무는 데란다.", "You only stay here while there's someone still to come.\nOnce you've met them all, you cross."),
    ("이제 건너가세.", "Time we crossed.\nThere's no one left to wait for."),
    ("저도 집사람 기다리는 중이라,", "I'm waiting for my wife too,\nso I've hands to spare."),
    ("이제 나도 건너가야겠다.", "It's time I crossed too."),
    ("…벌써요?", "…Already?"),
    ("넌 이제 혼자서도 기다릴 수 있잖니.", "You can wait on your own now.\nYou've Rosa, and Bean, and that house."),
    ("조금만 더 있다 가면 안 돼요?", "Can't you stay a little longer?"),
    ("네 아빠도 그렇게 말하더라.", "Your dad said that too.\nAnd still he went first, to build a house and wait."),
    ("…천천히 가요.", "…Take your time going."),
    ("그래. 넌 천천히 와.", "I will. And you take your time coming."),
    ("…꿈에서 한 말을,", "…Lily must have remembered\nwhat I said in that dream."),
    ("어서 와요.", "Welcome.\nYou took your time."),
    ("…다들 이 사람을 아세요?", "…You all know him?"),
    # ---- Pipi
    ("아저씨 집 지어?", "Are you building a house?\nCan I watch?"),
    ("…넌 누구니?", "…And who are you?"),
    ("피피. 일곱 살 때 왔어.", "Pippi. I came when I was seven.\nI'm waiting for my mom and dad."),
    ("피피는 여기 꽤 오래 있었지.", "Pippi's been here a good while.\nThirty years, is it."),
    ("아저씨는 누구 기다려?", "Who are you waiting for?"),
    ("아나. 내 아내.", "Ana. My wife."),
    ("그럼 나랑 같이 기다리면 되겠다.", "Then we can wait together.\nSo it's not boring."),
    ("그래. 약속.", "All right. Promise."),
    ("히히. 찾아봐!", "Hee hee. Find them!\nI hid them in the grass somewhere."),
    ("망치는 팻말 바로 밑 풀숲에 숨겼어.", "The mallet's in the grass right under the sign."),
    ("모자는 등불이랑 나무 사이.", "The cap's between the lamp and the tree. Under where you eat."),
    ("나무 밑은 아니야.", "Not under the tree. One step past it, towards the sea."),
    ("빈 반칙이야!", "Bean's cheating!\nNo finding things with your nose!"),
    ("…그럼 뼈다귀는 누구 거야?", "…Then whose is the bone?"),
    ("그건 빈 선물.", "That's for Bean.\nHe was on our side today."),
    ("엄마!", "Mom!"), ("아빠는?", "Where's Dad?"),
    ("아빠는 아직이야.", "Not yet.\nHe'll raise the grandchildren first, and take his time."),
    ("그럼 이제 엄마랑 같이 기다리면 되겠다.", "Then now you and I can wait together."),
    ("나 그동안 레오 아저씨 집 짓는 거 도왔다?", "I helped Mr Leo build his house the whole time!\nI pulled the frame, and the roof too."),
    ("…고맙습니다.\n우리 애 곁에", "…Thank you,\nfor staying by our girl."),
    ("망치", "the mallet"), ("모자", "the cap"), ("세 번째 보물", "treasure number three"), ("피피의 힌트", "Pippi's clue"),
    ("힌트에 맞는 풀숲을 눌러 빈을 보내세요.", "Tap the tuft the clue points to and send Bean. The closer he is, the harder he wags."),
    # ---- dream ingredients
    ("저 김, 담아 두렴.", "Keep that steam.\nIt's a scent Ana knows. It will be useful one day."),
    ("아저씨, 이거.", "Mr Leo, here.\nA firefly I caught last night. For when you go somewhere dark."),
    ("이거 가져가. 저 자장가 한 소절.", "Take this. A line of that lullaby.\nAna will sing it to her girl too."),
    ("그 사람이 아는 냄새, 아는 소리,", "A scent she knows, a sound she knows,\nand a light to find the way. With all three, you can go into a dream."),
    ("쓰고 나면 또 모으면 되지.", "Once they're spent, you gather them again.\nToday's the day to spend them."),
    # ---- Bram's planks, Rosa's blanket, the notebook
    ("그 손 좀 빌리세.", "Lend me those hands.\nI've planks to bend, and I can't time the steam alone."),
    ("이 배가 뜨는 날,", "The day this boat goes in,\nyou be there."),
    ("그 애 오면 덮어 줄 새 담요를 뜨는데,", "I'm knitting a new blanket for when he comes,\nand I keep forgetting the stripes."),
    ("같이 떠요. 제가 같이 봐 둘게요.", "We'll knit it together. I'll remember them with you."),
    ("그 애 담요 줄무늬, 기억나?", "Remember the stripes on his blanket?\nI keep mixing up the order."),
    ("됐다. 이제 그 애만 오면 돼.", "There. Now he only has to come."),
    ("브램 선장의 배 띄우는 것 돕기", "Help Captain Bram launch his boat"), ("피피랑 같이 기다리기", "Wait with Pippi"),
    ("로사의 새 담요 같이 뜨기", "Knit Rosa's new blanket with her"), ("아나의 스튜 똑같이 끓이기", "Cook Ana's stew just as she does"),
    ("여기서 한 약속", "Promises made here"),
    ("그 애의 담요", "his blanket"), ("옛 담요의 줄무늬를 잘 봐 두세요", "Look closely at the old blanket's stripes"),
    ("기억한 차례대로 실을 눌러 한 줄씩 뜨세요", "Tap the yarn in the order you remember, a row at a time"),
    ("그 줄이 아니에요. 한 번 더 보여 줄게요", "Not that row. Here it is again."),
    ("아직 덜 쪘어요.", "Not steamed enough. The plank springs back."),
    ("너무 오래 쪘어요.", "Steamed too long. The plank has cracked."),
    ("김이 초록 칸에 들어오면 눌러서 꺼내세요", "When the heat is in the green, tap to take it out"),
    ("눌러서 판자를 김에 쬐기 시작하세요", "Tap to start steaming the plank"),
    # ---- cooking
    ("감자, 당근, 양파, 토마토.", "Potatoes, carrots, onion, tomatoes.\nIn the order Ana puts them in."),
    ("아나가 넣던 차례대로 재료를 눌러 넣으세요", "Tap the ingredients in the order Ana puts them in"),
    ("불은 약하게, 오래오래.", "Low heat, a long time.\nThen a little salt."),
    ("토마토 다음엔 불을 눌러", "After the tomatoes, tap the fire to turn it down; once it has simmered, add the salt"),
    ("작년처럼 끓여 보세요", "Cook it like last year"),
    ("공책대로 끓이고, 처음 보는 풀은 맨 마지막에 넣으세요", "Follow the notebook, and put the new herb in last of all"),
    ("감자", "potatoes"), ("당근", "carrots"), ("양파", "onion"), ("토마토", "tomatoes"), ("소금", "salt"), ("처음 보는 풀", "the new herb"), ("빵", "bread"),
    ("불을 약하게 줄였어요", "Heat turned down"), ("불을 세게 올렸어요", "Heat turned up"),
    ("공책에 “불은 약하게,", "The notebook says \"low heat, a long time\". Turn the fire down first."),
    ("아직이에요. 약한 불에서", "Not yet. Let it simmer on low a while."),
    ("그 풀은 맨 마지막이에요.", "That herb goes in last. Ana put it in just before taking it off the heat."),
    ("아나는 그걸 이때 넣지 않았어요.", "Ana didn't put that in now. Look at the order in the notebook."),
    ("공책에 적은 차례대로 재료를 눌러 넣으세요", "Tap the ingredients in the order written in the notebook"),
    # ---- the lake's places, the bell's variations, names
    ("로사는 요람 옆 빈 걸상에,", "Rosa on the empty stool by the cradle, the yarn basket at its foot, the lamp in the dark window. Slide them onto the dotted shapes."),
    ("빈은 릴리 옆 늘 앉던 계단에,", "Bean on the step by Lily where he always sat, the ball in the grass, the lamp in the dark porch light. Slide them onto the dotted shapes."),
    ("브램은 마르타 옆 빈 의자에,", "Bram in the empty chair by Marta, the boat on the sill by the old one, the lamp in the dark lighthouse. Slide them onto the dotted shapes."),
    ("등불은 창에, 냄비는 아나의 화구에,", "The lamp in the window, the pot on Ana's stove, Leo where he always sat on the counter. Slide them onto the dotted shapes."),
    ("등불은 깜깜한 창에,", "The lamp in the dark window, the pot on Ana's pot, Leo where he always sat on the counter. Slide them along the bank onto the dotted shapes."),
    ("떠나보낼 때는 거꾸로예요. 마지막에 울린 등불부터", "To see someone off, answer backwards: the last lamp first."),
    ("등불이 자리를 바꿨어요. 울린 등불을 따라가 보세요", "The lamps have changed places. Follow the ones that rang."),
    ("떠나보낼 때는 거꾸로, 마지막에 울린 등불부터 눌러 주세요", "To see someone off, answer backwards: tap the last lamp first"),
    ("등불이 자리를 바꿨어요. 울린 등불을 따라 같은 차례로 눌러 주세요", "The lamps have changed places. Follow the ones that rang, in the same order"),
    ("이웃 할아버지", "Old neighbor"), ("빵집 아주머니", "The baker"), ("목수 아저씨", "The carpenter"),
    ("마르타", "Marta"), ("로사의 아들", "Rosa's son"), ("피피", "Pippi"), ("집배원", "Postman"),
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
    const y = /^(\\d+)년$/.exec(s);
    if (y) return y[1] === '1' ? '1 year' : y[1] + ' years';
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
            if len(cand) > 1:
                raise SystemExit(f"no single source string for {ko!r}: {cand}")
            if not cand:
                print(f"   (unused row, no longer in the game: {ko!r})")
                continue
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
