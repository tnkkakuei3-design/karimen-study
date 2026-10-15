/* Meal-voucher inclusion, menus and printed hours: the user's supplied restaurant guide.
   Do not infer current opening status or eligible individual menu items from this list. */
window.KarimenTownData = {
  version: '20261012-maps-2',
  guideCheckedOn: '2026-10-12',
  school: { name: '糸満自動車学校', address: '沖縄県糸満市字糸満2278', source: 'https://www.itojikou.co.jp/gasshuku/access' },
  shops: [
    { id:'center', number:1, name:'センター食堂', category:'食堂', tags:['meal','takeout'], phone:'090-3795-5882', menus:['沖縄そば','かつ丼','チャンプルー','オムライス'], hours:'7:00〜18:00（売り切れ次第終了）', closed:'月曜日', note:'電話注文で持ち帰り可。' },
    { id:'umibozu', number:2, name:'海ぼうず', category:'食堂・居酒屋', tags:['meal','lunch'], phone:'098-994-0595', menus:['幕の内','海鮮丼各種','魚汁'], hours:'11:00〜13:00（売り切れ次第終了）', closed:'水・土・日曜日', note:'' },
    { id:'kirakira', number:3, name:'きらきら', category:'食堂', tags:['meal','dinner'], phone:'080-8356-2119', menus:['各種定食'], hours:'14:00〜21:00', closed:'水・日曜日', note:'' },
    { id:'kinta', number:4, name:'きんた', category:'居酒屋・定食', tags:['meal','dinner'], phone:'090-5731-9917', menus:['定食','居酒屋メニュー'], hours:'18:00〜24:00', closed:'日曜日・祝日', note:'' },
    { id:'chiquita', number:5, name:'チキータ', category:'喫茶店', tags:['cafe','meal','lunch'], phone:'098-994-8248', menus:['パスタセット','カレー','オムライス','なす味噌'], hours:'9:00〜17:00（モーニングは11:00まで）', closed:'日曜日・祝日', note:'' },
    { id:'mahoroba', number:7, name:'まほろば', category:'食堂', tags:['meal','lunch','takeout'], phone:'090-6859-7431', menus:['沖縄そば','カツカレー','豚キムチ','ルーロー飯','魚汁','煮付け','メガシャークバーガー'], hours:'10:30〜15:00', closed:'なし（案内表記載）', note:'電話注文で持ち帰り可。' },
    { id:'ritz', number:8, name:'リッツ', category:'パン・ケーキ', tags:['bakery','takeout'], phone:'098-992-6000', menus:['パン各種','ケーキ各種'], hours:'月〜土 8:00〜19:30／日 11:00〜18:00', closed:'なし（案内表記載）', note:'' },
    { id:'uminchu', number:9, name:'糸満海人食堂', category:'食堂・居酒屋', tags:['meal','dinner'], phone:'090-5295-3296', menus:['イカ','魚汁','沖縄そば','定食'], hours:'17:00〜22:00（ラストオーダー21:00）', closed:'月・火・水曜日', note:'来店前に、営業場所と営業時間を電話でご確認ください。' },
    { id:'konaya', number:10, name:'こなや本家', category:'うどん・居酒屋', tags:['meal','takeout','dinner'], phone:'098-955-3966', menus:['うどん','たこ焼き','居酒屋メニュー'], hours:'17:00〜24:00／日 16:00〜23:00', closed:'木曜日・毎月末の水曜日', note:'テイクアウトは電話予約が必要です。' },
    { id:'yotsuba', number:11, name:'よつばキッチン', category:'弁当', tags:['takeout','lunch'], phone:'070-9117-0594', menus:['沖縄風弁当','丼もの','おにぎり'], hours:'10:30〜売り切れ次第終了', closed:'水・土・日曜日・祝日', note:'' },
    { id:'cafe-itoman', number:12, name:'セラミックアートカフェ イトマン', shortName:'カフェ イトマン', category:'カフェ', tags:['cafe','meal','lunch'], phone:'', menus:['イナムドゥチ定食','ランチ定食','カレー','各国コーヒー','手作りケーキ'], hours:'11:00〜17:00／土・日 11:00〜18:00', closed:'月・木曜日（案内表に営業曜日の重複記載あり）', note:'陶芸体験あり。営業日は店舗の案内をご確認ください。' },
    { id:'itomaru', number:13, name:'糸満市場 いとま〜る', category:'市場・飲食施設', tags:['market','meal'], phone:'098-987-1037', menus:['施設内の各飲食店'], hours:'9:00〜18:00（店舗によって異なります）', closed:'店舗によって異なります', note:'食券は施設内の飲食店が対象です。物販店は対象に含みません。', facility:true },
    { id:'ichiman-yokocho', number:14, name:'いちまん横丁', category:'飲食施設', tags:['market','meal'], phone:'', menus:['施設内の各飲食店'], hours:'店舗によって異なります', closed:'不定休', note:'食券は施設内の各飲食店で利用できます。利用条件は各店にご確認ください。', facility:true },
    { id:'zero', number:15, name:'ゼロ番地', category:'喫茶・バー', tags:['cafe','dinner'], phone:'090-5486-7719', menus:['軽食','デザート','ドリンク'], hours:'昼 11:00〜16:00／夜 19:00〜24:00', closed:'不定休', note:'' }
  ]
};

// Public location sources, verified separately from the meal-voucher guide.
const townLocations = {
  "1": {
    "address": "沖縄県糸満市字糸満1942-19",
    "source": "https://tabelog.com/okinawa/A4704/A470402/47020162/dtlmap/",
    "embedUrl": "https://www.google.com/maps/embed?origin=mfe&pb=!1m2!2m1!1z44K744Oz44K_44O86aOf5aCCIOaylue4hOecjOezuOa6gOW4guWtl-ezuOa6gDE5NDItMTk!3m1!1sja!5m1!1sja",
    "mapCheckedOn": "2026-10-12",
    "mapPlaceId": "ChIJ__-b2rhn5TQRc3QyeiMDgfQ"
  },
  "2": {
    "address": "沖縄県糸満市字糸満2250",
    "embedUrl": "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3582.0544679097716!2d127.66208631543645!3d26.129766983471033!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x34e567bf2477cb9f:0x2798504fdbff2255!2z5rW344G844GG44Ga!5e0!3m2!1sja!2sjp!4v1570704761917!5m2!1sja!2sjp",
    "source": "https://map.yahoo.co.jp/v3/place/8wLP8dEF2Uw",
    "mapCheckedOn": "2026-10-12",
    "mapPlaceId": "ChIJn8t3JL9n5TQRVSL_209QmCc"
  },
  "3": {
    "address": "沖縄県糸満市糸満1943-60",
    "source": "https://tabelog.com/okinawa/A4704/A470402/47033114/",
    "embedUrl": "https://www.google.com/maps/embed?origin=mfe&pb=!1m2!2m1!1z44GN44KJ44GN44KJIOaylue4hOecjOezuOa6gOW4guezuOa6gDE5NDMtNjA!3m1!1sja!5m1!1sja",
    "mapCheckedOn": "2026-10-12",
    "mapPlaceId": "ChIJzwlhp61n5TQRnsxijy1Kuvs"
  },
  "4": {
    "source": "https://tabelog.com/okinawa/A4704/A470402/47005590/",
    "embedUrl": "https://www.google.com/maps/embed?origin=mfe&pb=!1m2!2m1!1z44GN44KT44GfIOaylue4hOecjOezuOa6gOW4gg!3m1!1sja!5m1!1sja",
    "mapCheckedOn": "2026-10-12",
    "address": "沖縄県糸満市字糸満989-61",
    "mapPlaceId": "ChIJ47Ft5rhn5TQRW4-RJXXP_5g"
  },
  "5": {
    "address": "沖縄県糸満市字糸満989-60",
    "source": "https://map.yahoo.co.jp/v3/place/pvyY4f30I3E",
    "embedUrl": "https://www.google.com/maps/embed?origin=mfe&pb=!1m2!2m1!1z44OB44Kt44O844K_IOaylue4hOecjOezuOa6gOW4guWtl-ezuOa6gDk4OS02MA!3m1!1sja!5m1!1sja",
    "mapCheckedOn": "2026-10-12",
    "mapPlaceId": "ChIJVd4d5rhn5TQRG2Gd5SEa8z8"
  },
  "7": {
    "address": "沖縄県糸満市糸満2228",
    "embedUrl": "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3582.0739910419907!2d127.6618229116158!3d26.129130377027504!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x34e567b855e743af:0x741399137a08eb46!2z6aOf5bel5oi_44G-44G744KN44Gw!5e0!3m2!1sja!2sjp!4v1733458762026!5m2!1sja!2sjp",
    "source": "https://www.instagram.com/syokukobo_mahoroba/",
    "mapCheckedOn": "2026-10-12",
    "mapPlaceId": "ChIJr0PnVbhn5TQRRusIehOZE3Q"
  },
  "8": {
    "address": "沖縄県糸満市字糸満989-8 1F",
    "source": "https://itp.ne.jp/zenkoku/okinawa/itomanshi/azaitoman/474373715182131120",
    "embedUrl": "https://www.google.com/maps/embed?origin=mfe&pb=!1m2!2m1!1z44Oq44OD44OEIOaylue4hOecjOezuOa6gOW4guWtl-ezuOa6gDk4OS04IDFG!3m1!1sja!5m1!1sja",
    "mapCheckedOn": "2026-10-12",
    "mapPlaceId": "ChIJ9VEvXLhn5TQR_Tfb8gR_kuI"
  },
  "9": {
    "source": "https://men-japan.com/news/773/",
    "embedUrl": "https://www.google.com/maps/embed?origin=mfe&pb=!1m2!2m1!1z57O45rqA5rW35Lq66aOf5aCCIOaylue4hOecjOezuOa6gOW4gg!3m1!1sja!5m1!1sja",
    "mapCheckedOn": "2026-10-12",
    "address": "沖縄県糸満市字糸満989-88",
    "mapPlaceId": "ChIJZdGP5zxn5TQRIoOCcO23Bl0"
  },
  "10": {
    "address": "沖縄県糸満市字糸満502",
    "source": "https://itp.ne.jp/zenkoku/okinawa/itomanshi/azaitoman/853276722674383001",
    "embedUrl": "https://www.google.com/maps/embed?origin=mfe&pb=!1m2!2m1!1z44GT44Gq44KE5pys5a62IOaylue4hOecjOezuOa6gOW4guWtl-ezuOa6gDUwMg!3m1!1sja!5m1!1sja",
    "mapCheckedOn": "2026-10-12",
    "mapPlaceId": "ChIJJSskQ-ln5TQRrZ1B3ceV2wM"
  },
  "11": {
    "address": "沖縄県糸満市糸満2224",
    "source": "https://tabelog.com/okinawa/A4704/A470402/47033137/",
    "embedUrl": "https://www.google.com/maps/embed?origin=mfe&pb=!1m2!2m1!1z44KI44Gk44Gw44Kt44OD44OB44OzIOaylue4hOecjOezuOa6gOW4guezuOa6gDIyMjQ!3m1!1sja!5m1!1sja",
    "mapCheckedOn": "2026-10-12",
    "mapPlaceId": "ChIJt70uw75n5TQR4jNs9Uu_FqE"
  },
  "12": {
    "address": "沖縄県糸満市糸満989-56 1F",
    "source": "https://ceramic-art-cafe-itoman.studio.site/",
    "socialUrl": "https://www.instagram.com/ceramic_art_cafe_itoman",
    "embedUrl": "https://www.google.com/maps/embed?origin=mfe&pb=!1m2!2m1!1z44K744Op44Of44OD44Kv44Ki44O844OI44Kr44OV44KnIOOCpOODiOODnuODsyDmspbnuITnnIzns7jmuoDluILns7jmuoA5ODktNTYgMUY!3m1!1sja!5m1!1sja",
    "mapCheckedOn": "2026-10-12",
    "mapPlaceId": "ChIJVSJytEtn5TQRsECRKlinkSg"
  },
  "13": {
    "address": "沖縄県糸満市字糸満989-83",
    "embedUrl": "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3582.0814061315573!2d127.6660044150284!3d26.12888858347142!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x34e567b85876ac85:0x3f052d52e5e6676f!2z57O45rqA5biC5aC044GE44Go44G-44Cc44KL!5e0!3m2!1sja!2sjp!4v1684471900572!5m2!1sja!2sjp",
    "source": "https://www.itoman-itomaru.okinawa/",
    "mapCheckedOn": "2026-10-12",
    "mapPlaceId": "ChIJhax2WLhn5TQRb2fm5VItBT8"
  },
  "14": {
    "address": "沖縄県糸満市糸満989-90 金城アパート1F",
    "source": "https://www.okinawastory.jp/gourmet/600011430",
    "embedUrl": "https://www.google.com/maps/embed?origin=mfe&pb=!1m2!2m1!1z44GE44Gh44G-44KT5qiq5LiBIOaylue4hOecjOezuOa6gOW4guezuOa6gDk4OS05MCDph5Hln47jgqLjg5Hjg7zjg4gxRg!3m1!1sja!5m1!1sja",
    "mapCheckedOn": "2026-10-12",
    "mapPlaceId": "ChIJlZ_JPr5n5TQR0H9h4ohVZMU"
  },
  "15": {
    "address": "沖縄県糸満市字糸満1953番地",
    "embedUrl": "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3582.088940654995!2d127.66393336227826!3d26.128642893247587!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x34e5670007a90743:0x37c5b85c7b2205c8!2z5Zar6Iy2JkJBUiDjgrzjg63nlarlnLA!5e0!3m2!1sja!2sjp!4v1781005333722!5m2!1sja!2sjp",
    "source": "https://www.instagram.com/kissaandbarzerobanchi/",
    "mapCheckedOn": "2026-10-12",
    "mapPlaceId": "ChIJQwepBwBn5TQRyAUie1y4xTc"
  }
};
for (const shop of window.KarimenTownData.shops) Object.assign(shop, townLocations[shop.number] || {});

// Store profiles verified against public store/tourism listings.
const townInstagram = {
  "7": "https://www.instagram.com/syokukobo_mahoroba/",
  "12": "https://www.instagram.com/ceramic_art_cafe_itoman/",
  "15": "https://www.instagram.com/kissaandbarzerobanchi/"
};
for (const shop of window.KarimenTownData.shops) if (townInstagram[shop.number]) shop.instagram = townInstagram[shop.number];

// Scheduled hours from the supplied guide; never a live opening-status claim.
window.KarimenTownData.schedules = {
 center:{hours:[420,1080],closed:[1],soldOut:true},
 umibozu:{hours:[660,780],closed:[0,3,6],soldOut:true},
 kirakira:{hours:[840,1260],closed:[0,3]},
 kinta:{hours:[1080,1440],closed:[0],holidays:true},
 chiquita:{hours:[540,1020],closed:[0],holidays:true},
 mahoroba:{hours:[630,900],closed:[]},
 ritz:{hours:[480,1170],sunday:[660,1080],closed:[]},
 uminchu:{hours:[1020,1320],closed:[1,2,3],lastOrder:1260},
 konaya:{hours:[1020,1440],sunday:[960,1380],closed:[4],lastWednesday:true},
 yotsuba:{hours:[630,null],closed:[0,3,6],holidays:true,soldOut:true},
 'cafe-itoman':{ranges:[[660,1020]],weekendRanges:[[660,1080]],uncertain:'営業曜日の記載に重複あり'},
 itomaru:{ranges:[[540,1080]],uncertain:'施設内の店舗ごとに異なります'},
 'ichiman-yokocho':{uncertain:'店舗ごとの営業時間・不定休を確認'},
 zero:{ranges:[[660,960],[1140,1440]],uncertain:'不定休のため来店前に確認'}
};

// Cabinet Office holiday CSV, retrieved 2026-10-12. Years outside this snapshot are unknown.
window.KarimenTownData.holidays = {
  "source": "https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv",
  "years": [
    2026,
    2027
  ],
  "dates": {
    "2026-01-01": "元日",
    "2026-01-12": "成人の日",
    "2026-02-11": "建国記念の日",
    "2026-02-23": "天皇誕生日",
    "2026-03-20": "春分の日",
    "2026-04-29": "昭和の日",
    "2026-05-03": "憲法記念日",
    "2026-05-04": "みどりの日",
    "2026-05-05": "こどもの日",
    "2026-05-06": "休日",
    "2026-07-20": "海の日",
    "2026-08-11": "山の日",
    "2026-09-21": "敬老の日",
    "2026-09-22": "休日",
    "2026-09-23": "秋分の日",
    "2026-10-12": "スポーツの日",
    "2026-11-03": "文化の日",
    "2026-11-23": "勤労感謝の日",
    "2027-01-01": "元日",
    "2027-01-11": "成人の日",
    "2027-02-11": "建国記念の日",
    "2027-02-23": "天皇誕生日",
    "2027-03-21": "春分の日",
    "2027-03-22": "休日",
    "2027-04-29": "昭和の日",
    "2027-05-03": "憲法記念日",
    "2027-05-04": "みどりの日",
    "2027-05-05": "こどもの日",
    "2027-07-19": "海の日",
    "2027-08-11": "山の日",
    "2027-09-20": "敬老の日",
    "2027-09-23": "秋分の日",
    "2027-10-11": "スポーツの日",
    "2027-11-03": "文化の日",
    "2027-11-23": "勤労感謝の日"
  }
};

// Individual market restaurants: public sources do not establish voucher eligibility.
window.KarimenTownData.marketShops = [
  {
    "id": "itomaru-knowry",
    "parentId": "itomaru",
    "number": "13-1",
    "name": "Knowry’s Fried Fish",
    "shortName": "ノウリーズ フライドフィッシュ",
    "category": "魚料理",
    "tags": [
      "meal",
      "market",
      "lunch"
    ],
    "menus": [
      "深海サメのフライ",
      "フィッシュ＆チップス",
      "メカジキのソテー"
    ],
    "hours": "11:30〜21:00（L.O.20:00）",
    "closed": "水曜日",
    "phone": "090-5080-2592",
    "source": "https://knowrysfriedfish.owst.jp/",
    "price": "料理例：メカジキのソテー 1,350円",
    "priceSource": "https://knowrysfriedfish.owst.jp/foods",
    "address": "沖縄県糸満市糸満989-83 糸満市場いとま〜る A1",
    "voucherStatus": "confirmed",
    "menuSourceNote": "店舗・市場の公開情報より。価格は掲載時点の参考です。",
    "checkedOn": "2026-10-15",
    "note": ""
  },
  {
    "id": "itomaru-minatomachi",
    "parentId": "itomaru",
    "number": "13-2",
    "name": "港町パーラー きんしろ鮮魚",
    "shortName": "港町パーラー",
    "category": "海鮮丼",
    "tags": [
      "meal",
      "market",
      "lunch"
    ],
    "menus": [
      "海鮮丼",
      "マグロ丼"
    ],
    "hours": "11:00〜15:00（売り切れ次第終了）",
    "closed": "火曜日・不定休あり",
    "phone": "098-901-5733",
    "source": "https://www.itoman-itomaru.okinawa/shop/food/",
    "price": "海鮮丼の掲載例：1,000〜1,300円",
    "priceSource": "https://www.itoman-itomaru.okinawa/shop/food/",
    "address": "沖縄県糸満市糸満989-83 糸満市場いとま〜る",
    "voucherStatus": "confirmed",
    "menuSourceNote": "店舗・市場の公開情報より。価格は掲載時点の参考です。",
    "checkedOn": "2026-10-15",
    "note": ""
  },
  {
    "id": "itomaru-fullhouse",
    "parentId": "itomaru",
    "number": "13-3",
    "name": "THE BURGER STADIUM FULL HOUSE",
    "shortName": "FULL HOUSE",
    "category": "ハンバーガー",
    "tags": [
      "meal",
      "market",
      "lunch"
    ],
    "menus": [
      "ハンバーガー",
      "ポテト・ドリンク付きセット"
    ],
    "hours": "11:00〜18:00（L.O.17:00）",
    "closed": "不定休",
    "phone": "",
    "source": "https://www.itoman-itomaru.okinawa/",
    "price": "来店前にメニューで確認",
    "priceSource": "",
    "address": "沖縄県糸満市糸満989-83 糸満市場いとま〜る D3",
    "voucherStatus": "confirmed",
    "menuSourceNote": "店舗・市場の公開情報より。価格は掲載時点の参考です。",
    "checkedOn": "2026-10-15",
    "note": ""
  },
  {
    "id": "itomaru-gajimaru",
    "parentId": "itomaru",
    "number": "13-4",
    "name": "琉球半身揚げ がじまるや～",
    "shortName": "がじまるや～",
    "category": "鶏料理",
    "tags": [
      "meal",
      "market",
      "lunch"
    ],
    "menus": [
      "鶏の半身揚げ"
    ],
    "hours": "11:00〜18:00（売り切れ次第終了）",
    "closed": "月曜日",
    "phone": "",
    "source": "https://www.itoman-itomaru.okinawa/shop/food/",
    "price": "来店前にメニューで確認",
    "priceSource": "",
    "address": "沖縄県糸満市糸満989-83 糸満市場いとま〜る",
    "voucherStatus": "confirmed",
    "menuSourceNote": "店舗・市場の公開情報より。価格は掲載時点の参考です。",
    "checkedOn": "2026-10-15",
    "note": ""
  },
  {
    "id": "itomaru-manjuen",
    "parentId": "itomaru",
    "number": "13-5",
    "name": "万寿園",
    "shortName": "万寿園",
    "category": "ラーメン・餃子",
    "tags": [
      "meal",
      "market",
      "lunch"
    ],
    "menus": [
      "味噌ラーメン",
      "塩ラーメン",
      "チャーハン",
      "餃子"
    ],
    "hours": "11:00〜17:00（市場公式掲載）",
    "closed": "月曜／月・火曜の記載があるため要確認",
    "phone": "",
    "source": "https://www.itoman-itomaru.okinawa/shop/food/",
    "price": "掲載例：チャーハン650円／ラーメン700円",
    "priceSource": "https://www.itoman-itomaru.okinawa/shop/food/",
    "address": "沖縄県糸満市糸満989-83 糸満市場いとま〜る",
    "voucherStatus": "confirmed",
    "menuSourceNote": "店舗・市場の公開情報より。価格は掲載時点の参考です。",
    "checkedOn": "2026-10-15",
    "note": ""
  },
  {
    "id": "itomaru-naminami",
    "parentId": "itomaru",
    "number": "13-6",
    "name": "spice kitchen naminami",
    "shortName": "naminami（ナミナミ）",
    "category": "スパイスカレー",
    "tags": [
      "meal",
      "market",
      "lunch"
    ],
    "menus": [
      "スパイスカレー",
      "日替わりカレー"
    ],
    "hours": "11:00〜15:00（L.O.14:30）",
    "closed": "不定休",
    "phone": "080-7532-7133",
    "source": "https://okinawa-naminami.com/",
    "price": "来店前にメニューで確認",
    "priceSource": "",
    "address": "沖縄県糸満市糸満989-83 糸満市場いとま〜る",
    "voucherStatus": "confirmed",
    "menuSourceNote": "店舗・市場の公開情報より。価格は掲載時点の参考です。",
    "checkedOn": "2026-10-15",
    "note": ""
  },
  {
    "id": "itomaru-lazy-pub",
    "parentId": "itomaru",
    "number": "13-7",
    "name": "LAZY PUB",
    "shortName": "LAZY PUB",
    "category": "ケバブ・ライス料理",
    "tags": [
      "meal",
      "market",
      "lunch"
    ],
    "menus": [
      "ケバブ",
      "チキンオーバーライス"
    ],
    "hours": "11:00〜15:00／18:00〜21:00（夜L.O.20:30）",
    "closed": "水曜日",
    "phone": "",
    "source": "https://www.itoman-itomaru.okinawa/shop/food/",
    "price": "来店前にメニューで確認",
    "priceSource": "",
    "address": "沖縄県糸満市糸満989-83 糸満市場いとま〜る",
    "voucherStatus": "confirmed",
    "menuSourceNote": "店舗・市場の公開情報より。価格は掲載時点の参考です。",
    "checkedOn": "2026-10-15",
    "note": ""
  },
  {
    "id": "itomaru-chef-vegeta",
    "parentId": "itomaru",
    "number": "13-8",
    "name": "シェフ＆ベジタ",
    "shortName": "シェフ＆ベジタ",
    "category": "スープ・玄米",
    "tags": [
      "meal",
      "market",
      "lunch"
    ],
    "menus": [
      "ヌチグスイスープ",
      "酵素玄米"
    ],
    "hours": "11:00〜17:00",
    "closed": "日曜日",
    "phone": "090-2514-1749",
    "source": "https://www.itoman-itomaru.okinawa/",
    "price": "セット1,000円（2025年12月取材時）",
    "priceSource": "https://www.otv.co.jp/okitive/article/90482/",
    "address": "沖縄県糸満市糸満989-83 糸満市場いとま〜る",
    "voucherStatus": "confirmed",
    "menuSourceNote": "店舗・市場の公開情報より。価格は掲載時点の参考です。",
    "checkedOn": "2026-10-15",
    "note": ""
  },
  {
    "id": "itomaru-machigwa",
    "parentId": "itomaru",
    "number": "13-9",
    "name": "町小（まちぐゎぁ）",
    "shortName": "町小（まちぐゎぁ）",
    "category": "沖縄そば・天ぷら",
    "tags": [
      "meal",
      "market",
      "lunch"
    ],
    "menus": [
      "沖縄そば",
      "ゆし豆腐そば",
      "天ぷら"
    ],
    "hours": "11:00〜17:00（売り切れ・早仕舞いあり）",
    "closed": "不定休",
    "phone": "",
    "source": "https://omalblog.com/2026/08/02/itoman-machigwa-2/",
    "price": "そば・天ぷらセット1,400円（2026年8月掲載）",
    "priceSource": "https://omalblog.com/2026/08/02/itoman-machigwa-2/",
    "address": "沖縄県糸満市糸満989-83 糸満市場いとま〜る",
    "voucherStatus": "confirmed",
    "menuSourceNote": "店舗・市場の公開情報より。価格は掲載時点の参考です。",
    "checkedOn": "2026-10-15",
    "note": "フードコート奥、総合案内所の隣。"
  }
];
Object.assign(window.KarimenTownData.schedules, {
  "itomaru-knowry": {
    "hours": [
      690,
      1260
    ],
    "closed": [
      3
    ],
    "lastOrder": 1200
  },
  "itomaru-minatomachi": {
    "uncertain": "不定休・売り切れは店舗へ確認"
  },
  "itomaru-fullhouse": {
    "uncertain": "不定休のため店舗へ確認"
  },
  "itomaru-gajimaru": {
    "hours": [
      660,
      1080
    ],
    "closed": [
      1
    ],
    "soldOut": true
  },
  "itomaru-manjuen": {
    "uncertain": "定休日の記載が異なるため店舗へ確認"
  },
  "itomaru-naminami": {
    "uncertain": "不定休のため店舗へ確認"
  },
  "itomaru-lazy-pub": {
    "uncertain": "昼・夜の営業予定は店舗へ確認"
  },
  "itomaru-chef-vegeta": {
    "hours": [
      660,
      1020
    ],
    "closed": [
      0
    ]
  },
  "itomaru-machigwa": {
    "uncertain": "不定休・早仕舞いは店舗へ確認"
  }
});
const marketGuide = window.KarimenTownData.shops.find(s => s.id === 'itomaru');
marketGuide.menus = ['海鮮丼','沖縄そば','ハンバーガー','カレー','ラーメン'];
marketGuide.note = '教習所の案内では市場内の飲食店が対象です。個店の対応・対象メニュー・差額は注文前に確認してください。';
const ceramicCafe = window.KarimenTownData.shops.find(s => s.id === 'cafe-itoman');
Object.assign(ceramicCafe, {shortName:'セラミックアートカフェ イトマン',aliases:['Ceramic Art Cafe Itoman','カフェイトマン'],category:'カフェ・沖縄料理',menus:['イナムドゥチ','タコライス','カレーライス'],price:'掲載例：タコライス880円／イナムドゥチ1,100円',priceSource:'https://www.098markets.net/about-cafe/',menuSourceNote:'店舗公式サイトより。価格は掲載時点の参考です。',hours:'営業案内に複数の記載があるため店舗へ確認',closed:'店舗へ確認',source:'https://www.098markets.net/about-cafe/',note:'陶芸体験もできるカフェ。市場とは別の店舗です。営業時間は公式内にも複数の記載があります。'});
window.KarimenTownData.schedules['cafe-itoman'] = {uncertain:'営業時間・営業日は店舗へ確認'};

marketGuide.menuSourceNote = '市場内店舗の公開メニューより。';
const marketPhotoSources = {
 'itomaru-chef-vegeta':'https://www.otv.co.jp/okitive/article/90482/',
 'itomaru-fullhouse':'https://tabelog.com/okinawa/A4704/A470402/47033757/'
};
for (const shop of window.KarimenTownData.marketShops) shop.photoSource = marketPhotoSources[shop.id] || shop.source;

// Google Maps visible listings and expanded weekly hours, checked 2026-10-15 JST.
// Preserve voucher eligibility and separately sourced holiday/last-Wednesday restrictions.
const googleTownAudit = {
  "center": {"googleName":"センター食堂","googleCheckedOn":"2026-10-15","googleSourceUrl":"https://www.google.com/maps?cid=17618366668158956659","fields":{"hours":"7:00〜17:00（売り切れ次第終了）","closed":"月曜日"},"weekly":[[[420,1020]],[],[[420,1020]],[[420,1020]],[[420,1020]],[[420,1020]],[[420,1020]]]},
  "umibozu": {"googleName":"海ぼうず","googleCheckedOn":"2026-10-15","googleSourceUrl":"https://www.google.com/maps?cid=2853118667862778453","fields":{"hours":"11:00〜14:00（売り切れ次第終了）","closed":"水・土・日曜日"},"weekly":[[],[[660,840]],[[660,840]],[],[[660,840]],[[660,840]],[]]},
  "kirakira": {"googleName":"きらきら","googleCheckedOn":"2026-10-15","googleSourceUrl":"https://www.google.com/maps?cid=18138892008727694494","fields":{"hours":"14:00〜21:00","closed":"水・土・日曜日"},"weekly":[[],[[840,1260]],[[840,1260]],[],[[840,1260]],[[840,1260]],[]]},
  "kinta": {"googleName":"きんた","googleCheckedOn":"2026-10-15","googleSourceUrl":"https://www.google.com/maps?cid=11024758514874683227","fields":{"phone":"098-995-3228"},"hoursNote":"Googleマップに営業時間の掲載なし。営業時間・定休日は教習所の案内表。"},
  "chiquita": {"googleName":"チキータ","googleCheckedOn":"2026-10-15","googleSourceUrl":"https://www.google.com/maps?cid=4608055576618688795","fields":{},"weekly":[[],[[540,1020]],[[540,1020]],[[540,1020]],[[540,1020]],[[540,1020]],[[540,1020]]],"hoursNote":"祝日休みは教習所の案内表。"},
  "mahoroba": {"googleName":"食工房まほろば","googleCheckedOn":"2026-10-15","googleSourceUrl":"https://www.google.com/maps?cid=8364197241887976262","fields":{"name":"食工房まほろば","hours":"月〜水・金 10:30〜15:00／土・日 10:30〜17:00","closed":"木曜日"},"weekly":[[[630,1020]],[[630,900]],[[630,900]],[[630,900]],[],[[630,900]],[[630,1020]]]},
  "ritz": {"googleName":"リッツ・パンとケーキのお店","googleCheckedOn":"2026-10-15","googleSourceUrl":"https://www.google.com/maps?cid=16326251258402519037","fields":{"name":"リッツ・パンとケーキのお店","address":"沖縄県糸満市糸満989-8 フォーションビル"},"weekly":[[[660,1080]],[[480,1170]],[[480,1170]],[[480,1170]],[[480,1170]],[[480,1170]],[[480,1170]]]},
  "uminchu": {"googleName":"糸満海人食堂","googleCheckedOn":"2026-10-15","googleSourceUrl":"https://www.google.com/maps?cid=6703247325810295586","fields":{"phone":"098-911-7466","note":"","hours":"17:00〜21:00","closed":"月曜日"},"weekly":[[[1020,1260]],[],[[1020,1260]],[[1020,1260]],[[1020,1260]],[[1020,1260]],[[1020,1260]]]},
  "konaya": {"googleName":"こなや本家","googleCheckedOn":"2026-10-15","googleSourceUrl":"https://www.google.com/maps?cid=277980487656512941","fields":{"hours":"月〜水・金・土 17:00〜24:00／日 15:00〜23:00","closed":"木曜日・毎月末の水曜日（案内表）"},"weekly":[[[900,1380]],[[1020,1440]],[[1020,1440]],[[1020,1440]],[],[[1020,1440]],[[1020,1440]]],"hoursNote":"毎月末の水曜休みは教習所の案内表。"},
  "yotsuba": {"googleName":"よつばキッチン","googleCheckedOn":"2026-10-15","googleSourceUrl":"https://www.google.com/maps?cid=11607675422554993634","fields":{"hours":"10:30〜13:30（売り切れ次第終了）"},"weekly":[[],[[630,810]],[[630,810]],[],[[630,810]],[[630,810]],[]],"hoursNote":"祝日休み・売り切れ次第終了は教習所の案内表。"},
  "cafe-itoman": {"googleName":"Ceramic Art Cafe Itoman","googleCheckedOn":"2026-10-15","googleSourceUrl":"https://www.google.com/maps?cid=2923301630253285552","fields":{"phone":"080-9856-7209","note":"陶芸体験もできるカフェ。市場とは別の店舗です。","hours":"10:00〜17:00","closed":"月・木曜日"},"weekly":[[[600,1020]],[],[[600,1020]],[[600,1020]],[],[[600,1020]],[[600,1020]]]},
  "itomaru": {"googleName":"糸満市場いとま〜る","googleCheckedOn":"2026-10-15","googleSourceUrl":"https://www.google.com/maps?cid=4541085633340663663","fields":{"name":"糸満市場いとま〜る"},"weekly":[[[540,1080]],[[540,1080]],[[540,1080]],[[540,1080]],[[540,1080]],[[540,1080]],[[540,1080]]]},
  "ichiman-yokocho": {"googleName":"いちまん横丁","googleCheckedOn":"2026-10-15","googleSourceUrl":"https://www.google.com/maps?cid=14223587569544822736","fields":{"hours":"施設 15:00〜翌1:00（各店で異なります）","closed":"施設は定休日の登録なし（各店へ確認）"},"weekly":[[[900,1500]],[[900,1500]],[[900,1500]],[[900,1500]],[[900,1500]],[[900,1500]],[[900,1500]]]},
  "zero": {"googleName":"喫茶&BAR ゼロ番地","googleCheckedOn":"2026-10-15","googleSourceUrl":"https://www.google.com/maps?cid=4018820949840365000","fields":{"name":"喫茶&BAR ゼロ番地","hours":"月〜金 11:30〜24:00／土・日 12:00〜翌2:00","closed":"Googleマップに定休日の登録なし"},"weekly":[[[720,1560]],[[690,1440]],[[690,1440]],[[690,1440]],[[690,1440]],[[690,1440]],[[720,1560]]],"hoursNote":"昼・夜の提供メニューと中休みは店舗へ確認。"},
  "itomaru-knowry": {"googleName":"Knowry's Fried Fish","googleCheckedOn":"2026-10-15","googleSourceUrl":"https://www.google.com/maps?cid=2667753529834807503","fields":{"name":"Knowry's Fried Fish"},"weekly":[[[690,1260]],[[690,1260]],[[690,1260]],[],[[690,1260]],[[690,1260]],[[690,1260]]]},
  "itomaru-minatomachi": {"googleName":"港町パーラー","googleCheckedOn":"2026-10-15","googleSourceUrl":"https://www.google.com/maps?cid=17563875919216926015","fields":{"name":"港町パーラー","closed":"Googleマップに定休日の登録なし"},"weekly":[[[660,900]],[[660,900]],[[660,900]],[[660,900]],[[660,900]],[[660,900]],[[660,900]]],"hoursNote":"市場公式には火曜休みの記載あり。火曜日は来店前に確認。"},
  "itomaru-fullhouse": {"googleName":"THE BURGER STADIUM FULL HOUSE","googleCheckedOn":"2026-10-15","googleSourceUrl":"https://www.google.com/maps?cid=6800332294988217986","fields":{"phone":"090-7585-0307","hours":"火〜金 11:00〜15:00／土 11:00〜20:00","closed":"日・月曜日"},"weekly":[[],[],[[660,900]],[[660,900]],[[660,900]],[[660,900]],[[660,1200]]]},
  "itomaru-gajimaru": {"googleName":"琉球半身揚げ がじまるや〜","googleCheckedOn":"2026-10-15","googleSourceUrl":"https://www.google.com/maps?cid=14437186541887702173","fields":{"phone":"098-800-2937","name":"琉球半身揚げ がじまるや〜","hours":"11:00〜21:00（売り切れ次第終了）"},"weekly":[[[660,1260]],[],[[660,1260]],[[660,1260]],[[660,1260]],[[660,1260]],[[660,1260]]]},
  "itomaru-manjuen": {"googleName":"万寿園","googleCheckedOn":"2026-10-15","googleSourceUrl":"https://www.google.com/maps?cid=8991389386691169069","fields":{"hours":"11:00〜17:00","closed":"月・火曜日"},"weekly":[[[660,1020]],[],[],[[660,1020]],[[660,1020]],[[660,1020]],[[660,1020]]]},
  "itomaru-naminami": {"googleName":"沖縄のスパイスカレー スパイスキッチンナミナミ spice Kitchen naminami","googleCheckedOn":"2026-10-15","googleSourceUrl":"https://www.google.com/maps?cid=3141744819438493155","fields":{"closed":"火・木・日曜日"},"weekly":[[],[[660,900]],[],[[660,900]],[],[[660,900]],[[660,900]]]},
  "itomaru-lazy-pub": {"googleName":"LAZY_PUB","googleCheckedOn":"2026-10-15","googleSourceUrl":"https://www.google.com/maps?cid=9584425969512097449","fields":{"name":"LAZY_PUB","shortName":"LAZY_PUB","phone":"080-9851-5749","address":"沖縄県糸満市糸満989-83 糸満市場いとま〜る D4","hours":"11:00〜15:00／18:00〜22:00"},"weekly":[[[660,900],[1080,1320]],[[660,900],[1080,1320]],[[660,900],[1080,1320]],[],[[660,900],[1080,1320]],[[660,900],[1080,1320]],[[660,900],[1080,1320]]]},
  "itomaru-chef-vegeta": {"googleName":"シェフ＆ベジタ","googleCheckedOn":"2026-10-15","googleSourceUrl":"https://www.google.com/maps?cid=3009075444600748749","fields":{},"weekly":[[],[[660,1020]],[[660,1020]],[[660,1020]],[[660,1020]],[[660,1020]],[[660,1020]]]},
  "itomaru-machigwa": {"googleName":"町小 まちぐゎぁ","googleCheckedOn":"2026-10-15","googleSourceUrl":"https://www.google.com/maps?cid=4833090588919273832","fields":{"name":"町小 まちぐゎぁ","address":"沖縄県糸満市糸満989-83 糸満市場いとま〜る D6","hours":"月〜金 11:00〜17:00／土 11:00〜16:30（売り切れ次第終了）","closed":"日曜日"},"weekly":[[],[[660,1020]],[[660,1020]],[[660,1020]],[[660,1020]],[[660,1020]],[[660,990]]]}
};
for (const shop of [...window.KarimenTownData.shops, ...window.KarimenTownData.marketShops]) {
  // All listed restaurants confirmed by the listing owner on 2026-10-15.
  shop.voucherStatus = 'confirmed';
  shop.voucherCheckedOn = '2026-10-15';
  const audit = googleTownAudit[shop.id];
  const oldName = shop.name;
  const oldShortName = shop.shortName;
  Object.assign(shop, audit.fields, {googleName:audit.googleName, googleCheckedOn:audit.googleCheckedOn, googleSourceUrl:audit.googleSourceUrl, hoursSourceNote:audit.hoursNote || ''});
  shop.aliases = [...new Set([...(shop.aliases || []), oldName, oldShortName, audit.googleName].filter(Boolean))];
  shop.name = audit.googleName;
  shop.shortName = audit.googleName;
  if (audit.weekly) {
    const old = window.KarimenTownData.schedules[shop.id];
    window.KarimenTownData.schedules[shop.id] = {weekly:audit.weekly, holidays:old.holidays || false, lastWednesday:old.lastWednesday || false, soldOut:old.soldOut || shop.id==='itomaru-minatomachi' || shop.id==='itomaru-machigwa', lastOrder:old.lastOrder && shop.id!=='uminchu' ? old.lastOrder : undefined, uncertain:shop.facility ? '施設内の店舗ごとに異なります' : undefined};
  }
}
window.KarimenTownData.version = '20261015-google-hours';
