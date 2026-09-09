/*!
 * 딜리버드 파트너스 - 글로벌링크 위젯형 (Global Link Widget)
 * Prototype v0.4.0
 *
 * 설치: <script src="https://widget.delivered.co.kr/v1/gl.js" data-gl-key="YOUR_KEY" async></script>
 *
 * 독립형 서비스. 글로벌체크아웃 SDK / 글로벌쉽 API 를 사용하지 않음.
 * - 런처: 네비게이션형(nav, 화면 중앙) / 버튼형(fab) 전환
 * - 장바구니: 위젯 내부에서 자체 구현 (localStorage)
 * - 단건 결제: https://www.delivered.co.kr/en/stores/scraper/loading?url={url}
 * - 결제하기: 프로토타입 테스트 안내 모달
 */
(function () {
  'use strict';

  if (window.__DK_GLOBAL_LINK_WIDGET__) return;
  window.__DK_GLOBAL_LINK_WIDGET__ = true;

  /* ================================================================== *
   * 0. 설치 태그 / 설정
   * ================================================================== */
  var tag =
    document.currentScript ||
    (function () {
      var n = document.querySelectorAll('script[data-gl-key]');
      return n[n.length - 1];
    })();

  var attr = function (name, def) {
    if (!tag) return def;
    var v = tag.getAttribute(name);
    return v === null ? def : v;
  };

  var CDN = 'https://www.delivered.co.kr/images/';
  var ASSET = {
    logo: CDN + 'logo.png',
    symbol: CDN + 'aboutus/brandidentity/box.png',
    mascot: CDN + 'aboutus/brandidentity/main_character.png'
  };

  /* 결제 수단 로고 (프로토타입은 CDN 참조, 운영은 DK CDN 셀프 호스팅 권장) */
  var CARD_CDN = 'https://cdn.jsdelivr.net/gh/aaronfagan/svg-credit-card-payment-icons@main/flat/';
  function brandCard(bg, path, scale) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 780 500">' +
      '<rect width="780" height="500" fill="' + bg + '"/>' +
      '<g transform="translate(390 250) scale(' + scale + ') translate(-12 -12)">' +
      '<path fill="#ffffff" d="' + path + '"/></g></svg>'
    );
  }
  var WECHAT_D = 'M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.995a1.05 1.05 0 1 1 0 2.098 1.05 1.05 0 0 1 0-2.098zm5.813 0a1.05 1.05 0 1 1 0 2.098 1.05 1.05 0 0 1 0-2.098zm4.717 3.183c-3.98 0-7.207 2.727-7.207 6.093 0 3.365 3.226 6.092 7.207 6.092.834 0 1.635-.124 2.383-.343a.7.7 0 0 1 .59.081l1.57.92a.27.27 0 0 0 .138.045.24.24 0 0 0 .24-.243c0-.06-.024-.12-.04-.177l-.322-1.22a.487.487 0 0 1 .176-.55C22.99 18.756 24 17.11 24 15.271c0-3.366-3.226-6.093-7.685-6.093zm-2.534 3.157a.875.875 0 1 1 0 1.749.875.875 0 0 1 0-1.749zm4.844 0a.875.875 0 1 1 0 1.749.875.875 0 0 1 0-1.749z';
  var NAVER_D = 'M16.273 12.845 7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727v12.845Z';

  var PAYMENTS = [
    { id: 'visa',       label: 'Visa',        src: CARD_CDN + 'visa.svg' },
    { id: 'mastercard', label: 'Mastercard',  src: CARD_CDN + 'mastercard.svg' },
    { id: 'amex',       label: 'American Express', src: CARD_CDN + 'amex.svg' },
    { id: 'jcb',        label: 'JCB',         src: CARD_CDN + 'jcb.svg' },
    { id: 'unionpay',   label: 'UnionPay',    src: CARD_CDN + 'unionpay.svg' },
    { id: 'paypal',     label: 'PayPal',      src: CARD_CDN + 'paypal.svg' },
    { id: 'alipay',     label: 'Alipay',      src: CARD_CDN + 'alipay.svg' },
    { id: 'wechat',     label: 'WeChat Pay',  src: brandCard('#07C160', WECHAT_D, 14) },
    { id: 'naver',      label: 'Naver Pay',   src: brandCard('#03C75A', NAVER_D, 12) },
    { id: 'discover',   label: 'Discover',    src: CARD_CDN + 'discover.svg' }
  ];

  var CONFIG = {
    key: attr('data-gl-key', 'DEMO'),
    overseasOnly: attr('data-gl-overseas-only', 'true') !== 'false',
    lang: attr('data-gl-lang', 'auto'),
    currency: attr('data-gl-currency', 'USD'),
    launcher: attr('data-gl-launcher', 'nav'),   // nav | fab
    theme: attr('data-gl-theme', '#FB6D0E'),
    /* 가맹점이 이미 쓰고 있는 class 나 id 를 그대로 알려주면 그것으로 판정한다.
       값을 비워 두면 자동 판단 + DK 표준 class 만으로 동작한다. */
    selSoldOut:  attr('data-gl-soldout-class', ''),
    selRequired: attr('data-gl-required-class', ''),
    selStock:    attr('data-gl-stock-class', ''),
    fxRate: parseFloat(attr('data-gl-fx', '1250')),
    purchaseEndpoint: attr(
      'data-gl-endpoint',
      'https://www.delivered.co.kr/en/stores/scraper/loading?url='
    ),
    excludeCountries: attr('data-gl-exclude-countries', '').split(',').filter(Boolean),
    enabled: attr('data-gl-enabled', 'true') !== 'false',
    /* 파트너 콘솔에서 화면을 클릭해 지정한 위치. 설치 코드 속성으로 그대로 들어간다 */
    selName:    attr('data-gl-sel-name', ''),
    selBrand:   attr('data-gl-sel-brand', ''),
    selImage:   attr('data-gl-sel-image', ''),
    selOptions: attr('data-gl-sel-options', ''),
    /* 해외 고객 언어로 상품명·브랜드·옵션을 자동 번역 (auto | off) */
    translate:  attr('data-gl-translate', 'auto')
  };

  var OVERRIDE_KEY = 'dkgl.override.' + CONFIG.key;
  var _urlOverride = null;
  function readOverride() {
    if (_urlOverride === null) {
      _urlOverride = {};
      try {
        var q = (location.search.match(/[?&]glcfg=([^&]+)/) || [])[1];
        if (q) _urlOverride = JSON.parse(decodeURIComponent(q));
      } catch (e) {}
    }
    if (Object.keys(_urlOverride).length) return _urlOverride;
    try {
      return JSON.parse(localStorage.getItem(OVERRIDE_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }
  (function applyOverride() {
    var o = readOverride();
    for (var k in o) if (o[k] !== undefined && o[k] !== null) CONFIG[k] = o[k];
  })();

  /* ================================================================== *
   * 1. 다국어
   * ================================================================== */
  var I18N = {
    en: {
      slogan: 'Shop Korea, Ship Worldwide',
      shipAvail: 'Shipping available to {c}',
      flow: ['Order here', 'We buy it', 'Ship to {c}'],
      sloganShort: 'Shop Korea',
      lead: 'We buy from this store and ship to your country.',
      navTitle: 'Buy this from Korea',
      navTitleShort: 'Buy from Korea',
      navSub: 'We buy it for you and ship worldwide',
      order: 'Order now', orderShort: 'Order',
      nudge: 'Ships to your country',
      add: 'Add to Bag', buy: 'Buy Now', bag: 'Shopping Bag',
      empty: 'Your bag is empty', emptySub: 'Open a product page to add items.',
      notProduct: 'Open a product page', notProductSub: 'Browse this store and pick a product to get started.',
      subtotal: 'Subtotal', checkout: 'Checkout', viewBag: 'View all',
      remove: 'Remove', qty: 'Quantity', selectOption: 'Please select',
      back: 'Back', close: 'Close',
      howItWorks: 'How it works', privacy: 'Privacy',
      payLabel: 'Accepted payment methods',
      approxNote: 'Charged in KRW. International shipping is calculated after arrival.',
      excluded: 'We cannot ship this item to your country.',
      added: 'Added to your bag', maxQty: 'Up to 10 per item',
      testTitle: 'Prototype notice',
      testBody: 'Checkout is not connected in this prototype. Product recognition and the shopping bag run entirely inside the widget.',
      testBody2: 'Single-item purchase is connected to the live Delivered Korea order page. Try Buy Now on any product.',
      testOk: 'Got it', shipTo: 'Ships to',
      soldOut: 'Sold out', unavailable: 'Currently unavailable',
      unavailableSub: 'This item cannot be ordered right now.',
      allSoldOut: 'All choices are sold out',
      qtyMaxFmt: 'Up to {n} per item', pickRequired: 'Select all required options',
      buyThis: 'Buy this item only', buyThisShort: 'Buy only this',
      perItemNote: 'You can also order each item separately.',
      keepShopping: 'Keep shopping', errRequired: 'This option is required',
      steps: [
        'Add the products you want to your bag.',
        'Delivered Korea buys them from this store on your behalf.',
        'Items arrive at our Korean warehouse and are inspected.',
        'Request international shipping to your address.'
      ]
    },
    ko: {
      slogan: 'Shop Korea, Ship Worldwide',
      shipAvail: '{c}(으)로 배송 가능합니다',
      flow: ['여기서 주문', '대신 구매', '{c} 배송'],
      sloganShort: '한국 상품 구매',
      lead: '이 스토어에서 대신 구매해 배송해 드립니다.',
      navTitle: '한국에서 대신 구매해 드립니다',
      navTitleShort: '한국에서 대신 구매',
      navSub: '구매 대행부터 해외 배송까지',
      order: '주문하기', orderShort: '주문',
      nudge: '해외 배송 가능',
      add: '장바구니 담기', buy: '바로 구매', bag: '장바구니',
      empty: '장바구니가 비어 있습니다', emptySub: '상품 페이지에서 담을 수 있습니다.',
      notProduct: '상품 페이지에서 이용', notProductSub: '스토어를 둘러보고 상품을 선택해 주세요.',
      subtotal: '주문 금액', checkout: '결제하기', viewBag: '전체 보기',
      remove: '삭제', qty: '수량', selectOption: '선택해 주세요',
      back: '뒤로', close: '닫기',
      howItWorks: '이용 방법', privacy: '개인정보',
      payLabel: '이용 가능한 결제 수단',
      approxNote: '실제 결제는 원화로 진행되며, 국제 배송비는 입고 후 산정됩니다.',
      excluded: '해당 국가로 배송할 수 없는 상품입니다.',
      added: '장바구니에 담았습니다', maxQty: '상품당 최대 10개',
      testTitle: '프로토타입 안내',
      testBody: '이 프로토타입에서는 결제가 연동되어 있지 않습니다. 상품 인식과 장바구니는 위젯 내부에서 동작합니다.',
      testBody2: '단건 결제는 딜리버드코리아 실제 주문 페이지와 연동되어 있습니다. 바로 구매로 확인해 주세요.',
      testOk: '확인', shipTo: '배송',
      soldOut: '품절', unavailable: '판매 종료',
      unavailableSub: '현재 주문할 수 없는 상품입니다.',
      allSoldOut: '선택 가능한 옵션이 없습니다',
      qtyMaxFmt: '상품당 최대 {n}개', pickRequired: '필수 옵션을 모두 선택해 주세요',
      buyThis: '이 상품만 구매', buyThisShort: '개별 구매',
      perItemNote: '상품별로 따로 주문하실 수도 있습니다.',
      keepShopping: '계속 둘러보기', errRequired: '필수 선택 항목입니다',
      steps: [
        '원하는 상품을 장바구니에 담습니다.',
        '딜리버드코리아가 고객님을 대신해 이 스토어에서 구매합니다.',
        '상품이 한국 물류센터에 입고되어 검수됩니다.',
        '해외 주소로 배송을 신청합니다.'
      ]
    },
    ja: {
      slogan: 'Shop Korea, Ship Worldwide',
      shipAvail: '{c}へ配送できます',
      flow: ['ここで注文', '代理購入', '{c}へ配送'],
      sloganShort: '韓国から購入',
      lead: 'このストアで代理購入し、お届けします。',
      navTitle: '韓国から代理購入します',
      navTitleShort: '韓国から代理購入',
      navSub: '代理購入から海外配送まで',
      order: '注文する', orderShort: '注文',
      nudge: '海外配送対応',
      add: 'カートに追加', buy: '今すぐ購入', bag: 'カート',
      empty: 'カートは空です', emptySub: '商品ページから追加できます。',
      notProduct: '商品ページでご利用ください', notProductSub: 'ストアを見て商品をお選びください。',
      subtotal: '小計', checkout: 'ご購入手続きへ', viewBag: 'すべて見る',
      remove: '削除', qty: '数量', selectOption: '選択してください',
      back: '戻る', close: '閉じる',
      howItWorks: 'ご利用方法', privacy: 'プライバシー',
      payLabel: 'ご利用可能なお支払い方法',
      approxNote: 'お支払いは韓国ウォンです。国際送料は入荷後に算出されます。',
      excluded: 'この商品はお住まいの国へ配送できません。',
      added: 'カートに追加しました', maxQty: '1商品につき最大10点',
      testTitle: 'プロトタイプのご案内',
      testBody: 'このプロトタイプでは決済は接続されていません。商品認識とカートはウィジェット内で動作します。',
      testBody2: '単品購入はDelivered Koreaの実際の注文ページに接続されています。「今すぐ購入」からお試しください。',
      testOk: 'OK', shipTo: 'お届け先',
      soldOut: '在庫切れ', unavailable: '販売終了',
      unavailableSub: '現在ご注文いただけません。',
      allSoldOut: '選択できるオプションがありません',
      qtyMaxFmt: '1商品につき最大{n}点', pickRequired: '必須オプションをすべて選択してください',
      buyThis: 'この商品だけ購入', buyThisShort: '個別に購入',
      perItemNote: '商品ごとに個別でご注文いただけます。',
      keepShopping: '買い物を続ける', errRequired: '必須項目です',
      steps: [
        'ご希望の商品をカートに追加します。',
        'Delivered Koreaがお客様に代わってこのストアで購入します。',
        '商品が韓国の物流センターに入荷し検品されます。',
        '海外のご住所へ配送を申請します。'
      ]
    },
    zh: {
      slogan: 'Shop Korea, Ship Worldwide',
      shipAvail: '可配送至{c}',
      flow: ['在此下单', '代您购买', '配送至{c}'],
      sloganShort: '从韩国购买',
      lead: '我们在本店代购并寄送到您的国家。',
      navTitle: '由我们代您从韩国购买',
      navTitleShort: '代您从韩国购买',
      navSub: '代购与国际配送一站完成',
      order: '立即下单', orderShort: '下单',
      nudge: '支持国际配送',
      add: '加入购物车', buy: '立即购买', bag: '购物车',
      empty: '购物车是空的', emptySub: '请在商品页面添加商品。',
      notProduct: '请在商品页面使用', notProductSub: '浏览本店并选择想要的商品。',
      subtotal: '小计', checkout: '结算', viewBag: '查看全部',
      remove: '删除', qty: '数量', selectOption: '请选择',
      back: '返回', close: '关闭',
      howItWorks: '使用方法', privacy: '隐私',
      payLabel: '支持的支付方式',
      approxNote: '结算以韩元进行，国际运费于入库后计算。',
      excluded: '该商品无法配送至您所在的国家。',
      added: '已加入购物车', maxQty: '每件商品最多10件',
      testTitle: '原型说明',
      testBody: '此原型未接入结算功能。商品识别与购物车均在挂件内部运行。',
      testBody2: '单件购买已接入 Delivered Korea 实际下单页面，可通过“立即购买”体验。',
      testOk: '知道了', shipTo: '配送至',
      soldOut: '售罄', unavailable: '已停售',
      unavailableSub: '该商品目前无法下单。',
      allSoldOut: '没有可选的规格',
      qtyMaxFmt: '每件商品最多{n}件', pickRequired: '请选择全部必选项',
      buyThis: '仅购买此商品', buyThisShort: '单件购买',
      perItemNote: '也可以逐件分开下单。',
      keepShopping: '继续选购', errRequired: '此项为必选',
      steps: [
        '将想要的商品加入购物车。',
        'Delivered Korea 代您在本店购买。',
        '商品到达韩国仓库并完成检验。',
        '申请国际配送至您的地址。'
      ]
    }
  };

  var COUNTRY_LANG = { KR: 'ko', JP: 'ja', TW: 'zh', HK: 'zh', CN: 'zh', MO: 'zh' };

  function resolveLang() {
    if (CONFIG.lang && CONFIG.lang !== 'auto') return I18N[CONFIG.lang] ? CONFIG.lang : 'en';
    var sim = readOverride().simCountry;
    if (sim) return COUNTRY_LANG[sim] || 'en';
    var langs = navigator.languages || [navigator.language || 'en'];
    for (var i = 0; i < langs.length; i++) {
      var l = String(langs[i]).toLowerCase();
      if (l.indexOf('ko') === 0) return 'ko';
      if (l.indexOf('ja') === 0) return 'ja';
      if (l.indexOf('zh') === 0) return 'zh';
      if (l.indexOf('en') === 0) return 'en';
    }
    return 'en';
  }
  var LANG = resolveLang();
  var T = I18N[LANG] || I18N.en;

  /* ================================================================== *
   * 2. 해외 고객 판별
   * ================================================================== */
  var KO_TZ = ['Asia/Seoul', 'Asia/Pyongyang'];

  function guessCountry(tz, langs) {
    var map = {
      'America/New_York': 'US', 'America/Los_Angeles': 'US', 'America/Chicago': 'US',
      'Asia/Tokyo': 'JP', 'Asia/Taipei': 'TW', 'Asia/Hong_Kong': 'HK',
      'Asia/Shanghai': 'CN', 'Asia/Singapore': 'SG', 'Asia/Bangkok': 'TH',
      'Asia/Jakarta': 'ID', 'Asia/Manila': 'PH', 'Australia/Sydney': 'AU',
      'Europe/London': 'GB', 'Europe/Paris': 'FR', 'Europe/Berlin': 'DE'
    };
    if (map[tz]) return map[tz];
    var m = String(langs[0] || '').toUpperCase().match(/-([A-Z]{2})$/);
    return m ? m[1] : 'US';
  }

  function detectVisitor() {
    var sim = readOverride().simCountry;
    if (sim) return { country: sim, isOverseas: sim !== 'KR', source: 'simulated' };
    var tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
    var langs = navigator.languages || [navigator.language || ''];
    var isKoTz = KO_TZ.indexOf(tz) > -1;
    var isKoLang = langs.some(function (l) { return String(l).toLowerCase().indexOf('ko') === 0; });
    var overseas = !isKoTz && !isKoLang;
    return {
      country: overseas ? guessCountry(tz, langs) : 'KR',
      isOverseas: overseas, source: 'browser', tz: tz
    };
  }
  var VISITOR = detectVisitor();

  /* ================================================================== *
   * 3. 상품 정보 인식
   * ================================================================== */
  function toNumber(s) {
    var n = String(s || '').replace(/[^\d]/g, '');
    return n ? parseInt(n, 10) : 0;
  }

  function validProduct(p) {
    return !!(p && typeof p.name === 'string' && p.name.trim().length >= 2 &&
      isFinite(p.price) && p.price > 0 && p.images && p.images.length);
  }

  function fromJsonLd() {
    var nodes = document.querySelectorAll('script[type="application/ld+json"]');
    for (var i = 0; i < nodes.length; i++) {
      var data;
      try { data = JSON.parse(nodes[i].textContent); } catch (e) { continue; }
      var list = [];
      function collect(d, path) {
        if (Array.isArray(d)) { d.forEach(function (v, n) { collect(v, path + '[' + n + ']'); }); return; }
        if (!d || typeof d !== 'object') return;
        if ([].concat(d['@type'] || []).some(function (v) { return /(^|[/#])Product$/.test(v); })) list.push({ data: d, path: path });
        if (d['@graph']) collect(d['@graph'], path + '["@graph"]');
      }
      collect(data, '$');
      for (var j = 0; j < list.length; j++) {
        var d = list[j].data, base = list[j].path;
        var offers = Array.isArray(d.offers) ? d.offers : [d.offers || {}];
        for (var k = 0; k < offers.length; k++) {
          var offer = offers[k] || {};
          var offerPath = base + '.offers' + (Array.isArray(d.offers) ? '[' + k + ']' : '');
          var images = [].concat(d.image || []).map(function (image, index) {
            var value = typeof image === 'string' ? image : image && (image.url || image.contentUrl);
            return { value: value, path: base + '.image' + (Array.isArray(d.image) ? '[' + index + ']' : '') +
              (typeof image === 'object' && image ? (image.url ? '.url' : '.contentUrl') : '') };
          }).filter(function (image) { return typeof image.value === 'string' && image.value.trim(); });
          var p = {
            source: 'json-ld', name: typeof d.name === 'string' ? d.name.trim() : '', price: toNumber(offer.price),
            currency: offer.priceCurrency || 'KRW', images: images.map(function (image) { return image.value; }),
            sku: d.sku || '', brand: (d.brand && d.brand.name) || '',
            available: !offer.availability || /InStock/i.test(offer.availability), url: d.url || ''
          };
          if (!validProduct(p)) continue;
          p.fields = [jsonEvidence('상품명', nodes[i], i, base + '.name', d.name, p.name),
            jsonEvidence('가격', nodes[i], i, offerPath + '.price', offer.price, p.price),
            jsonEvidence('대표 이미지', nodes[i], i, images[0].path, images[0].value, p.images[0])];
          p.structure = parentChain(nodes[i], 'JSON-LD 상품 데이터');
          p.availabilityEvidence = jsonEvidence('판매 상태', nodes[i], i, offerPath + '.availability', offer.availability, p.available);
          return p;
        }
      }
    }
    return null;
  }

  function fromOpenGraph() {
    function meta(keys) {
      for (var i = 0; i < keys.length; i++) {
        var r = pickWithSel(['meta[property="' + keys[i] + '"]', 'meta[name="' + keys[i] + '"]']);
        if (r.el && r.el.getAttribute('content')) { r.value = r.el.getAttribute('content'); return r; }
      }
      return { el: null, sel: null, value: '' };
    }
    var name = meta(['og:title']), price = meta(['product:price:amount', 'og:price:amount']);
    var image = meta(['og:image']);
    var p = {
      source: 'opengraph', name: name.value.trim(), price: toNumber(price.value),
      currency: meta(['product:price:currency', 'og:price:currency']).value || 'KRW',
      images: [image.value].filter(Boolean), sku: '', brand: '',
      available: true, url: meta(['og:url']).value || ''
    };
    if (!validProduct(p)) return null;
    p.fields = [domEvidence('상품명', name, p.name, name.value), domEvidence('가격', price, p.price, price.value),
      domEvidence('대표 이미지', image, p.images[0], image.value)];
    p.structure = parentChain(name.el, 'OpenGraph 상품명').concat(parentChain(price.el, 'OpenGraph 가격'), parentChain(image.el, 'OpenGraph 이미지'));
    return p;
  }

  var ADAPTER = {
    isProductPage: ['meta[property="og:type"][content="product"]', '[data-gl-product]', '.product-detail'],
    name: ['[data-gl-name]', '.product-detail__name', '.prd-name', 'h1'],
    price: ['[data-gl-price]', '.product-detail__price .now', '.prd-price .now', '.price'],
    image: ['[data-gl-image] img', '.product-detail__gallery img', '.prd-image img'],
    optionSelect: ['[data-gl-options] select', '.product-detail__options select', 'select.prd-option'],
    soldOut: ['[data-gl-soldout]', '.is-soldout'],
    qtyInput: ['[data-gl-qty]', 'input[type=number][name*="qty" i]', 'input[type=number][name*="quantity" i]',
               'input[type=number][id*="qty" i]', 'input[type=number][id*="quantity" i]'],
    nativeAddToCart: ['[data-gl-native-cart]', '.btn-cart']
  };

  /* ---- 휴리스틱 사전 (다국어) ---- */
  var RE_SOLDOUT  = /(품절|일시품절|재고\s*없|매진|판매\s*종료|판매\s*중지|입고\s*대기|입고\s*예정|sold\s*out|out\s*of\s*stock|unavailable|在庫切れ|完売|売り切れ|售罄|缺货|已售完)/i;
  var RE_PLACEHOLDER = /(선택|고르|select|choose|please|請選擇|请选择|選択|選んで)/i;
  var RE_REQUIRED = /([*＊]|필수|required|必須|必选|必選)/;
  var RE_OPTIONAL = /(선택\s*사항|optional|任意|選択自由|选填|選填)/i;
  var RE_STOCK = /[(（\[]?\s*(?:재고|남은\s*수량|남음|remain(?:ing)?|stock|在庫|库存)\s*[:：]?\s*(\d+)\s*(?:개|점|ea|pcs|点|件)?\s*[)）\]]?/i;

  /* ---- 가맹점 선택자 매칭 ----
     '.foo' '#bar' '[data-x]' 를 그대로 받고, 'foo' 처럼 점 없이 적어도 class 로 해석한다.
     DK 표준 class(gl-soldout / gl-required / gl-stock)는 설정 없이도 항상 동작한다. */
  function normSel(v) {
    return String(v || '').split(',').map(function (s) {
      s = s.trim();
      if (!s) return '';
      return /^[.#\[]/.test(s) ? s : '.' + s;
    }).filter(Boolean).join(', ');
  }
  var SEL = {
    soldOut:  normSel((CONFIG.selSoldOut  ? CONFIG.selSoldOut  + ',' : '') + 'gl-soldout'),
    required: normSel((CONFIG.selRequired ? CONFIG.selRequired + ',' : '') + 'gl-required'),
    stock:    normSel((CONFIG.selStock    ? CONFIG.selStock    + ',' : '') + 'gl-stock')
  };
  function selfMatch(el, sel) {
    if (!el || !sel || !el.matches) return false;
    try { return el.matches(sel); } catch (e) { return false; }
  }
  function nearMatch(el, sel) {
    if (!el || !sel) return false;
    if (selfMatch(el, sel)) return true;
    try { return !!(el.closest && el.closest(sel)); } catch (e) { return false; }
  }
  function selCount(sel) {
    if (!sel) return 0;
    try { return document.querySelectorAll(sel).length; } catch (e) { return -1; }
  }

  /* 국가 코드를 사람이 읽는 이름으로 · 런처 안내 문구에 쓴다 */
  var COUNTRY = {
    en: { US:'the United States', JP:'Japan', TW:'Taiwan', SG:'Singapore', FR:'France',
          CN:'China', HK:'Hong Kong', TH:'Thailand', VN:'Vietnam', MY:'Malaysia',
          ID:'Indonesia', PH:'the Philippines', AU:'Australia', CA:'Canada',
          GB:'the United Kingdom', DE:'Germany', NL:'the Netherlands', MX:'Mexico' },
    ko: { US:'미국', JP:'일본', TW:'대만', SG:'싱가포르', FR:'프랑스', CN:'중국', HK:'홍콩',
          TH:'태국', VN:'베트남', MY:'말레이시아', ID:'인도네시아', PH:'필리핀',
          AU:'호주', CA:'캐나다', GB:'영국', DE:'독일', NL:'네덜란드', MX:'멕시코' },
    ja: { US:'アメリカ', JP:'日本', TW:'台湾', SG:'シンガポール', FR:'フランス', CN:'中国',
          HK:'香港', TH:'タイ', VN:'ベトナム', MY:'マレーシア', ID:'インドネシア',
          PH:'フィリピン', AU:'オーストラリア', CA:'カナダ', GB:'イギリス', DE:'ドイツ',
          NL:'オランダ', MX:'メキシコ' },
    zh: { US:'美国', JP:'日本', TW:'台湾', SG:'新加坡', FR:'法国', CN:'中国', HK:'香港',
          TH:'泰国', VN:'越南', MY:'马来西亚', ID:'印度尼西亚', PH:'菲律宾',
          AU:'澳大利亚', CA:'加拿大', GB:'英国', DE:'德国', NL:'荷兰', MX:'墨西哥' }
  };
  function countryName() {
    var t = COUNTRY[LANG] || COUNTRY.en;
    if(t[VISITOR.country]) return t[VISITOR.country];
    try { return new Intl.DisplayNames([LANG || 'en'], { type:'region' }).of(VISITOR.country); } catch(e) { return VISITOR.country; }
  }
  function shipAvailText() { return T.shipAvail.replace('{c}', countryName()); }

  function clampQty(n) {
    n = parseInt(n, 10);
    if (isNaN(n) || n < 1) return null;
    return Math.min(99, n);
  }

  function stockQty(n) {
    if (n === null || n === undefined || !/^\d+$/.test(String(n).trim())) return null;
    return Math.min(99, parseInt(n, 10));
  }

  /* 옵션 그룹명 및 필수 표기 탐지 */
  function optionLabelInfo(sel) {
    var explicit = sel.getAttribute('data-gl-option-name');
    var el = null;
    try {
      if (sel.id && window.CSS && CSS.escape) el = document.querySelector('label[for="' + CSS.escape(sel.id) + '"]');
    } catch (e) {}
    if (!el && sel.closest) el = sel.closest('label');
    if (!el) {
      var prev = sel.previousElementSibling;
      // 래퍼 단계까지 거슬러 올라가며 라벨 탐색
      if (!prev && sel.parentElement) prev = sel.parentElement.previousElementSibling;
      if (prev && /^(LABEL|SPAN|DIV|DT|TH|P|STRONG)$/.test(prev.tagName)) el = prev;
    }
    // 라벨 요소 텍스트는 이름과 별개로 보관한다.
    // data-gl-option-name 이 있어도 필수 표기(*)는 라벨에서 읽어야 하기 때문
    var labelText = (el ? el.textContent : '').replace(/\s+/g, ' ').trim();
    var raw = (explicit || labelText || sel.name || '').replace(/\s+/g, ' ').trim();
    var scan = labelText + ' ' + raw;
    return { name: raw.replace(RE_REQUIRED, '').replace(/[:：]\s*$/, '').trim() || raw,
             marked: RE_REQUIRED.test(scan), optional: RE_OPTIONAL.test(scan),
             at: elDesc(el), tag: openTag(el), preview: labelText };
  }

  /* 옵션별 판매 가능 여부 및 표시명 정제 */
  function parseOptionValue(o) {
    var raw = (o.textContent || '').replace(/\s+/g, ' ').trim();
    var stockAttr = o.getAttribute('data-gl-stock');
    var m = raw.match(RE_STOCK);
    var attrStock = stockAttr !== null ? stockQty(stockAttr) : null;
    var stock = attrStock !== null ? attrStock : (m ? stockQty(m[1]) : null);
    var soldOutReason = o.disabled ? 'disabled' : o.hasAttribute('data-gl-soldout') ? 'data-gl-soldout'
      : selfMatch(o, SEL.soldOut) ? 'merchant-class: ' + SEL.soldOut
      : RE_SOLDOUT.test(raw) ? 'sold-out-text' : stock === 0 ? (attrStock !== null ? 'data-gl-stock=0' : 'stock-text=0') : null;
    var soldOut =
      o.disabled ||
      o.hasAttribute('data-gl-soldout') ||
      selfMatch(o, SEL.soldOut) ||     // 가맹점이 알려준 class/id
      RE_SOLDOUT.test(raw) ||
      stock === 0;
    var label = raw
      .replace(RE_SOLDOUT, '')
      .replace(RE_STOCK, '')
      .replace(/[(（\[]\s*[)）\]]/g, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/[\-·,\/]\s*$/, '')
      .trim();
    return {
      value: o.value || raw,
      label: label || raw,
      raw: raw,
      extra: toNumber(o.getAttribute('data-extra')),
      soldOut: !!soldOut,
      stock: stock, soldOutReason: soldOutReason,
      at: elDesc(o), tag: openTag(o),
      stockSource: attrStock !== null ? 'data-gl-stock' : m ? 'stock-text' : null
    };
  }

  function pick(list) {
    for (var i = 0; i < list.length; i++) {
      var el = document.querySelector(list[i]);
      if (el) return el;
    }
    return null;
  }
  function pickAll(list) {
    for (var i = 0; i < list.length; i++) {
      var els = document.querySelectorAll(list[i]);
      if (els.length) return [].slice.call(els);
    }
    return [];
  }

  function fromSelectors() {
    var name = pickWithSel(ADAPTER.name), price = pickWithSel(ADAPTER.price);
    var image = pickWithSel(ADAPTER.image);
    var imageEls = pickAll(ADAPTER.image).filter(function (el) { return el.currentSrc || el.src; });
    image.el = imageEls[0] || null;
    var p = {
      source: 'selector', name: textPreview(name.el, 10000),
      price: toNumber(price.el ? price.el.textContent : ''), currency: 'KRW',
      images: imageEls.map(function (el) { return el.currentSrc || el.src; }),
      sku: '', brand: '', available: !pick(ADAPTER.soldOut), url: ''
    };
    if (!validProduct(p)) return null;
    p.fields = [domEvidence('상품명', name, p.name), domEvidence('가격', price, p.price),
      domEvidence('대표 이미지', image, p.images[0], p.images[0])];
    p.structure = parentChain(name.el, '상품명').concat(parentChain(price.el, '가격'), parentChain(image.el, '대표 이미지'));
    return p;
  }

  function resolveOriginUrl(parsed) {
    var canon = document.querySelector('link[rel="canonical"]');
    if (canon && canon.href) return canon.href;
    if (parsed && parsed.url) return parsed.url;
    return location.href;
  }

  function isProductPage() { return !!pick(ADAPTER.isProductPage); }

  function readOptions() { return readOptionsFrom(pickAll(ADAPTER.optionSelect)); }
  function readOptionsFrom(list) {
    return list.map(function (sel) {
      var info = optionLabelInfo(sel);
      var opts = [].slice.call(sel.options);
      var first = opts[0] ? (opts[0].textContent || '').trim() : '';
      var firstIsPlaceholder = opts[0] && !opts[0].value;
      var values = opts.filter(function (o) { return o.value; }).map(parseOptionValue);

      /* 필수 여부 판정 · 명시 속성 > 표준 속성 > 라벨 표기 > 플레이스홀더 > 보수적 기본값 */
      var required, requiredReason;
      if (sel.hasAttribute('data-gl-required')) {
        required = sel.getAttribute('data-gl-required') !== 'false';
        requiredReason = 'data-gl-required=' + sel.getAttribute('data-gl-required');
      } else if (nearMatch(sel, SEL.required)) {
        required = true; requiredReason = 'merchant-class: ' + SEL.required;
      } else if (info.optional) {
        required = false; requiredReason = 'optional-label';
      } else if (sel.required || sel.getAttribute('aria-required') === 'true' || info.marked) {
        required = true; requiredReason = sel.required ? 'required-attribute' : sel.getAttribute('aria-required') === 'true' ? 'aria-required=true' : 'required-label';
      } else if (firstIsPlaceholder && RE_PLACEHOLDER.test(first)) {
        required = true; requiredReason = 'placeholder-text';
      } else {
        // 대행 구매 모델은 오선택 리스크가 크므로 판단 불가 시 필수로 간주
        required = values.length > 0; requiredReason = required ? 'conservative-default' : 'no-values';
      }

      return {
        name: info.name || T.selectOption,
        required: required, requiredReason: requiredReason, at: elDesc(sel), tag: openTag(sel),
        requiredEvidence: requiredReason.indexOf('label') >= 0 ? { at: info.at, tag: info.tag, preview: info.preview }
          : requiredReason === 'placeholder-text' ? { at: elDesc(opts[0]), tag: openTag(opts[0]), preview: first }
          : { at: elDesc(nearMatch(sel, SEL.required) && !sel.hasAttribute('data-gl-required') ? sel.closest(SEL.required) : sel),
              tag: openTag(nearMatch(sel, SEL.required) && !sel.hasAttribute('data-gl-required') ? sel.closest(SEL.required) : sel) },
        structure: parentChain(sel, info.name || T.selectOption),
        source: (sel.hasAttribute('data-gl-required') || nearMatch(sel, SEL.required)) ? 'attr'
              : (sel.required || sel.getAttribute('aria-required') === 'true' || info.marked || info.optional) ? 'markup' : 'heuristic',
        values: values
      };
    });
  }

  /* 최대 주문 수량 · 명시 속성 > 수량 입력창 max > 옵션 재고 > 기본값 */
  function readMaxQty(options) {
    function result(value, source, el, preview) {
      return { value: value, source: source, at: elDesc(el), tag: openTag(el), preview: preview || '',
        structure: parentChain(el, '최대 주문 수량') };
    }
    var sEl = null;
    try { sEl = document.querySelector(SEL.stock); } catch (e) {}
    var sTxt = sEl ? (sEl.textContent || '').replace(/\s+/g, ' ').trim() : '';
    var sAttr = sEl ? sEl.getAttribute('data-gl-stock') : null;
    var sNum = sTxt.match(RE_STOCK) || sTxt.match(/(\d+)/);
    var sv = sAttr !== null ? stockQty(sAttr) : sNum ? stockQty(sNum[1]) : null;
    // Zero inventory must not be discarded by a truthiness check or a quantity limit.
    if (sv === 0) return result(0, 'merchant-class', sEl, sAttr !== null ? 'data-gl-stock=' + sAttr : sTxt);
    var el = document.querySelector('[data-gl-max-qty]');
    if (el) {
      var a = stockQty(el.getAttribute('data-gl-max-qty'));
      if (a !== null) return result(a, 'attr', el, 'data-gl-max-qty=' + el.getAttribute('data-gl-max-qty'));
    }
    if (sv !== null) return result(sv, 'merchant-class', sEl, sAttr !== null ? 'data-gl-stock=' + sAttr : sTxt);
    var q = pick(ADAPTER.qtyInput);
    if (q && q.getAttribute('max')) {
      var b = stockQty(q.getAttribute('max'));
      if (b !== null) return result(b, 'input-max', q, 'max=' + q.getAttribute('max'));
    }
    var best = null;
    (options || []).forEach(function (o) {
      o.values.forEach(function (v) {
        if (!v.soldOut && typeof v.stock === 'number' && v.stock > 0 && (!best || v.stock > best.stock)) best = v;
      });
    });
    if (best) return { value: Math.min(99, best.stock), source: 'option-stock', at: best.at, tag: best.tag,
      preview: best.raw, stockSource: best.stockSource };
    return { value: 10, source: 'default', at: null, tag: '', preview: '기본 수량 제한' };
  }

  /* ---- 인식 과정 기록 ----
     어떤 규칙이 걸렸고 어느 코드에서 값을 읽었는지 그대로 남겨 콘솔에서 보여준다 */
  function elDesc(el) {
    if (!el) return null;
    var s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    if (el.className && typeof el.className === 'string') {
      var c = el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2);
      if (c.length) s += '.' + c.join('.');
    }
    return s;
  }
  function openTag(el) {
    if (!el) return '';
    var attrs = [].slice.call(el.attributes || []).slice(0, 12).map(function (a) {
      return ' ' + a.name + '="' + String(a.value).slice(0, 160).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '"';
    }).join('');
    return '<' + el.tagName.toLowerCase() + attrs + '>';
  }
  function parentChain(el, label) {
    var chain = [], node = el;
    while (node && chain.length < 4 && !/^(BODY|HTML)$/.test(node.tagName)) {
      chain.push(node); node = node.parentElement;
    }
    return chain.map(function (entry, i) {
      return { label: label + (i ? ' 상위 ' + i : ''),
        path: chain.slice(i).reverse().map(elDesc).join(' > '), tag: openTag(entry) };
    });
  }
  function domEvidence(label, selected, value, preview) {
    return { label: label, sel: selected.sel, at: elDesc(selected.el), tag: openTag(selected.el), value: value,
      preview: preview === undefined ? textPreview(selected.el) : String(preview).slice(0, 180) };
  }
  function jsonEvidence(label, el, index, path, raw, value) {
    var subset = {}; subset[path] = raw === undefined ? null : raw;
    var json = JSON.stringify(subset).replace(/</g, '\\u003c');
    return { label: label, sel: 'script[type="application/ld+json"]',
      at: 'script[type="application/ld+json"][' + index + '] ' + path, path: path,
      tag: json, value: value, preview: json.length > 220 ? json.slice(0, 220) + '…' : json };
  }
  function textPreview(el, n) {
    if (!el) return '';
    var t = (el.textContent || '').replace(/\s+/g, ' ').trim();
    return t.length > (n || 48) ? t.slice(0, n || 48) + '…' : t;
  }
  function pickWithSel(list) {
    for (var i = 0; i < list.length; i++) {
      var el = null;
      try { el = document.querySelector(list[i]); } catch (e) {}
      if (el) return { el: el, sel: list[i] };
    }
    return { el: null, sel: null };
  }
  function firstMatchingSel(list) {
    for (var i = 0; i < list.length; i++) {
      try { if (document.querySelectorAll(list[i]).length) return list[i]; } catch (e) {}
    }
    return null;
  }
  var SOURCE_LABEL = {
    'json-ld': '페이지에 심어진 상품 데이터 (JSON-LD)',
    'opengraph': '공유용 메타 태그 (OpenGraph)',
    'selector': '화면에 보이는 요소를 직접 읽음'
  };

  function buildTrace(parsed) {
    var pt = pickWithSel(ADAPTER.isProductPage);
    var t = {
      url: location.href, isProduct: !!pt.el, markerPresent: !!pt.el, recognized: !!parsed,
      pageKind: pt.el ? 'detail-marker' : 'unclassified',
      recognitionReason: parsed ? 'valid-product-data' : pt.el ? 'detail-marker-invalid-product-data' : 'no-detail-marker',
      pageRule: pt.sel, pageAt: elDesc(pt.el), pageTag: openTag(pt.el), pageCandidates: ADAPTER.isProductPage,
      source: parsed ? parsed.source : null,
      sourceLabel: parsed ? (SOURCE_LABEL[parsed.source] || parsed.source) : null,
      fields: [], structure: parentChain(pt.el, '상품 상세 판별'),
      options: [], optionRule: null, maxQty: null, soldOut: null
    };
    if (parsed) {
      t.fields = parsed.fields || [];
      t.structure = t.structure.concat(parsed.structure || []);
      t.optionRule = firstMatchingSel(ADAPTER.optionSelect);
      t.options = (parsed.options || []).map(function (o) {
        t.structure = t.structure.concat(o.structure || []);
        return {
          name: o.name, required: o.required, requiredReason: o.requiredReason, requiredEvidence: o.requiredEvidence,
          source: o.source, at: o.at, tag: o.tag, total: o.values.length,
          soldOut: o.values.filter(function (v) { return v.soldOut; }).length,
          soldOutReason: o.allSoldOut ? 'all-option-values-sold-out' : null,
          sample: o.values.slice(0, 4).map(function (v) {
            return { label: v.label, soldOut: v.soldOut, soldOutReason: v.soldOutReason,
              stock: v.stock, stockSource: v.stockSource, at: v.at, tag: v.tag, preview: v.raw };
          })
        };
      });
      t.maxQty = parsed.maxQty;
      t.qtyAt = parsed.maxQty.at; t.qtyTag = parsed.maxQty.tag;
      t.structure = t.structure.concat(parsed.maxQty.structure || []);
      t.soldOut = parsed.soldOutEvidence || null;
    }
    if (!parsed) {
      ['meta[property="og:type"]','main','main > :first-child'].forEach(function(sel){
        var el=document.querySelector(sel);
        if(el) t.structure=t.structure.concat(parentChain(el,'페이지 구조'));
      });
    }
    var seen = {};
    t.structure = t.structure.filter(function (entry) {
      var key = entry.label + '|' + entry.path + '|' + entry.tag;
      if (seen[key]) return false;
      seen[key] = true; return true;
    }).slice(0, 32);
    return t;
  }

  var TRACE = null;

  function scrapeProduct() {
    var parsed = null;
    var parsers = [fromJsonLd, fromOpenGraph, fromSelectors];
    for (var i = 0; i < parsers.length; i++) {
      var candidate = parsers[i]();
      if (validProduct(candidate)) { parsed = candidate; break; }
    }
    if (!parsed) { TRACE = buildTrace(null); return null; }
    parsed.originUrl = resolveOriginUrl(parsed);
    parsed.options = readOptions();
    parsed.id = parsed.sku || parsed.originUrl;
    parsed.mapped = false;
    if (parsed.available === false) parsed.soldOutEvidence = Object.assign({ reason: 'json-ld-availability' }, parsed.availabilityEvidence || {});
    var so = pickWithSel(ADAPTER.soldOut);
    if (so.el) {
      parsed.available = false;
      parsed.soldOutEvidence = { reason: 'sold-out-marker', sel: so.sel, at: elDesc(so.el), tag: openTag(so.el), preview: textPreview(so.el) };
      parsed.structure = (parsed.structure || []).concat(parentChain(so.el, '품절 표기'));
    }
    parsed.maxQty = readMaxQty(parsed.options);
    if (parsed.maxQty.value === 0) {
      parsed.available = false;
      parsed.soldOutEvidence = { reason: 'zero-stock-or-quantity-limit', source: parsed.maxQty.source,
        at: parsed.maxQty.at, tag: parsed.maxQty.tag, preview: parsed.maxQty.preview };
    }
    parsed.options.forEach(function (o) {
      o.allSoldOut = o.values.length > 0 && o.values.every(function (v) { return v.soldOut; });
      if (o.required && o.allSoldOut) {
        parsed.available = false;
        parsed.soldOutEvidence = { reason: 'required-group-all-sold-out', name: o.name, at: o.at, tag: o.tag };
      }
    });
    parsed = applySiteSelectors(parsed);
    translateProduct(parsed);
    TRACE = buildTrace(parsed);
    return parsed;
  }

  /* ---- 화면에서 지정한 위치 적용 ----
     가맹점이 콘솔에서 클릭해 지정한 요소가 있으면 자동 인식보다 우선한다 */
  function q1(sel) { if (!sel) return null; try { return document.querySelector(sel); } catch (e) { return null; } }
  function qAll(sel) { if (!sel) return []; try { return [].slice.call(document.querySelectorAll(sel)); } catch (e) { return []; } }
  function applySiteSelectors(p) {
    p.picked = { name: false, brand: false, image: false, options: false };
    var el;
    if ((el = q1(CONFIG.selName))) {
      var nm = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (nm.length >= 2) { p.name = nm; p.picked.name = true;
        p.fields = (p.fields || []).filter(function (f) { return f.label !== '상품명'; });
        p.fields.unshift({ label: '상품명', sel: CONFIG.selName, at: elDesc(el), tag: openTag(el), value: nm, preview: nm, picked: true }); }
    }
    if ((el = q1(CONFIG.selBrand))) {
      var br = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (br) { p.brand = br; p.picked.brand = true;
        p.fields = (p.fields || []).concat([{ label: '브랜드명', sel: CONFIG.selBrand, at: elDesc(el), tag: openTag(el), value: br, preview: br, picked: true }]); }
    }
    if ((el = q1(CONFIG.selImage))) {
      var img = el.tagName === 'IMG' ? el : el.querySelector('img');
      var src = img ? (img.currentSrc || img.src) : '';
      if (src) { p.images = [src].concat(p.images.filter(function (u) { return u !== src; })); p.picked.image = true;
        p.fields = (p.fields || []).filter(function (f) { return f.label !== '대표 이미지'; })
          .concat([{ label: '대표 이미지', sel: CONFIG.selImage, at: elDesc(img), tag: openTag(img), value: src, preview: '', picked: true }]); }
    }
    var sels = qAll(CONFIG.selOptions);
    if (sels.length) {
      var selects = [];
      sels.forEach(function (n) { if (n.tagName === 'SELECT') selects.push(n); else selects = selects.concat([].slice.call(n.querySelectorAll('select'))); });
      if (selects.length) { p.options = readOptionsFrom(selects); p.picked.options = true; }
    }
    p.original = { name: p.name, brand: p.brand, image: p.images[0] || '',
      options: p.options.map(function (o) { return { name: o.name, values: o.values.map(function (v) { return { value: v.value, label: v.label }; }) }; }) };
    return p;
  }

  /* ---- 자동 번역 ----
     해외 고객 언어가 한국어가 아니고 translate=auto 이면 상품명·브랜드·옵션 이름·옵션 값을 번역해 표시한다.
     프로토타입은 공개 번역 API(MyMemory)를 브라우저에서 호출하고 결과를 이 브라우저에 저장한다.
     운영에서는 딜리버드코리아 서버가 번역·검수·캐시를 담당한다. */
  var TR_KEY = 'dkgl.tr.' + LANG;
  var trCache = {};
  try { trCache = JSON.parse(localStorage.getItem(TR_KEY) || '{}'); } catch (e) { trCache = {}; }
  function trSave() { try { localStorage.setItem(TR_KEY, JSON.stringify(trCache)); } catch (e) {} }
  function trFetch(text) {
    var tl = LANG === 'zh' ? 'zh-CN' : LANG;
    var url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text) + '&langpair=ko|' + tl;
    return fetch(url).then(function (r) { return r.json(); }).then(function (j) {
      var t = j && j.responseData && j.responseData.translatedText;
      if (!t || /QUERY LENGTH|INVALID|MYMEMORY WARNING|PLEASE SELECT/i.test(t)) throw new Error('bad');
      return t;
    });
  }
  var trStatus = 'off';   // off | pending | done | partial | error
  function translateProduct(p) {
    if (!p || CONFIG.translate !== 'auto' || LANG === 'ko') { trStatus = 'off'; return; }
    var strings = [p.original.name, p.original.brand];
    p.original.options.forEach(function (o) { strings.push(o.name); o.values.forEach(function (v) { strings.push(v.label); }); });
    strings = strings.filter(function (s, i, a) { return s && /[가-힣]/.test(s) && a.indexOf(s) === i; }).slice(0, 24);
    var missing = strings.filter(function (s) { return !trCache[s]; });
    var apply = function () {
      var tr = function (s) { return (s && trCache[s]) || s; };
      p.name = tr(p.original.name); p.brand = tr(p.original.brand);
      p.options.forEach(function (o, i) {
        var oo = p.original.options[i]; if (!oo) return;
        o.name = tr(oo.name);
        o.values.forEach(function (v, j) { if (oo.values[j]) v.label = tr(oo.values[j].label); });
      });
      p.translated = strings.some(function (s) { return trCache[s] && trCache[s] !== s; });
      p.translation = strings.map(function (s) { return { ko: s, tr: trCache[s] || null }; });
    };
    if (!missing.length) { if (trStatus !== 'partial' && trStatus !== 'error') trStatus = strings.length ? 'done' : 'off'; apply(); return; }
    trStatus = 'pending'; apply();
    var id = p.id, fail = 0;
    Promise.all(missing.map(function (s) {
      return trFetch(s).then(function (t) { trCache[s] = t; }, function () { fail++; });
    })).then(function () {
      trSave();
      if (!currentProduct || currentProduct.id !== id) return;
      trStatus = fail ? (fail === missing.length ? 'error' : 'partial') : 'done';
      refresh();   // 캐시가 채워졌으므로 다시 읽으면 번역이 반영된 상태로 렌더링·상태 전송
    });
  }

  /* ================================================================== *
   * 4. 장바구니
   * ================================================================== */
  var CART_KEY = 'dkgl.cart.' + CONFIG.key;
  var cart = [];
  function loadCart() {
    try { cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch (e) { cart = []; }
  }
  function saveCart() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {}
    syncState();
  }
  function cartCount() { return cart.reduce(function (a, b) { return a + b.qty; }, 0); }
  function cartTotal() { return cart.reduce(function (a, b) { return a + (b.price + (b.extra || 0)) * b.qty; }, 0); }
  function lineKey(p, opts) {
    return p.id + '|' + (opts || []).map(function (o) { return o.name + ':' + o.value; }).join(',');
  }
  function addToCart(p, opts, qty) {
    var key = lineKey(p, opts);
    var found = cart.filter(function (c) { return c.key === key; })[0];
    if (found) found.qty = Math.min(10, found.qty + qty);
    else cart.push({
      key: key, id: p.id, name: p.name, price: p.price,
      extra: (opts || []).reduce(function (a, o) { return a + (o.extra || 0); }, 0),
      image: p.images[0] || '', originUrl: p.originUrl, options: opts || [], qty: qty
    });
    saveCart();
  }

  /* ================================================================== *
   * 5. 통화
   * ================================================================== */
  function krw(n) { return '₩' + Number(n || 0).toLocaleString('ko-KR'); }
  function usd(n) { return '$' + (Number(n || 0) / CONFIG.fxRate).toFixed(2); }
  function money(n) { return CONFIG.currency === 'KRW' ? krw(n) : usd(n); }
  function moneySub(n) { return CONFIG.currency === 'KRW' ? usd(n) : krw(n); }

  /* ================================================================== *
   * 6. UI
   * ================================================================== */
  var host, shadow, root;
  var ui = { open: false, view: 'home', modal: null, nudge: true };
  var pendingFit = null;   // 런처 폭 실측 콜백

  function isMobile() { return window.innerWidth <= 640; }
  function launcherMode() { return CONFIG.launcher === 'nav' ? 'nav' : 'fab'; }
  function launcherH() {
    if (launcherMode() === 'fab') return isMobile() ? 56 : 60;
    return isMobile() ? 70 : 82;
  }

  var CSS = `
/* ==================================================================
   글로벌링크 위젯형 · 디자인 토큰
   컬러 hue 5 / 타입 6단계 / 스페이싱 7단계 / 라운드 4단계 / 그림자 3단계
   ================================================================== */
:host { all: initial; }
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
button, input, select { font: inherit; color: inherit; }

.gl {
  /* 브랜드 · DK 원색 팔레트 */
  --brand-soft:   #FFF3E9;
  --brand-accent: #FB6D0E;
  --brand:        #FB6D0E;
  --brand-hover:  #E45F05;
  --brand-text:   #FB6D0E;
  /* 중립 */
  --g-50:  #FAFAFA;
  --g-100: #F5F6F7;
  --g-200: #E6E8EC;   /* 구분선 */
  --g-300: #969CA4;   /* 경계선 */
  --g-500: #6E747B;   /* 보조 텍스트 */
  --g-700: #33373D;   /* 본문 보조 */
  --g-900: #0B0D12;   /* 본문 */
  /* 시맨틱 */
  --success: #0F8B45;
  --danger:  #C0272D;
  --danger-soft: #FDF3F3;
  --danger-line: #F2D4D5;
  /* 스페이싱 */
  --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px;
  --sp-5: 24px; --sp-6: 32px; --sp-7: 48px;
  /* 타이포 (배율 1.25) */
  --fs-xs: 13px; --fs-sm: 14px; --fs-md: 16px;
  --fs-lg: 20px; --fs-xl: 25px; --fs-2xl: 31px;
  /* 라운드 */
  --r-sm: 4px; --r-md: 8px; --r-lg: 12px; --r-full: 9999px;
  /* 그림자 */
  --sh-1: 0 1px 2px rgba(16,19,23,.06);
  --sh-2: 0 4px 12px rgba(16,19,23,.10);
  --sh-3: 0 12px 32px rgba(16,19,23,.16);
  /* 모션 */
  --d-fast: 150ms; --d-base: 250ms; --d-slow: 350ms;
  --ease-out: cubic-bezier(0, 0, .2, 1);

  font-family: "Wanted Sans Variable", "Wanted Sans", -apple-system, BlinkMacSystemFont,
               "Apple SD Gothic Neo", "Noto Sans KR", Pretendard, Roboto, sans-serif;
  color: var(--g-900);
  font-size: var(--fs-md);
  line-height: 1.7;
  letter-spacing: -.01em;
  word-break: keep-all;
  overflow-wrap: anywhere;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-variant-numeric: tabular-nums;
}
.gl :focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; border-radius: var(--r-sm); }

/* ================= 런처 ================= */
.launch { position: fixed; z-index: 2147483000; touch-action: none; user-select: none;
          display: flex; align-items: center; gap: var(--sp-3); }
.launch.right  { right: var(--sp-5); flex-direction: row-reverse; }
.launch.center { left: 50%; transform: translateX(-50%); }

/* 버튼형 */
.fab { position: relative; width: 64px; height: 64px; border-radius: var(--r-full); border: 0;
       padding: 0; cursor: pointer; flex-shrink: 0; background: #fff; box-shadow: var(--sh-2);
       display: grid; place-items: center;
       transition: box-shadow var(--d-fast) var(--ease-out), background var(--d-fast); }
.fab::after { content: ""; position: absolute; inset: 0; border-radius: var(--r-full);
              border: 2px solid var(--brand); }
.fab:hover { background: var(--brand-soft); box-shadow: var(--sh-3); }
.fab:active { background: #FBE7D6; }
.fab img { width: 38px; height: 38px; object-fit: contain; pointer-events: none; }

.badge { position: absolute; top: -4px; right: -4px; min-width: 24px; height: 24px;
  padding: 0 var(--sp-2); background: var(--brand); color: #fff; border: 2px solid #fff;
  border-radius: var(--r-full); font-size: var(--fs-xs); font-weight: 800; line-height: 1;
  display: grid; place-items: center; letter-spacing: 0; }

.nudge { background: var(--g-900); color: #fff; border-radius: var(--r-full);
  padding: var(--sp-3) var(--sp-4); font-size: var(--fs-sm); font-weight: 600;
  white-space: nowrap; box-shadow: var(--sh-2); display: flex; align-items: center; gap: var(--sp-2);
  line-height: 1.4; animation: nudgeIn var(--d-base) var(--ease-out); }
.nudge b { color: #FFC08F; font-weight: 800; }
.nudge .x { width: 24px; height: 24px; display: grid; place-items: center; border: 0;
            background: transparent; color: #C9CDD2; cursor: pointer; border-radius: var(--r-sm); }
.nudge .x:hover { color: #fff; }
@keyframes nudgeIn { from { opacity:0; transform: translateX(8px) } to { opacity:1; transform:none } }

/* 네비게이션형 · 바 전체가 열기 버튼 */
.nav { position: relative; width: 800px; max-width: calc(100vw - var(--sp-5)); background: #fff;
       border: 1px solid var(--g-200); border-radius: var(--r-lg); box-shadow: var(--sh-2);
       display: flex; align-items: center; gap: var(--sp-3);
       padding: var(--sp-3) var(--sp-3) var(--sp-3) var(--sp-4); cursor: pointer;
       transition: box-shadow var(--d-fast) var(--ease-out), border-color var(--d-fast);
       animation: navIn var(--d-base) var(--ease-out); }
@keyframes navIn { from { opacity:0; transform: translateY(12px) } to { opacity:1; transform:none } }
.nav:hover { box-shadow: var(--sh-3); border-color: var(--g-300); }

.nav .ava { width: 52px; height: 52px; border-radius: var(--r-md); background: var(--brand-soft);
            display: grid; place-items: center; flex-shrink: 0; }
.nav .ava img { width: 38px; height: 38px; object-fit: contain; }

.nav .tx { flex: 1; min-width: 0; }
.nav .tx .t { font-size: var(--fs-md); font-weight: 800; letter-spacing: -.02em; line-height: 1.4;
              white-space: nowrap; overflow: hidden; }
.nav .tx .s { display: flex; align-items: center; gap: var(--sp-2); margin-top: 2px;
              font-size: var(--fs-sm); color: var(--g-500); font-weight: 400; line-height: 1.5;
              white-space: nowrap; overflow: hidden; }
.nav .tx .s b { color: var(--g-900); font-weight: 800; }
.nav .tx .s i { width: 3px; height: 3px; border-radius: var(--r-full); background: var(--g-300);
                display: block; flex-shrink: 0; }

.nav .acts { display: flex; align-items: center; gap: var(--sp-2); flex-shrink: 0; }
.nav .cta { background: var(--brand); color: #fff; border: 0; border-radius: var(--r-md);
            cursor: pointer; font-size: var(--fs-md); font-weight: 800; letter-spacing: -.02em;
            padding: 0 var(--sp-4); height: 48px; display: inline-flex; align-items: center;
            gap: var(--sp-2); transition: background var(--d-fast); white-space: nowrap; }
.nav .cta:hover { background: var(--brand-hover); }
.nav .cta svg { width: 18px; height: 18px; flex-shrink: 0; }
/* 패널이 열려 있으면 화면당 primary 1개 원칙에 따라 강등 */
.launch.muted .cta { background: #fff; color: var(--g-700); border: 1px solid var(--g-300); }
.launch.muted .cta:hover { background: var(--g-100); }

.navbtn { position: relative; width: 48px; height: 48px; border: 1px solid var(--g-300);
          background: #fff; border-radius: var(--r-md); cursor: pointer; display: grid;
          place-items: center; color: var(--g-700); flex-shrink: 0;
          transition: background var(--d-fast), border-color var(--d-fast); }
.navbtn:hover { background: var(--g-100); border-color: var(--g-500); }
.navbtn svg { width: 24px; height: 24px; }
.navbtn .badge { top: -8px; right: -8px; }

/* 폭이 부족할 때 단계적으로 덜어낸다 · 자르지 않는다 */
.nav.d-ava .ava     { display: none; }
.nav.d-sub .tx .s   { display: none; }
.nav.d-tight        { gap: var(--sp-2); padding-left: var(--sp-3); }
.nav.d-tight .navbtn{ width: 44px; }
.nav.d-tight .tx .t { font-size: var(--fs-sm); }
.nav.d-tight .cta   { padding: 0 var(--sp-3); font-size: var(--fs-sm); }
.nav.d-tight .cta svg { display: none; }
.nav.d-bag .navbtn  { display: none; }
.nav.d-clip .tx .t,
.nav.d-clip .tx .s  { text-overflow: ellipsis; }

/* 모바일 · 문구를 줄이지 않고 두 줄로 편다 */
.nav.mob { flex-wrap: wrap; width: calc(100vw - var(--sp-4)); max-width: none;
           padding: var(--sp-3) var(--sp-4); gap: var(--sp-3) 0; }
.nav.mob .ava { display: none; }          /* 장식보다 문구에 폭을 준다 */
.nav.mob .tx { flex: 1 1 100%; }
.nav.mob .tx .t { white-space: normal; font-size: var(--fs-md); line-height: 1.35; }
.nav.mob .tx .s { white-space: normal; flex-wrap: wrap; font-size: var(--fs-xs); line-height: 1.5;
                  margin-top: 3px; }
.nav.mob .acts { flex: 1 0 100%; gap: var(--sp-2); }
.nav.mob .acts .cta { flex: 1; justify-content: center; }

/* 구매 절차 3단계 · 대행 구조를 먼저 보여준다 */
.steps { display: flex; align-items: stretch; gap: var(--sp-1); padding: var(--sp-3) var(--sp-5);
         border-bottom: 1px solid var(--g-200); background: #fff; }
.steps .st { flex: 1; min-width: 0; display: flex; align-items: center; gap: var(--sp-2); }
.steps .n { width: 20px; height: 20px; border-radius: var(--r-full); background: var(--brand-soft);
            color: var(--brand-text); font-size: 11px; font-weight: 800; display: grid;
            place-items: center; flex-shrink: 0; letter-spacing: 0; line-height: 1; }
.steps .lb { font-size: var(--fs-xs); font-weight: 600; color: var(--g-700); line-height: 1.4;
             min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.steps .ar { color: var(--g-300); display: flex; align-items: center; flex-shrink: 0; }
.steps .ar svg { width: 14px; height: 14px; }
@media (max-width: 640px) { .steps { padding: var(--sp-3) var(--sp-4); } }

/* ================= 패널 ================= */
.scrim { position: fixed; inset: 0; z-index: 2147483050; background: rgba(16,19,23,.5);
         animation: fade var(--d-base) var(--ease-out); }
@keyframes fade { from { opacity: 0 } to { opacity: 1 } }

.panel { position: fixed; z-index: 2147483100; width: 448px;
  max-height: min(760px, calc(100vh - 160px)); background: #fff; border-radius: var(--r-lg);
  box-shadow: var(--sh-3); display: flex; flex-direction: column; overflow: hidden;
  animation: panelIn var(--d-base) var(--ease-out); }
.panel.center { left: 50%; transform: translateX(-50%); }
@keyframes panelIn { from { opacity:0; transform: translateY(12px) } to { opacity:1 } }
.panel.mobile { left: 0; right: 0; bottom: 0; width: 100%; max-height: 88vh; transform: none;
  border-radius: var(--r-lg) var(--r-lg) 0 0; animation: sheetIn var(--d-slow) var(--ease-out); }
@keyframes sheetIn { from { transform: translateY(100%) } to { transform: none } }
.grab { padding: var(--sp-2) 0 0; display: grid; place-items: center; flex-shrink: 0; }
.grab i { width: 40px; height: 4px; border-radius: var(--r-full); background: var(--g-200); display: block; }

.ph { display: flex; align-items: center; gap: var(--sp-3); padding: var(--sp-3) var(--sp-4);
      flex-shrink: 0; border-bottom: 1px solid var(--g-200); min-height: 64px; }
.ph .logo { height: 28px; width: 84px; object-fit: contain; display: block; }
.ph h2 { font-size: var(--fs-lg); font-weight: 800; letter-spacing: -.02em; line-height: 1.3; }
.ph .sp { margin-left: auto; display: flex; align-items: center; gap: var(--sp-1); }
.icb { width: 44px; height: 44px; border: 0; background: transparent; border-radius: var(--r-md);
       cursor: pointer; display: grid; place-items: center; color: var(--g-700); position: relative;
       transition: background var(--d-fast); flex-shrink: 0; }
.icb:hover { background: var(--g-100); }
.icb svg { width: 24px; height: 24px; }
.icb .badge { top: 2px; right: 2px; min-width: 20px; height: 20px; }

.hero { display: flex; align-items: flex-start; gap: var(--sp-3); padding: var(--sp-4);
        background: var(--brand-soft); flex-shrink: 0; }
.hero img { width: 40px; height: 40px; object-fit: contain; flex-shrink: 0; margin-top: 2px; }
.hero .t { font-size: var(--fs-md); font-weight: 800; letter-spacing: -.02em; line-height: 1.4;
           color: var(--g-900); }
.hero .s { font-size: var(--fs-sm); color: var(--brand-text); line-height: 1.6; margin-top: var(--sp-1);
           font-weight: 400; }

.pb { flex: 1; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
.pb::-webkit-scrollbar { width: 8px; }
.pb::-webkit-scrollbar-thumb { background: var(--g-200); border-radius: var(--r-sm); border: 2px solid #fff; }

.sec { padding: var(--sp-5) var(--sp-4); }
.sec + .sec { border-top: var(--sp-2) solid var(--g-100); }
.sec-h { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3);
         margin-bottom: var(--sp-4); }
.sec-h h3 { font-size: var(--fs-md); font-weight: 800; letter-spacing: -.02em; color: var(--g-900); }
.sec-h .a { min-height: 44px; display: inline-flex; align-items: center; font-size: var(--fs-sm);
            font-weight: 600; color: var(--brand-text); cursor: pointer; background: none;
            border: 0; padding: 0 var(--sp-1); }
.sec-h .a:hover { text-decoration: underline; }

/* 상품 */
.prod { display: flex; gap: var(--sp-4); align-items: flex-start; }
.prod.dim .thumbwrap, .prod.dim .meta { opacity: .5; }
.thumbwrap { position: relative; flex-shrink: 0; }
.so-badge { position: absolute; inset: 0; border-radius: var(--r-md); background: rgba(16,19,23,.66);
            color: #fff; font-size: var(--fs-xs); font-weight: 800; display: grid; place-items: center; }
.prod .thumb { width: 88px; height: 88px; border-radius: var(--r-md); object-fit: cover;
               background: var(--g-100); border: 1px solid var(--g-200); display: block; }
.prod .meta { min-width: 0; flex: 1; }
.prod .bd { font-size: var(--fs-xs); font-weight: 600; color: var(--brand-text); line-height: 1.5; }
.prod .nm { font-size: var(--fs-md); font-weight: 600; line-height: 1.5; letter-spacing: -.01em;
            margin-top: var(--sp-1); display: -webkit-box; -webkit-line-clamp: 2;
            -webkit-box-orient: vertical; overflow: hidden; }
.prod .pr { display: flex; align-items: baseline; gap: var(--sp-2); margin-top: var(--sp-3);
            flex-wrap: wrap; }
.prod .pr .m { font-size: var(--fs-xl); font-weight: 800; letter-spacing: -.03em; line-height: 1.2; }
.prod .pr .s { font-size: var(--fs-sm); color: var(--g-500); font-weight: 400; }

.alert { margin-top: var(--sp-4); background: var(--danger-soft); border: 1px solid var(--danger-line);
         border-radius: var(--r-md); padding: var(--sp-3) var(--sp-4); display: flex;
         gap: var(--sp-2); align-items: flex-start; }
.alert svg { width: 20px; height: 20px; color: var(--danger); flex-shrink: 0; margin-top: 2px; }
.alert .at { font-size: var(--fs-sm); font-weight: 800; color: var(--danger); line-height: 1.5; }
.alert .as { font-size: var(--fs-sm); color: var(--g-700); margin-top: 2px; line-height: 1.6; }

/* 폼 */
.fld { margin-top: var(--sp-5); }
.fld:first-child { margin-top: 0; }
.fld > label { display: flex; align-items: center; gap: var(--sp-1); font-size: var(--fs-sm);
               font-weight: 600; color: var(--g-700); margin-bottom: var(--sp-2); line-height: 1.5; }
.fld > label .req { color: var(--brand-text); font-weight: 800; }
.fld > label .lbl-so { margin-left: auto; font-size: var(--fs-xs); font-weight: 600; color: var(--danger); }
.fld > label .lbl-hint { margin-left: auto; font-size: var(--fs-xs); font-weight: 400; color: var(--g-500); }
.sel { position: relative; }
.sel select { width: 100%; height: 48px; appearance: none; -webkit-appearance: none;
  padding: 0 var(--sp-7) 0 var(--sp-3); border: 1px solid var(--g-300); border-radius: var(--r-md);
  font-size: var(--fs-md); font-weight: 400; background: #fff; cursor: pointer;
  color: var(--g-900); line-height: 1.5;
  transition: border-color var(--d-fast), box-shadow var(--d-fast); }
.sel select:hover { border-color: var(--g-500); }
.sel select:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
.sel select:disabled { background: var(--g-100); color: var(--g-500); cursor: not-allowed; }
.sel select option:disabled { color: var(--g-500); }
.sel::after { content: ""; position: absolute; right: var(--sp-4); top: 50%; width: 8px; height: 8px;
  border-right: 2px solid var(--g-500); border-bottom: 2px solid var(--g-500);
  transform: translateY(-70%) rotate(45deg); pointer-events: none; }
.fld.err .sel select { border-color: var(--danger); }
.errmsg { display: flex; align-items: center; gap: var(--sp-1); margin-top: var(--sp-2);
          font-size: var(--fs-xs); font-weight: 600; color: var(--danger); line-height: 1.5; }
.errmsg svg { width: 16px; height: 16px; flex-shrink: 0; }

/* 버튼 */
.btn { border: 0; border-radius: var(--r-md); cursor: pointer; font-weight: 800;
       letter-spacing: -.02em; font-size: var(--fs-md); height: 48px; padding: 0 var(--sp-4);
       transition: background var(--d-fast), border-color var(--d-fast);
       display: inline-flex; align-items: center; justify-content: center; gap: var(--sp-2);
       position: relative; line-height: 1; }
.btn:disabled { opacity: .4; cursor: not-allowed; }
.btn-primary { background: var(--brand); color: #fff; }
.btn-primary:hover:not(:disabled) { background: var(--brand-hover); }
.btn-primary:active:not(:disabled) { background: #8F3600; }
.btn-outline { background: #fff; color: var(--g-900); border: 1px solid var(--g-300); }
.btn-outline:hover:not(:disabled) { background: var(--g-100); border-color: var(--g-500); }
.btn-outline:active:not(:disabled) { background: var(--g-200); }
.btn-block { width: 100%; }
.btn-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-2); }
.btn svg { width: 18px; height: 18px; }
.btn.is-loading { color: transparent; pointer-events: none; }
.btn.is-loading .spin { position: absolute; width: 20px; height: 20px; border-radius: var(--r-full);
  border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; animation: spin 700ms linear infinite; }
@keyframes spin { to { transform: rotate(360deg) } }

/* 장바구니 라인 */
.line { display: flex; gap: var(--sp-3); padding: var(--sp-4) 0; align-items: flex-start; }
.line:first-child { padding-top: 0; }
.line + .line { border-top: 1px solid var(--g-200); }
.line img { width: 64px; height: 64px; border-radius: var(--r-md); object-fit: cover;
            background: var(--g-100); border: 1px solid var(--g-200); flex-shrink: 0; }
.line .m { flex: 1; min-width: 0; }
.line .nm { font-size: var(--fs-sm); font-weight: 600; line-height: 1.6;
            display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.line .op { font-size: var(--fs-xs); color: var(--g-500); margin-top: var(--sp-1); line-height: 1.5; }
.line .bt { display: flex; align-items: center; gap: var(--sp-2); margin-top: var(--sp-3); }
.line .pr { font-size: var(--fs-md); font-weight: 800; letter-spacing: -.02em; margin-left: auto; }
.step { display: inline-flex; align-items: center; border: 1px solid var(--g-300);
        border-radius: var(--r-md); overflow: hidden; height: 46px; }
.step button { width: 44px; height: 100%; border: 0; background: #fff; cursor: pointer;
               color: var(--g-700); font-size: var(--fs-md); display: grid; place-items: center; }
.step button:hover:not(:disabled) { background: var(--g-100); }
.step button:disabled { color: var(--g-300); cursor: not-allowed; }
.step span { min-width: 36px; text-align: center; font-size: var(--fs-sm); font-weight: 800; }
.rmv { border: 0; background: transparent; color: var(--g-500); cursor: pointer;
       width: 44px; height: 44px; display: grid; place-items: center; border-radius: var(--r-md);
       transition: color var(--d-fast), background var(--d-fast); }
.rmv:hover { color: var(--danger); background: var(--danger-soft); }
.rmv svg { width: 20px; height: 20px; }
.linebuy { width: 100%; height: 44px; margin-top: var(--sp-3); border: 1px solid var(--g-300);
           background: #fff; color: var(--g-900); border-radius: var(--r-md); cursor: pointer;
           font-size: var(--fs-sm); font-weight: 800; letter-spacing: -.01em;
           display: inline-flex; align-items: center; justify-content: center; gap: var(--sp-2);
           transition: background var(--d-fast), border-color var(--d-fast); }
.linebuy:hover { background: var(--g-100); border-color: var(--g-500); }
.linebuy svg { width: 16px; height: 16px; }
.linebuy { position: relative; }
.linebuy.is-loading { color: transparent; pointer-events: none; }
.linebuy.is-loading svg { opacity: 0; }
.spin.dark { border-color: rgba(16,19,23,.18); border-top-color: var(--g-900); }
.linebuy .spin { position: absolute; width: 20px; height: 20px; border-radius: var(--r-full);
  border: 2px solid rgba(16,19,23,.18); border-top-color: var(--g-900);
  animation: spin 700ms linear infinite; }
.bagnote { display: flex; align-items: center; justify-content: center; gap: var(--sp-1);
           font-size: var(--fs-xs); color: var(--g-500); padding-top: var(--sp-4); line-height: 1.6; }

/* 빈 상태 */
.empty { text-align: center; padding: var(--sp-7) var(--sp-5); }
.empty img { width: 88px; margin: 0 auto var(--sp-4); display: block; }
.empty .t { font-size: var(--fs-lg); font-weight: 800; letter-spacing: -.02em; line-height: 1.3; }
.empty .s { font-size: var(--fs-sm); color: var(--g-500); margin-top: var(--sp-2); line-height: 1.7;
            max-width: 280px; margin-left: auto; margin-right: auto; }
.empty .btn { margin-top: var(--sp-5); }

/* 푸터 */
.pf { flex-shrink: 0; border-top: 1px solid var(--g-200); padding: var(--sp-4); background: #fff; }
.sum { display: flex; align-items: baseline; justify-content: space-between; gap: var(--sp-3);
       margin-bottom: var(--sp-4); }
.sum .l { font-size: var(--fs-md); font-weight: 600; color: var(--g-700); }
.sum .r { display: flex; align-items: baseline; gap: var(--sp-2); }
.sum .v { font-size: var(--fs-xl); font-weight: 800; letter-spacing: -.03em; line-height: 1.2; }
.sum .s { font-size: var(--fs-sm); color: var(--g-500); font-weight: 400; }
.fine { display: flex; align-items: flex-start; justify-content: center; gap: var(--sp-2);
        font-size: var(--fs-xs); color: var(--g-500); line-height: 1.6; margin-top: var(--sp-3);
        text-align: center; }
.fine svg { width: 16px; height: 16px; flex-shrink: 0; margin-top: 3px; }

/* 결제 수단 스트립 */
.paywrap { margin-top: var(--sp-4); padding-top: var(--sp-4); border-top: 1px solid var(--g-200); }
.paywrap .cap { font-size: var(--fs-xs); font-weight: 600; color: var(--g-500);
                text-align: center; margin-bottom: var(--sp-3); line-height: 1.5; }
.paywall { position: relative; overflow: hidden; padding: 1px 0;
  -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 15%, #000 85%, transparent 100%);
          mask-image: linear-gradient(90deg, transparent 0, #000 15%, #000 85%, transparent 100%); }
.pay-track { display: flex; align-items: center; gap: var(--sp-3); width: max-content;
             animation: payflow 30s linear infinite; }
.paywall:hover .pay-track { animation-play-state: paused; }
@keyframes payflow { from { transform: translateX(0) } to { transform: translateX(calc(-50% - 6px)) } }
.pay { width: 48px; height: 30px; border-radius: var(--r-sm); overflow: hidden;
       border: 1px solid var(--g-200); background: #fff; flex-shrink: 0; display: block; }
.pay img { width: 100%; height: 100%; object-fit: cover; display: block; }
@media (prefers-reduced-motion: reduce) { .pay-track { animation: none; } }

.foot { display: flex; align-items: center; gap: var(--sp-3); padding: var(--sp-2) var(--sp-4);
        background: var(--g-100); font-size: var(--fs-xs); color: var(--g-500); flex-shrink: 0; }
.foot button, .foot a { background: none; border: 0; color: var(--g-500); cursor: pointer;
        font-size: var(--fs-xs); font-weight: 400; text-decoration: underline; text-underline-offset: 2px;
        min-height: 44px; display: inline-flex; align-items: center; }
.foot button:hover, .foot a:hover { color: var(--g-900); }
.foot .cc { margin-left: auto; font-weight: 600; color: var(--g-700); }

/* 모달 */
.mov { position: fixed; inset: 0; z-index: 2147483200; background: rgba(16,19,23,.55);
       display: grid; place-items: center; padding: var(--sp-5);
       animation: fade var(--d-base) var(--ease-out); }
.modal { width: 448px; max-width: 100%; max-height: 84vh; background: #fff;
         border-radius: var(--r-lg); overflow: hidden; display: flex; flex-direction: column;
         box-shadow: var(--sh-3); animation: panelIn var(--d-base) var(--ease-out); }
.mh { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3);
      padding: var(--sp-4) var(--sp-2) var(--sp-3) var(--sp-5); }
.mh h2 { font-size: var(--fs-lg); font-weight: 800; letter-spacing: -.02em; line-height: 1.3; }
.mb { padding: 0 var(--sp-5) var(--sp-2); overflow-y: auto; }
.mf { padding: var(--sp-4) var(--sp-5) var(--sp-5); }
.note { background: var(--g-100); border-radius: var(--r-md); padding: var(--sp-4);
        font-size: var(--fs-sm); color: var(--g-700); line-height: 1.7; }
.note + .note { margin-top: var(--sp-3); }
.steps { counter-reset: s; }
.steps li { list-style: none; counter-increment: s; position: relative; padding-left: var(--sp-6);
            font-size: var(--fs-sm); line-height: 1.7; color: var(--g-700); }
.steps li + li { margin-top: var(--sp-4); }
.steps li::before { content: counter(s); position: absolute; left: 0; top: 2px; width: 24px; height: 24px;
  border-radius: var(--r-full); background: var(--brand-soft); color: var(--brand-text);
  font-size: var(--fs-xs); font-weight: 800; display: grid; place-items: center; }

/* 토스트 */
.toast { position: fixed; left: 50%; z-index: 2147483300; background: var(--g-900); color: #fff;
  font-size: var(--fs-sm); font-weight: 600; padding: var(--sp-3) var(--sp-5);
  border-radius: var(--r-full); box-shadow: var(--sh-3); display: flex; align-items: center;
  gap: var(--sp-2); line-height: 1.5; animation: toastIn var(--d-base) var(--ease-out); }
.toast svg { width: 20px; height: 20px; color: #4ADE80; flex-shrink: 0; }
@keyframes toastIn { from { opacity:0; transform: translate(-50%,10px) } to { opacity:1; transform: translate(-50%,0) } }

/* ================= PC 2단 그리드 (상품 화면) =================
   왼쪽: 상품 정보(큰 이미지 · 브랜드 · 상품명 · 가격 · 진행 단계 · 안내)
   오른쪽: 옵션 · 수량 · 행동 버튼 · 결제 수단 · 장바구니 미리보기 */
.panel.wide { width: 780px; max-height: min(640px, calc(100vh - 160px)); }
.pb.grid2 { display: grid; grid-template-columns: 300px minmax(0, 1fr); grid-template-rows: minmax(0, 1fr);
            align-items: stretch; overflow: hidden; min-height: 0; }
.colL { border-right: 1px solid var(--g-200); background: var(--g-50); padding: var(--sp-4);
        display: flex; flex-direction: column; gap: var(--sp-3); overflow-y: auto; min-height: 0; scrollbar-width: thin; }
.colR { display: flex; flex-direction: column; min-width: 0; overflow-y: auto; min-height: 0; }
.colR::-webkit-scrollbar { width: 8px; }
.colR::-webkit-scrollbar-thumb { background: var(--g-200); border-radius: var(--r-sm); border: 2px solid #fff; }
.colR .sec { padding: var(--sp-4); }
.colR .sec > .fld:first-child { margin-top: 0; }
.colR .pf { margin-top: auto; border-top: 1px solid var(--g-200); position: sticky; bottom: 0; z-index: 1; }
.colR .bagp { border-top: var(--sp-2) solid var(--g-100); }
.pinfo { position: relative; }
.pinfo .thumb-lg { width: 100%; aspect-ratio: 3 / 2; object-fit: cover; border-radius: var(--r-md);
                   border: 1px solid var(--g-200); background: #fff; display: block; }
.pinfo .so-badge { inset: auto var(--sp-2) var(--sp-2) auto; border-radius: var(--r-full);
                   padding: var(--sp-1) var(--sp-3); font-size: var(--fs-xs); position: absolute; }
.pinfo.dim .thumb-lg { opacity: .5; }
.pinfo .bd { font-size: var(--fs-xs); font-weight: 600; color: var(--brand-text); margin-top: var(--sp-3); }
.pinfo .nm { font-size: var(--fs-md); font-weight: 700; line-height: 1.45; letter-spacing: -.01em;
             margin-top: var(--sp-1); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.pinfo .pr { display: flex; align-items: baseline; gap: var(--sp-2); margin-top: var(--sp-2); flex-wrap: wrap; }
.pinfo .pr .m { font-size: var(--fs-xl); font-weight: 800; letter-spacing: -.03em; line-height: 1.2; }
.pinfo .pr .s { font-size: var(--fs-sm); color: var(--g-500); }
.pinfo .orig { font-size: var(--fs-xs); color: var(--g-500); margin-top: var(--sp-1); }
.colL .steps { padding: var(--sp-3) 0 0; border-top: 1px solid var(--g-200); border-bottom: 0; background: transparent;
               flex-direction: column; gap: var(--sp-2); }
.colL .steps .ar { display: none; }
.colL .steps .st { flex: none; }
.colL .lead { display: flex; gap: var(--sp-2); align-items: flex-start; font-size: var(--fs-xs);
              color: var(--g-700); line-height: 1.6; margin-top: auto; }
.colL .lead img { width: 28px; height: 28px; object-fit: contain; flex-shrink: 0; }
.colL .lead b { display: block; color: var(--g-900); font-weight: 800; font-size: var(--fs-sm); }
.colR .alert { margin: 0 0 var(--sp-4); }

/* 장바구니 2단 */
.pb.grid2.bag { grid-template-columns: minmax(0, 1fr) 300px; }
.bagL { overflow-y: auto; min-height: 0; padding: 0 var(--sp-4); scrollbar-width: thin; }
.bagL::-webkit-scrollbar { width: 8px; }
.bagL::-webkit-scrollbar-thumb { background: var(--g-200); border-radius: var(--r-sm); border: 2px solid #fff; }
.bagR { border-left: 1px solid var(--g-200); background: var(--g-50); padding: var(--sp-4);
        display: flex; flex-direction: column; gap: var(--sp-3); overflow-y: auto; min-height: 0; scrollbar-width: thin; }
.bagR .sumcard { background: #fff; border: 1px solid var(--g-200); border-radius: var(--r-md); padding: var(--sp-4); }
.bagR .sumcard .cnt { font-size: var(--fs-xs); font-weight: 600; color: var(--g-500); margin-bottom: var(--sp-2); }
.bagR .sum { flex-direction: column; align-items: flex-start; gap: var(--sp-1); margin-bottom: var(--sp-3); }
.bagR .sum .l { font-size: var(--fs-sm); }
.bagR .fine { margin-top: var(--sp-3); }
.bagR .paywrap { margin-top: 0; padding-top: 0; border-top: 0; }
.bagR .steps { margin-top: auto; }
.bagR .steps { padding: var(--sp-3) 0 0; border-top: 1px solid var(--g-200); border-bottom: 0; background: transparent;
               flex-direction: column; gap: var(--sp-2); }
.bagR .steps .ar { display: none; }
.bagR .steps .st { flex: none; }
.bagR .lead { display: flex; gap: var(--sp-2); align-items: flex-start; font-size: var(--fs-xs);
              color: var(--g-700); line-height: 1.6; margin-top: auto; }
.bagR .lead img { width: 28px; height: 28px; object-fit: contain; flex-shrink: 0; }
.bagR .lead b { display: block; color: var(--g-900); font-weight: 800; font-size: var(--fs-sm); }

/* ================= 반응형 ================= */
@media (max-width: 640px) {
  .launch.right { left: 50%; right: auto; transform: translateX(-50%); }
  .launch.left  { left: 50%; transform: translateX(-50%); }
  .nav { width: calc(100vw - var(--sp-6)); max-width: none;
         padding: var(--sp-2) var(--sp-1) var(--sp-2) var(--sp-3); gap: var(--sp-3); }
  .nav .ava { width: 48px; height: 48px; }
  .nav .ava img { width: 34px; height: 34px; }
  .nav .tx .t { font-size: var(--fs-sm); }
  .nav .tx .s { font-size: var(--fs-xs); }
  .nav .cta { font-size: var(--fs-sm); padding: 0 var(--sp-3); height: 44px; }
  .navbtn { width: 44px; height: 44px; }
  .mini { width: 36px; height: 44px; }
  .nav .divi { display: none; }
  .mov { padding: var(--sp-4); }
  .modal { width: 100%; }
  .toast { max-width: calc(100vw - var(--sp-6)); }
  .sec { padding: var(--sp-4); }
  .ph, .pf, .hero, .foot { padding-left: var(--sp-4); padding-right: var(--sp-4); }
}
`;

  var ICON = {
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>',
    ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13M13 6l6 6-6 6"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m20 6-11 11-5-5"/></svg>',
    chevDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z"/><path d="m9 12 2 2 4-4"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>'
  };

  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    for (var k in attrs || {}) {
      if (k === 'class') el.className = attrs[k];
      else if (k === 'html') el.innerHTML = attrs[k];
      else if (k === 'style') el.setAttribute('style', attrs[k]);
      else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) el.setAttribute(k, attrs[k]);
    }
    [].concat(children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  }

  function mount() {
    if (!document.getElementById('dk-gl-font')) {
      var l = document.createElement('link');
      l.id = 'dk-gl-font'; l.rel = 'stylesheet'; l.crossOrigin = 'anonymous';
      l.href = 'https://cdn.jsdelivr.net/gh/wanteddev/wanted-sans@v1.0.3/packages/wanted-sans/fonts/webfonts/variable/complete/WantedSansVariable.min.css';
      document.head.appendChild(l);
    }
    host = document.createElement('div');
    host.id = 'dk-global-link';
    host.setAttribute('data-gl-key', CONFIG.key);
    shadow = host.attachShadow({ mode: 'open' });
    var style = document.createElement('style');
    style.textContent = CSS;
    shadow.appendChild(style);
    root = document.createElement('div');
    root.className = 'gl';
    if (CONFIG.theme && /^#[0-9a-f]{6}$/i.test(CONFIG.theme) && CONFIG.theme.toLowerCase() !== '#fb6d0e') {
      /* 강조 색을 바꾸면 호버·연한 배경·강조 글자색도 같은 색에서 파생시킨다. 안 그러면 호버 시 기본 주황이 튀어나온다 */
      var hex = CONFIG.theme, rr = parseInt(hex.slice(1, 3), 16), gg = parseInt(hex.slice(3, 5), 16), bb = parseInt(hex.slice(5, 7), 16);
      var mix = function (r, g, b, t, w) { return 'rgb(' + Math.round(r + (t - r) * w) + ',' + Math.round(g + (t - g) * w) + ',' + Math.round(b + (t - b) * w) + ')'; };
      var lum = (0.2126 * rr + 0.7152 * gg + 0.0722 * bb) / 255;
      root.style.setProperty('--brand', hex);
      root.style.setProperty('--brand-hover', mix(rr, gg, bb, 0, 0.12));          // 12% 어둡게
      root.style.setProperty('--brand-soft', mix(rr, gg, bb, 255, 0.90));         // 90% 밝게
      root.style.setProperty('--brand-text', lum > 0.6 ? mix(rr, gg, bb, 0, 0.45) : hex);   // 밝은 색은 글자용으로 어둡게
    }
    shadow.appendChild(root);
    document.body.appendChild(host);
  }

  function toast(msg) {
    var pos = (isMobile() && ui.open) ? 'top:22px' : 'bottom:' + (launcherY() + launcherH() + 18) + 'px';
    var t = h('div', { class: 'toast', style: pos, role: 'status' }, [
      h('span', { html: ICON.check, style: 'display:flex' }), msg
    ]);
    root.appendChild(t);
    setTimeout(function () { t.remove(); }, 2200);
  }

  /* ---------------- 결제 수단 스트립 ---------------- */
  function payChip(p) {
    return h('span', { class: 'pay', title: p.label }, [
      h('img', { src: p.src, alt: p.label, loading: 'lazy' })
    ]);
  }
  function paymentStrip() {
    var items = PAYMENTS.map(payChip).concat(PAYMENTS.map(payChip));  // 무한 루프용 2회 반복
    return h('div', { class: 'paywrap' }, [
      h('div', { class: 'cap' }, T.payLabel),
      h('div', { class: 'paywall', 'aria-label': T.payLabel }, [
        h('div', { class: 'pay-track' }, items)
      ])
    ]);
  }

  /* ---------------- 런처 ---------------- */
  /* 런처는 화면 하단에 고정한다 · 위치 조정 기능 없음 */
  var LAUNCH_GAP = 24;

  function launcherY() { return LAUNCH_GAP; }

  function openPanel(view) {
    ui.open = true; ui.view = view || 'home'; ui.nudge = false; render();
  }

  function renderLauncher() {
    var count = cartCount();
    var mode = launcherMode();
    var mob = isMobile();
    var posClass = mode === 'nav' ? 'center' : 'right';
    // 패널이 열리면 화면당 primary 1개 원칙에 따라 런처 CTA 를 강등
    var wrap = h('div', {
      class: 'launch ' + posClass + (ui.open ? ' muted' : ''),
      style: 'bottom:' + launcherY() + 'px'
    }, []);

    if (mode === 'fab') {
      var fab = h('button', {
        class: 'fab', 'aria-label': T.slogan,
        onclick: function () { openPanel('home'); }
      }, [
        h('img', { src: ASSET.mascot, alt: '' }),
        count > 0 ? h('span', { class: 'badge' }, count > 99 ? '99+' : String(count)) : null
      ]);
      wrap.appendChild(fab);

      if (ui.nudge && !ui.open && count === 0) {
        wrap.appendChild(h('div', { class: 'nudge' }, [
          h('b', {}, countryName()), T.nudge,
          h('span', {
            class: 'x', html: '&times;', role: 'button', 'aria-label': T.close,
            onclick: function (e) { e.stopPropagation(); ui.nudge = false; render(); }
          })
        ]));
      }
      return wrap;
    }

    /* 네비게이션형
       PC   : 한 줄. 상품이 있으면 가격을 앞세운다.
       모바일: 두 줄. 슬로건과 배송 가능 국가를 그대로 보여준다. */
    var titleFull  = mob ? T.slogan : (currentProduct ? T.navTitle : T.slogan);
    var titleShort = mob ? T.slogan : (currentProduct ? T.navTitleShort : T.sloganShort);

    function fillSub(el, short) {
      while (el.firstChild) el.removeChild(el.firstChild);
      var nodes;
      if (mob) {
        // 모바일은 배송 가능 국가 한 문장만 · 가격은 패널에서 크게 보여준다
        nodes = [shipAvailText()];
      } else if (currentProduct) {
        nodes = short
          ? [h('b', {}, money(currentProduct.price)), h('i'), VISITOR.country]
          : [h('b', {}, money(currentProduct.price)),
             h('i'), T.shipTo + ' ' + VISITOR.country,
             h('i'), T.navSub];
      } else {
        nodes = short ? [T.shipTo + ' ' + VISITOR.country] : [T.navSub];
      }
      nodes.forEach(function (n) {
        el.appendChild(typeof n === 'string' ? document.createTextNode(n) : n);
      });
    }

    var bar = h('div', {
      class: 'nav' + (mob ? ' mob' : ''),
      role: 'button', tabindex: '0', 'aria-label': T.navTitle,
      onclick: function () { openPanel('home'); }
    }, [
      h('div', { class: 'ava' }, [h('img', { src: ASSET.mascot, alt: '' })]),
      h('div', { class: 'tx' }, [h('div', { class: 't' }), h('div', { class: 's' })]),
      h('div', { class: 'acts' }, [
        h('button', {
          class: 'navbtn', 'aria-label': T.bag,
          onclick: function (e) { e.stopPropagation(); openPanel('bag'); }
        }, [
          h('span', { html: ICON.bag, style: 'display:flex' }),
          count > 0 ? h('span', { class: 'badge' }, count > 99 ? '99+' : String(count)) : null
        ]),
        h('button', {
          class: 'cta',
          onclick: function (e) { e.stopPropagation(); openPanel('home'); }
        }, [T.order, h('span', { html: ICON.arrow, style: 'display:flex' })])
      ])
    ]);

    /* 폭이 부족하면 잘라내는 대신 덜 중요한 것부터 덜어낸다.
       기기 폭이 아니라 실제 문구 길이로 판단하므로 언어를 바꿔도 안전하다.
       모바일은 두 줄로 감싸므로 마스코트만 조정한다. */
    function fitNav() {
      var t = bar.querySelector('.tx .t');
      var s = bar.querySelector('.tx .s');
      var cta = bar.querySelector('.cta');
      bar.classList.remove('d-sub', 'd-ava', 'd-bag', 'd-tight', 'd-clip');
      t.textContent = titleFull; fillSub(s, false);
      cta.firstChild.nodeValue = T.order;

      if (mob) {
        // 두 줄 배치에서는 넘칠 일이 없다. 폭이 아주 좁을 때만 마스코트를 뺀다
        if (bar.scrollWidth > bar.clientWidth + 1) bar.classList.add('d-ava');
        return;
      }

      var over = function () {
        return t.scrollWidth > t.clientWidth + 1 || s.scrollWidth > s.clientWidth + 1;
      };
      if (!over()) return;
      t.textContent = titleShort; fillSub(s, true);
      if (!over()) return;
      cta.firstChild.nodeValue = T.orderShort;
      if (!over()) return;
      bar.classList.add('d-ava');   if (!over()) return;
      bar.classList.add('d-sub');   if (!over()) return;
      bar.classList.add('d-tight'); if (!over()) return;
      bar.classList.add('d-bag');   if (!over()) return;
      bar.classList.add('d-clip');
    }
    pendingFit = fitNav;

    bar.addEventListener('keydown', function (e) {
      if (e.target !== bar) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPanel('home'); }
    });

    wrap.appendChild(bar);
    return wrap;
  }

  /* ---------------- 패널 ---------------- */
  function panelHeader() {
    var count = cartCount();
    var left = ui.view === 'bag'
      ? h('button', { class: 'icb', 'aria-label': T.back, html: ICON.back,
          onclick: function () { ui.view = 'home'; render(); } })
      : h('img', { class: 'logo', src: ASSET.logo, alt: 'Delivered Korea' });

    return h('div', { class: 'ph' }, [
      left,
      ui.view === 'bag' ? h('h2', {}, T.bag) : null,
      h('div', { class: 'sp' }, [
        ui.view === 'home' ? h('button', {
          class: 'icb', 'aria-label': T.bag, onclick: function () { ui.view = 'bag'; render(); }
        }, [
          h('span', { html: ICON.bag, style: 'display:flex' }),
          count > 0 ? h('span', { class: 'badge' }, count > 99 ? '99+' : String(count)) : null
        ]) : null,
        h('button', { class: 'icb', 'aria-label': T.close, html: ICON.close,
          onclick: function () { ui.open = false; render(); } })
      ])
    ]);
  }

  function buildProductUI(p, layout) {
    var selected = {}, qty = 1;
    p.options.forEach(function (o) { selected[o.name] = ''; });

    var fieldEls = [];   // 인라인 오류 표시용 참조
    function clearErr(el) {
      el.classList.remove('err');
      var m = el.querySelector('.errmsg');
      if (m) m.remove();
    }
    var fields = p.options.map(function (o) {
      var box = h('div', { class: 'fld' }, [
        h('label', {}, [
          o.required ? h('span', { class: 'req', 'aria-hidden': 'true' }, '*') : null,
          o.name,
          o.allSoldOut ? h('span', { class: 'lbl-so' }, T.allSoldOut) : null
        ]),
        h('div', { class: 'sel' + (o.allSoldOut ? ' off' : '') }, [
          h('select', {
            'aria-label': o.name + (o.required ? ' (' + T.errRequired + ')' : ''),
            'aria-required': o.required ? 'true' : 'false',
            disabled: o.allSoldOut ? 'disabled' : null,
            onchange: function (e) { selected[o.name] = e.target.value; clearErr(box); }
          }, [h('option', { value: '' }, T.selectOption)].concat(
              o.values.map(function (v) {
                return h('option', {
                  value: v.value,
                  disabled: v.soldOut ? 'disabled' : null
                }, v.label
                   + (v.extra ? '  (+' + money(v.extra) + ')' : '')
                   + (v.soldOut ? '  · ' + T.soldOut : ''));
              })))
        ])
      ]);
      fieldEls.push({ name: o.name, el: box });
      return box;
    });

    var maxQty = (p.maxQty && p.maxQty.value) || 10;
    var qtyList = [];
    for (var qi = 1; qi <= maxQty; qi++) qtyList.push(qi);
    fields.push(h('div', { class: 'fld' }, [
      h('label', {}, [T.qty, maxQty < 10 ? h('span', { class: 'lbl-hint' },
        T.qtyMaxFmt.replace('{n}', String(maxQty))) : null]),
      h('div', { class: 'sel' }, [
        h('select', { 'aria-label': T.qty, onchange: function (e) { qty = parseInt(e.target.value, 10); } },
          qtyList.map(function (n) { return h('option', { value: String(n) }, String(n)); }))
      ])
    ]));

    /* PC 2단용 상품 정보 블록 */
    var info = h('div', { class: 'pinfo' + (p.available === false ? ' dim' : '') }, [
      h('img', { class: 'thumb-lg', src: p.images[0], alt: '' }),
      p.available === false ? h('span', { class: 'so-badge' }, T.soldOut) : null,
      p.brand ? h('div', { class: 'bd' }, p.brand) : null,
      h('div', { class: 'nm' }, p.name),
      h('div', { class: 'pr' }, [ h('span', { class: 'm' }, money(p.price)), h('span', { class: 's' }, moneySub(p.price)) ])
    ]);
    var alertBox = p.available === false ? h('div', { class: 'alert', role: 'status' }, [
      h('span', { html: ICON.warn, style: 'display:flex' }),
      h('div', {}, [ h('div', { class: 'at' }, T.unavailable), h('div', { class: 'as' }, T.unavailableSub) ])
    ]) : null;
    var fieldsOnly = layout === 'wide' ? h('div', { class: 'sec' }, [alertBox].concat(p.available === false ? [] : fields)) : null;

    var body = layout === 'wide' ? null : h('div', { class: 'sec' }, [
      h('div', { class: 'prod' + (p.available === false ? ' dim' : '') }, [
        h('div', { class: 'thumbwrap' }, [
          h('img', { class: 'thumb', src: p.images[0], alt: '' }),
          p.available === false ? h('span', { class: 'so-badge' }, T.soldOut) : null
        ]),
        h('div', { class: 'meta' }, [
          p.brand ? h('div', { class: 'bd' }, p.brand) : null,
          h('div', { class: 'nm' }, p.name),
          h('div', { class: 'pr' }, [
            h('span', { class: 'm' }, money(p.price)),
            h('span', { class: 's' }, moneySub(p.price))
          ])
        ])
      ]),
      p.available === false ? h('div', { class: 'alert', role: 'status' }, [
        h('span', { html: ICON.warn, style: 'display:flex' }),
        h('div', {}, [
          h('div', { class: 'at' }, T.unavailable),
          h('div', { class: 'as' }, T.unavailableSub)
        ])
      ]) : null
    ].concat(p.available === false ? [] : fields));

    var blocked = p.available === false;
    var footer = h('div', { class: 'pf' }, [
      h('div', { class: 'btn-row', style: 'margin-top:0' }, [
        h('button', {
          class: 'btn btn-outline', disabled: blocked ? 'disabled' : null,
          onclick: function () {
            var missing = p.options.filter(function (o) { return o.required && !selected[o.name]; })
                            .map(function (o) { return o.name; });
            // 오류는 색 · 아이콘 · 문구 3중으로 해당 필드 옆에 인라인 표시
            fieldEls.forEach(function (f) { clearErr(f.el); });
            if (missing.length) {
              fieldEls.forEach(function (f) {
                if (missing.indexOf(f.name) === -1) return;
                f.el.classList.add('err');
                f.el.appendChild(h('div', { class: 'errmsg', role: 'alert' }, [
                  h('span', { html: ICON.warn, style: 'display:flex' }), T.errRequired
                ]));
              });
              var firstEl = fieldEls.filter(function (f) { return missing.indexOf(f.name) > -1; })[0];
              if (firstEl) { var s = firstEl.el.querySelector('select'); if (s) s.focus(); }
              return;
            }
            var opts = p.options.map(function (o) {
              var v = o.values.filter(function (x) { return x.value === selected[o.name]; })[0];
              return {
                name: o.name, value: selected[o.name],
                label: v ? v.label : selected[o.name], extra: v ? v.extra : 0
              };
            }).filter(function (o) { return o.value; });
            addToCart(p, opts, qty);
            ui.view = 'bag'; render(); toast(T.added);
          }
        }, T.add),
        (function () {
          var b = h('button', {
            class: 'btn btn-primary', disabled: blocked ? 'disabled' : null,
            onclick: function () {
              if (blocked) return;
              withLoading(b, function () { buyNow(p); });
            }
          }, [T.buy, h('span', { html: ICON.ext, style: 'display:flex' })]);
          return b;
        })()
      ]),
      paymentStrip()
    ]);

    return { body: body, footer: footer, info: info, fieldsOnly: fieldsOnly };
  }

  function cartLine(line, compact) {
    return h('div', { class: 'line' }, [
      h('img', { src: line.image, alt: '' }),
      h('div', { class: 'm' }, [
        h('div', { class: 'nm' }, line.name),
        line.options && line.options.length
          ? h('div', { class: 'op' }, line.options.map(function (o) { return o.label || o.value; }).join(' · '))
          : null,
        h('div', { class: 'bt' }, compact ? [
          h('span', { class: 'op', style: 'margin-top:0' }, T.qty + ' ' + line.qty),
          h('span', { class: 'pr' }, money((line.price + (line.extra || 0)) * line.qty))
        ] : [
          h('div', { class: 'step' }, [
            h('button', { 'aria-label': '-', disabled: line.qty <= 1 ? 'disabled' : null,
              onclick: function () { if (line.qty > 1) { line.qty--; saveCart(); render(); } } }, '\u2212'),
            h('span', {}, String(line.qty)),
            h('button', { 'aria-label': '+', onclick: function () {
              if (line.qty >= 10) { toast(T.maxQty); return; }
              line.qty++; saveCart(); render();
            } }, '+')
          ]),
          h('span', { class: 'pr' }, money((line.price + (line.extra || 0)) * line.qty)),
          h('button', { class: 'rmv', 'aria-label': T.remove, html: ICON.trash,
            onclick: function () {
              cart = cart.filter(function (c) { return c.key !== line.key; });
              saveCart(); render();
            } })
        ]),
        compact ? null : (function () {
          var b = h('button', {
            class: 'linebuy',
            onclick: function () { withLoading(b, function () { buyLine(line); }, true); }
          }, [T.buyThis, h('span', { html: ICON.ext, style: 'display:flex' })]);
          return b;
        })()
      ])
    ]);
  }

  function bagPreview() {
    if (!cart.length) return null;
    return h('div', { class: 'sec' }, [
      h('div', { class: 'sec-h' }, [
        h('h3', {}, T.bag + ' (' + cartCount() + ')'),
        h('button', { class: 'a', onclick: function () { ui.view = 'bag'; render(); } }, T.viewBag)
      ]),
      h('div', {}, cart.slice(0, 2).map(function (l) { return cartLine(l, true); }))
    ]);
  }

  function emptyState(title, sub, action) {
    return h('div', { class: 'empty' }, [
      h('img', { src: ASSET.mascot, alt: '' }),
      h('div', { class: 't' }, title),
      h('div', { class: 's' }, sub),
      action || null
    ]);
  }
  /* 빈 상태에는 항상 다음 행동 버튼을 둔다 */
  function continueBtn() {
    return h('button', {
      class: 'btn btn-outline',
      onclick: function () { ui.open = false; render(); }
    }, T.keepShopping);
  }

  /* 대행 구매라는 구조를 주문 전에 3단계로 드러낸다 */
  function stepStrip() {
    var labels = T.flow.map(function (s) { return s.replace('{c}', VISITOR.country); });
    var kids = [];
    labels.forEach(function (lb, i) {
      if (i > 0) kids.push(h('div', { class: 'ar', html: ICON.arrow }));
      kids.push(h('div', { class: 'st' }, [
        h('span', { class: 'n' }, String(i + 1)),
        h('span', { class: 'lb' }, lb)
      ]));
    });
    return h('div', { class: 'steps' }, kids);
  }

  function renderPanel(product) {
    var mob = isMobile();
    var body, footer = null, wide = false;

    if (ui.view === 'bag' && cart.length && !mob) {
      /* PC 2단: 왼쪽 담은 상품 목록, 오른쪽 주문 요약·결제 버튼·결제 수단·진행 단계 */
      wide = true;
      var bagLeft = h('div', { class: 'bagL' }, [
        h('div', { class: 'sec', style: 'padding-left:0;padding-right:0' },
          cart.map(function (l) { return cartLine(l, false); })
            .concat([h('div', { class: 'bagnote' }, T.perItemNote)]))
      ]);
      var bagRight = h('div', { class: 'bagR' }, [
        h('div', { class: 'sumcard' }, [
          h('div', { class: 'cnt' }, T.bag + ' (' + cartCount() + ')'),
          h('div', { class: 'sum' }, [
            h('span', { class: 'l' }, T.subtotal),
            h('span', { class: 'r' }, [
              h('span', { class: 'v' }, money(cartTotal())),
              h('span', { class: 's' }, moneySub(cartTotal()))
            ])
          ]),
          h('button', { class: 'btn btn-primary btn-block', onclick: openCheckoutNotice }, T.checkout),
          h('div', { class: 'fine' }, [
            h('span', { html: ICON.shield, style: 'display:flex' }),
            h('span', {}, T.approxNote)
          ])
        ]),
        paymentStrip(),
        stepStrip()
      ]);
      body = h('div', { class: 'pb grid2 bag' }, [bagLeft, bagRight]);
    } else if (ui.view === 'bag') {
      body = cart.length
        ? h('div', { class: 'sec' },
            cart.map(function (l) { return cartLine(l, false); })
              .concat([h('div', { class: 'bagnote' }, T.perItemNote)]))
        : emptyState(T.empty, T.emptySub, continueBtn());
      if (cart.length) {
        footer = h('div', { class: 'pf' }, [
          h('div', { class: 'sum' }, [
            h('span', { class: 'l' }, T.subtotal),
            h('span', { class: 'r' }, [
              h('span', { class: 'v' }, money(cartTotal())),
              h('span', { class: 's' }, moneySub(cartTotal()))
            ])
          ]),
          h('button', { class: 'btn btn-primary btn-block', onclick: openCheckoutNotice }, T.checkout),
          h('div', { class: 'fine' }, [
            h('span', { html: ICON.shield, style: 'display:flex' }),
            h('span', {}, T.approxNote)
          ]),
          paymentStrip()
        ]);
      }
    } else {
      var secs = [
        h('div', { class: 'hero' }, [
          h('img', { src: ASSET.symbol, alt: '' }),
          h('div', {}, [
            h('div', { class: 't' }, T.slogan),
            h('div', { class: 's' }, T.lead)
          ])
        ]),
        stepStrip()
      ];
      if (product && !mob) {
        /* PC 2단: 왼쪽 상품 정보, 오른쪽 옵션·버튼·결제수단·장바구니 */
        var pw = buildProductUI(product, 'wide');
        var left = h('div', { class: 'colL' }, [
          pw.info,
          stepStrip(),
          h('div', { class: 'lead' }, [ h('img', { src: ASSET.symbol, alt: '' }),
            h('div', {}, [ h('b', {}, T.slogan), T.lead ]) ])
        ]);
        var rightKids = [pw.fieldsOnly, pw.footer];
        var bpw = bagPreview(); if (bpw) rightKids.push(bpw);
        var right = h('div', { class: 'colR' }, rightKids);
        wide = true;
        body = h('div', { class: 'pb grid2' }, [left, right]);
      } else if (product) {
        var pui = buildProductUI(product);
        secs.push(pui.body);
        footer = pui.footer;
      } else {
        secs.push(emptyState(T.notProduct, T.notProductSub, continueBtn()));
        secs.push(h('div', { class: 'sec', style: 'padding-top:0' }, [paymentStrip()]));
      }
      if (!wide) { var bp = bagPreview(); if (bp) secs.push(bp); body = h('div', {}, secs); }
    }

    var kids = [];
    if (mob) kids.push(h('div', { class: 'grab' }, [h('i')]));
    kids.push(panelHeader());
    kids.push(wide ? body : h('div', { class: 'pb' }, [body]));
    if (footer) kids.push(footer);
    kids.push(h('div', { class: 'foot' }, [
      h('button', { onclick: openHowTo }, T.howItWorks),
      h('span', { class: 'sep' }, '·'),
      h('a', { href: 'https://www.delivered.co.kr/en/privacy', target: '_blank', rel: 'noopener' }, T.privacy),
      h('span', { class: 'cc' }, T.shipTo + ' ' + VISITOR.country)
    ]));

    var centered = launcherMode() === 'nav';
    var style = mob ? '' :
      (centered ? '' : 'right:24px;') +
      'bottom:' + (launcherY() + launcherH() + 14) + 'px;';

    return h('div', {
      class: 'panel' + (mob ? ' mobile' : (centered ? ' center' : '')) + (wide ? ' wide' : ''),
      style: style
    }, kids);
  }

  /* ---------------- 모달 ---------------- */
  function closeModal() { ui.modal = null; render(); }

  function modalShell(title, bodyNodes, footerNodes) {
    return h('div', {
      class: 'mov',
      onclick: function (e) { if (e.target.classList.contains('mov')) closeModal(); }
    }, [
      h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' }, [
        h('div', { class: 'mh' }, [
          h('h2', {}, title),
          h('button', { class: 'icb', 'aria-label': T.close, html: ICON.close, onclick: closeModal })
        ]),
        h('div', { class: 'mb' }, bodyNodes),
        h('div', { class: 'mf' }, footerNodes)
      ])
    ]);
  }

  function openCheckoutNotice() {
    ui.modal = function () {
      return modalShell(T.testTitle, [
        h('div', { class: 'note' }, T.testBody),
        h('div', { class: 'note' }, T.testBody2),
        paymentStrip()
      ], [h('button', { class: 'btn btn-primary btn-block', onclick: closeModal }, T.testOk)]);
    };
    render();
  }

  function openHowTo() {
    ui.modal = function () {
      return modalShell(T.howItWorks, [
        h('ol', { class: 'steps', style: 'padding:8px 0 4px' },
          T.steps.map(function (s) { return h('li', {}, s); })),
        paymentStrip()
      ], [h('button', { class: 'btn btn-primary btn-block', onclick: closeModal }, T.testOk)]);
    };
    render();
  }

  /* 로딩 상태 · 1초 이상 걸리는 액션은 중복 제출을 막고 진행을 표시한다 */
  function withLoading(btn, fn, dark) {
    if (btn.classList.contains('is-loading')) return;
    btn.classList.add('is-loading');
    var sp = h('span', { class: 'spin' + (dark ? ' dark' : '') });
    btn.appendChild(sp);
    try { fn(); } catch (e) {}
    setTimeout(function () {
      btn.classList.remove('is-loading');
      if (sp.parentNode) sp.remove();
    }, 1000);
  }

  /* ---------------- 단건 결제 ---------------- */
  function openPurchase(url) {
    if (CONFIG.excludeCountries.indexOf(VISITOR.country) > -1) { toast(T.excluded); return false; }
    if (!url) return false;
    window.open(CONFIG.purchaseEndpoint + encodeURIComponent(url), '_blank', 'noopener');
    return true;
  }
  function buyNow(product) { openPurchase(product.originUrl); }
  /* 장바구니 라인 단위 개별 결제 */
  function buyLine(line) { openPurchase(line.originUrl); }

  /* ---------------- 렌더 ---------------- */
  var currentProduct = null;

  function render() {
    if (!root) return;
    root.innerHTML = '';
    pendingFit = null;
    root.appendChild(renderLauncher());
    if (ui.open) {
      if (isMobile()) root.appendChild(h('div', { class: 'scrim',
        onclick: function () { ui.open = false; render(); } }));
      root.appendChild(renderPanel(currentProduct));
    }
    if (ui.modal) root.appendChild(ui.modal());
    // 레이아웃이 확정된 뒤에 런처 문구 폭을 실측한다
    if (pendingFit) {
      var fit = pendingFit;
      if (window.requestAnimationFrame) requestAnimationFrame(fit); else setTimeout(fit, 0);
    }
  }

  /* ================================================================== *
   * 7. 부팅
   * ================================================================== */
  function boot() {
    if (CONFIG.enabled === false || CONFIG.enabled === 'false') {
      window.__DK_GL_STATE__ = { rendered: false, reason: 'not-installed', visitor: VISITOR };
      notifyParent(); return;
    }
    if (CONFIG.overseasOnly && !VISITOR.isOverseas) {
      window.__DK_GL_STATE__ = { rendered: false, reason: 'domestic', visitor: VISITOR };
      notifyParent(); return;
    }
    if (CONFIG.excludeCountries.indexOf(VISITOR.country) > -1) {
      window.__DK_GL_STATE__ = { rendered: false, reason: 'excluded-country', visitor: VISITOR };
      notifyParent(); return;
    }

    loadCart();
    mount();
    refresh();
    setTimeout(function () { if (ui.nudge && !ui.open) { ui.nudge = false; render(); } }, 8000);

    var lastUrl = location.href;
    setInterval(function () {
      if (location.href !== lastUrl) { lastUrl = location.href; refresh(); }
    }, 400);
    window.addEventListener('hashchange', refresh);
    window.addEventListener('popstate', refresh);
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (ui.modal) closeModal();
        else if (ui.open) { ui.open = false; render(); }
      }
    });
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { syncState(); render(); }, 150);
    });

    document.addEventListener('click', function (e) {
      if (!currentProduct || !e.target.closest) return;
      var t = e.target.closest(ADAPTER.nativeAddToCart.join(','));
      if (t && t.hasAttribute('data-gl-intercept')) {
        e.preventDefault(); e.stopPropagation();
        openPanel('home');
      }
    }, true);
  }

  function refresh() {
    currentProduct = isProductPage() ? scrapeProduct() : null;
    if (!currentProduct) TRACE = buildTrace(null);
    window.__DK_GL_STATE__ = {
      rendered: true, visitor: VISITOR, lang: LANG, currency: CONFIG.currency,
      device: isMobile() ? 'mobile' : 'desktop',
      launcher: launcherMode(),
      trace: TRACE,
      selectors: {
        soldOut:  { input: CONFIG.selSoldOut,  used: SEL.soldOut,  count: selCount(CONFIG.selSoldOut ? normSel(CONFIG.selSoldOut) : SEL.soldOut) },
        required: { input: CONFIG.selRequired, used: SEL.required, count: selCount(CONFIG.selRequired ? normSel(CONFIG.selRequired) : SEL.required) },
        stock:    { input: CONFIG.selStock,    used: SEL.stock,    count: selCount(CONFIG.selStock ? normSel(CONFIG.selStock) : SEL.stock) },
        name: { input: CONFIG.selName, count: selCount(CONFIG.selName) }, brand: { input: CONFIG.selBrand, count: selCount(CONFIG.selBrand) },
        image: { input: CONFIG.selImage, count: selCount(CONFIG.selImage) }, options: { input: CONFIG.selOptions, count: selCount(CONFIG.selOptions) }
      },
      translate: CONFIG.translate,
      product: currentProduct ? {
        sku: currentProduct.sku, name: currentProduct.name, price: currentProduct.price,
        source: currentProduct.source, originUrl: currentProduct.originUrl,
        options: currentProduct.options.length,
        available: currentProduct.available !== false,
        mapped: !!currentProduct.mapped,
        brand: currentProduct.brand || '', image: currentProduct.images[0] || '',
        picked: currentProduct.picked || null, translated: !!currentProduct.translated, lang: LANG,
        translateStatus: trStatus, translation: currentProduct.translation || [],
        original: currentProduct.original || null,
        maxQty: currentProduct.maxQty,
        optionDetail: currentProduct.options.map(function (o) {
          return {
            name: o.name, required: o.required, source: o.source, allSoldOut: o.allSoldOut,
            values: o.values.map(function (v) {
              return { value: v.value, label: v.label, soldOut: v.soldOut, stock: v.stock };
            })
          };
        })
      } : null,
      cart: { count: cartCount(), total: cartTotal() }
    };
    ui.modal = null;
    render();
    notifyParent();
  }

  function syncState() {
    if (!window.__DK_GL_STATE__) return;
    window.__DK_GL_STATE__.cart = { count: cartCount(), total: cartTotal() };
    window.__DK_GL_STATE__.device = isMobile() ? 'mobile' : 'desktop';
    window.__DK_GL_STATE__.launcher = launcherMode();
    // 가맹점이 넣은 선택자가 이 페이지에서 몇 개 잡히는지 그대로 돌려준다
    window.__DK_GL_STATE__.selectors = {
      soldOut:  { input: CONFIG.selSoldOut,  used: SEL.soldOut,  count: selCount(CONFIG.selSoldOut ? normSel(CONFIG.selSoldOut) : SEL.soldOut) },
      required: { input: CONFIG.selRequired, used: SEL.required, count: selCount(CONFIG.selRequired ? normSel(CONFIG.selRequired) : SEL.required) },
      stock:    { input: CONFIG.selStock,    used: SEL.stock,    count: selCount(CONFIG.selStock ? normSel(CONFIG.selStock) : SEL.stock) }
    };
    notifyParent();
  }

  function notifyParent() {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'dk-gl-state', payload: window.__DK_GL_STATE__ }, '*');
      }
    } catch (e) {}
  }

  window.addEventListener('message', function (e) {
    var d = e.data || {};
    if (d.type !== 'dk-gl-config') return;
    try { localStorage.setItem(OVERRIDE_KEY, JSON.stringify(d.payload || {})); } catch (err) {}
    location.reload();
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
