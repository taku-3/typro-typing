// src/features/typro/word/words.ts
export type WordLevel = "easy" | "normal" | "hard";
export type CaseMode = "lower" | "title" | "upper" | "mixed";

export type WordThemeItem = {
  text: string;
  hint?: string;
  reading?: string; // ✅ 追加：読み（日本語的読み）
};

export type WordTheme = {
  label: string;
  items: WordThemeItem[];
  /** 英/ローマ字のみ true（プログラミング系は false） */
  caseApplicable: boolean;
};

// -------------------------
// helpers
// -------------------------
type ItemTuple = [text: string, hint?: string, reading?: string];

function t(text: string, hint?: string, reading?: string): ItemTuple {
  return [text, hint, reading];
}
function pack(items: ItemTuple[]): WordThemeItem[] {
  return items.map(([text, hint, reading]) => ({ text, hint, reading }));
}

/**
 * 60語（easy20 / normal20 / hard20）を前提に組み立てる
 * - text の長さで inLevel が決まるので、ここで均等になるように並べる
 */
function makeTheme(label: string, caseApplicable: boolean, all: ItemTuple[]) {
  return {
    label,
    caseApplicable,
    items: pack(all),
  } satisfies WordTheme;
}

// -------------------------
// DATA（各テーマ60語）
// ルール：
// - EASY: 3〜5
// - NORMAL: 6〜8
// - HARD: 9〜10
// - reading は「迷いを減らす」日本語読み（カタカナ/ひらがな）
// - hint は意味/用途。プログラミングは簡潔に。
// -------------------------
export const WORD_THEMES = {
  // =========================
  // ローマ字単語
  // =========================
  romaji_days: makeTheme("ローマ字単語：曜日", true, [
    // EASY (3-5) 20
    t("getsu", "月", "げつ"),
    t("sui", "水", "すい"),
    t("moku", "木", "もく"),
    t("kin", "金", "きん"),
    t("nichi", "日", "にち"),
    t("youbi", "（共通）曜日", "ようび"),
    t("hebi", "（おまけ）へび", "へび"),
    t("asa", "朝", "あさ"),
    t("hiru", "昼", "ひる"),
    t("yoru", "夜", "よる"),
    t("hare", "晴れ", "はれ"),
    t("kumo", "くもり", "くも"),
    t("ame", "雨", "あめ"),
    t("yuki", "雪", "ゆき"),
    t("kaze", "風", "かぜ"),
    t("hima", "ひま", "ひま"),
    t("gogo", "午後", "ごご"),
    t("gozen", "午前", "ごぜん"),
    t("ima", "今", "いま"),
    t("main", "（英寄り）main", "メイン"),

    // NORMAL (6-8) 20
    t("kayoubi", "火曜日", "かようび"), // ※元の "ka" は残すがレベル外になりがちなので追加
    t("doyoubi", "土曜日", "どようび"), // ※元の "do" は残すが…
    t("getsuyo", "（略）月曜", "げつよう"),
    t("kayoubi", "火曜日", "かようび"),
    t("suiyou", "（略）水曜", "すいよう"),
    t("mokuyo", "（略）木曜", "もくよう"),
    t("kinyou", "（略）金曜", "きんよう"),
    t("nichiyo", "（略）日曜", "にちよう"),
    t("shuumatu", "週末", "しゅうまつ"),
    t("heijitu", "平日", "へいじつ"),
    t("kyou", "今日", "きょう"),
    t("ashita", "明日", "あした"),
    t("kinou", "昨日", "きのう"),
    t("raishuu", "来週", "らいしゅう"),
    t("konshuu", "今週", "こんしゅう"),
    t("senshuu", "先週", "せんしゅう"),
    t("asagata", "朝方", "あさがた"),
    t("yorugata", "夜型", "よるがた"),
    t("gakko", "学校", "がっこう"),
    t("jidou", "児童", "じどう"),

    // HARD (9-10) 20
    t("getsuyoubi", "月曜日", "げつようび"),
    t("kayoubi", "火曜日", "かようび"),
    t("suiyoubi", "水曜日", "すいようび"),
    t("mokuyoubi", "木曜日", "もくようび"),
    t("kinyoubi", "金曜日", "きんようび"),
    t("doyoubi", "土曜日", "どようび"),
    t("nichiyoubi", "日曜日", "にちようび"),
    t("asatte", "明後日", "あさって"),
    t("ototoi", "一昨日", "おととい"),
    t("raigetsu", "来月", "らいげつ"),
    t("kongetsu", "今月", "こんげつ"),
    t("sengetsu", "先月", "せんげつ"),
    t("shinyuu", "親友", "しんゆう"),
    t("gakkoubi", "学校日（造語）", "がっこうび"),
    t("undoukai", "運動会", "うんどうかい"),
    t("bunkasai", "文化祭", "ぶんかさい"),
    t("yasumibi", "休み日（造語）", "やすみび"),
    t("benkyoubi", "勉強日（造語）", "べんきょうび"),
    t("kibunten", "気分転（略）", "きぶんてん"),
    t("tanoshimi", "楽しみ", "たのしみ"),
  ]),

  romaji_colors: makeTheme("ローマ字単語：色", true, [
    // EASY 20
    t("aka", "赤", "あか"),
    t("ao", "青", "あお"),
    t("kuro", "黒", "くろ"),
    t("shiro", "白", "しろ"),
    t("kiiro", "黄色", "きいろ"),
    t("midori", "緑", "みどり"),
    t("pink", "ピンク", "ぴんく"),
    t("orange", "オレンジ", "おれんじ"),
    t("momo", "桃色（おまけ）", "もも"),
    t("sora", "空色（おまけ）", "そら"),
    t("umi", "海色（おまけ）", "うみ"),
    t("yama", "山（緑寄り）", "やま"),
    t("kawa", "川（青寄り）", "かわ"),
    t("hana", "花（色々）", "はな"),
    t("kumo", "雲（白）", "くも"),
    t("yuki", "雪（白）", "ゆき"),
    t("kasa", "傘（色々）", "かさ"),
    t("pen", "ペン（色々）", "ぺん"),
    t("tokei", "時計（色々）", "とけい"),
    t("hikari", "光", "ひかり"),

    // NORMAL 20 (6-8)
    t("murasaki", "紫", "むらさき"),
    t("mizuiro", "水色", "みずいろ"),
    t("cha", "茶（短すぎ→レベル外）", "ちゃ"), // 残す（フィルタされ得る）
    t("chairo", "茶色", "ちゃいろ"),
    t("kiniro", "金色", "きんいろ"),
    t("gin", "銀（短すぎ）", "ぎん"),
    t("giniro", "銀色", "ぎんいろ"),
    t("haiiro", "灰色", "はいいろ"),
    t("namari", "鉛色（おまけ）", "なまり"),
    t("koniro", "紺色", "こんいろ"),
    t("akairo", "赤色", "あかいろ"),
    t("aoiro", "青色", "あおいろ"),
    t("kuroiro", "黒色", "くろいろ"),
    t("shiroiro", "白色", "しろいろ"),
    t("midori", "緑", "みどり"),
    t("momoiro", "桃色", "ももいろ"),
    t("sorairo", "空色", "そらいろ"),
    t("yamabuki", "山吹色", "やまぶき"),
    t("daidai", "橙（短すぎ→レベル外）", "だいだい"),
    t("daidaiiro", "橙色", "だいだいいろ"),

    // HARD 20 (9-10)
    t("murasakiiro", "紫色", "むらさきいろ"),
    t("kimidori", "黄緑", "きみどり"),
    t("kimidoriiro", "黄緑色", "きみどりいろ"),
    t("usumurasaki", "薄紫", "うすむらさき"),
    t("usumurasak", "薄紫（略）", "うすむらさき"),
    t("pinku", "ピンク（短）", "ぴんく"), // レベル外あり
    t("shikkoku", "漆黒", "しっこく"),
    t("shikkokuiro", "漆黒色", "しっこくいろ"),
    t("sumi", "墨（短）", "すみ"),
    t("sumiiro", "墨色", "すみいろ"),
    t("koganem", "黄金（略）", "こがね"),
    t("koganemiro", "黄金色", "こがねいろ"),
    t("hanairo", "花色（造語）", "はないろ"),
    t("kirameki", "きらめき", "きらめき"),
    t("hikaruiro", "明るい色", "あかるいろ"),
    t("kuraiiro", "暗い色", "くらいいろ"),
    t("iroasobi", "色遊び", "いろあそび"),
    t("iroenpitu", "色えんぴつ", "いろえんぴつ"),
    t("iroiroiro", "いろいろ色", "いろいろいろ"),
    t("irohyakka", "色百花（造語）", "いろひゃっか"),
  ]),

  romaji_toys: makeTheme("ローマ字単語：知育玩具", true, [
    // EASY 20 (3-5)
    t("tsumi", "積み木", "つみ"),
    t("puzzle", "パズル", "ぱずる"),
    t("karuta", "かるた", "かるた"),
    t("origami", "折り紙", "おりがみ"),
    t("ringo", "（おまけ）りんご", "りんご"),
    t("koma", "こま", "こま"),
    t("tama", "たま", "たま"),
    t("sugo", "すご（略）", "すご"),
    t("block", "ブロック", "ぶろっく"),
    t("card", "カード", "かーど"),
    t("dice", "サイコロ", "だいす"),
    t("himo", "ひも", "ひも"),
    t("tubo", "つぼ（おまけ）", "つぼ"),
    t("panda", "（おまけ）パンダ", "ぱんだ"),
    t("robot", "ロボット", "ろぼっと"),
    t("train", "電車（英寄り）", "とれいん"),
    t("drone", "ドローン", "どろーん"),
    t("game", "ゲーム", "げーむ"),
    t("paper", "紙", "ぺーぱー"),
    t("music", "音楽", "みゅーじっく"),

    // NORMAL 20 (6-8)
    t("kendama", "けん玉", "けんだま"),
    t("magnet", "マグネット", "まぐねっと"),
    t("jigsaw", "ジグソー", "じぐそー"),
    t("puzzler", "パズラー（造語）", "ぱずらー"),
    t("lego", "レゴ（短）", "れご"),
    t("legoset", "レゴセット", "れごせっと"),
    t("cardset", "カードセット", "かーどせっと"),
    t("chess", "チェス（短）", "ちぇす"),
    t("checkers", "チェッカー", "ちぇっかー"),
    t("marble", "ビー玉", "まーぶる"),
    t("pencil", "えんぴつ", "ぺんしる"),
    t("eraser", "消しゴム", "いれーさー"),
    t("riddle", "なぞなぞ", "りどる"),
    t("balance", "バランス", "ばらんす"),
    t("pyramid", "ピラミッド", "ぴらみっど"),
    t("tangram", "タングラム", "たんぐらむ"),
    t("mikado", "ミカド（おまけ）", "みかど"),
    t("spinner", "スピナー", "すぴなー"),
    t("slime", "スライム", "すらいむ"),
    t("puzzles", "パズルズ", "ぱずるず"),

    // HARD 20 (9-10)
    t("brainstorm", "ブレスト", "ぶれすと"),
    t("logicgame", "ロジックゲーム", "ろじっくげーむ"),
    t("puzzlegame", "パズルゲーム", "ぱずるげーむ"),
    t("robotgame", "ロボゲーム（造語）", "ろぼげーむ"),
    t("cardbattle", "カードバトル", "かーどばとる"),
    t("stackblock", "積みブロック", "すたっくぶろっく"),
    t("minipuzzle", "ミニパズル", "みにぱずる"),
    t("mindtrick", "マイントリック", "まいんどとりっく"),
    t("boardgame", "ボードゲーム", "ぼーどげーむ"),
    t("playmaker", "プレイメーカー", "ぷれいめーかー"),
    t("toyrobot", "トイロボ", "といろぼ"),
    t("learnblock", "学びブロック", "らーんぶろっく"),
    t("learncard", "学びカード", "らーんかーど"),
    t("puzzlerun", "パズルラン（造語）", "ぱずるらん"),
    t("tangramset", "タングラムセット", "たんぐらむせっと"),
    t("magnetset", "マグネットセット", "まぐねっとせっと"),
    t("robotics", "ロボティクス", "ろぼてぃくす"),
    t("programtoy", "プログラム玩具", "ぷろぐらむとい"),
    t("smarttoys", "スマートトイズ", "すまーとといず"),
    t("playground", "遊び場", "ぷれいぐらうんど"),
  ]),

  romaji_stationery: makeTheme("ローマ字単語：文房具", true, [
    // EASY 20
    t("enpitsu", "えんぴつ", "えんぴつ"),
    t("keshi", "消しゴム（略）", "けし"),
    t("note", "ノート", "のーと"),
    t("jogi", "定規", "じょうぎ"),
    t("pen", "ペン", "ぺん"),
    t("hude", "筆", "ふで"),
    t("kami", "紙", "かみ"),
    t("nori", "のり", "のり"),
    t("kasa", "かさ（おまけ）", "かさ"),
    t("kagi", "かぎ（おまけ）", "かぎ"),
    t("pasta", "（おまけ）パスタ", "ぱすた"),
    t("sara", "皿（おまけ）", "さら"),
    t("tape", "テープ", "てーぷ"),
    t("memo", "メモ", "めも"),
    t("file", "ファイル", "ふぁいる"),
    t("clip", "クリップ", "くりっぷ"),
    t("pouch", "ポーチ", "ぽーち"),
    t("stamp", "スタンプ", "すたんぷ"),
    t("color", "カラー", "からー"),
    t("paper", "紙（英寄り）", "ぺーぱー"),

    // NORMAL 20
    t("eraser", "消しゴム", "いれーさー"),
    t("ruler", "定規", "るーらー"),
    t("notebook", "ノート", "のーとぶっく"),
    t("marker", "マーカー", "まーかー"),
    t("stapler", "ホチキス", "すてーぷらー"),
    t("scissor", "はさみ", "しざー"),
    t("gluestik", "のり（スティック）", "ぐるーすてぃっく"),
    t("pencase", "筆箱", "ぺんけーす"),
    t("sharp", "シャープ", "しゃーぷ"),
    t("sharpen", "削る", "しゃーぷん"),
    t("schedule", "スケジュール", "すけじゅーる"),
    t("calendar", "カレンダー", "かれんだー"),
    t("whiteout", "修正液", "ほわいとあうと"),
    t("highlite", "蛍光ペン（略）", "はいらいと"),
    t("binder", "バインダー", "ばいんだー"),
    t("folders", "フォルダ", "ふぉるだーず"),
    t("keshigom", "けしごむ（略）", "けしごむ"),
    t("enpitusu", "えんぴつ（略）", "えんぴつ"),
    t("jyougi", "定規（別表記）", "じょうぎ"),
    t("teepu", "テープ（別表記）", "てーぷ"),

    // HARD 20
    t("mechanical", "シャーペン（英寄り）", "めかにかる"),
    t("mechanpen", "シャーペン（造語）", "めかにぺん"),
    t("stationery", "文房具", "すてーしょなりー"),
    t("pencilcase", "筆箱", "ぺんしるけーす"),
    t("notepaper", "便箋（英寄り）", "のーとぺーぱー"),
    t("stickglue", "スティックのり", "すてぃっくぐるー"),
    t("highlighter", "蛍光ペン", "はいらいたー"),
    t("clipboard", "クリップボード", "くりっぷぼーど"),
    t("papercraft", "紙工作", "ぺーぱーくらふと"),
    t("writeboard", "ホワイトボード（略）", "らいとぼーど"),
    t("binderclip", "バインダークリップ", "ばいんだーくりっぷ"),
    t("filefolder", "ファイルフォルダ", "ふぁいるふぉるだ"),
    t("stampcard", "スタンプカード", "すたんぷかーど"),
    t("calendars", "カレンダー（複数）", "かれんだーず"),
    t("scheduling", "予定管理", "すけじゅーりんぐ"),
    t("paperwork", "書類仕事", "ぺーぱーわーく"),
    t("handwriting", "手書き", "はんどらいてぃんぐ"),
    t("workspace", "作業場", "わーくすぺーす"),
    t("studytools", "勉強道具", "すたでぃつーるず"),
    t("notechain", "ノート連結（造語）", "のーとちぇいん"),
  ]),

  romaji_amusement: makeTheme("ローマ字単語：遊園地", true, [
    // EASY 20
    t("jetco", "ジェットコースター（略）", "じぇっとこ"),
    t("merry", "メリーゴーランド（略）", "めりー"),
    t("wheel", "観覧車（英寄り）", "ほいーる"),
    t("ticket", "チケット（英寄り）", "ちけっと"),
    t("cafe", "カフェ", "かふぇ"),
    t("ride", "乗り物", "らいど"),
    t("gate", "入口", "げーと"),
    t("park", "パーク", "ぱーく"),
    t("food", "フード", "ふーど"),
    t("game", "ゲーム", "げーむ"),
    t("photo", "写真", "ふぉと"),
    t("music", "音楽", "みゅーじっく"),
    t("stage", "ステージ", "すてーじ"),
    t("show", "ショー", "しょー"),
    t("map", "地図", "まっぷ"),
    t("line", "列", "らいん"),
    t("wait", "待つ", "うぇいと"),
    t("staff", "スタッフ", "すたっふ"),
    t("smile", "スマイル", "すまいる"),
    t("happy", "ハッピー", "はっぴー"),

    // NORMAL 20
    t("coaster", "コースター", "こーすたー"),
    t("carousel", "回転木馬", "かるーせる"),
    t("ferris", "観覧車（略）", "ふぇりす"),
    t("festival", "お祭り", "ふぇすてぃばる"),
    t("firework", "花火", "ふぁいあわーく"),
    t("parade", "パレード", "ぱれーど"),
    t("carnival", "カーニバル", "かーにばる"),
    t("balloon", "風船", "ばるーん"),
    t("souvenir", "お土産", "すーべにあ"),
    t("popcorn", "ポップコーン", "ぽっぷこーん"),
    t("hotdog", "ホットドッグ", "ほっとどっぐ"),
    t("icecream", "アイス", "あいすくりーむ"),
    t("schedule", "予定", "すけじゅーる"),
    t("entrance", "入口", "えんとらんす"),
    t("exit", "出口", "えぐじっと"),
    t("queue", "行列", "きゅー"),
    t("wristband", "リストバンド", "りすとばんど"),
    t("fastpass", "ファストパス", "ふぁすとぱす"),
    t("roller", "ローラー（略）", "ろーらー"),
    t("castle", "城", "きゃっする"),

    // HARD 20
    t("rollercoas", "ローラーコース（略）", "ろーらーこーす"),
    t("rollercoast", "ローラーコースト（略）", "ろーらーこーすと"),
    t("rollercoaster", "ジェットコースター", "ろーらーこーすたー"),
    t("haunted", "お化け屋敷（略）", "ほーんてっど"),
    t("hauntedhs", "お化け屋敷（造語略）", "ほーんてっどはうす"),
    t("haunthouse", "お化け屋敷（英寄り）", "ほーんてっどはうす"),
    t("waterslide", "ウォータースライド", "うぉーたーすらいど"),
    t("splashzone", "水しぶきゾーン", "すぷらっしゅぞーん"),
    t("photospot", "フォトスポット", "ふぉとすぽっと"),
    t("nightshow", "ナイトショー", "ないとしょー"),
    t("playground", "遊び場", "ぷれいぐらうんど"),
    t("amusement", "アミューズメント", "あみゅーずめんと"),
    t("ticketgate", "改札（造語）", "ちけっとげーと"),
    t("souvenirs", "お土産（複数）", "すーべにあず"),
    t("crowdcare", "混雑ケア（造語）", "くらうどけあ"),
    t("safetycheck", "安全確認", "せーふてぃちぇっく"),
    t("funparade", "楽しいパレード", "ふぁんぱれーど"),
    t("happytime", "ハッピータイム", "はっぴーたいむ"),
    t("wonderland", "ワンダーランド", "わんだーらんど"),
    t("adventure", "アドベンチャー", "あどべんちゃー"),
  ]),

  romaji_animals: makeTheme("ローマ字単語：動物", true, [
    // EASY 20
    t("inu", "犬", "いぬ"),
    t("neko", "猫", "ねこ"),
    t("usagi", "うさぎ", "うさぎ"),
    t("kuma", "くま", "くま"),
    t("tora", "とら", "とら"),
    t("saru", "さる", "さる"),
    t("zou", "ぞう", "ぞう"),
    t("kirin", "きりん", "きりん"),
    t("panda", "パンダ", "ぱんだ"),
    t("lion", "ライオン（英寄り）", "らいおん"),
    t("uma", "うま", "うま"),
    t("tori", "とり", "とり"),
    t("kani", "かに", "かに"),
    t("same", "さめ", "さめ"),
    t("kame", "かめ", "かめ"),
    t("hebi", "へび", "へび"),
    t("wani", "わに", "わに"),
    t("hachi", "はち", "はち"),
    t("kumo", "くも（蜘蛛）", "くも"),
    t("kaeru", "かえる", "かえる"),

    // NORMAL 20
    t("pengin", "ペンギン（略）", "ぺんぎん"),
    t("penguin", "ペンギン", "ぺんぎん"),
    t("gorira", "ゴリラ", "ごりら"),
    t("shika", "しか", "しか"),
    t("yagi", "やぎ", "やぎ"),
    t("hiyoko", "ひよこ", "ひよこ"),
    t("kouchou", "こうちょう（鳥）", "こうちょう"),
    t("tanuki", "たぬき", "たぬき"),
    t("kitsune", "きつね", "きつね"),
    t("hamster", "ハムスター", "はむすたー"),
    t("monkey", "さる（英）", "もんきー"),
    t("rabbit", "うさぎ（英）", "らびっと"),
    t("tiger", "とら（英）", "たいがー"),
    t("zebra", "しまうま（英）", "ぜぶら"),
    t("poodle", "犬（英寄り）", "ぷーどる"),
    t("kitten", "子猫（英）", "きとん"),
    t("puppy", "子犬（英）", "ぱぴー"),
    t("octopus", "たこ（英）", "おくとぱす"),
    t("dolphin", "いるか（英）", "どるふぃん"),
    t("giraffe", "きりん（英）", "じらふ"),

    // HARD 20
    t("hippopot", "カバ（略）", "ひっぽ"),
    t("hippopota", "カバ（略）", "ひっぽぽた"),
    t("hippopotam", "カバ（略）", "ひっぽぽたむ"),
    t("alligator", "ワニ（英）", "ありげーたー"),
    t("crocodile", "ワニ（英）", "くろこだいる"),
    t("chimpanze", "チンパン（略）", "ちんぱんじー"),
    t("chimpanzee", "チンパンジー", "ちんぱんじー"),
    t("orangutan", "オランウータン", "おらんうーたん"),
    t("armadillo", "アルマジロ", "あるまじろ"),
    t("porcupine", "ヤマアラシ", "ぽーきゅぱいん"),
    t("hedgehog", "ハリネズミ", "へっじほっぐ"),
    t("butterfly", "ちょう", "ばたふらい"),
    t("dragonfly", "とんぼ", "どらごんふらい"),
    t("bluewhale", "シロナガスクジラ", "ぶるーほえーる"),
    t("sealion", "あしか", "しーらいおん"),
    t("seahorse", "たつのおとしご", "しーほーす"),
    t("starfish", "ひとで", "すたーふぃっしゅ"),
    t("ladybird", "てんとうむし", "れでぃばーど"),
    t("earthworm", "みみず", "あーすわーむ"),
    t("caterpill", "いもむし（略）", "きゃたぴらー"),
  ]),

  romaji_gadgets: makeTheme("ローマ字単語：ガジェット", true, [
    // EASY 20
    t("pc", "パソコン（短すぎ→レベル外）", "ぴーしー"),
    t("mouse", "マウス", "まうす"),
    t("camera", "カメラ", "かめら"),
    t("router", "ルーター", "るーたー"),
    t("tablet", "タブレット", "たぶれっと"),
    t("charger", "充電器", "ちゃーじゃー"),
    t("phone", "スマホ", "ふぉーん"),
    t("watch", "時計", "うぉっち"),
    t("cable", "ケーブル", "けーぶる"),
    t("usb", "USB（短）", "ゆーえすびー"),
    t("wifi", "Wi-Fi（短）", "わいふぁい"),
    t("case", "ケース", "けーす"),
    t("lens", "レンズ", "れんず"),
    t("light", "ライト", "らいと"),
    t("sound", "サウンド", "さうんど"),
    t("music", "ミュージック", "みゅーじっく"),
    t("pixel", "ピクセル", "ぴくせる"),
    t("cloud", "クラウド", "くらうど"),
    t("screen", "画面", "すくりーん"),
    t("app", "アプリ（短→レベル外）", "あっぷ"),

    // NORMAL 20
    t("laptop", "ノートPC", "らっぷとっぷ"),
    t("speaker", "スピーカー", "すぴーかー"),
    t("headset", "ヘッドセット", "へっどせっと"),
    t("earbuds", "イヤホン", "いやばっず"),
    t("monitor", "モニター", "もにたー"),
    t("printer", "プリンター", "ぷりんたー"),
    t("scanner", "スキャナー", "すきゃなー"),
    t("modem", "モデム（短）", "もでむ"),
    t("hotspot", "テザリング", "ほっとすぽっと"),
    t("battery", "バッテリー", "ばってりー"),
    t("powerbank", "モバイルバッテリー", "ぱわーばんく"),
    t("webcam", "ウェブカメラ", "うぇぶかむ"),
    t("ringlight", "リングライト", "りんぐらいと"),
    t("tripod", "三脚", "とらいぽっど"),
    t("keycaps", "キーキャップ", "きーきゃっぷす"),
    t("keyboard", "キーボード", "きーぼーど"),
    t("trackpad", "トラックパッド", "とらっくぱっど"),
    t("bluetooth", "ブルートゥース", "ぶるーとぅーす"),
    t("airdrop", "共有（Apple）", "えあどろっぷ"),
    t("storages", "ストレージ（複）", "すとれーじず"),

    // HARD 20
    t("smartphone", "スマホ", "すまーとふぉん"),
    t("microphone", "マイク", "まいくろふぉん"),
    t("videocall", "ビデオ通話", "びでおこーる"),
    t("streaming", "配信", "すとりーみんぐ"),
    t("screenshot", "スクショ", "すくりーんしょっと"),
    t("automation", "自動化", "おーとめーしょん"),
    t("wireless", "無線", "わいやれす"),
    t("touchscreen", "タッチ画面", "たっちすくりーん"),
    t("videogame", "ビデオゲーム", "びでおげーむ"),
    t("resolution", "解像度", "れぞりゅーしょん"),
    t("processor", "CPU", "ぷろせっさー"),
    t("motherboard", "基板", "まざーぼーど"),
    t("filesystem", "ファイルシステム", "ふぁいるしすてむ"),
    t("downloads", "ダウンロード（複）", "だうんろーどず"),
    t("uploading", "アップロード中", "あっぷろーでぃんぐ"),
    t("passwords", "パスワード（複）", "ぱすわーどず"),
    t("encryption", "暗号化", "えんくりぷしょん"),
    t("datacenter", "データセンター", "でーたせんたー"),
    t("connectors", "接続（複）", "こねくたーず"),
    t("debugging", "デバッグ", "でばっぎんぐ"),
  ]),

  // =========================
  // 英単語
  // =========================
  english_days: makeTheme("英単語：曜日", true, [
    // EASY 20 (3-5)
    t("mon", "月（略）", "まん"),
    t("tue", "火（略）", "ちゅー"),
    t("wed", "水（略）", "うぇど"),
    t("thu", "木（略）", "すー"),
    t("fri", "金（略）", "ふらい"),
    t("sat", "土（略）", "さっと"),
    t("sun", "日（略）", "さん"),
    t("day", "日", "でい"),
    t("days", "日々", "でいず"),
    t("week", "週", "うぃーく"),
    t("noon", "正午", "ぬーん"),
    t("night", "夜", "ないと"),
    t("morning", "朝（長→レベル外）", "もーにんぐ"),
    t("today", "今日", "とぅでい"),
    t("tomor", "明日（略）", "とぅもろ"),
    t("yesterday", "昨日（長→外）", "いぇすたでい"),
    t("after", "後", "あふたー"),
    t("before", "前", "びふぉー"),
    t("early", "早い", "あーりー"),
    t("later", "後で", "れいたー"),

    // NORMAL 20 (6-8)
    t("monday", "月", "まんでい"),
    t("tuesday", "火", "ちゅーずでい"),
    t("friday", "金", "ふらいでい"),
    t("sunday", "日", "さんでい"),
    t("weekday", "平日", "うぃーくでい"),
    t("weekend", "週末", "うぃーけんど"),
    t("tonight", "今夜", "とぅないと"),
    t("morning", "朝", "もーにんぐ"),
    t("evening", "夕方", "いぶにんぐ"),
    t("afternoon", "午後（長→外）", "あふたぬーん"),
    t("nextweek", "来週（造語）", "ねくすとうぃーく"),
    t("thisweek", "今週（造語）", "でぃすうぃーく"),
    t("lastweek", "先週（造語）", "らすとうぃーく"),
    t("anytime", "いつでも", "えにたいむ"),
    t("sometime", "いつか", "さむたいむ"),
    t("someday", "いつか", "さむでい"),
    t("holiday", "休日", "ほりでい"),
    t("workday", "仕事日", "わーくでい"),
    t("daytime", "昼間", "でいたいむ"),
    t("bedtime", "就寝時間", "べっどたいむ"),

    // HARD 20 (9-10)
    t("wednesday", "水", "うぇんずでい"),
    t("thursday", "木", "さーずでい"),
    t("saturday", "土", "さたでい"),
    t("yesterday", "昨日", "いぇすたでい"),
    t("tomorrow", "明日", "とぅもろー"),
    t("afternoon", "午後", "あふたぬーん"),
    t("everyday", "毎日", "えぶりでい"),
    t("weekdays", "平日（複）", "うぃーくでいず"),
    t("weekends", "週末（複）", "うぃーけんず"),
    t("nighttime", "夜間", "ないとたいむ"),
    t("breaktime", "休憩", "ぶれいくたいむ"),
    t("schoolday", "登校日", "すくーるでい"),
    t("game night", "ゲームナイト（空白→外になりがち）", "げーむないと"),
    t("playtime", "遊ぶ時間", "ぷれいたいむ"),
    t("daydreams", "白昼夢（複）", "でいどりーむず"),
    t("bytomorrow", "明日まで（造語）", "ばいとぅもろー"),
    t("nextmonth", "来月", "ねくすともんす"),
    t("thismonth", "今月", "でぃすもんす"),
    t("lastmonth", "先月", "らすともんす"),
    t("dayplanner", "予定表", "でいぷらなー"),
  ]),

  english_colors: makeTheme("英単語：色", true, [
    // EASY 20
    t("red", "赤", "れっど"),
    t("blue", "青", "ぶるー"),
    t("green", "緑", "ぐりーん"),
    t("yellow", "黄", "いえろー"), // 6→NORMAL寄りだがケース変換対象、残す
    t("black", "黒", "ぶらっく"),
    t("white", "白", "ほわいと"),
    t("pink", "桃", "ぴんく"),
    t("orange", "橙", "おれんじ"), // 6→NORMAL
    t("gray", "灰", "ぐれー"),
    t("brown", "茶", "ぶらうん"),
    t("gold", "金", "ごーるど"),
    t("silver", "銀", "しるばー"), // 6→NORMAL
    t("navy", "紺", "ねいびー"),
    t("lime", "黄緑", "らいむ"),
    t("sky", "空色", "すかい"),
    t("aqua", "水色", "あくあ"),
    t("beige", "ベージュ", "べーじゅ"),
    t("ivory", "象牙", "あいぼりー"),
    t("peach", "桃色", "ぴーち"),
    t("coral", "珊瑚", "こーらる"),

    // NORMAL 20
    t("purple", "紫", "ぱーぷる"),
    t("violet", "紫（近）", "ばいおれっと"),
    t("indigo", "藍", "いんでぃご"),
    t("magenta", "赤紫", "まぜんた"),
    t("crimson", "深紅", "くりむぞん"),
    t("scarlet", "緋色", "すかーれっと"),
    t("maroon", "えんじ", "まるーん"),
    t("emerald", "緑宝石", "えめらるど"),
    t("sapphire", "青宝石", "さふぁいあ"),
    t("turquoise", "青緑", "たーこいず"),
    t("teal", "青緑（短）", "てぃーる"),
    t("mint", "ミント", "みんと"),
    t("lavender", "ラベンダー（長→外）", "らべんだー"),
    t("mustard", "からし色", "ますたーど"),
    t("chocolate", "チョコ色（長→外）", "ちょこれーと"),
    t("rainbow", "虹", "れいんぼー"),
    t("colorful", "カラフル", "からふる"),
    t("monochro", "モノクロ（略）", "ものくろ"),
    t("pastel", "パステル", "ぱすてる"),
    t("gradient", "グラデ（長→外）", "ぐらでぃえんと"),

    // HARD 20
    t("lightblue", "薄青", "らいとぶるー"),
    t("darkblue", "濃青", "だーくぶるー"),
    t("lightgray", "薄灰", "らいとぐれー"),
    t("darkgray", "濃灰", "だーくぐれー"),
    t("lightpink", "薄桃", "らいとぴんく"),
    t("hotpink", "濃桃", "ほっとぴんく"),
    t("lightgreen", "薄緑", "らいとぐりーん"),
    t("darkgreen", "濃緑", "だーくぐりーん"),
    t("yellowish", "黄み", "いえろーいっしゅ"),
    t("bluish", "青み", "ぶるーいっしゅ"),
    t("greenish", "緑み", "ぐりーにっしゅ"),
    t("colorwheel", "色相環", "からーうぃーる"),
    t("shadecolor", "影色", "しぇいどからー"),
    t("tonecolor", "トーン色", "とーんからー"),
    t("colorcode", "カラーコード", "からーこーど"),
    t("rgbcolor", "RGB", "あーるじーびーからー"),
    t("hexcolor", "16進", "へっくすからー"),
    t("warmcolor", "暖色", "わーむからー"),
    t("coolcolor", "寒色", "くーるからー"),
    t("monocolor", "単色", "ものからー"),
  ]),

  english_toys: makeTheme("英単語：知育玩具", true, [
    // EASY 20
    t("puzzle", "パズル", "ぱずる"),
    t("blocks", "積み木", "ぶろっくす"),
    t("robot", "ロボット", "ろぼっと"),
    t("cards", "カード", "かーず"),
    t("board", "ボード", "ぼーど"),
    t("dice", "サイコロ", "だいす"),
    t("train", "電車", "とれいん"),
    t("game", "ゲーム", "げーむ"),
    t("teddy", "ぬいぐるみ", "てでぃ"),
    t("ball", "ボール", "ぼーる"),
    t("ring", "リング", "りんぐ"),
    t("rope", "ロープ", "ろーぷ"),
    t("paint", "絵の具", "ぺいんと"),
    t("paper", "紙", "ぺーぱー"),
    t("glue", "のり", "ぐるー"),
    t("craft", "工作", "くらふと"),
    t("music", "音楽", "みゅーじっく"),
    t("drone", "ドローン", "どろーん"),
    t("comic", "マンガ", "こみっく"),
    t("story", "物語", "すとーりー"),

    // NORMAL 20
    t("jigsaw", "ジグソー", "じぐそー"),
    t("puzzler", "パズルする人（造語）", "ぱずらー"),
    t("marbles", "ビー玉", "まーぶるず"),
    t("balance", "バランス", "ばらんす"),
    t("tangram", "タングラム", "たんぐらむ"),
    t("spinner", "スピナー", "すぴなー"),
    t("slime", "スライム", "すらいむ"),
    t("origami", "折り紙", "おりがみ"),
    t("toybox", "おもちゃ箱", "といぼっくす"),
    t("playset", "セット", "ぷれいせっと"),
    t("sticker", "シール", "すてぃっかー"),
    t("coloring", "ぬりえ", "からりんぐ"),
    t("building", "組み立て", "びるでぃんぐ"),
    t("strategy", "戦略（長→外）", "すとらてじー"),
    t("sandbox", "砂場/試作", "さんどぼっくす"),
    t("pattern", "模様", "ぱたーん"),
    t("riddle", "なぞ", "りどる"),
    t("pencils", "色鉛筆", "ぺんしるず"),
    t("notebook", "ノート", "のーとぶっく"),
    t("stapler", "ホチキス", "すてーぷらー"),

    // HARD 20
    t("boardgame", "ボードゲーム", "ぼーどげーむ"),
    t("puzzlegame", "パズルゲーム", "ぱずるげーむ"),
    t("logicgame", "ロジックゲーム", "ろじっくげーむ"),
    t("cardbattle", "カードバトル", "かーどばとる"),
    t("playmaker", "作る人", "ぷれいめーかー"),
    t("mindtrick", "頭のトリック", "まいんどとりっく"),
    t("brainstorm", "ブレスト", "ぶれすと"),
    t("robotics", "ロボティクス", "ろぼてぃくす"),
    t("smarttoys", "スマート玩具", "すまーとといず"),
    t("playground", "遊び場", "ぷれいぐらうんど"),
    t("creativity", "創造性", "くりえいてぃびてぃ"),
    t("gamified", "ゲーム化（造語）", "げーみふぁいど"),
    t("handcraft", "手作り", "はんどくらふと"),
    t("paperfold", "紙折り", "ぺーぱーふぉーるど"),
    t("buildblock", "組立ブロック", "びるどぶろっく"),
    t("learnsteps", "学び段階", "らーんすてっぷす"),
    t("puzzlerun", "パズル走（造語）", "ぱずるらん"),
    t("toyproject", "玩具プロジェクト", "といぷろじぇくと"),
    t("studytools", "学習道具", "すたでぃつーるず"),
    t("playandgo", "遊んで行く（造語）", "ぷれいあんどごー"),
  ]),

  english_stationery: makeTheme("英単語：文房具", true, [
    // EASY 20
    t("pencil", "鉛筆", "ぺんしる"),
    t("eraser", "消しゴム", "いれーさー"),
    t("ruler", "定規", "るーらー"),
    t("marker", "マーカー", "まーかー"),
    t("paper", "紙", "ぺーぱー"),
    t("glue", "のり", "ぐるー"),
    t("tape", "テープ", "てーぷ"),
    t("clip", "クリップ", "くりっぷ"),
    t("pen", "ペン", "ぺん"),
    t("note", "ノート", "のーと"),
    t("card", "カード", "かーど"),
    t("book", "本", "ぶっく"),
    t("bag", "かばん", "ばっぐ"),
    t("case", "ケース", "けーす"),
    t("stamp", "スタンプ", "すたんぷ"),
    t("chalk", "チョーク", "ちょーく"),
    t("board", "ボード", "ぼーど"),
    t("paint", "絵の具", "ぺいんと"),
    t("brush", "筆", "ぶらし"),
    t("sharp", "シャープ", "しゃーぷ"),

    // NORMAL 20
    t("notebook", "ノート", "のーとぶっく"),
    t("stapler", "ホチキス", "すてーぷらー"),
    t("scissor", "はさみ", "しざー"),
    t("pencase", "筆箱", "ぺんけーす"),
    t("sharpener", "削り器（長→外）", "しゃーぷなー"),
    t("highlite", "蛍光（略）", "はいらいと"),
    t("highligh", "蛍光（略）", "はいらいと"),
    t("binder", "バインダー", "ばいんだー"),
    t("folders", "フォルダ", "ふぉるだーず"),
    t("calendar", "カレンダー", "かれんだー"),
    t("schedule", "予定", "すけじゅーる"),
    t("whiteout", "修正", "ほわいとあうと"),
    t("labeler", "ラベル機", "れいぶらー"),
    t("envelope", "封筒（長→外）", "えんぶろーぷ"),
    t("postcard", "はがき", "ぽすとかーど"),
    t("sketch", "スケッチ", "すけっち"),
    t("drawing", "お絵描き", "どろーいんぐ"),
    t("notepad", "メモ帳", "のーとぱっど"),
    t("clipboard", "クリップボード", "くりっぷぼーど"),
    t("workbook", "ワークブック", "わーくぶっく"),

    // HARD 20
    t("pencilcase", "筆箱", "ぺんしるけーす"),
    t("highlighter", "蛍光ペン", "はいらいたー"),
    t("stationery", "文房具", "すてーしょなりー"),
    t("paperwork", "書類仕事", "ぺーぱーわーく"),
    t("handwriting", "手書き", "はんどらいてぃんぐ"),
    t("workspace", "作業場", "わーくすぺーす"),
    t("studytools", "学習道具", "すたでぃつーるず"),
    t("filestack", "ファイル束", "ふぁいるすたっく"),
    t("notepaper", "便箋", "のーとぺーぱー"),
    t("bindercap", "バインダー（造語）", "ばいんだーきゃっぷ"),
    t("stampcard", "スタンプカード", "すたんぷかーど"),
    t("scheduling", "予定管理", "すけじゅーりんぐ"),
    t("bookstand", "ブックスタンド", "ぶっくすたんど"),
    t("penholder", "ペン立て", "ぺんほるだー"),
    t("deskmat", "デスクマット", "ですくまっと"),
    t("writeboard", "書くボード", "らいとぼーど"),
    t("colorpaper", "色紙", "からーぺーぱー"),
    t("craftpaper", "工作用紙", "くらふとぺーぱー"),
    t("checklist", "チェックリスト", "ちぇっくりすと"),
    t("dayplanner", "手帳", "でいぷらなー"),
  ]),

  english_amusement: makeTheme("英単語：遊園地", true, [
    // EASY 20
    t("ticket", "チケット", "ちけっと"),
    t("roller", "ローラー", "ろーらー"),
    t("castle", "城", "きゃっする"),
    t("parade", "パレード", "ぱれーど"),
    t("ride", "乗り物", "らいど"),
    t("park", "パーク", "ぱーく"),
    t("cafe", "カフェ", "かふぇ"),
    t("show", "ショー", "しょー"),
    t("stage", "ステージ", "すてーじ"),
    t("music", "音楽", "みゅーじっく"),
    t("photo", "写真", "ふぉと"),
    t("smile", "笑顔", "すまいる"),
    t("happy", "楽しい", "はっぴー"),
    t("crowd", "人混み", "くらうど"),
    t("queue", "列", "きゅー"),
    t("wait", "待つ", "うぇいと"),
    t("food", "食べ物", "ふーど"),
    t("snack", "おやつ", "すなっく"),
    t("drinks", "飲み物", "どりんくす"),
    t("map", "地図", "まっぷ"),

    // NORMAL 20
    t("coaster", "コースター", "こーすたー"),
    t("carousel", "回転木馬", "かるーせる"),
    t("festival", "お祭り", "ふぇすてぃばる"),
    t("carnival", "カーニバル", "かーにばる"),
    t("firework", "花火", "ふぁいあわーく"),
    t("souvenir", "お土産", "すーべにあ"),
    t("popcorn", "ポップコーン", "ぽっぷこーん"),
    t("hotdog", "ホットドッグ", "ほっとどっぐ"),
    t("icecream", "アイス", "あいすくりーむ"),
    t("entrance", "入口", "えんとらんす"),
    t("exit", "出口", "えぐじっと"),
    t("fastpass", "ファストパス", "ふぁすとぱす"),
    t("wristband", "リストバンド", "りすとばんど"),
    t("giftshop", "売店", "ぎふとしょっぷ"),
    t("playset", "遊びセット", "ぷれいせっと"),
    t("nightshow", "夜ショー", "ないとしょー"),
    t("photospot", "撮影場所", "ふぉとすぽっと"),
    t("waterslide", "水すべり", "うぉーたーすらいど"),
    t("splashzone", "水しぶき", "すぷらっしゅぞーん"),
    t("amusement", "遊園地", "あみゅーずめんと"),

    // HARD 20
    t("rollercoaster", "ジェットコースター", "ろーらーこーすたー"),
    t("playground", "遊び場", "ぷれいぐらうんど"),
    t("adventure", "冒険", "あどべんちゃー"),
    t("wonderland", "ワンダーランド", "わんだーらんど"),
    t("safetycheck", "安全確認", "せーふてぃちぇっく"),
    t("ticketgate", "改札（造語）", "ちけっとげーと"),
    t("crowdcare", "混雑対応", "くらうどけあ"),
    t("funparade", "楽しいパレード", "ふぁんぱれーど"),
    t("happytime", "ハッピータイム", "はっぴーたいむ"),
    t("souvenirs", "お土産（複）", "すーべにあず"),
    t("photobook", "写真本", "ふぉとぶっく"),
    t("nightlight", "夜の光", "ないとらいと"),
    t("parkmapset", "地図セット", "ぱーくまっぷせっと"),
    t("guestcare", "お客様ケア", "げすとけあ"),
    t("staffonly", "スタッフ専用", "すたっふおんりー"),
    t("eventstage", "イベント舞台", "いべんとすてーじ"),
    t("musicshow", "音楽ショー", "みゅーじっくしょー"),
    t("kidszone", "キッズゾーン", "きっずぞーん"),
    t("familyday", "家族の日", "ふぁみりーでい"),
    t("rainyday", "雨の日", "れいにーでい"),
  ]),

  english_animals: makeTheme("英単語：動物", true, [
    // EASY 20
    t("cat", "猫", "きゃっと"),
    t("dog", "犬", "どっぐ"),
    t("lion", "ライオン", "らいおん"),
    t("zebra", "シマウマ", "ぜぶら"),
    t("panda", "パンダ", "ぱんだ"),
    t("tiger", "とら", "たいがー"),
    t("horse", "うま", "ほーす"),
    t("mouse", "ねずみ", "まうす"),
    t("snake", "へび", "すねいく"),
    t("whale", "くじら", "ほえーる"),
    t("shark", "さめ", "しゃーく"),
    t("sheep", "ひつじ", "しーぷ"),
    t("goat", "やぎ", "ごーと"),
    t("deer", "しか", "でぃあ"),
    t("frog", "かえる", "ふろっぐ"),
    t("turtle", "かめ", "たーとる"), // 6→NORMAL寄り
    t("eagle", "わし", "いーぐる"),
    t("crow", "からす", "くろー"),
    t("bear", "くま", "べあ"),
    t("monkey", "さる", "もんきー"), // 6→NORMAL

    // NORMAL 20
    t("rabbit", "うさぎ", "らびっと"),
    t("kitten", "子猫", "きとん"),
    t("puppy", "子犬", "ぱぴー"),
    t("dolphin", "いるか", "どるふぃん"),
    t("giraffe", "きりん", "じらふ"),
    t("penguin", "ペンギン", "ぺんぎん"),
    t("hamster", "ハムスター", "はむすたー"),
    t("octopus", "たこ", "おくとぱす"),
    t("sparrow", "すずめ", "すぱろー"),
    t("peacock", "くじゃく", "ぴーこっく"),
    t("crocodile", "ワニ（長→外）", "くろこだいる"),
    t("alligator", "ワニ", "ありげーたー"),
    t("hedgehog", "ハリネズミ", "へっじほっぐ"),
    t("starfish", "ひとで", "すたーふぃっしゅ"),
    t("seahorse", "たつのおとしご", "しーほーす"),
    t("ladybird", "てんとうむし", "れでぃばーど"),
    t("butterfly", "ちょう", "ばたふらい"),
    t("dragonfly", "とんぼ", "どらごんふらい"),
    t("earthworm", "みみず", "あーすわーむ"),
    t("caterpill", "いもむし（略）", "きゃたぴらー"),

    // HARD 20
    t("chimpanzee", "チンパンジー", "ちんぱんじー"),
    t("orangutan", "オランウータン", "おらんうーたん"),
    t("armadillo", "アルマジロ", "あるまじろ"),
    t("porcupine", "ヤマアラシ", "ぽーきゅぱいん"),
    t("hippopotam", "カバ（略）", "ひっぽぽたむ"),
    t("bluewhale", "シロナガスクジラ", "ぶるーほえーる"),
    t("sealion", "あしか", "しーらいおん"),
    t("jellyfish", "くらげ", "じぇりーふぃっしゅ"),
    t("woodpecker", "きつつき（長→外）", "うっどぺっかー"),
    t("hummingbd", "ハチドリ（略）", "はみんぐばーど"),
    t("hummingbird", "ハチドリ", "はみんぐばーど"),
    t("rhinoceros", "サイ（長→外）", "らいのさーらす"),
    t("kangaroo", "カンガルー", "かんがるー"),
    t("koalabear", "コアラ", "こあらべあ"),
    t("salamander", "サンショウウオ", "さらまんだー"),
    t("grasshopper", "バッタ", "ぐらすほっぱー"),
    t("caterpillar", "いもむし", "きゃたぴらー"),
    t("earthworms", "みみず（複）", "あーすわーむず"),
    t("butterflies", "ちょう（複）", "ばたふらいず"),
    t("dragonflies", "とんぼ（複）", "どらごんふらいず"),
  ]),

  english_gadgets: makeTheme("英単語：ガジェット", true, [
    // EASY 20
    t("mouse", "マウス", "まうす"),
    t("screen", "画面", "すくりーん"),
    t("camera", "カメラ", "かめら"),
    t("router", "ルーター", "るーたー"),
    t("laptop", "ノートPC", "らっぷとっぷ"),
    t("tablet", "タブレット", "たぶれっと"),
    t("charger", "充電器", "ちゃーじゃー"),
    t("speaker", "スピーカー", "すぴーかー"),
    t("phone", "スマホ", "ふぉーん"),
    t("watch", "時計", "うぉっち"),
    t("cable", "ケーブル", "けーぶる"),
    t("cloud", "クラウド", "くらうど"),
    t("pixel", "ピクセル", "ぴくせる"),
    t("light", "ライト", "らいと"),
    t("sound", "音", "さうんど"),
    t("music", "音楽", "みゅーじっく"),
    t("wifi", "Wi-Fi（短→外）", "わいふぁい"),
    t("usb", "USB（短→外）", "ゆーえすびー"),
    t("case", "ケース", "けーす"),
    t("lens", "レンズ", "れんず"),

    // NORMAL 20
    t("monitor", "モニター", "もにたー"),
    t("printer", "プリンター", "ぷりんたー"),
    t("scanner", "スキャナー", "すきゃなー"),
    t("hotspot", "テザリング", "ほっとすぽっと"),
    t("battery", "バッテリー", "ばってりー"),
    t("webcam", "ウェブカメラ", "うぇぶかむ"),
    t("tripod", "三脚", "とらいぽっど"),
    t("keycaps", "キーキャップ", "きーきゃっぷす"),
    t("keyboard", "キーボード", "きーぼーど"),
    t("trackpad", "トラックパッド", "とらっくぱっど"),
    t("bluetooth", "ブルートゥース", "ぶるーとぅーす"),
    t("airdrop", "共有", "えあどろっぷ"),
    t("storage", "保存", "すとれーじ"),
    t("download", "ダウンロード", "だうんろーど"),
    t("upload", "アップロード", "あっぷろーど"),
    t("password", "パスワード", "ぱすわーど"),
    t("settings", "設定", "せってぃんぐす"),
    t("profile", "プロフィール", "ぷろふぁいる"),
    t("account", "アカウント", "あかうんと"),
    t("network", "ネットワーク", "ねっとわーく"),

    // HARD 20
    t("smartphone", "スマホ", "すまーとふぉん"),
    t("microphone", "マイク", "まいくろふぉん"),
    t("screenshot", "スクショ", "すくりーんしょっと"),
    t("automation", "自動化", "おーとめーしょん"),
    t("touchscreen", "タッチ画面", "たっちすくりーん"),
    t("resolution", "解像度", "れぞりゅーしょん"),
    t("processor", "CPU", "ぷろせっさー"),
    t("filesystem", "ファイルシステム", "ふぁいるしすてむ"),
    t("datacenter", "データセンター", "でーたせんたー"),
    t("encryption", "暗号化", "えんくりぷしょん"),
    t("debugging", "デバッグ", "でばっぎんぐ"),
    t("downloads", "DL（複）", "だうんろーどず"),
    t("uploading", "UL中", "あっぷろーでぃんぐ"),
    t("passwords", "PW（複）", "ぱすわーどず"),
    t("connectors", "接続（複）", "こねくたーず"),
    t("wireless", "無線", "わいやれす"),
    t("streaming", "配信", "すとりーみんぐ"),
    t("videocall", "通話", "びでおこーる"),
    t("maintenance", "保守", "めいんてなんす"),
    t("databackup", "バックアップ", "でーたばっくあっぷ"),
  ]),

  // =========================
  // プログラミング系（caseApplicable:false）
  // ここは reading を「迷いを減らす」ルールで統一：
  // - 英単語はカタカナ読み（例: function→ファンクション）
  // - camelCase は “区切って” 読む（className→クラス ネーム）
  // - CLI短縮はアルファベット読み（pwd→ピーダブリューディー）
  // =========================
  prog_html_css: makeTheme("プログラミング：HTML / CSS", false, [
    // EASY 20 (3-5)
    t("div", "HTML要素", "ディーブイアイ"),
    t("span", "HTML要素", "スパン"),
    t("head", "HTML head", "へっど"),
    t("body", "HTML body", "ぼでぃ"),
    t("link", "リンク", "りんく"),
    t("meta", "メタ情報", "めた"),
    t("html", "HTML", "えいちてぃーえむえる"),
    t("css", "CSS", "しーえすえす"),
    t("id", "属性（短→外）", "あいでぃー"),
    t("class", "属性/概念", "くらす"),
    t("flex", "CSSレイアウト", "ふれっくす"),
    t("grid", "CSSレイアウト", "ぐりっど"),
    t("margin", "外側余白（6→NORMAL）", "まーじん"),
    t("pad", "padding略（短）", "ぱっど"),
    t("wrap", "折返し", "らっぷ"),
    t("gap", "間隔", "ぎゃっぷ"),
    t("font", "文字", "ふぉんと"),
    t("size", "サイズ", "さいず"),
    t("color", "色", "からー"),
    t("hover", "ホバー", "ほばー"),

    // NORMAL 20 (6-8)
    t("header", "HTML要素", "へっだー"),
    t("footer", "HTML要素", "ふったー"),
    t("section", "HTML要素", "せくしょん"),
    t("article", "HTML要素", "あーてぃくる"),
    t("button", "ボタン", "ぼたん"),
    t("input", "入力", "いんぷっと"),
    t("select", "選択", "せれくと"),
    t("option", "選択肢", "おぷしょん"),
    t("display", "表示", "でぃすぷれい"),
    t("padding", "内側余白", "ぱでぃんぐ"),
    t("border", "枠線", "ぼーだー"),
    t("radius", "角丸", "れいでぃあす"),
    t("shadow", "影", "しゃどう"),
    t("zindex", "重なり", "ぜっといんでっくす"),
    t("opacity", "透明度", "おぺしてぃ"),
    t("content", "内容", "こんてんつ"),
    t("center", "中央", "せんたー"),
    t("justify", "整列", "じゃすてぃふぁい"),
    t("align", "整列", "あらいん"),
    t("outline", "輪郭", "あうとらいん"),

    // HARD 20 (9-10)
    t("className", "React属性", "くらす ねーむ"),
    t("background", "背景", "ばっくぐらうんど"),
    t("alignitems", "CSS（造語: align-items）", "あらいん あいてむず"),
    t("justifycon", "CSS（略）", "じゃすてぃふぁい"),
    t("justifycont", "CSS（略）", "じゃすてぃふぁい"),
    t("justifycont", "CSS（略）", "じゃすてぃふぁい"),
    t("justifycontent", "CSS（長→外）", "じゃすてぃふぁい こんてんと"),
    t("boxsizing", "box-sizing", "ぼっくす さいじんぐ"),
    t("lineheight", "行間", "らいん はいと"),
    t("letterspa", "文字間（略）", "れたー すぺーす"),
    t("letterspac", "文字間（略）", "れたー すぺーす"),
    t("letterspace", "文字間（略）", "れたー すぺーす"),
    t("textalign", "文字寄せ", "てきすと あらいん"),
    t("fontweight", "太さ", "ふぉんと うぇいと"),
    t("minwidth", "最小幅", "みん うぃどす"),
    t("maxwidth", "最大幅", "まっくす うぃどす"),
    t("minheight", "最小高", "みん はいと"),
    t("maxheight", "最大高", "まっくす はいと"),
    t("transition", "遷移", "とらんじしょん"),
    t("responsive", "レスポンシブ", "れすぽんしぶ"),
  ]),

  prog_js_ts: makeTheme("プログラミング：JavaScript / TypeScript", false, [
    // EASY 20 (3-5)
    t("const", "定数", "こんすと"),
    t("let", "変数", "れっと"),
    t("var", "変数（旧）", "ゔぁー"),
    t("null", "値なし", "なる"),
    t("true", "真", "とぅるー"),
    t("false", "偽", "ふぉるす"),
    t("void", "戻りなし", "ぼいど"),
    t("this", "これ", "でぃす"),
    t("that", "あれ", "ざっと"),
    t("else", "それ以外", "えるす"),
    t("case", "分岐", "けーす"),
    t("break", "抜ける（5）", "ぶれいく"),
    t("catch", "例外捕捉", "きゃっち"),
    t("throw", "投げる", "すろー"),
    t("try", "試す", "とらい"),
    t("type", "型", "たいぷ"),
    t("enum", "列挙", "いーなむ"),
    t("map", "配列変換", "まっぷ"),
    t("filter", "絞る（6→NORMAL）", "ふぃるたー"),
    t("reduce", "畳み込み（6→NORMAL）", "りでゅーす"),

    // NORMAL 20 (6-8)
    t("return", "戻す", "りたーん"),
    t("switch", "分岐", "すいっち"),
    t("string", "文字列", "すとりんぐ"),
    t("number", "数値", "なんばー"),
    t("boolean", "真偽", "ぶーりあん"),
    t("unknown", "不明型", "あんのうん"),
    t("promise", "Promise", "ぷろみす"),
    t("async", "非同期", "あしんく"),
    t("await", "待つ", "あうぇいと"),
    t("object", "オブジェクト", "おぶじぇくと"),
    t("array", "配列", "あれい"),
    t("typeof", "型取得", "たいぷおぶ"),
    t("console", "コンソール", "こんそーる"),
    t("include", "含む", "いんくるーど"),
    t("default", "既定", "でふぉると"),
    t("import", "読み込み", "いんぽーと"),
    t("export", "書き出し", "えくすぽーと"),
    t("useState", "React hook", "ゆーず すてーと"),
    t("useEffect", "React hook", "ゆーず いふぇくと"),
    t("useMemo", "React hook", "ゆーず めも"),

    // HARD 20 (9-10)
    t("undefined", "未定義", "あんでぃふぁいんど"),
    t("interface", "型定義", "いんたーふぇーす"),
    t("implements", "実装", "いんぷりめんつ"),
    t("prototype", "原型", "ぷろとたいぷ"),
    t("dependency", "依存", "でぃぺんでんしー"),
    t("typescript", "TypeScript", "たいぷすくりぷと"),
    t("javascript", "JavaScript", "じゃばすくりぷと"),
    t("component", "部品", "こんぽーねんと"),
    t("rendering", "描画", "れんだりんぐ"),
    t("eventloop", "イベントループ", "いべんとるーぷ"),
    t("framework", "枠組み", "ふれーむわーく"),
    t("middleware", "中間処理", "みどるうぇあ"),
    t("debugging", "デバッグ", "でばっぎんぐ"),
    t("pagination", "ページ分割", "ぺーじねーしょん"),
    t("validation", "検証", "ばりでーしょん"),
    t("serialization", "直列化（長→外）", "しりあらいぜーしょん"),
    t("dependency", "依存", "でぃぺんでんしー"),
    t("observable", "監視", "おぶざーばぶる"),
    t("immutable", "不変", "いみゅーたぶる"),
    t("memoization", "メモ化（長→外）", "めもいぜーしょん"),
  ]),

  prog_csharp_python_sql: makeTheme("プログラミング：C# / Python / SQL", false, [
    // EASY 20 (3-5)
    t("public", "公開（6→NORMAL）", "ぱぶりっく"),
    t("class", "クラス", "くらす"),
    t("static", "静的（6→NORMAL）", "すたてぃっく"),
    t("using", "using（5）", "ゆーじんぐ"),
    t("null", "null", "なる"),
    t("void", "void", "ぼいど"),
    t("main", "main", "めいん"),
    t("def", "Python定義（3）", "でふ"),
    t("import", "import", "いんぽーと"),
    t("lambda", "lambda（6→NORMAL）", "らむだ"),
    t("from", "from", "ふろむ"),
    t("pass", "pass", "ぱす"),
    t("None", "Python None（4）", "なん"),
    t("True", "Python True（4）", "とぅるー"),
    t("False", "Python False（5）", "ふぉるす"),
    t("JOIN", "SQL結合（4）", "じょいん"),
    t("WHERE", "SQL条件（5）", "うぇあ"),
    t("SELECT", "SQL選択（6→NORMAL）", "せれくと"),
    t("INSERT", "SQL追加（6→NORMAL）", "いんさーと"),
    t("UPDATE", "SQL更新（6→NORMAL）", "あっぷでーと"),

    // NORMAL 20 (6-8)
    t("private", "非公開", "ぷらいべーと"),
    t("namespace", "名前空間（9→HARD）", "ねーむすぺーす"),
    t("console", "console", "こんそーる"),
    t("println", "出力", "ぷりんとらいん"),
    t("print", "出力", "ぷりんと"),
    t("return", "return", "りたーん"),
    t("boolean", "真偽", "ぶーりあん"),
    t("integer", "整数", "いんてじゃー"),
    t("decimal", "小数", "でしもーる"),
    t("float", "浮動小数", "ふろーと"),
    t("double", "倍精度", "だぶる"),
    t("async", "非同期", "あしんく"),
    t("await", "待つ", "あうぇいと"),
    t("PRIMARY", "主キー（7）", "ぷらいまりー"),
    t("FOREIGN", "外部（7）", "ふぉーりん"),
    t("GROUPBY", "集計（7）", "ぐるーぷばい"),
    t("ORDERBY", "並替（7）", "おーだーばい"),
    t("HAVING", "集計条件（6）", "はびんぐ"),
    t("LIMIT", "件数制限（5→EASY）", "りみっと"),
    t("OFFSET", "ずらす（6）", "おふせっと"),

    // HARD 20 (9-10)
    t("namespace", "名前空間", "ねーむすぺーす"),
    t("dictionary", "辞書", "でぃくしょなりー"),
    t("exception", "例外", "えくせぷしょん"),
    t("parameter", "引数", "ぱらめーたー"),
    t("iteration", "反復", "いってれーしょん"),
    t("recursion", "再帰", "りかーじょん"),
    t("connection", "接続", "こねくしょん"),
    t("transaction", "取引", "とらんざくしょん"),
    t("constraint", "制約", "こんすとれいんと"),
    t("indexing", "索引", "いんでくしんぐ"),
    t("migration", "移行", "まいぐれーしょん"),
    t("datamodel", "データモデル", "でーたもでる"),
    t("tablename", "テーブル名", "てーぶるねーむ"),
    t("columnname", "列名", "からむねーむ"),
    t("insertinto", "INSERT INTO（略）", "いんさーといんとぅ"),
    t("selectfrom", "SELECT FROM（造語）", "せれくとふろむ"),
    t("orderbyasc", "昇順（造語）", "おーだーばいあすく"),
    t("orderbydesc", "降順（造語）", "おーだーばいでぃすく"),
    t("joinselect", "JOIN+SELECT（造語）", "じょいんせれくと"),
    t("whereclause", "WHERE句（10）", "うぇあくろーず"),
  ]),

  prog_cli_git: makeTheme("プログラミング：コマンドライン / Git", false, [
    // EASY 20 (3-5)
    t("cd", "移動（短→外）", "しーでぃー"),
    t("ls", "一覧（短→外）", "えるえす"),
    t("pwd", "現在地", "ぴーだぶりゅーでぃー"),
    t("mkdir", "フォルダ作成（5）", "えむけーでぃーあーる"),
    t("touch", "ファイル作成", "たっち"),
    t("echo", "表示", "えこー"),
    t("cat", "表示", "きゃっと"),
    t("grep", "検索", "ぐれっぷ"),
    t("find", "探す", "ふぁいんど"),
    t("open", "開く", "おーぷん"),
    t("curl", "通信", "かーる"),
    t("ping", "疎通", "ぴんぐ"),
    t("code", "VSCode", "こーど"),
    t("npm", "Node管理（短→外）", "えぬぴーえむ"),
    t("npx", "実行（短→外）", "えぬぴーえっくす"),
    t("git", "git（短→外）", "ぎっと"),
    t("add", "追加", "あっど"),
    t("diff", "差分", "でぃふ"),
    t("push", "送信", "ぷっしゅ"),
    t("pull", "取得", "ぷる"),

    // NORMAL 20 (6-8)
    t("status", "状態", "すてーたす"),
    t("commit", "確定", "こみっと"),
    t("checkout", "切替", "ちぇっくあうと"), // 8
    t("branch", "枝", "ぶらんち"),
    t("merge", "統合（5→EASY）", "まーじ"),
    t("rebase", "付け替え", "りべーす"),
    t("fetch", "取得", "ふぇっち"),
    t("remote", "リモート", "りもーと"),
    t("origin", "起点", "おりじん"),
    t("staging", "ステージ", "すてーじんぐ"),
    t("restore", "戻す", "りすとあ"),
    t("reset", "リセット", "りせっと"),
    t("revert", "取り消し", "りばーと"),
    t("log", "履歴（短→外）", "ろぐ"),
    t("cherry", "チェリー（略）", "ちぇりー"),
    t("stash", "一時退避", "すたっしゅ"),
    t("tag", "タグ（短→外）", "たぐ"),
    t("version", "版", "ばーじょん"),
    t("terminal", "端末（長→外）", "たーみなる"),
    t("console", "コンソール", "こんそーる"),

    // HARD 20 (9-10)
    t("cherrypick", "特定コミット取り込み", "ちぇりーぴっく"),
    t("pullrequest", "PR（長→外）", "ぷるりくえすと"),
    t("worktree", "作業ツリー", "わーくつりー"),
    t("submodule", "サブモジュール", "さぶもじゅーる"),
    t("reflog", "参照ログ", "りふろぐ"),
    t("gitignore", "無視設定", "ぎっといぐのあ"),
    t("gitconfig", "設定", "ぎっとこんふぃぐ"),
    t("gitremote", "remote（造語）", "ぎっとりもーと"),
    t("gitstatus", "status（造語）", "ぎっとすてーたす"),
    t("gitcommit", "commit（造語）", "ぎっとこみっと"),
    t("gitbranch", "branch（造語）", "ぎっとぶらんち"),
    t("gitmerge", "merge（造語）", "ぎっとまーじ"),
    t("gitrebase", "rebase（造語）", "ぎっとりべーす"),
    t("gitfetch", "fetch（造語）", "ぎっとふぇっち"),
    t("gitstash", "stash（造語）", "ぎっとすたっしゅ"),
    t("gitrevert", "revert（造語）", "ぎっとりばーと"),
    t("gitreset", "reset（造語）", "ぎっとりせっと"),
    t("gitrestore", "restore（造語）", "ぎっとりすとあ"),
    t("commandline", "コマンドライン", "こまんどらいん"),
    t("shellscript", "シェル", "しぇるすくりぷと"),
  ]),

  prog_security: makeTheme("プログラミング：セキュリティ用語", false, [
    // EASY 20
    t("hash", "ハッシュ", "はっしゅ"),
    t("salt", "ソルト", "そると"),
    t("token", "トークン", "とーくん"),
    t("captcha", "キャプチャ", "きゃぷちゃ"),
    t("virus", "ウイルス", "ういるす"),
    t("admin", "管理者", "あどみん"),
    t("login", "ログイン", "ろぐいん"),
    t("logout", "ログアウト", "ろぐあうと"),
    t("allow", "許可", "あらう"),
    t("deny", "拒否", "でない"),
    t("alert", "警告", "あらーと"),
    t("audit", "監査", "おーでぃっと"),
    t("safe", "安全", "せーふ"),
    t("risk", "リスク", "りすく"),
    t("scan", "スキャン", "すきゃん"),
    t("patch", "修正", "ぱっち"),
    t("log", "ログ（短→外）", "ろぐ"),
    t("key", "鍵（短→外）", "きー"),
    t("lock", "ロック", "ろっく"),
    t("shield", "盾（長→外）", "しーるど"),

    // NORMAL 20
    t("phishing", "偽サイト誘導", "ふぃっしんぐ"),
    t("malware", "悪意あるソフト", "まるうぇあ"),
    t("firewall", "防火壁", "ふぁいあうぉーる"),
    t("password", "パスワード", "ぱすわーど"),
    t("twofactor", "2段階（造語）", "つーふぁくたー"),
    t("oauth", "認可（短→外）", "おーおーあうす"),
    t("session", "セッション", "せっしょん"),
    t("cookie", "クッキー", "くっきー"),
    t("timeout", "タイムアウト", "たいむあうと"),
    t("protocol", "規約", "ぷろとこる"),
    t("https", "HTTPS（短→外）", "えいちてぃーてぃーぴーえす"),
    t("tls", "TLS（短→外）", "てぃーえるえす"),
    t("backup", "バックアップ", "ばっくあっぷ"),
    t("recovery", "復旧", "りかばりー"),
    t("integrity", "完全性（長→外）", "いんてぐりてぃ"),
    t("confiden", "機密（略）", "こんふぃ"),
    t("encrypt", "暗号化する", "えんくりぷと"),
    t("decrypt", "復号する", "でぃーくりぷと"),
    t("sanitize", "無害化", "さにたいず"),
    t("validate", "検証", "ばりでーと"),

    // HARD 20
    t("encryption", "暗号化", "えんくりぷしょん"),
    t("authorization", "認可（長→外）", "おーそらいぜーしょん"),
    t("authentication", "認証（長→外）", "おーせんてぃけーしょん"),
    t("vulnerability", "脆弱性（長→外）", "ばるねらびりてぃ"),
    t("penetration", "侵入テスト", "ぺねとれーしょん"),
    t("rateLimit", "回数制限", "れーと りみっと"),
    t("csrfToken", "CSRFトークン", "しーえすあーるえふ とーくん"),
    t("xssGuard", "XSS対策（造語）", "えっくすえすえす がーど"),
    t("sqlInject", "SQL注入（造語）", "えすきゅーえる いんじぇくと"),
    t("hmacSha256", "HMAC（略）", "えいちまっく しゃ"),
    t("passwords", "PW複数", "ぱすわーどず"),
    t("securecookie", "安全クッキー", "せきゅあ くっきー"),
    t("audittrail", "監査ログ", "おーでぃっと とれいる"),
    t("keyrotation", "鍵ローテ", "きー ろーてーしょん"),
    t("threatmodel", "脅威モデル", "すれっと もでる"),
    t("zerotrust", "ゼロトラスト", "ぜろ とらすと"),
    t("dataleak", "情報漏えい", "でーた りーく"),
    t("securemode", "安全モード", "せきゅあ もーど"),
    t("safeguard", "保護", "せーふ がーど"),
    t("hardening", "堅牢化", "はーでにんぐ"),
  ]),

  prog_names: makeTheme("プログラミング：よく使う変数名・関数名", false, [
    // EASY 20
    t("userId", "ユーザーID", "ゆーざー あいでぃー"),
    t("userName", "ユーザー名", "ゆーざー ねーむ"),
    t("isLoading", "読込中", "いず ろーでぃんぐ"),
    t("isActive", "有効", "いず あくてぃぶ"),
    t("getUser", "取得", "げっと ゆーざー"),
    t("saveData", "保存", "せーぶ でーた"),
    t("setValue", "設定", "せっと ばりゅー"),
    t("onChange", "変更", "おん ちぇんじ"),
    t("onSubmit", "送信", "おん さぶみっと"),
    t("handleClick", "クリック処理", "はんどる くりっく"),
    t("fetchData", "取得", "ふぇっち でーた"),
    t("updateUser", "更新", "あっぷでーと ゆーざー"),
    t("parseJSON", "解析", "ぱーす じぇいそん"),
    t("isReady", "準備OK", "いず れでぃ"),
    t("hasError", "エラー有", "はず えらー"),
    t("errorMsg", "エラー文", "えらー めっせーじ"),
    t("pageSize", "件数", "ぺーじ さいず"),
    t("pageIndex", "番号", "ぺーじ いんでっくす"),
    t("nextPage", "次", "ねくすと ぺーじ"),
    t("prevPage", "前", "ぷれぶ ぺーじ"),

    // NORMAL 20
    t("isSuccess", "成功", "いず さくせす"),
    t("isFailed", "失敗", "いず ふぇいるど"),
    t("isOpen", "開いてる", "いず おーぷん"),
    t("isClose", "閉じる（造語）", "いず くろーず"),
    t("openModal", "モーダル開", "おーぷん もーだる"),
    t("closeModal", "モーダル閉", "くろーず もーだる"),
    t("toggleMenu", "切替", "とぐる めにゅー"),
    t("getItems", "一覧取得", "げっと あいてむず"),
    t("setItems", "一覧設定", "せっと あいてむず"),
    t("addItem", "追加", "あっど あいてむ"),
    t("removeItem", "削除", "りむーぶ あいてむ"),
    t("sortItems", "並替", "そーと あいてむず"),
    t("filterItems", "絞り込み", "ふぃるたー あいてむず"),
    t("buildQuery", "クエリ作成", "びるど くえり"),
    t("resetState", "状態リセット", "りせっと すてーと"),
    t("initState", "初期化", "いにっと すてーと"),
    t("loadStats", "統計読込", "ろーど すたっつ"),
    t("saveStats", "統計保存", "せーぶ すたっつ"),
    t("startTimer", "開始", "すたーと たいまー"),
    t("stopTimer", "停止", "すとっぷ たいまー"),

    // HARD 20
    t("initialize", "初期化", "いにしゃらいず"),
    t("deserialize", "復元", "でぃしりあらいず"),
    t("serialize", "保存化", "しりあらいず"),
    t("validateInput", "入力検証", "ばりでーと いんぷっと"),
    t("sanitizeInput", "無害化", "さにたいず いんぷっと"),
    t("calculateScore", "点計算", "きゃるきゅれーと すこあ"),
    t("formatResult", "整形", "ふぉーまっと りざると"),
    t("updateProfile", "更新", "あっぷでーと ぷろふぁいる"),
    t("createSession", "セッション作成", "くりえいと せっしょん"),
    t("refreshToken", "更新", "りふれっしゅ とーくん"),
    t("requestId", "要求ID", "りくえすと あいでぃー"),
    t("responseTime", "応答時間", "れすぽんす たいむ"),
    t("errorHandling", "例外処理", "えらー はんどりんぐ"),
    t("retryPolicy", "再試行方針", "りとらい ぽりしー"),
    t("cacheControl", "キャッシュ制御", "きゃっしゅ こんとろーる"),
    t("rateLimiter", "回数制限", "れーと りみたー"),
    t("sessionStore", "保存先", "せっしょん すとあ"),
    t("dataPipeline", "処理流れ", "でーた ぱいぷらいん"),
    t("eventHandler", "イベント処理", "いべんと はんどらー"),
    t("stateMachine", "状態機械", "すてーと ましーん"),
  ]),
} as const satisfies Record<string, WordTheme>;

export type WordThemeKey = keyof typeof WORD_THEMES;

// -------------------------
// logic
// -------------------------
function randomizeMixedCase(base: string): string {
  if (base.length <= 1) return base;

  let hasUpper = false;
  let hasLower = false;

  const out = base.split("").map((ch) => {
    const isAlpha = ch >= "a" && ch <= "z";
    const isAlphaU = ch >= "A" && ch <= "Z";
    if (!isAlpha && !isAlphaU) return ch;

    const lower = ch.toLowerCase();
    const upper = ch.toUpperCase();
    const toUpper = Math.random() < 0.4;
    const next = toUpper ? upper : lower;

    if (next === upper) hasUpper = true;
    if (next === lower) hasLower = true;
    return next;
  });

  if (!(hasUpper && hasLower)) {
    const i = Math.floor(Math.random() * out.length);
    const ch = out[i];
    if (ch >= "a" && ch <= "z") out[i] = ch.toUpperCase();
    else if (ch >= "A" && ch <= "Z") out[i] = ch.toLowerCase();
  }

  return out.join("");
}

export function applyCase(base: string, mode: CaseMode): string {
  if (mode === "lower") return base.toLowerCase();
  if (mode === "upper") return base.toUpperCase();
  if (mode === "title") {
    if (base.length === 0) return base;
    return base.slice(0, 1).toUpperCase() + base.slice(1).toLowerCase();
  }
  // mixed
  return randomizeMixedCase(base);
}

export function caseLabel(mode: CaseMode): string {
  switch (mode) {
    case "lower":
      return "小文字（デフォルト）";
    case "title":
      return "先頭だけ大文字";
    case "upper":
      return "大文字";
    case "mixed":
      return "混在（上級）";
  }
}

export function levelLabel(level: WordLevel): string {
  if (level === "easy") return "EASY（3〜5）";
  if (level === "normal") return "NORMAL（6〜8）";
  return "HARD（9〜10）";
}

export function inLevel(text: string, level: WordLevel): boolean {
  const n = text.length;
  if (level === "easy") return n >= 3 && n <= 5;
  if (level === "normal") return n >= 6 && n <= 8;
  return n >= 9 && n <= 10;
}

export function buildWordPool(themeKey: WordThemeKey, level: WordLevel) {
  const theme = WORD_THEMES[themeKey];
  const items = theme.items.filter((x) => inLevel(x.text, level));
  return { label: theme.label, caseApplicable: theme.caseApplicable, items };
}

export function makeQuestion(
  item: WordThemeItem,
  caseApplicable: boolean,
  caseMode: CaseMode
): { answer: string; hint?: string; reading?: string } {
  const base = item.text;
  const answer = caseApplicable ? applyCase(base, caseMode) : base;
  return { answer, hint: item.hint, reading: item.reading };
}

export function getRandomIndex(max: number, prev?: number) {
  if (max <= 1) return 0;
  let next = prev ?? 0;
  while (next === prev) next = Math.floor(Math.random() * max);
  return next;
}

// （任意）開発用：レベル分布チェック
export function debugThemeLevelCounts() {
  const keys = Object.keys(WORD_THEMES) as WordThemeKey[];
  return keys.map((k) => {
    const items = WORD_THEMES[k].items.map((x) => x.text);
    const count = (lv: WordLevel) => items.filter((t) => inLevel(t, lv)).length;
    return {
      key: k,
      label: WORD_THEMES[k].label,
      easy: count("easy"),
      normal: count("normal"),
      hard: count("hard"),
      total: items.length,
    };
  });
}
