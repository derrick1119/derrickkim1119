# 앱 출시 안내 — 안드로이드 · iOS

「쉿! UFO」를 구글 플레이와 앱 스토어에 올리는 방법입니다. 웹 게임(`dist/`)을 [Capacitor](https://capacitorjs.com/) 로 감싸 앱으로 만들고,
보상형 광고는 **AdMob**(`@capacitor-community/admob`), 인앱 결제는 **RevenueCat**(`@revenuecat/purchases-capacitor`)으로 처리합니다.
대상 연령은 **12세 이상**(어린이 대상 앱이 아님)입니다.

> 상품 ID 같은 식별자는 영어 그대로 둡니다. 스토어·AdMob·RevenueCat 화면 이름은 2026년 11월 기준이며, 메뉴 이름은 조금씩 바뀔 수 있습니다.

## 0. 한눈에 보기

이 저장소에 이미 들어 있는 것과 직접 해야 하는 것입니다.

| 항목 | 저장소에 들어 있음 | 직접 할 일 |
| --- | --- | --- |
| Capacitor 8 프로젝트 | `capacitor.config.json`, `android/`, `ios/` (Swift Package Manager) | 앱 ID 정하기(1단계) |
| 앱 아이콘·시작 화면 | 안드로이드 적응형 아이콘, iOS 아이콘(1024), 시작 화면 그림 | 바꾸고 싶으면 「아이콘·스플래시 다시 만들기」 |
| AdMob 앱 ID | Google **테스트** 앱 ID (Android `…~3347511713`, iOS `…~1458002511`) | 내 AdMob 앱 ID 로 교체(3단계) |
| 보상형 광고 단위 | Google **테스트** 보상형 단위 | 내 광고 단위 ID 로 교체, `testMode: false` |
| 광고 동의(UMP)·ATT | 코드 완료(동의 → ATT → SDK 시작 → 광고 미리 불러오기) | AdMob 에서 동의 메시지 만들기 |
| SKAdNetwork·ATT 문구 | Info.plist (Google 목록 50개, 한/영 문구) | 미디에이션을 켜면 그 네트워크 ID 추가 |
| RevenueCat | 코드 완료 | 프로젝트·상품·권한 만들고 공개 SDK 키 넣기(4단계) |
| 서명 | `android/keystore.properties` 를 읽는 설정 | 업로드 키 만들기, Xcode 팀 선택 |
| 스토어 등록 | 이 문서의 답안(연령 등급·데이터 보안·개인정보 표시) | 계정·결제·세금 정보, 스크린샷, 개인정보처리방침 게시 |

설정 파일 위치 요약

| 무엇 | 파일 |
| --- | --- |
| 앱 ID·이름·시작 화면·상태 표시줄 | `capacitor.config.json` |
| 광고 단위·RevenueCat 키·시험 모드 | `src/monetize/config.js` |
| 광고·결제 코드 | `src/monetize/providers/native.js` |
| AdMob 앱 ID(안드로이드) | `android/app/src/main/res/values/strings.xml` 의 `admob_app_id` |
| AdMob 앱 ID·ATT 문구·SKAdNetwork(iOS) | `ios/App/App/Info.plist`, `ios/App/App/ko.lproj/InfoPlist.strings`, `en.lproj/InfoPlist.strings` |
| 버전·서명·미디에이션(안드로이드) | `android/app/build.gradle` |

## 준비물

- **Node.js 22 이상** (Capacitor 8 이 요구합니다. 웹 빌드만 하면 20 도 됩니다.)
- **안드로이드**: [Android Studio](https://developer.android.com/studio) 최신 안정판(JDK 21 포함), Google Play Console 개발자 계정(등록비 25달러, 1회)
- **iOS**: macOS 와 **Xcode 26 이상**, Apple Developer Program(연회비). iOS 앱은 Mac 에서만 빌드할 수 있습니다.
- **AdMob** 계정(광고 수익 지급을 위해 결제·세금 정보 입력 필요)
- **RevenueCat** 계정(무료 구간부터 시작 가능)
- 개인정보처리방침을 올릴 **공개 웹 주소**(예: GitHub Pages). 초안은 [`docs/privacy-policy.md`](privacy-policy.md).

> **구글 플레이 개인 개발자 계정 주의**: 2023년 11월 이후에 만든 *개인* 계정은 프로덕션(정식) 출시 전에 **비공개 테스트에 테스터 12명 이상이 14일 연속** 참여해야 합니다. 일정을 잡을 때 2주 이상을 따로 잡으세요.

## 1. 앱 ID 정하기 (가장 먼저)

지금 앱 ID 는 임시 값 **`com.shhufo.game`** 입니다. 스토어에 한 번 올리면 바꿀 수 없으니, 내 도메인을 거꾸로 쓴 고유한 값(예: `com.mystudio.shhufo`)으로 먼저 바꾸세요.
아래 네 곳을 같은 값으로 바꾸면 됩니다(자바 패키지 폴더 `com/shhufo/game` 과 `namespace` 는 코드 이름일 뿐이라 그대로 둬도 됩니다).

1. `capacitor.config.json` → `"appId"` (맨 위 `"//"` 설명 줄은 지워도 됩니다)
2. `android/app/build.gradle` → `applicationId "…"`
3. `android/app/src/main/res/values/strings.xml` → `package_name`, `custom_url_scheme`
4. iOS: Xcode 에서 App 타깃 › **Signing & Capabilities** › Bundle Identifier (또는 `ios/App/App.xcodeproj/project.pbxproj` 의 `PRODUCT_BUNDLE_IDENTIFIER` 두 곳)

## 2. 빌드 흐름

```bash
npm install            # Capacitor·AdMob·RevenueCat 플러그인 포함
npm run cap:sync       # 웹 빌드(npm run build) 후 android/ · ios/ 에 복사하고 플러그인 갱신
npm run cap:android    # 빌드 → 안드로이드만 동기화 → Android Studio 열기
npm run cap:ios        # 빌드 → iOS 만 동기화 → Xcode 열기 (Mac)
```

- 게임 코드를 고친 뒤에는 항상 `npm run cap:sync`(또는 `cap:android`/`cap:ios`)를 다시 실행해야 앱에 반영됩니다.
- 복사할 때 `package.json` 의 `capacitor:copy:after` 훅이 앱에서는 쓰지 않는 `sw.js`(서비스 워커)와 `shh-ufo.html`(파일 하나짜리 판, 약 3 MB)을 앱 묶음에서 뺍니다. 웹 배포용 `dist/` 는 그대로입니다.
- 앱은 웹 파일을 앱 안에 품고 있으므로 오프라인에서도 열립니다. 광고·결제만 인터넷이 필요합니다.
- **버전 올리기**: 안드로이드는 `android/app/build.gradle` 의 `versionCode`(올릴 때마다 +1)와 `versionName`, iOS 는 Xcode › App 타깃 › General 의 Version(`MARKETING_VERSION`)과 Build(`CURRENT_PROJECT_VERSION`, 올릴 때마다 +1).

### 웹 화면 설정(capacitor.config.json)

- 배경색 `#2f62cf`(게임 첫 화면 하늘색)로 시작 화면 → 게임 사이가 깜빡이지 않게 했습니다.
- `SystemBars`: 상태 표시줄 글자는 밝게(`DARK` 스타일), 화면 가장자리까지 그리고(`viewport-fit=cover`), 안전 영역은 CSS `env(safe-area-inset-*)`로 처리합니다(`styles/main.css` 의 `--safe-top`, `--safe-bottom`).
- `SplashScreen`: 0.8초 뒤 자동으로 사라집니다(게임 자체의 「기체 예열 중…」 화면이 이어받음).
- iOS 는 화면 튕김(스크롤)을 껐습니다. 세로 화면 전용입니다(안드로이드 매니페스트 `screenOrientation="portrait"`, iOS Info.plist).

## 3. AdMob (보상형 광고)

### 3-1. 앱과 광고 단위 만들기

1. [AdMob](https://admob.google.com/) › **앱 › 앱 추가** 를 안드로이드·iOS 각각 한 번씩. 스토어에 올리기 전이면 「아니요(아직 등록 안 됨)」로 만들고, 출시 뒤 스토어와 연결합니다.
2. 각 앱의 **앱 ID**(`ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY`, 물결표 `~`)를 넣습니다.
   - 안드로이드: `android/app/src/main/res/values/strings.xml` 의 `admob_app_id`
   - iOS: `ios/App/App/Info.plist` 의 `GADApplicationIdentifier`
   - 앱 ID 가 틀리거나 빠지면 앱이 시작하자마자 종료됩니다.
3. 각 앱에 **광고 단위 › 보상형** 을 하나씩 만듭니다. 보상 설정은 「보상 수량 1, 보상 항목 `reward`」면 충분합니다(보상 크기는 게임 규칙이 정합니다).
   광고 단위 ID(`ca-app-pub-…/…`, 빗금 `/`)를 `src/monetize/config.js` 의 `admob.rewarded.android` / `ios` 에 넣습니다.
4. 출시 빌드 전에 `src/monetize/config.js` 의 **`testMode` 를 `false`** 로 바꿉니다.
   `testMode: true` 인 동안은 설정한 광고 단위와 상관없이 Google 테스트 광고 단위만 씁니다.
5. **app-ads.txt**: 스토어 등록 정보에 적은 개발자 웹사이트의 최상위 경로(`https://내도메인/app-ads.txt`)에 AdMob 이 알려 주는 한 줄을 올립니다.
   `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`
   (없으면 광고 수익이 크게 줄 수 있습니다.)
6. **차단 관리**(선택): 12세 이상 대상이므로 앱이 광고 등급을 `T(청소년)`까지로 이미 제한합니다(`maxAdContentRating: Teen`). 필요하면 AdMob › 차단 관리 › 민감한 카테고리에서 도박·데이트 등을 더 막습니다.
7. 결제·세금 정보(개인은 W-8BEN 등)를 넣어야 수익을 받을 수 있습니다.

### 3-2. 개인정보 동의(UMP)와 앱 추적 투명성(ATT)

앱은 시작할 때마다 다음 순서로 동작합니다(`providers/native.js`).

1. **동의 정보 확인**(Google UMP). 동의가 필요한 지역(유럽 경제 지역·영국·스위스, 미국 일부 주 등)에서 아직 동의하지 않았으면 Google 동의 창을 띄웁니다.
2. **iOS: ATT 알림**(아직 묻지 않았을 때만). 문구는 `ko.lproj` / `en.lproj` 의 `InfoPlist.strings`.
3. **AdMob 시작**: `tagForChildDirectedTreatment: false`, `tagForUnderAgeOfConsent: false`, `maxAdContentRating: Teen`.
4. 보상형 광고 한 편을 **미리 불러 둡니다**. 광고를 본 뒤에도 바로 다음 한 편을 불러 둡니다.

이 과정은 게임 시작을 막지 않도록 뒤에서 진행됩니다. 동의하지 않았거나 광고가 없으면 광고 버튼은 「광고를 불러오지 못함」으로 끝나고, 게임은 그대로 진행됩니다.

AdMob 에서 할 일

- **개인정보 보호 및 메시지 › GDPR 메시지**를 만들고 게시합니다(유럽 사용자에게 필요). 메시지의 광고 파트너 목록에 미디에이션 네트워크를 넣어야 합니다.
- **미국 주 규정 메시지**도 만들기를 권합니다.
- **IDFA 안내 메시지**(선택): 켜면 UMP 가 ATT 알림 앞에 설명 화면을 먼저 보여 주고 ATT 알림도 UMP 가 띄웁니다. 앱은 이미 물었는지 확인한 뒤에만 묻기 때문에 둘 다 켜도 두 번 묻지 않습니다.
- 동의가 필요한 지역의 사용자에게는 게임 설정 화면에 「광고 개인정보 설정」 버튼이 있어야 합니다. 공급자가 `consent.required()` / `consent.showOptions()` 를 제공하고, 수익화 서비스의 `privacyOptionsRequired` / `showPrivacyOptions()` 로 이어집니다.

### 3-3. 미디에이션 — AppLovin · ironSource (선택, 지금은 꺼져 있음)

AdMob 이 중개자(미디에이터)가 되어 다른 네트워크의 보상형 광고와 경쟁시키면 채움률·단가가 오를 수 있습니다. 처음에는 AdMob 만으로 시작하고, 사용자가 늘면 켜는 것을 권합니다.

> 「AppLovin MAX」는 AppLovin 자체의 미디에이션 플랫폼입니다. 여기서는 **AdMob 을 미디에이터로 두고 AppLovin·ironSource 를 네트워크(어댑터)로 추가**하는 방법을 설명합니다. MAX 를 주 미디에이터로 쓰려면 다른 SDK·플러그인이 필요합니다.

1. 각 네트워크 계정을 만들고 앱·광고 단위(보상형)를 만듭니다.
2. AdMob › **미디에이션 › 미디에이션 그룹 만들기**(형식: 보상형, 플랫폼별) › 광고 소스 추가(AppLovin, ironSource Ads) › 네트워크의 키·광고 단위 입력.
3. **안드로이드**: `android/app/build.gradle` 맨 아래 주석 처리된 줄을 풀고 버전을 맞춥니다.
   ```gradle
   implementation 'com.google.ads.mediation:applovin:<버전>'
   implementation 'com.google.ads.mediation:ironsource:<버전>'
   ```
   ironSource 는 `android/build.gradle` 의 `allprojects { repositories { … } }` 에 `maven { url 'https://android-sdk.is.com/' }` 도 넣습니다.
   버전은 Google 문서([AppLovin](https://developers.google.com/admob/android/mediation/applovin), [ironSource](https://developers.google.com/admob/android/mediation/ironsource))의 최신 값을 씁니다.
4. **iOS**: 이 프로젝트는 Swift Package Manager 를 씁니다. `ios/App/CapApp-SPM/Package.swift` 는 Capacitor 가 덮어쓰므로 고치지 말고,
   Xcode › App 프로젝트 › **Package Dependencies › +** 로 Google 이 안내하는 어댑터 패키지를 App 타깃에 추가합니다([AppLovin iOS](https://developers.google.com/admob/ios/mediation/applovin), [ironSource iOS](https://developers.google.com/admob/ios/mediation/ironsource) 문서의 「Swift Package Manager」 항목).
   CocoaPods 로 쓰려면 iOS 프로젝트를 CocoaPods 방식으로 다시 만든 뒤(「iOS: CocoaPods 로 바꾸기」) `ios/App/Podfile` 의 `target 'App'` 안에 넣습니다.
   ```ruby
   # pod 'GoogleMobileAdsMediationAppLovin'
   # pod 'GoogleMobileAdsMediationIronSource'
   ```
5. 각 네트워크가 안내하는 **SKAdNetwork ID** 를 `Info.plist` 의 `SKAdNetworkItems` 에 이어 넣습니다(중복은 빼도 되고 그대로 둬도 됩니다).
6. **app-ads.txt** 에 각 네트워크의 줄을 더하고, GDPR 메시지의 광고 파트너·개인정보처리방침의 국외 이전 표·스토어 데이터 보안 답안을 함께 고칩니다.
7. AdMob 의 **광고 검사기**(Ad Inspector)로 각 네트워크가 실제로 채워지는지 확인합니다(테스트 기기 등록 필요).

## 4. RevenueCat (인앱 결제)

앱은 스토어 상품 ID 를 그대로 써서 RevenueCat 으로 가격을 받고(`getProducts`), 결제하고(`purchaseStoreProduct`), 구매를 복원합니다(`restorePurchases`).
영수증 검증과 구독 상태 관리는 RevenueCat 서버가 합니다. 「오퍼링(Offering)」은 쓰지 않으므로 만들지 않아도 됩니다.

### 4-1. 상품 표

`src/features/monetize/catalog.js` 의 `PRODUCTS` 와 같아야 합니다. 원화 가격은 개발용 표시 가격이며, 실제로 화면에 보이는 값은 스토어가 정한 현지 가격입니다.

| 상품 ID | 게임 안 종류 | App Store 유형 | Google Play 유형 | 원화 가격 | RevenueCat 권한 | 내용 |
| --- | --- | --- | --- | --- | --- | --- |
| `shh.starter` | once(한 번만) | 비소모성 | 일회성 상품 · RC 에서 Non-consumable | ₩1,500 | — | 스타터 팩(연구비, 진열장 1칸, 견습 비행사 의상) |
| `shh.freepass` | nonconsumable | 비소모성 | 일회성 · Non-consumable | ₩9,900 | `freepass` | 본부 프리패스(광고 없이 보상) + 금빛 도색 |
| `shh.season` | subscription | 자동 갱신 구독(1개월) | 정기 결제 · 기본 요금제 `monthly`(1개월 자동 갱신) | ₩6,500 | `season` | 시즌 패스(성장 ×1.25, 매일 연구비, 별빛 망토·금빛 빔) |
| `shh.grant.s` | consumable | 소모성 | 일회성 · Consumable | ₩1,200 | — | 연구비 S |
| `shh.grant.m` | consumable | 소모성 | 일회성 · Consumable | ₩5,900 | — | 연구비 M |
| `shh.grant.l` | consumable | 소모성 | 일회성 · Consumable | ₩12,000 | — | 연구비 L |
| `shh.grant.xl` | consumable | 소모성 | 일회성 · Consumable | ₩33,000 | — | 연구비 XL |
| `shh.formpack` | consumable | 소모성 | 일회성 · Consumable | ₩3,900 | — | 새 형태 기념 팩(연구비 + 부스터 3시간) |
| `shh.outfit.bunny` | nonconsumable | 비소모성 | 일회성 · Non-consumable | ₩2,500 | `cosmetics` | 토끼 귀 털모자 |
| `shh.outfit.raincoat` | nonconsumable | 비소모성 | 일회성 · Non-consumable | ₩2,500 | `cosmetics` | 노란 우비 |
| `shh.outfit.chef` | nonconsumable | 비소모성 | 일회성 · Non-consumable | ₩3,300 | `cosmetics` | 우주 요리사 |
| `shh.outfit.astro` | nonconsumable | 비소모성 | 일회성 · Non-consumable | ₩4,900 | `cosmetics` | 꼬마 우주복 |
| `shh.paint.sunset` | nonconsumable | 비소모성 | 일회성 · Non-consumable | ₩2,500 | `cosmetics` | 노을 도색 |
| `shh.paint.mint` | nonconsumable | 비소모성 | 일회성 · Non-consumable | ₩2,500 | `cosmetics` | 민트 도색 |
| `shh.paint.galaxy` | nonconsumable | 비소모성 | 일회성 · Non-consumable | ₩4,900 | `cosmetics` | 은하 도색 |
| `shh.beam.pink` | nonconsumable | 비소모성 | 일회성 · Non-consumable | ₩2,500 | `cosmetics` | 분홍 빔 |
| `shh.beam.rainbow` | nonconsumable | 비소모성 | 일회성 · Non-consumable | ₩3,300 | `cosmetics` | 무지개 빔 |

- **권한(Entitlement)**: RevenueCat › Product catalog › Entitlements 에 `freepass`, `season`, `cosmetics` 세 개를 만들고 표대로 상품을 붙입니다.
  게임은 `freepass`·`season` 권한(만료 시각 포함)과, 상품별 거래 기록으로 복원합니다. `cosmetics` 는 「꾸미기를 하나라도 산 사람」 분석용이며 복원은 상품별 거래로 합니다.
- **스타터 팩(`shh.starter`)은 비소모성**으로 만드세요. 스토어가 「한 번만」을 지켜 주고, 재설치 뒤 「구매 복원」으로 의상이 돌아옵니다.
- **구글 플레이의 일회성 상품은 RevenueCat 대시보드에서 유형(Consumable / Non-consumable)을 꼭 지정**하세요. 소모성은 결제 뒤 소비되어 다시 살 수 있고, 비소모성은 계속 소유로 남습니다.
- 안드로이드 정기 결제의 기본 요금제 ID 는 `monthly` 로 만드세요(`src/monetize/config.js` 의 `revenuecat.seasonBasePlan`). 다른 이름을 쓰면 그 값도 바꿉니다.
- App Store 가격은 정해진 가격 단계 중에서 고릅니다(원화 표와 똑같지 않아도 됩니다). 구글 플레이 원화 가격은 부가세 포함 가격입니다.
- 상품 ID 는 한 번 쓰면 지워도 다시 쓸 수 없습니다(App Store). 오타 없이 만드세요.

### 4-2. 만드는 순서

1. **스토어에 상품 만들기**
   - App Store Connect › 앱 › **수익화 › 앱 내 구입**(소모성·비소모성)과 **구독**(구독 그룹 「시즌 패스」 안에 `shh.season`, 기간 1개월). 각 상품에 한국어·영어 표시 이름·설명, 심사용 스크린샷이 필요합니다.
   - Play Console › 앱 › **수익 창출 › 제품 › 인앱 상품**(일회성)과 **정기 결제**(`shh.season`, 기본 요금제 `monthly`, 자동 갱신 1개월). 인앱 상품을 만들려면 먼저 결제 권한이 들어간 빌드(AAB)를 한 번 올려야 합니다(내부 테스트 트랙이면 충분).
2. **RevenueCat 프로젝트 만들기** › Apps 에 두 앱 추가
   - Google Play: 패키지 이름 + **서비스 계정 JSON**(Play Console › 사용자 및 권한에서 서비스 계정에 재무 데이터 보기·주문 관리 권한). 연결이 반영되기까지 최대 하루 걸릴 수 있습니다.
   - App Store: 번들 ID + **In-App Purchase Key**(App Store Connect › 사용자 및 액세스 › 통합 › 앱 내 구입, `.p8` 파일. 저장소에 올리지 마세요).
   - (권장) 스토어 서버 알림 연결: App Store Server Notifications V2 URL, Google 실시간 개발자 알림(RTDN). RevenueCat 안내대로 넣으면 환불·해지가 빨리 반영됩니다.
3. RevenueCat › Product catalog › **Products** 에 스토어 상품을 가져오고(Import), 4-1 표대로 **Entitlements** 에 붙입니다.
4. RevenueCat › Project settings › **API keys** 의 앱별 **공개 SDK 키**를 `src/monetize/config.js` 의 `revenuecat.apiKey` 에 넣습니다.
   안드로이드 `goog_…`, iOS `appl_…`. **비밀 키(`sk_…`)는 절대 앱에 넣지 마세요.**
   키가 `REPLACE…` 그대로면 앱은 결제를 끄고 원화 표시 가격만 보여 줍니다.
5. Xcode › App 타깃 › Signing & Capabilities › **+ Capability › In-App Purchase** 를 추가합니다.

### 4-3. 결제 결과 처리(코드가 하는 일)

- 성공: `{ok: true, txId: 거래 ID}` (구독이면 `expiresAt` = 권한 만료 시각). 게임 규칙은 같은 거래 ID 를 두 번 지급하지 않습니다.
- 사용자가 취소: `{ok: false, cancelled: true}`
- **결제 대기**(iOS 「구입 요청」으로 보호자 승인 대기, 구글 현금 결제 대기 등): `{ok: false, pending: true}`. 나중에 승인되면 공급자의 `store.onDeferred(cb)` 로 그 거래를 알려 줍니다(수익화 서비스가 받아서 지급).
- 이미 가진 비소모성 상품을 다시 사려 하면 그 거래로 다시 반영합니다.
- 구매 복원: 비소모성 상품과 유효한 구독만 돌려줍니다(소모성은 복원되지 않습니다). 실패하면 빈 목록에 `error` 가 붙습니다.

## 5. 안드로이드 빌드 · 서명 (Android Studio)

1. `npm run cap:android` → Android Studio 가 `android/` 를 엽니다. 처음에는 Gradle 동기화에 몇 분 걸립니다.
2. 기기를 USB 로 연결(개발자 옵션 › USB 디버깅)하고 ▶ Run. 디버그 빌드에서는 `chrome://inspect` 로 웹 화면을 디버깅할 수 있습니다.
3. **업로드 키 만들기**(한 번만, 잃어버리면 안 됩니다. 저장소 밖 안전한 곳에 두고 백업)
   ```bash
   keytool -genkeypair -v -keystore ~/keys/shh-ufo-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
   ```
4. `android/keystore.properties` 를 만듭니다(`.gitignore` 에 들어 있어 커밋되지 않습니다).
   ```properties
   storeFile=/Users/나/keys/shh-ufo-upload.jks
   storePassword=…
   keyAlias=upload
   keyPassword=…
   ```
5. 출시용 번들(AAB) 만들기: Android Studio › Build › **Generate Signed App Bundle**, 또는
   ```bash
   cd android && ./gradlew bundleRelease
   # 결과: android/app/build/outputs/bundle/release/app-release.aab
   ```
6. Play Console 에 처음 올릴 때 **Play 앱 서명**을 켭니다(Google 이 앱 서명 키를 보관하고, 나는 업로드 키만 가집니다).
7. 대상 API: 템플릿이 `targetSdkVersion 36`(Android 16)입니다. 구글 플레이의 최소 대상 API 요구가 오르면 `android/variables.gradle` 을 올리세요.
   Android 16 이상의 큰 화면(태블릿·폴더블)에서는 OS 가 세로 고정을 무시할 수 있습니다. 게임은 화면이 낮으면 「세로로 돌려 주세요」 안내를 보여 줍니다.
8. 뒤로 가기 버튼: 지금은 안드로이드 기본 동작(앱 닫기)입니다. 모달을 닫는 동작이 필요하면 `@capacitor/app` 의 `backButton` 이벤트를 연결하세요.

## 6. iOS 빌드 · 서명 (Xcode, Mac 전용)

이 저장소의 `ios/` 는 Linux 에서 **Swift Package Manager(SPM)** 방식으로 생성했습니다. CocoaPods 가 필요 없고, Mac 에서 처음 열 때 Xcode 가 패키지(Capacitor, Google Mobile Ads, UMP, RevenueCat)를 받습니다.
`ios/App/CapApp-SPM/Package.swift` 는 `node_modules` 를 가리키므로 **Mac 에서도 먼저 `npm install`** 이 필요합니다.

1. Mac 에서 `npm install` → `npm run cap:ios` → Xcode 가 `ios/App/App.xcodeproj` 를 엽니다. 패키지 받기(Resolve Packages)가 끝날 때까지 기다립니다.
2. App 타깃 › **Signing & Capabilities**: Team 선택, Automatically manage signing, Bundle Identifier 확인(1단계), **In-App Purchase** 추가.
3. 실제 기기를 연결하고 ▶ Run. (시뮬레이터에서도 광고·결제 화면은 열리지만 결제는 StoreKit 시험 설정이나 샌드박스 계정이 필요합니다.)
4. 출시: 기기 대상 **Any iOS Device (arm64)** › Product › **Archive** › Distribute App › App Store Connect › Upload. 처리가 끝나면 TestFlight 에서 시험합니다.
5. **기기 종류**: 지금은 **iPhone 전용**(`TARGETED_DEVICE_FAMILY = 1`)입니다. iPad 에서는 iPhone 앱으로(확대) 실행되며, iPad 스크린샷이 필요 없습니다.
   iPad 를 정식 지원하려면 App 타깃 › General › Supported Destinations 에 iPad 를 넣고, iPad 레이아웃 점검과 13인치 iPad 스크린샷을 준비하세요(Info.plist 에 iPad 세로 방향·`UIRequiresFullScreen` 은 이미 들어 있습니다).
6. **암호화 수출 규정**: Info.plist 에 `ITSAppUsesNonExemptEncryption = NO` 를 넣어 두었습니다(HTTPS 만 사용). 올릴 때마다 묻는 질문이 생략됩니다.
7. **개인정보 매니페스트**: Google Mobile Ads·UMP·RevenueCat·Capacitor 패키지가 각자의 `PrivacyInfo.xcprivacy` 를 가지고 있습니다. 업로드 뒤 App Store Connect 가 누락을 알리면 그 안내대로 App 타깃에 `PrivacyInfo.xcprivacy` 를 추가하세요.

### iOS: CocoaPods 로 바꾸기(필요할 때만)

미디에이션 어댑터를 CocoaPods 로 넣어야 하는 경우 등에만 합니다. Mac 에서:

```bash
rm -rf ios && npx cap add ios --packagemanager CocoaPods && npx cap sync ios
```

그 뒤 이 저장소에서 바꾼 iOS 설정을 다시 넣어야 합니다: `Info.plist` 전체(AdMob 앱 ID, ATT 문구, SKAdNetwork, 세로 화면, 암호화 규정), `ko.lproj`·`en.lproj` 의 `InfoPlist.strings`(Xcode 에서 Localization 추가), 앱 아이콘·시작 화면(`Assets.xcassets`), iPhone 전용 설정. 바꾸기 전에 `ios/App/App/` 를 복사해 두세요.

## 7. 스토어 등록

### 7-1. 공통으로 준비할 것

- 앱 이름: `쉿! UFO` (영어 `Shh! UFO`). 기기 언어가 영어면 홈 화면 이름도 `Shh! UFO` 로 보입니다(안드로이드 `values-en/strings.xml`, iOS `en.lproj/InfoPlist.strings`. 한국어 이름만 쓰려면 지우세요).
- 짧은 설명·긴 설명(한국어 기본, 영어 추가), 카테고리: 게임 › 캐주얼(또는 시뮬레이션)
- 스크린샷: 휴대폰 세로. iPhone 6.9인치(1320×2868 또는 1290×2796) 필수, 구글 플레이 휴대폰 2장 이상 + 그래픽 이미지(1024×500)
- 개인정보처리방침 URL(공개 주소), 고객 지원 이메일/URL
- **구독 안내(애플 필수)**: 시즌 패스 결제 화면에 ① 구독 이름 ② 기간(1개월, 자동 갱신) ③ 가격 ④ **이용약관(EULA)과 개인정보처리방침 링크** ⑤ 해지 방법이 보여야 하고, App Store 설명에도 이용약관·개인정보처리방침 링크를 넣어야 합니다. 이용약관은 Apple 표준 EULA(`https://www.apple.com/legal/internet-services/itunes/dev/stdeula/`)를 써도 됩니다.
- 「구매 복원」 버튼(애플 필수) — 상점 화면에 있어야 합니다.

### 7-2. App Store Connect

1. **새로운 앱**: 플랫폼 iOS, 이름, 기본 언어 한국어, 번들 ID, SKU(예: `shh-ufo`).
2. **앱 정보**: 카테고리, 연령 등급(8단계), 개인정보처리방침 URL.
3. **가격 및 사용 가능 여부**: 무료.
4. **앱 개인정보 보호**: 9단계 답안.
5. **앱 내 구입·구독**: 4단계 상품. 첫 심사 때 앱 버전과 **함께 제출**해야 합니다(버전 페이지의 「앱 내 구입 및 구독」에서 선택).
6. **심사 메모**: 「로그인 없음. 보상형 광고는 게임 안 선택형(보급 풍선·부스터 등). 인앱 결제는 상점 탭. 구매 복원은 상점 아래.」

### 7-3. Google Play Console

1. **앱 만들기**: 기본 언어 한국어, 게임, 무료.
2. **앱 콘텐츠** 에서 모두 답합니다.
   - 개인정보처리방침 URL
   - **광고**: 「예, 광고가 포함되어 있음」
   - **앱 액세스 권한**: 모든 기능을 제한 없이 이용 가능
   - **콘텐츠 등급**: 8단계(IARC 설문)
   - **타겟층 및 콘텐츠**: 대상 연령 **13–15세, 16–17세, 18세 이상**만 선택합니다. 12세 이하 연령대를 고르면 가족 정책(Families)이 적용되어 광고 SDK·광고 설정 요건이 크게 달라집니다.
     「앱이 의도치 않게 어린이의 관심을 끌 수 있나요?」 질문에는 실제 화면(귀여운 카툰 그림)을 보고 정직하게 답하세요. 구글이 어린이 대상으로 판단하면 가족 정책 요건(가족용 인증 광고 SDK, 어린이 대상 광고 설정)을 맞추라는 요청이 올 수 있습니다.
   - **데이터 보안**: 9단계 답안
   - **광고 ID**: 「예, 광고 ID 를 사용함」 — 용도: 광고 또는 마케팅, 분석, 사기 방지·보안
   - 정부 앱·금융 기능·건강: 해당 없음
3. **내부 테스트** 트랙에 AAB 를 올려 라이선스 테스터로 결제를 시험한 뒤 → 비공개 테스트(개인 계정은 12명·14일) → 프로덕션.

## 8. 연령 등급 설문 답안 (12세 이상 의도)

게임 내용: 카툰풍 UFO 가 지구인의 시선을 피해 표본(젖소·풍선 등)을 견인 빔으로 끌어올림. 들키면 지구인이 잠자리채를 들고 달려옴. 피·부상·사망 없음. 채팅·사용자 제작 콘텐츠 없음. 보상형 광고(선택)와 인앱 결제 있음. 유료 확률형 아이템 없음.

| 질문(요지) | 답 |
| --- | --- |
| 폭력 | 사실적 폭력 없음. 묻는 경우 「만화·판타지풍, 경미함, 드물게」(지구인이 잠자리채로 쫓아옴 정도) |
| 공포·무서운 장면 | 없음 |
| 성적 내용·노출 | 없음 |
| 욕설·저속한 언어 | 없음 |
| 약물·술·담배 | 없음 |
| 도박(실제 돈) / 모의 도박 | 없음 / 없음 |
| 현금으로 사는 무작위 아이템(루트박스) | **없음** (유료 상품은 내용이 정해져 있음. 광고 보상인 보급 풍선은 무작위지만 무료) |
| 사용자 간 소통·채팅·사용자 제작 콘텐츠 | 없음 |
| 위치 공유 | 없음 |
| 디지털 상품 구매(인앱 결제) | **있음** |
| 광고 | **있음** |
| 웹 무제한 접근 | 없음 |

- **구글 플레이(IARC)**: 위처럼 답하면 대체로 전체이용가~12세(GRAC), PEGI 3~7, ESRB E~E10+ 범위가 나옵니다. 등급은 「이 나이부터 봐도 되는 내용」이라는 뜻이라 12세보다 낮게 나와도 괜찮습니다. 「12세 이상 대상」은 타겟층(7-3)과 광고 설정(어린이 대상 아님, 광고 등급 T)으로 표현합니다.
- **애플**: 2025년에 연령 등급이 **4+ / 9+ / 13+ / 16+ / 18+** 체계로 바뀌었습니다(예전 12+ 자리가 13+). 새 설문(앱 내 제어 기능, 광고, 사용자 제작 콘텐츠, 의료·건강, 폭력 주제 등)에 위와 같이 답하면 「만화·판타지 폭력: 드물게/경미」 정도로 **9+** 안팎이 예상됩니다.
- 한국: 구글·애플은 게임물관리위원회가 지정한 **자체등급분류사업자**라 스토어 설문으로 받은 등급이 국내 등급으로 쓰입니다(따로 심의를 받지 않아도 됩니다).

## 9. 데이터 보안(구글) · 앱 개인정보 보호(애플) 답안

게임 진행 기록은 **기기 안에만** 저장됩니다(localStorage). 개발자가 직접 운영하는 서버는 없습니다. 아래는 광고 SDK(Google Mobile Ads)와 결제(RevenueCat·스토어) 때문에 생기는 항목입니다.
충돌 보고(크래시) SDK 는 넣지 않았습니다. 다만 Google Mobile Ads SDK 가 광고 동작을 위한 진단 정보를 수집하므로 그 항목은 신고합니다.
미디에이션 네트워크를 켜면 그 네트워크의 안내대로 항목을 더하세요.

### 구글 플레이 데이터 보안

| 데이터 유형 | 수집 | 공유 | 처리 목적 | 비고 |
| --- | --- | --- | --- | --- |
| 기기 또는 기타 ID (광고 ID, 앱 세트 ID) | 예 | 예(광고 파트너) | 광고 또는 마케팅, 분석, 사기 방지·보안·규정 준수 | Google Mobile Ads |
| 위치 › 대략적인 위치 (IP 주소로 추정) | 예 | 예 | 광고 또는 마케팅, 분석, 사기 방지 | Google Mobile Ads |
| 앱 활동 › 앱 상호작용 (광고 노출·클릭 등) | 예 | 예 | 광고 또는 마케팅, 분석 | Google Mobile Ads |
| 앱 정보 및 성능 › 비정상 종료 로그·진단 | 예 | 아니요 | 분석, 앱 기능 | Google Mobile Ads 진단 |
| 금융 정보 › 구매 기록 | 예 | 아니요 | 앱 기능(구매 지급·복원·구독 상태) | RevenueCat, 결제 자체는 Google Play |

- 모든 데이터는 **전송 중 암호화됨**: 예
- **삭제 요청 방법**: 예(개인정보처리방침의 문의 이메일). 구매 기록은 관련 법령에 따라 보관될 수 있음을 함께 적습니다.
- 수집이 필수인지 선택인지: 광고 관련 항목은 앱 안에서 끌 수 없으므로 「필수」로 답하는 것이 일반적입니다. 동의 지역의 맞춤 광고 거부, 광고 ID 재설정·삭제, ATT 거부로 제한할 수 있다는 점은 개인정보처리방침에 적습니다.
- 계정 만들기: 없음 / 이름·이메일·연락처·사진·메시지·건강 정보: 수집 안 함

### 애플 앱 개인정보 보호

| 데이터 유형 | 용도 | 사용자에게 연결됨 | 추적에 사용 |
| --- | --- | --- | --- |
| 식별자 › 기기 ID (IDFA, ATT 허용 시) | 타사 광고, 분석 | 아니요 | **예** |
| 사용 데이터 › 광고 데이터 | 타사 광고, 분석 | 아니요 | **예** |
| 사용 데이터 › 제품 상호작용 | 타사 광고, 분석 | 아니요 | 예 |
| 위치 › 대략적인 위치 (IP) | 타사 광고 | 아니요 | 아니요 |
| 진단 › 충돌 데이터·성능 데이터·기타 진단 데이터 | 앱 기능, 분석 | 아니요 | 아니요 |
| 구입 항목 › 구입 내역 | 앱 기능 | 예(보수적으로) | 아니요 |

- 「추적」에 쓰는 항목이 있으므로 ATT 알림(Info.plist 문구)이 필요하고, 이미 들어 있습니다.
- RevenueCat 은 익명 ID 를 쓰지만, 기기 단위로 구매 기록이 묶이므로 「연결됨」으로 답하는 편이 안전합니다.

## 10. 한국 법규 — 인앱 결제 고지

상점 화면과 결제 확인 단계에 아래 문구가 보이도록 하세요(게임 UI 담당). 판단이 어려우면 전문가 확인을 권합니다.

1. **청약철회(전자상거래법 제17조, 콘텐츠산업 진흥법)**
   - 「구매 후 7일 이내에는 청약철회를 요청할 수 있습니다. 다만 구매 즉시 지급되어 사용된 아이템(연구비 등 소모성 상품)과 이미 적용된 혜택은 청약철회가 제한됩니다.」
   - 철회가 제한되는 상품에는 **구매 전에** 그 사실을 표시해야 제한이 인정됩니다(상품 카드나 결제 확인 창).
   - 환불은 스토어 정책을 따릅니다: App Store `reportaproblem.apple.com`, 구글 플레이 주문 내역 › 환불 요청.
2. **미성년자 결제(민법 제5조)**
   - 「미성년자가 법정대리인의 동의 없이 결제한 경우, 본인 또는 법정대리인이 결제를 취소할 수 있습니다.」
   - iOS 「구입 요청」(가족 공유) 사용자는 보호자 승인 전까지 결제가 대기됩니다(4-3).
3. **정기 결제(시즌 패스)**
   - 「매월 자동 갱신되며, 갱신 24시간 전까지 해지하지 않으면 다음 달 요금이 결제됩니다. 해지: iPhone 설정 › Apple 계정 › 구독 / Play 스토어 › 결제 및 정기 결제.」
   - 2025년 2월 시행 전자상거래법 개정(다크 패턴 규제): 가격을 올리거나 무료 체험 뒤 유료로 바뀌는 경우 사전 고지·동의가 필요하고, 해지 방법을 가입만큼 쉽게 안내해야 합니다.
4. **확률형 아이템 정보 공개(게임산업법, 2024년 3월 시행)**: 유료 확률형 아이템은 없습니다. 광고 보상인 보급 풍선은 무작위지만 무료이므로 의무 대상은 아닌 것으로 보입니다. 그래도 확률(연구비 50%, 연료 30%, 반짝이 20%)을 게임 안 도움말에 적어 두면 분쟁을 줄일 수 있습니다.
5. **사업자 정보**: 인앱 판매 수익이 생기면 사업자등록과 통신판매업 신고 대상인지 확인하세요(소규모 면제 기준은 관할 구청·공정거래위원회 안내 확인).
6. **개인정보**: 개인정보처리방침을 게시하고 국외 이전(Google, RevenueCat — 미국) 내용을 적어야 합니다(초안에 포함).
   **만 14세 미만**의 개인정보 처리에는 법정대리인 동의가 필요하고, 주 이용자가 만 14세 미만인 앱에서는 맞춤형 광고 목적의 행태정보 수집을 하지 않는 것이 개인정보보호위원회 지침입니다.
   이 게임은 12세 이상을 대상으로 해 만 12–13세 사용자가 있을 수 있으므로, 이용자 연령 분포를 보고 필요하면 비개인 맞춤 광고만 요청하거나(`src/monetize/config.js` 의 `admob.npa: true`) 연령 확인 화면을 두는 것을 검토하세요.

## 11. 시험하기

### 광고

- `testMode: true`(기본값): Google 테스트 보상형 광고가 언제나 나옵니다(「Test Ad」 표시). 보상·닫기·실패 흐름을 모두 확인하세요.
- 실제 광고 단위로 시험할 때는 **절대 내 광고를 누르지 마세요**(계정 정지 위험). 앱 로그(Android Logcat / Xcode 콘솔)에 나오는 테스트 기기 ID 를 `admob.testDeviceIds` 에 넣으면 실제 광고 단위에서도 테스트 광고가 나옵니다.
- **동의 창 시험**: `testMode: true` + `admob.debugGeography: 'EEA'` + 테스트 기기 ID 등록. 다시 보려면 앱을 지우고 다시 설치합니다.
- **ATT 시험**: iPhone 설정 › 개인정보 보호 및 보안 › 추적, 또는 앱 재설치.
- 확인할 것: 광고를 끝까지 봤을 때만 보상, 중간에 닫으면 보상 없음, 비행기 모드에서 광고 버튼이 오류 안내로 끝나고 게임이 멈추지 않음, 광고가 끝나면 소리·게임이 다시 이어짐.

### 결제

- **iOS**: App Store Connect › 사용자 및 액세스 › **샌드박스 테스터** 계정을 만들고, 기기의 설정 › App Store › 샌드박스 계정으로 로그인. TestFlight 빌드의 결제는 모두 무료 샌드박스입니다. 샌드박스 구독은 빠르게 갱신됩니다(1개월 = 약 5분).
- **안드로이드**: Play Console › 설정 › **라이선스 테스트** 에 테스터 Gmail 추가 → 내부 테스트 트랙으로 설치(스토어에서 설치해야 결제가 열립니다). 결제 수단에서 「테스트 카드, 항상 승인」 / 「느린 테스트 카드」(결제 대기 시험)를 고를 수 있습니다. 테스트 정기 결제도 몇 분 단위로 갱신됩니다.
- **RevenueCat Test Store**(선택): 스토어 연결 전에 결제 흐름만 보려면 RevenueCat 의 Test Store 앱 키를 임시로 넣어 시험할 수 있습니다. 출시 빌드에는 넣지 마세요.
- 확인할 것: 가격이 스토어 현지 가격으로 보임, 소모성 상품을 여러 번 살 수 있음, 비소모성은 한 번만, 앱 삭제 → 재설치 → 「구매 복원」으로 의상·프리패스·시즌 패스가 돌아옴(소모성은 돌아오지 않음), 결제 취소 시 아무것도 지급되지 않음, RevenueCat 대시보드 › Customers 에 거래가 보임.

### 출시 직전 점검표

- [ ] 앱 ID 교체(1단계)
- [ ] AdMob 앱 ID 두 곳 교체, 광고 단위 ID 교체, `testMode: false`
- [ ] RevenueCat 공개 SDK 키 두 개
- [ ] app-ads.txt 게시
- [ ] 개인정보처리방침 게시(연락처 등 빈칸 채움)
- [ ] 상점 화면의 청약철회·미성년자·구독 고지, 이용약관·개인정보처리방침 링크, 구매 복원 버튼
- [ ] `versionCode` / Build 번호 올림
- [ ] 업로드 키·`.p8`·`keystore.properties` 가 저장소에 없음(`git status` 확인)

## 12. 보상형 광고 서버 확인(SSV, 선택)

이 게임은 보상을 기기 안에서 지급합니다(서버 없음). 그래서 SSV 는 **필수가 아닙니다**. 나중에 보상을 서버에서 관리하거나 부정 시청을 분석하려면 켭니다.

1. `src/monetize/config.js` 에서 `admob.ssv.enabled: true`. 광고를 불러올 때 `customData` 로 `{"placement": "boost", "nonce": "…"}`, `userId` 로 RevenueCat 익명 사용자 ID 를 실어 보냅니다.
   (SSV 를 켜면 광고 자리가 바뀔 때 광고를 새로 불러오므로 처음 표시가 조금 늦어질 수 있습니다.)
2. AdMob › 광고 단위(보상형) › **서버 측 확인** 에 내 콜백 URL 을 넣습니다.
3. 콜백 서버는 Google 공개 키(`https://www.gstatic.com/admob/reward/verifier-keys.json`)로 서명을 검증합니다. 쿼리 문자열에서 `&signature=` 앞부분 전체가 서명 대상입니다.

```js
// Node.js 예시(Express 등의 핸들러 안에서). 실제 서버에서는 키를 캐시하세요.
import { createPublicKey, verify } from 'node:crypto';

export async function verifyAdMobSsv(rawQuery) {
  const i = rawQuery.indexOf('&signature=');
  const message = rawQuery.slice(0, i);
  const params = new URLSearchParams(rawQuery);
  const signature = Buffer.from(params.get('signature'), 'base64url');
  const { keys } = await (await fetch('https://www.gstatic.com/admob/reward/verifier-keys.json')).json();
  const key = keys.find((k) => String(k.keyId) === params.get('key_id'));
  if (!key) return false;
  const ok = verify('sha256', Buffer.from(message), createPublicKey(key.pem), signature);
  // ok 이면 transaction_id 가 처음 보는 값인지 확인해 중복 지급을 막는다.
  // custom_data 의 placement·nonce, user_id, reward_amount, reward_item 을 기록·검증한다.
  return ok;
}
```

## 13. 아이콘·스플래시 다시 만들기

지금 앱 아이콘과 시작 화면은 웹 아이콘과 같은 그림(`tools/icon.html` 이 3D 로 찍는 UFO 와 농장)으로 만들었습니다.

1. 원본 그리기: `tools/icon.html?size=1024&maskable=1`(정사각형 꽉 찬 그림)과 `?size=1024&maskable=0`(둥근 모서리)을 브라우저(`npm start` 후 열기)나 Playwright 로 PNG 저장.
2. 아래 이름으로 한 폴더(예: 저장소 밖 `~/shh-ufo-resources/`)에 둡니다.
   - `icon-only.png` — 1024×1024, 투명도 없음(정사각형 그림). iOS 앱 아이콘·안드로이드 구형 아이콘
   - `icon-foreground.png`, `icon-background.png` — 1024×1024. 안드로이드 적응형 아이콘용
   - `splash.png` — 2732×2732. 가운데에 둥근 아이콘(약 600px), 바탕 `#2f62cf`. 어두운 모드용 `splash-dark.png` 는 같은 그림이라 만들지 않았습니다.
3. 생성(설치 없이 실행):
   ```bash
   npx @capacitor/assets@4 generate --assetPath ../shh-ufo-resources --android --ios
   ```
   `--assetPath` 는 저장소 기준 **상대 경로**로 주세요.
4. 안드로이드 적응형 아이콘 보정: 이 도구는 전경 그림을 작게(안쪽 72dp 에 맞춰) 만들어 흐려지므로, 이 저장소에서는 그 뒤에 `mipmap-*/ic_launcher_foreground.png` 를 108dp 캔버스(mdpi 108px … xxxhdpi 432px)의 가운데 72dp 에 정사각형 그림을 놓은 것으로, `ic_launcher_background.png` 를 같은 그림을 크게 흐린 것으로 바꾸고, `mipmap-anydpi-v26/ic_launcher*.xml` 의 `inset` 을 없앴습니다. 다시 생성했다면 같은 보정을 해 주세요. 시작 화면 PNG 는 용량을 줄이려고 256색 팔레트로 다시 저장했습니다(대부분 단색이라 차이가 거의 없습니다).

## 14. 알려 둘 한계

- 이 저장소를 만든 환경(Linux)에는 Android SDK·Xcode 가 없어 **APK/AAB·iOS 앱을 실제로 빌드해 보지는 않았습니다.** 프로젝트 생성, 설정 파일 문법, 웹 빌드·브라우저 점검, 광고·결제 코드의 흐름(가짜 플러그인으로 38가지 경우)은 확인했습니다. 첫 빌드 때 Gradle·Xcode 가 알려 주는 경고를 확인하세요.
- iOS 는 SPM 방식이며 패키지 받기는 Mac 의 Xcode 에서 처음 이루어집니다.
- 앱 안에서는 웹의 서비스 워커가 필요 없어 복사 단계에서 `sw.js` 를 뺍니다(등록 시도는 조용히 실패). 게임 코드에서 네이티브일 때 등록 자체를 건너뛰면 더 깔끔합니다.
- 결제 대기(보호자 승인 등) 뒤 지급은 공급자의 `store.onDeferred` 를 수익화 서비스가 연결해야 동작합니다.
