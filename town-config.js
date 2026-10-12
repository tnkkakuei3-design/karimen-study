/* Photos are static app assets; no Google API key is needed to display them.
 * Venue photos and food illustrations are intentionally separate and labeled.
 * Replace a shop's selection with owner-supplied/authorized venue photos when available.
 * Photo copyright/source/license records: assets/town/SOURCES.json.
 * Optional Google key: browser referrer/API-restricted; verified place IDs only.
 */
(() => {
  const photos = {
  "okinawa-soba": {
    "url": "./assets/town/okinawa-soba.jpg",
    "alt": "沖縄そばの料理イメージ（掲載店舗の実際の商品写真ではありません）",
    "credit": "Mokkie",
    "title": "Okinawa soba and mixed rice.jpg",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Okinawa_soba_and_mixed_rice.jpg",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/",
    "permission": "cc-by-sa-3.0",
    "kind": "menu-illustration",
    "caption": "店舗の実際の料理写真ではありません",
    "sha256": "a8a4ad37b9878f4b0b188410489a41f2932557b335e2dceaeb89e80181b37818"
  },
  "kaisendon": {
    "url": "./assets/town/kaisendon.jpg",
    "alt": "海鮮丼の料理イメージ（掲載店舗の実際の商品写真ではありません）",
    "credit": "Jun Seita",
    "title": "Kaisendon (15650467898).jpg",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Kaisendon_(15650467898).jpg",
    "license": "CC BY 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/2.0/",
    "permission": "cc-by-2.0",
    "kind": "menu-illustration",
    "caption": "店舗の実際の料理写真ではありません",
    "sha256": "fa5b0f0a151779ff0afa420d64ec25438113f62b76aaf72cc08954ad6df4ba54"
  },
  "omurice": {
    "url": "./assets/town/omurice.jpg",
    "alt": "オムライスの料理イメージ（掲載店舗の実際の商品写真ではありません）",
    "credit": "Ocdp",
    "title": "Omurice 001.jpg",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Omurice_001.jpg",
    "license": "CC0 1.0",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/deed.en",
    "permission": "cc0-1.0",
    "kind": "menu-illustration",
    "caption": "店舗の実際の料理写真ではありません",
    "sha256": "7972de87789e0f359d30f79650059c29f9ff7bff9c4647c0ce4c46bb9f6910d2"
  },
  "teishoku": {
    "url": "./assets/town/teishoku.jpg",
    "alt": "定食の料理イメージ（掲載店舗の実際の商品写真ではありません）",
    "credit": "円周率３パーセント",
    "title": "Teishoku 20200118.jpg",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Teishoku_20200118.jpg",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
    "permission": "cc-by-sa-4.0",
    "kind": "menu-illustration",
    "caption": "店舗の実際の料理写真ではありません",
    "sha256": "fc1ea294782bde33a9fd516f686b90fa10459fd44ef14585c06a8ff47f6997d7"
  },
  "onigiri": {
    "url": "./assets/town/onigiri.jpg",
    "alt": "おにぎりの料理イメージ（掲載店舗の実際の商品写真ではありません）",
    "credit": "Ocdp",
    "title": "Onigiri 001.jpg",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Onigiri_001.jpg",
    "license": "CC0 1.0",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/deed.en",
    "permission": "cc0-1.0",
    "kind": "menu-illustration",
    "caption": "店舗の実際の料理写真ではありません",
    "sha256": "5a5a0b9850f5afb803d61bf5e886531277986caefb0c4aac22f43f7b6a68d6f3"
  },
  "curry": {
    "url": "./assets/town/curry.jpg",
    "alt": "カレーの料理イメージ（掲載店舗の実際の商品写真ではありません）",
    "credit": "Ocdp",
    "title": "Beef curry rice 001.jpg",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Beef_curry_rice_001.jpg",
    "license": "CC0 1.0",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/deed.en",
    "permission": "cc0-1.0",
    "kind": "menu-illustration",
    "caption": "店舗の実際の料理写真ではありません",
    "sha256": "907d0b510df7d505db8c66a472f3afba0a29823dcd99e0adc781bd3676da8d09"
  },
  "cake": {
    "url": "./assets/town/cake.jpg",
    "alt": "ケーキの料理イメージ（掲載店舗の実際の商品写真ではありません）",
    "credit": "Tomomarusan",
    "title": "Strawberry shortcake.jpg",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Strawberry_shortcake.jpg",
    "license": "CC BY 2.5",
    "licenseUrl": "https://creativecommons.org/licenses/by/2.5/",
    "permission": "cc-by-2.5",
    "kind": "menu-illustration",
    "caption": "店舗の実際の料理写真ではありません",
    "sha256": "32da912dc7399b7f3fd210b2c570c113b3060ac8bad131e6dddfc3151e768c5c"
  },
  "udon": {
    "url": "./assets/town/udon.jpg",
    "alt": "うどんの料理イメージ（掲載店舗の実際の商品写真ではありません）",
    "credit": "Ocdp",
    "title": "Yoshida udon 003.jpg",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Yoshida_udon_003.jpg",
    "license": "CC0 1.0",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/deed.en",
    "permission": "cc0-1.0",
    "kind": "menu-illustration",
    "caption": "店舗の実際の料理写真ではありません",
    "sha256": "c13b387d2f65635bc7364b2fc860e53a64cc9f5bfd42ea76e23fbeac91293f58"
  },
  "coffee": {
    "url": "./assets/town/coffee.jpg",
    "alt": "コーヒーの料理イメージ（掲載店舗の実際の商品写真ではありません）",
    "credit": "Jubair1985",
    "title": "Espresso Coffee 01.jpg",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Espresso_Coffee_01.jpg",
    "license": "CC0 1.0",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/deed.en",
    "permission": "cc0-1.0",
    "kind": "menu-illustration",
    "caption": "店舗の実際の料理写真ではありません",
    "sha256": "4996f857534e248e4c91e14b18c32376b1f2df9b3025c3d3cb4ccefa9198255c"
  },
  "bento": {
    "url": "./assets/town/bento.jpg",
    "alt": "弁当の料理イメージ（掲載店舗の実際の商品写真ではありません）",
    "credit": "Ocdp",
    "title": "Bento 001.jpg",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Bento_001.jpg",
    "license": "CC0 1.0",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/deed.en",
    "permission": "cc0-1.0",
    "kind": "menu-illustration",
    "caption": "店舗の実際の料理写真ではありません",
    "sha256": "6feef47cfcab82c404e087cb3f0851f3d48120713374d5618eb49a68c1b2ef53"
  },
  "itomaru-02": {
    "url": "./assets/town/itomaru-02.jpg",
    "alt": "糸満市場いとま〜るの外観。2022年3月撮影。",
    "credit": "Kugel~commonswiki",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
    "permission": "cc-by-sa-4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Itoman_Market_202203_02.jpg",
    "kind": "venue",
    "caption": "2022年3月撮影",
    "sha256": "2ed94854694a6a695dafb3d49c99e31eb4e755913ec557e5314e0a3b7fdc503a",
    "title": "Itoman Market 202203 02.jpg"
  },
  "itomaru-01": {
    "url": "./assets/town/itomaru-01.jpg",
    "alt": "糸満市場いとま〜るの外観。2022年3月撮影。",
    "credit": "Kugel~commonswiki",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
    "permission": "cc-by-sa-4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Itoman_Market_202203_01.jpg",
    "kind": "venue",
    "caption": "2022年3月撮影",
    "sha256": "a6d4df790421e493e2f71731a522a13386c9480461cc067c615669088c08841c",
    "title": "Itoman Market 202203 01.jpg"
  }
};
  const selection = {
  "center": [
    "okinawa-soba"
  ],
  "umibozu": [
    "kaisendon"
  ],
  "kirakira": [
    "omurice"
  ],
  "kinta": [
    "teishoku"
  ],
  "chiquita": [
    "curry"
  ],

  "mahoroba": [
    "okinawa-soba"
  ],
  "ritz": [
    "cake"
  ],
  "uminchu": [
    "teishoku"
  ],
  "konaya": [
    "udon"
  ],
  "yotsuba": [
    "onigiri"
  ],
  "cafe-itoman": [
    "coffee",
    "cake"
  ],
  "itomaru": [
    "itomaru-02",
    "itomaru-01"
  ],
  "ichiman-yokocho": [
    "teishoku"
  ],
  "zero": [
    "coffee",
    "cake"
  ]
};
  window.KarimenTownConfig = Object.freeze({
    googleMapsApiKey: '',
    placeIds: {},
    suppliedPhotos: Object.fromEntries(Object.entries(selection).map(([shop,ids]) => [shop,ids.map(id => photos[id])]))
  });
})();
