const { withAndroidManifest } = require('expo/config-plugins');

const KAKAO_PACKAGE = 'com.kakao.talk';
const KAKAO_SCHEME = 'kakaotalk';

function asArray(value) {
  if (value == null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

/**
 * Android 11+ 패키지 가시성: 카카오톡 앱/스킴을 조회·실행할 수 있게 queries를 추가합니다.
 * iOS의 LSApplicationQueriesSchemes에 해당하는 설정입니다.
 */
function withKakaoTalkQueries(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const queriesList = asArray(manifest.queries);
    const queries = queriesList[0] ?? {};

    const packages = asArray(queries.package);
    if (!packages.some((pkg) => pkg.$?.['android:name'] === KAKAO_PACKAGE)) {
      packages.push({ $: { 'android:name': KAKAO_PACKAGE } });
    }
    queries.package = packages;

    const intents = asArray(queries.intent);
    const hasKakaoScheme = intents.some((intent) =>
      asArray(intent.data).some((data) => data.$?.['android:scheme'] === KAKAO_SCHEME),
    );
    if (!hasKakaoScheme) {
      intents.push({
        action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
        data: [{ $: { 'android:scheme': KAKAO_SCHEME } }],
      });
    }
    queries.intent = intents;

    manifest.queries = [queries, ...queriesList.slice(1)];
    return config;
  });
}

module.exports = withKakaoTalkQueries;
