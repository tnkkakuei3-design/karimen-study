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
 'cafe-itoman':{uncertain:'営業曜日の記載に重複あり'},
 itomaru:{uncertain:'施設内の店舗ごとに異なります'},
 'ichiman-yokocho':{uncertain:'店舗ごとの営業時間・不定休を確認'},
 zero:{uncertain:'不定休のため来店前に確認'}
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
