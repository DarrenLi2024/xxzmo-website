import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ArticleSeed {
  slug: string;
  title: string;
  subtitle: string | null;
  author: string;
  source: string;
  preface: string | null;
  body: string;
  postscript: string | null;
  notes: string | null;
  type: string;
  dateRaw: string;
  dateParsed: Date;
  tags: string[];
  status: string;
  publishedAt: Date;
  confidence: number;
}

const articles: ArticleSeed[] = [
  {
    slug: "qiuri-wuhou",
    title: "秋日午后口占一首",
    subtitle: null,
    author: "狂野君",
    source: "chuli",
    preface: "甲辰年秋日，闲坐南窗，见落叶满庭，心有所感，遂口占一首。",
    body: `秋风起兮白云飞，
草木黄落兮雁南归。
兰有秀兮菊有芳，
怀佳人兮不能忘。

泛楼船兮济汾河，
横中流兮扬素波。
箫鼓鸣兮发棹歌，
欢乐极兮哀情多。

少壮几时兮奈老何。`,
    postscript: "此诗成后三日，复观之，觉末句尤沉郁。人生如寄，秋意渐深，唯以笔墨遣怀而已。",
    notes: "是日秋高气爽，独坐山房，窗外梧桐叶落如雨。取案头纸笔，不假思索，一挥而就。",
    type: "诗",
    dateRaw: "2024年秋",
    dateParsed: new Date("2024-10-15"),
    tags: ["秋天", "闲适", "感怀", "即兴"],
    status: "published",
    publishedAt: new Date("2024-10-15"),
    confidence: 0.95,
  },
  {
    slug: "yedu-oude",
    title: "夜读偶得",
    subtitle: null,
    author: "狂野君",
    source: "chuli",
    preface: null,
    body: `更深人静一灯孤，
黄卷青灯伴老夫。
读到会心微笑处，
不知明月上庭梧。`,
    postscript: null,
    notes: "夜读《庄子》，至 吾生也有涯，而知也无涯 句，不觉莞尔。古人之言，今人读之，犹有会心处。",
    type: "诗",
    dateRaw: "2024年冬",
    dateParsed: new Date("2024-12-08"),
    tags: ["夜", "读书", "即兴", "闲适"],
    status: "published",
    publishedAt: new Date("2024-12-08"),
    confidence: 0.92,
  },
  {
    slug: "shanju-chunxiao",
    title: "山居春晓",
    subtitle: null,
    author: "狂野君",
    source: "chuli",
    preface: null,
    body: `晨起推窗见远山，
数峰青在有无间。
鸟声啼破春烟湿，
一树桃花带露寒。`,
    postscript: null,
    notes: "山中春早，晨起推窗，远山如黛，云雾缭绕。庭前桃花初绽，露珠晶莹，好一幅天然图画。",
    type: "诗",
    dateRaw: "2025年春",
    dateParsed: new Date("2025-03-20"),
    tags: ["春天", "山居", "写景"],
    status: "published",
    publishedAt: new Date("2025-03-20"),
    confidence: 0.90,
  },
  {
    slug: "denggao-yougan",
    title: "登高有感",
    subtitle: null,
    author: "狂野君",
    source: "chuli",
    preface: "乙巳年重阳，独登西山，四望苍茫，有感而作。",
    body: `西风渐紧又重阳，
独上西山望八荒。
万里秋光来眼底，
千年兴废入愁肠。
白云有意常遮日，
流水无声自绕廊。
何必登高伤往事，
不如归去醉壶觞。`,
    postscript: null,
    notes: "重阳登高，古来习俗。今人忙于世事，鲜有此闲情。独步山间，见白云悠悠，流水潺潺，顿觉人世纷扰，不过尔尔。",
    type: "诗",
    dateRaw: "2025年重阳",
    dateParsed: new Date("2025-10-29"),
    tags: ["秋天", "登高", "感怀", "七律"],
    status: "published",
    publishedAt: new Date("2025-10-29"),
    confidence: 0.88,
  },
  {
    slug: "huanxisha-chunsi",
    title: "浣溪沙·春思",
    subtitle: null,
    author: "狂野君",
    source: "chuli",
    preface: null,
    body: `小院春深昼掩门，
落花和雨正黄昏。
一帘幽梦了无痕。

几度寻芳穿曲径，
也曾载酒过西园。
当时只道是寻常。`,
    postscript: "末句借纳兰容若意，然情境自出胸臆。",
    notes: null,
    type: "词",
    dateRaw: "2025年春",
    dateParsed: new Date("2025-04-12"),
    tags: ["春天", "怀旧", "婉约"],
    status: "published",
    publishedAt: new Date("2025-04-12"),
    confidence: 0.91,
  },
  {
    slug: "shanshui-juan",
    title: "山水卷",
    subtitle: "观黄公望《富春山居图》有感",
    author: "狂野君",
    source: "chuli",
    preface: "近日观黄公望《富春山居图》，心驰神往，忽忆少年时游富春江事，乃作此篇。",
    body: `山水之为物，静者也。然善画者能于静中见动，于无中见有。黄公望《富春山居图》，笔墨所至，山川、林木、村舍、舟桥，一一如生。

余观此卷，最爱其空灵处。山不必尽露，云气半掩；水不必尽流，烟波微茫。凡作画，满则死，空则活。此卷之妙，正在于其留白之处，使人有遐想之余地。

忽忆少年时，尝游富春江。两岸青山如屏，江水澄碧，渔舟点点，白鹭斜飞。彼时不知黄公望为何人，亦不识笔墨之妙，唯觉此间山水，令人心静。

今观此图，彼时之境，历历如在目前。乃知山水之趣，不在目见，而在心会。大痴道人画此卷时，年已八十，一生阅尽沧桑，笔下山川，实乃胸中丘壑也。`,
    postscript: null,
    notes: "中国山水画之妙，在于以有限写无限。西画重写实，国画重写意。写实者，一目了然；写意者，回味无穷。",
    type: "文",
    dateRaw: "2025年夏",
    dateParsed: new Date("2025-06-20"),
    tags: ["山水", "画论", "怀旧", "游记"],
    status: "published",
    publishedAt: new Date("2025-06-20"),
    confidence: 0.87,
  },
  {
    slug: "tingyu-ji",
    title: "听雨记",
    subtitle: null,
    author: "狂野君",
    source: "chuli",
    preface: null,
    body: `夏夜苦热，辗转难眠。忽闻窗外淅沥之声，知雨至矣。

初时疏疏落落，如珠落玉盘，点点滴滴在梧桐叶上。继而渐密渐急，如万马奔腾，如瀑布倾泻。雷声隐隐，电光偶闪，天地间一片滂沱。

余索性起身，推开南窗。雨气扑面而来，清凉入骨。庭中芭蕉被雨打得东倒西歪，然其翠色愈鲜。墙角青苔，雨后当更绿矣。

想起蒋捷《虞美人》词：「少年听雨歌楼上，红烛昏罗帐。壮年听雨客舟中，江阔云低、断雁叫西风。而今听雨僧庐下，鬓已星星也。悲欢离合总无情，一任阶前、点滴到天明。」

余今年三十有八，尚未至「鬓已星星」之境。然听雨之感，已与少年时大不同。少时听雨，只觉烦闷，阻我游玩。今听雨，则觉天地间有一种大安静，藏在雨声之中。

雨渐小，天将明。东方既白，鸟声初起。遂援笔而记之。`,
    postscript: null,
    notes: "此篇得自一个真实的不眠之夜。写作时窗外正下雨，写完后雨恰好停了。有时觉得，文章天成，妙手偶得之。",
    type: "随笔",
    dateRaw: "2025年盛夏",
    dateParsed: new Date("2025-07-17"),
    tags: ["雨", "夏夜", "感怀", "即兴"],
    status: "published",
    publishedAt: new Date("2025-07-17"),
    confidence: 0.93,
  },
  {
    slug: "guiyuan-tianju",
    title: "归园田居",
    subtitle: "步陶渊明韵",
    author: "狂野君",
    source: "chuli",
    preface: "久居城市，身心俱疲。近日偶得机会小住山村，感陶渊明《归园田居》之趣，步其韵以写怀。",
    body: `少无适俗韵，性本爱山林。
误落尘网中，一去二十春。
羁鸟恋旧林，池鱼思故渊。
开荒南野际，守拙归园田。
方宅十余亩，草屋八九间。
榆柳荫后檐，桃李罗堂前。
暧暧远人村，依依墟里烟。
狗吠深巷中，鸡鸣桑树颠。
户庭无尘杂，虚室有余闲。
久在樊笼里，复得返自然。`,
    postscript: "陶公原诗，千古绝唱，余之步韵，只是心向往之。",
    notes: "虽借用陶诗原韵，但其中「误落尘网中，一去二十春」一句，实写自身经历。出社会十余年，常怀归隐之心。",
    type: "诗",
    dateRaw: "2025年夏",
    dateParsed: new Date("2025-08-10"),
    tags: ["田园", "隐逸", "步韵", "感怀"],
    status: "published",
    publishedAt: new Date("2025-08-10"),
    confidence: 0.85,
  },
  {
    slug: "nongjia-zuoye",
    title: "农家昨夜",
    subtitle: null,
    author: "狂野君",
    source: "chuli",
    preface: null,
    body: `农家昨夜风吹雨，
早起开门见菜肥。
最爱豆棚瓜架下，
绿荫如水湿人衣。`,
    postscript: null,
    notes: "小住山村，晨起推门，满目青翠。豆棚瓜架下露水晶莹，空气清香。此种生活，远胜城市喧嚣。",
    type: "诗",
    dateRaw: "2025年夏",
    dateParsed: new Date("2025-08-11"),
    tags: ["田园", "写景", "闲适"],
    status: "published",
    publishedAt: new Date("2025-08-11"),
    confidence: 0.89,
  },
  {
    slug: "buxing-sanji",
    title: "步行散记",
    subtitle: null,
    author: "狂野君",
    source: "chuli",
    preface: null,
    body: `黄昏，独自从办公室走出，决定不坐车，步行回家。路程约四公里，需时四十分钟。

出公司大门，拐进一条小巷。小巷很窄，两边的墙很旧，墙上爬满了爬山虎，绿得发亮。巷口有一棵老槐树，据附近老人说，已近百年。此时正值花期，满树白花，香气甜而不腻。

穿过小巷，是一条老街。街两旁都是老店——理发店、粮油店、五金店，招牌陈旧但整洁。路过一家烧饼摊，买了一个，边走边吃。烧饼刚出炉，烫手，芝麻香和面香混在一起。想起小时候放学路上常买烧饼，一角钱一个。现在这个三元。

忽然想到，自己多久没有这样慢慢走过路了？每天开车或打车，从一个点到另一个点，两点之间什么都不看见。城市那么大，可我认识它吗？

路过一座小桥，桥下河水浑浊，但有人在钓鱼。驻足看了片刻，那人果然钓起一条小鲫鱼，拇指大小。他取下鱼钩，把鱼扔回河里。「太小了」——他说。我问他天天来钓吗？他说几乎天天，不为钓鱼，为坐一坐。

天渐渐黑了，街灯亮起。继续走。再过两个路口就到家了。

这段路不长，但让我重新认识了自己住了十年的城市。有些东西，只有走路的时候才能看见。`,
    postscript: null,
    notes: "此文写成后，给自己定了一个规矩：每周至少有一天步行上下班。可惜坚持了不到一个月。",
    type: "随笔",
    dateRaw: "2025年春夏之交",
    dateParsed: new Date("2025-05-08"),
    tags: ["城市", "步行", "生活", "随笔"],
    status: "published",
    publishedAt: new Date("2025-05-08"),
    confidence: 0.90,
  },
  {
    slug: "kanshu-zayan",
    title: "看书杂言",
    subtitle: null,
    author: "狂野君",
    source: "chuli",
    preface: null,
    body: `古人看书，讲究「三上」——马上、枕上、厕上。今人看书，多在手机、平板，碎片化至极。

我仍爱纸质书。翻书页的声音，油墨的味道，书脊在手上的触感——这些是电子书给不了的。更重要的是，纸质书强迫你专注。一本书在手，你不能同时刷朋友圈，不能切换到别的app。这种被迫的专注，在今日已是奢侈品。

近来翻《世说新语》，每日不过四五则，不求多。读到有趣处，掩卷思之，往往能联想到现实。比如《任诞》篇载：「王子猷居山阴，夜大雪，眠觉，开室命酌酒，四望皎然，因起彷徨，咏左思招隐诗。忽忆戴安道，时戴在剡，即便夜乘小舟就之。经宿方至，造门不前而返。人问其故，王曰：吾本乘兴而行，兴尽而返，何必见戴！」

这段文字常被解读为魏晋名士的任性，但我读出了一点别的：真正在意的是「乘兴」这个过程，而不是「见戴」这个结果。过程本身已是全部的意义。

可能这就是读书的快乐。没有人问你读后感，没有考试，没有deadline。纯粹因为——想看。`,
    postscript: null,
    notes: null,
    type: "随笔",
    dateRaw: "2025年秋",
    dateParsed: new Date("2025-09-03"),
    tags: ["读书", "随笔", "感怀"],
    status: "published",
    publishedAt: new Date("2025-09-03"),
    confidence: 0.91,
  },
  {
    slug: "rushe-zhi-riji",
    title: "入山日记三则",
    subtitle: null,
    author: "狂野君",
    source: "chuli",
    preface: "乙巳年七月，入终南山小住三日。每日记数语，今整理为此篇。",
    body: `第一日·抵达

午后三时抵山脚。弃车步行，沿石阶而上。山路两旁是竹林，风吹过，竹叶飒飒作响。走约半小时，见一茅亭，匾曰「洗心」。坐亭中休息，远眺山色，层峦叠嶂间云霭沉沉，山风徐来，清凉透骨。至晚，投宿农家。农家主人是一老者，须发花白，声音洪亮。晚饭是蒸土豆、炒青菜、小米粥。食毕在院中闲坐，老人沏了一壶自己种的茶。抬头望天，星星比城里多得多。是日步行极累，九时就寝。

第二日·访古

早起爬山。山路渐陡，游人渐稀。行至半山腰，见一古寺，名「云居」。寺门半掩，推门而入。院中一株银杏，据说已逾千年，枝叶参天。殿内无人，唯香火尚燃。在殿前石阶上坐了很久。山中寂静，静到能听见自己的心跳。

下山时迷了路，误入一片栗子林。栗子尚未成熟，青刺球挂在枝头。在林子里绕了将近一小时才找到正路。回到农家已傍晚，老人笑说「山里的路，外人走不惯」。

第三日·归途

早起便要走。老人送至村口，临别叮嘱：「常来。」我点头，心里知道「常来」其实很难。下山的路比上山快。一路想着：山还是这座山，但进山的人和出山的人已是不同的人了。

回到城中，已是下午。车水马龙，人声鼎沸。恍惚间，那三天像一场梦。`,
    postscript: "终南山素有隐士传统，今之隐士已稀，然山间犹有古意。",
    notes: null,
    type: "日记",
    dateRaw: "2025年7月",
    dateParsed: new Date("2025-07-22"),
    tags: ["山居", "游记", "日记", "终南山"],
    status: "published",
    publishedAt: new Date("2025-07-22"),
    confidence: 0.94,
  },
  {
    slug: "gusong-lifu",
    title: "孤松赋",
    subtitle: null,
    author: "狂野君",
    source: "chuli",
    preface: null,
    body: `庭前有孤松一株，高逾三丈，不知何年所植。主干虬曲，鳞甲苍然。枝叶扶疏，形如华盖。

春时，新芽初发，嫩绿可爱。夏时，浓荫匝地，可纳凉风。秋时，针叶转黄，却不即落。至冬日，万木凋零，独此松苍翠如故，傲然立于霜雪之中。

余常于树下徘徊。月光之夜，树影婆娑，更觉清绝。

松之德，古人多所咏叹。子曰：「岁寒，然后知松柏之后凋也。」太史公曰：「松柏为百木长。」李太白诗云：「松柏本孤直，难为桃李颜。」皆赞美松之品格。

吾观此松，有数德焉：一曰独立，不与群卉争艳；二曰耐寒，霜雪不改其色；三曰长久，千岁而弥坚。此三者，君子之德也。

余性懒散、不合时宜，每以此松自况。虽居闹市，心在山林。虽与众处，志在独行。此松之于余，不啻为知己也。`,
    postscript: null,
    notes: "此文模仿古文赋体而作，虽不能望前人之项背，然情真意切。庭前松树实有其物，为租住之屋主所植。",
    type: "文",
    dateRaw: "2025年冬",
    dateParsed: new Date("2025-12-15"),
    tags: ["咏物", "松", "言志", "赋"],
    status: "published",
    publishedAt: new Date("2025-12-15"),
    confidence: 0.86,
  },
  {
    slug: "dongye-ganhuai",
    title: "冬夜感怀",
    subtitle: null,
    author: "狂野君",
    source: "chuli",
    preface: null,
    body: `寒夜沉沉独坐时，
一灯如豆影相随。
十年踪迹浑如梦，
万事浮沉总是痴。
故友多疏音信少，
新诗未就鬓毛衰。
欲将心事付瑶瑟，
弦断声吞知为谁。`,
    postscript: null,
    notes: "岁末独坐，百感交集。回首一年，碌碌无为。唯案头笔墨，始终相伴。",
    type: "诗",
    dateRaw: "2025年岁末",
    dateParsed: new Date("2025-12-30"),
    tags: ["冬天", "感怀", "岁末", "七律"],
    status: "published",
    publishedAt: new Date("2025-12-30"),
    confidence: 0.88,
  },
  {
    slug: "yiqin-yihe",
    title: "一晴一和",
    subtitle: null,
    author: "狂野君",
    source: "chuli",
    preface: null,
    body: `一晴一和柳初新，
半醉半醒花下春。
莫道今年春色早，
明年春色更愁人。`,
    postscript: null,
    notes: "春日偶过公园，见柳色新新，花事正盛，游人或拍照或野餐。独坐一隅，忽生感慨。春光年年有，而人不同。",
    type: "诗",
    dateRaw: "2026年早春",
    dateParsed: new Date("2026-02-28"),
    tags: ["春天", "感怀", "即兴"],
    status: "published",
    publishedAt: new Date("2026-02-28"),
    confidence: 0.87,
  },
  {
    slug: "xiari-xianju-zashi",
    title: "夏日闲居杂诗二首",
    subtitle: null,
    author: "狂野君",
    source: "chuli",
    preface: null,
    body: `其一

绿树阴浓夏日长，
竹床藤枕午风凉。
醒来不知身是客，
卧看蜻蜓过短墙。

其二

蝉噪声中日正高，
闭门不出读离骚。
偶然得句无人和，
自写芭蕉叶上瞧。`,
    postscript: null,
    notes: "夏日炎热，居家不出。午睡醒来，见蜻蜓飞过墙头，心有所动。读《离骚》至「长太息以掩涕兮，哀民生之多艰」，屈子之忧国忧民，今人读来犹觉惊心。",
    type: "诗",
    dateRaw: "2025年盛夏",
    dateParsed: new Date("2025-07-28"),
    tags: ["夏天", "闲适", "读书", "组诗"],
    status: "published",
    publishedAt: new Date("2025-07-28"),
    confidence: 0.92,
  },
  {
    slug: "chaye-shi",
    title: "茶叶诗",
    subtitle: null,
    author: "狂野君",
    source: "chuli",
    preface: null,
    body: `山中采得雨前芽，
焙作清香满室霞。
一盏能消千日困，
不须更觅武陵槎。

半瓯春雪绿菲菲，
舌底鸣泉久不归。
试问卢仝七碗后，
何如此际一忘机。`,
    postscript: null,
    notes: "朋友从武夷山寄来新茶，试泡一壶，果然好茶。茶香满室，烦虑顿消。想起卢仝「七碗茶」诗，故有此作。",
    type: "诗",
    dateRaw: "2026年春",
    dateParsed: new Date("2026-04-05"),
    tags: ["茶", "闲适", "春天"],
    status: "published",
    publishedAt: new Date("2026-04-05"),
    confidence: 0.89,
  },
  {
    slug: "guanyu-bodhisattva",
    title: "观雨·菩萨蛮",
    subtitle: null,
    author: "狂野君",
    source: "chuli",
    preface: null,
    body: `春云暗暗天将暮，
小楼一夜听春雨。
点滴到天明，
声声都是情。

起来慵自倚，
满院落花碎。
何处最关愁，
青山楼外楼。`,
    postscript: null,
    notes: null,
    type: "词",
    dateRaw: "2026年春",
    dateParsed: new Date("2026-04-18"),
    tags: ["春天", "雨", "婉约", "词"],
    status: "published",
    publishedAt: new Date("2026-04-18"),
    confidence: 0.90,
  },
  {
    slug: "xianju-za-yong",
    title: "闲居杂咏",
    subtitle: null,
    author: "狂野君",
    source: "chuli",
    preface: null,
    body: `其一

扫地焚香一事无，
蒲团趺坐学跏趺。
此心已似寒灰木，
又被春风轻唤苏。

其二

梨花院落溶溶月，
柳絮池塘淡淡风。
独立小桥人未识，
一星如月看多时。

其三

山果熟时猿鸟忙，
水花开处蝶蜂狂。
老夫别有闲家具，
一卷黄庭一炷香。`,
    postscript: null,
    notes: "闲居数日，得诗三首。不求工，唯求适意。",
    type: "诗",
    dateRaw: "2026年春",
    dateParsed: new Date("2026-04-25"),
    tags: ["闲适", "春天", "组诗"],
    status: "published",
    publishedAt: new Date("2026-04-25"),
    confidence: 0.91,
  },
  {
    slug: "lunshi-zhayan",
    title: "论诗札言",
    subtitle: null,
    author: "狂野君",
    source: "chuli",
    preface: null,
    body: `余少时学诗，从唐入。李白之飘逸、杜甫之沉郁、王维之空灵，各有所好。及长，始知宋诗之妙。苏东坡之旷达、黄庭坚之奇崛、杨万里之活泼，别开生面。

近岁转而读《诗经》，方知一切中国诗之源在此。「昔我往矣，杨柳依依。今我来思，雨雪霏霏」，十六字而已，而悲欢之感、时序之变、征戍之苦，尽在其中。后世诗家，千言万语，不过由此派生。

论诗者常分「唐音」「宋调」。唐诗主情韵，宋诗主理趣。唐诗如酒，宋诗如茶。然以余观之，好诗不论唐宋，动人即佳。「床前明月光」动人是唐诗，「小楼一夜听春雨」动人是宋诗。

吾国诗之传统，最重「意境」二字。何谓意境？以余浅见，即：有限之文字，引发无限之想象。诗不在说尽，而在留白。司空图《二十四诗品》所谓「不著一字，尽得风流」，正是此意。

今人写诗，多患两病：一曰拟古太过，堆砌典故，全无自家面目；二曰俚俗太过，口水白话，毫无诗意可言。余之所作，虽不敢望古人项背，然每有所咏，必求真心，必写实感。诗之优劣，存乎一心。`,
    postscript: null,
    notes: null,
    type: "文",
    dateRaw: "2026年4月",
    dateParsed: new Date("2026-04-30"),
    tags: ["诗论", "文学", "随笔"],
    status: "published",
    publishedAt: new Date("2026-04-30"),
    confidence: 0.93,
  },
  {
    slug: "xiangkou-yeyu",
    title: "巷口夜语",
    subtitle: null,
    author: "狂野君",
    source: "chuli",
    preface: null,
    body: `巷口每晚有一下棋的老者。七十上下，头发全白，永远穿一件灰色中山装。他一个人坐在路灯下，面前摆着棋盘，等候路人。

有时有人应战。来者或蹲或站，楚河汉界间厮杀一番。老者棋艺甚高，常让对手一车一马，仍能从容取胜。观棋的人围成圈，偶尔有人支招，老者只是微笑，不言语。

没人应战的时候，他就自己跟自己下。

昨晚回来迟了，已近午夜。巷口灯光昏黄，他还在，还在跟自己下棋。我站远处看了一会儿。他忽然抬头，冲我招手：「年轻人，来下一盘？」声音沙哑，但中气尚足。

「我不太会。」
「没关系，消遣消遣。」

于是坐下来，执红先行。他让我一马。我棋臭，走得很快，他每一步都想很久。不到中局，我已知必输。但他的车马炮并未乘胜追击，而是不紧不慢，像在等我。是故意让着。

下完那盘棋已是凌晨一点。走的时候，他已经在收棋盘。我问：「老伯贵姓？」他说姓陈。我又问：「明天还来吗？」

他笑了笑，说：「老了，除了这儿，也没地方可去。」

今天下班回来，又经过巷口。路灯亮着，棋盘摆着，他还在。远远地，他朝我点了点头。`,
    postscript: null,
    notes: "这篇是真实见闻。陈老伯后来成了我的棋友。他年轻时是中学数学老师，退休后每天在此下棋，风雨无阻。",
    type: "随笔",
    dateRaw: "2026年5月",
    dateParsed: new Date("2026-05-02"),
    tags: ["城市", "人物", "随笔", "棋"],
    status: "published",
    publishedAt: new Date("2026-05-02"),
    confidence: 0.94,
  },
  {
    slug: "manjianghong-denglin",
    title: "满江红·登临",
    subtitle: null,
    author: "狂野君",
    source: "chuli",
    preface: "登北固楼，望大江东去，慷慨而作。",
    body: `万里长风，
吹不尽、古今愁色。
登临处、大江东去，
浪淘千尺。
几度夕阳红欲暮，
一番烟雨青如织。
问苍茫、谁与共襟期，
天南北。

兴亡事，何时息。
英雄泪，何时拭。
叹青山依旧，
人间非昔。
铁马冰河空入梦，
楼船夜雪徒成忆。
待重寻、诗酒旧生涯，
从今日。`,
    postscript: null,
    notes: "北固楼在镇江，辛弃疾曾于此作《南乡子·登京口北固亭有怀》。登楼远眺，江山如画，豪情顿生。",
    type: "词",
    dateRaw: "2026年春",
    dateParsed: new Date("2026-05-05"),
    tags: ["登临", "怀古", "豪放", "词"],
    status: "published",
    publishedAt: new Date("2026-05-05"),
    confidence: 0.88,
  },
  {
    slug: "songbie-youren",
    title: "送别友人归蜀",
    subtitle: null,
    author: "狂野君",
    source: "chuli",
    preface: null,
    body: `蜀道青天不可攀，
送君此去几时还。
春风又绿江南岸，
细雨初收剑外山。
别后音书何处寄，
愁来杯酒暂时闲。
从今莫问东流水，
流到天涯也自弯。`,
    postscript: "友人王某，蜀人，客居江南十年，今归故乡，以诗送之。",
    notes: null,
    type: "诗",
    dateRaw: "2026年春",
    dateParsed: new Date("2026-04-15"),
    tags: ["送别", "友情", "七律"],
    status: "published",
    publishedAt: new Date("2026-04-15"),
    confidence: 0.89,
  },
  {
    slug: "jushuo-jigu",
    title: "论辑古之趣",
    subtitle: null,
    author: "狂野君",
    source: "chuli",
    preface: null,
    body: `近于辑古台采录前人经典，乐在其中。辑古之趣，非亲历者不能知。

何为辑古？以今之白话言之，便是「整理古籍」。然「整理」二字，不足以尽此中乐趣。每录一篇，需查证字句、校勘异文，颇如考古学家清理一件出土文物——一层层拂去历史的尘埃，让它本来的面目重现于世。

此外，还需为每篇作注、译文、写赏析。这过程如同与古人对话。譬如录《滕王阁序》，细读「落霞与孤鹜齐飞，秋水共长天一色」，仿佛自己正站在滕王阁上，看见那一抹晚霞、一只孤鹜、一片秋水、一色长天。古人所见的风景和我们今天所见的，其实没有太大区别。

或有问：今之网络如此发达，何必辑之录之？直接复制粘贴即可。

我说：复制粘贴是搜集，不是辑录。搜集只是囤积，辑录则是整理、吸收、再创造。复制一百篇，不如认真辑录一篇。就像吃饭，狼吞虎咽和细嚼慢咽，虽能果腹但绝不同味。

何况，许多古籍的电子版本错误百出。有人复制粘贴而不自知，以讹传讹。辑录的过程，正是一次校对的过程。

辑古台之名，取自「辑佚钩沉」之意。愿以此台，为往圣继绝学。虽力有不逮，心向往之。`,
    postscript: null,
    notes: "此文为辑古台功能写的前言。辑古台虽是小功能，但寄托了我对古籍整理的喜爱。",
    type: "文",
    dateRaw: "2026年5月",
    dateParsed: new Date("2026-05-10"),
    tags: ["辑古", "文学", "随笔"],
    status: "published",
    publishedAt: new Date("2026-05-10"),
    confidence: 0.92,
  },
  {
    slug: "yuzhong-manbu",
    title: "雨中漫步",
    subtitle: null,
    author: "狂野君",
    source: "chuli",
    preface: null,
    body: `撑着伞在雨里走，
看水珠连成线、线连成帘。
街上人很少，
每个都走得很快。
只有我不急。

经过地铁口，一个卖花的老太在避雨，
桶里剩几枝白姜花，
买了两枝。
她找钱时手在抖，
我说「不用找了」。
她笑得眼睛眯成缝。

走进一条旧巷，
青石板滑滑的。
墙角苔藓被雨洗过后绿得晃眼，
空气里有泥土和墙灰的味道。

忽然明白了一件事——
快乐和钱没关系，
和「慢」有关系。
慢下来，就能看见。`,
    postscript: null,
    notes: "五月梅雨季，连日下雨。今日撑伞出门，不为什么，只是走走。",
    type: "诗",
    dateRaw: "2026年5月",
    dateParsed: new Date("2026-05-12"),
    tags: ["雨", "城市", "生活", "白话诗"],
    status: "published",
    publishedAt: new Date("2026-05-12"),
    confidence: 0.86,
  },
];

async function main() {
  // 清空已有数据
  await prisma.tagOnArticle.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.article.deleteMany();

  console.log(`开始写入 ${articles.length} 篇文章...`);

  for (const article of articles) {
    const { tags, ...articleData } = article;

    const created = await prisma.article.create({
      data: {
        ...articleData,
        tagList: JSON.stringify(tags),
      },
    });

    for (const tagName of tags) {
      let tag = await prisma.tag.findUnique({ where: { name: tagName } });
      if (!tag) {
        tag = await prisma.tag.create({ data: { name: tagName } });
      }

      await prisma.tagOnArticle.create({
        data: {
          articleId: created.id,
          tagId: tag.id,
        },
      });

      await prisma.tag.update({
        where: { id: tag.id },
        data: { count: { increment: 1 } },
      });
    }

    console.log(`  OK ${article.title}`);
  }

  console.log(`完成！共写入 ${articles.length} 篇文章。`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
