// 앱(안드로이드·iOS) 광고·결제 설정. providers/native.js 만 읽는다(웹·개발 빌드는 가짜 공급자를 쓴다).
// 출시 전에 docs/release.md 를 따라 아래 「바꿀 것」을 모두 실제 값으로 바꾸고 testMode 를 false 로 둔다.
//
// 여기 들어가는 값은 모두 앱 안에 그대로 실리는 "공개용" 값이다.
//  - AdMob 광고 단위 ID 는 비밀이 아니다.
//  - RevenueCat 키는 대시보드 「API keys」의 앱별 공개 SDK 키(goog_… / appl_…)다.
//    비밀 키(sk_…)는 절대 넣지 않는다.
//
// AdMob "앱 ID"(…~…)는 여기가 아니라 네이티브 설정에 넣는다:
//   Android  android/app/src/main/res/values/strings.xml  admob_app_id
//   iOS      ios/App/App/Info.plist                        GADApplicationIdentifier

/** Google 공식 테스트용 보상형 광고 단위(실제 광고·수익 없음, 언제나 채워진다). */
export const GOOGLE_TEST_REWARDED = {
  android: 'ca-app-pub-3940256099942544/5224354917',
  ios: 'ca-app-pub-3940256099942544/1712485313',
};

export const MONETIZE_CONFIG = {
  /**
   * true  — 시험 모드: Google 테스트 광고 단위만 쓰고(아래 rewarded 값은 무시), 테스트 광고로 요청하고,
   *         RevenueCat 로그를 자세히 남긴다. 결제는 스토어의 샌드박스/라이선스 테스터 계정으로만 시험한다.
   * false — 출시 모드: 아래 rewarded 의 실제 광고 단위를 쓴다.
   * 바꿀 것: 출시 빌드 전에 false.
   */
  testMode: true,

  admob: {
    /** 보상형 광고 단위 ID(AdMob 콘솔 > 앱 > 광고 단위). 바꿀 것: 플랫폼마다 내 광고 단위 ID. */
    rewarded: {
      android: GOOGLE_TEST_REWARDED.android,
      ios: GOOGLE_TEST_REWARDED.ios,
    },
    /**
     * 실제 광고 단위로 내 기기에서 시험할 때 등록할 테스트 기기 ID(앱 로그의 "Use RequestConfiguration…setTestDeviceIds"
     * 안내에 나온 값). 등록한 기기에는 실제 광고 단위에서도 테스트 광고가 나온다. testMode 와 상관없이 적용된다.
     */
    testDeviceIds: [],
    /**
     * 동의(UMP) 창 시험: testMode 일 때만 적용. 'EEA' 로 두면 한국에서도 유럽 동의 창이 뜬다.
     * null | 'EEA' | 'US'(규제 대상 미국 주) | 'OTHER'
     */
    debugGeography: null,
    /**
     * true 면 모든 광고 요청을 비개인 맞춤 광고(npa)로 보낸다. 기본은 false(동의 지역은 UMP 동의를 따른다).
     * 만 14세 미만 사용자가 많다면 켜는 것을 검토한다. docs/release.md 「한국 법규」
     */
    npa: false,
    /** iOS: 동의 창 뒤에 앱 추적 투명성(ATT) 알림을 띄운다(아직 묻지 않았을 때만). */
    requestTracking: true,
    /**
     * 보상형 광고 서버 확인(SSV, 선택). 켜면 광고를 불러올 때 광고 자리(placement)와 일회용 값을
     * customData 로, RevenueCat 익명 사용자 ID 를 userId 로 실어 보낸다. AdMob 광고 단위에 콜백 URL 을
     * 등록해야 의미가 있다. docs/release.md 「보상형 광고 서버 확인」
     */
    ssv: { enabled: false },
    /** 광고를 불러오는 데 기다리는 최대 시간(ms). 넘으면 "광고 없음"으로 돌려준다. */
    loadTimeoutMs: 10000,
  },

  revenuecat: {
    /**
     * RevenueCat 공개 SDK 키(대시보드 > Project settings > API keys > 앱별 키).
     * 바꿀 것: Android 는 goog_…, iOS 는 appl_…. 값이 "REPLACE" 로 시작하면 결제를 켜지 않는다(가격은 원화 표시가).
     */
    apiKey: {
      android: 'REPLACE_WITH_REVENUECAT_GOOGLE_PUBLIC_SDK_KEY',
      ios: 'REPLACE_WITH_REVENUECAT_APPLE_PUBLIC_SDK_KEY',
    },
    /** RevenueCat 대시보드의 권한(Entitlement) 식별자. 상품 ID 와 연결 표는 docs/release.md */
    entitlements: { freepass: 'freepass', season: 'season', cosmetics: 'cosmetics' },
    /** Google Play 정기 결제(shh.season)의 기본 요금제(base plan) ID. 여러 개일 때 이것을 쓴다. */
    seasonBasePlan: 'monthly',
  },
};
