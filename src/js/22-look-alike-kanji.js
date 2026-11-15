/* =====================================================================
   LOOK-ALIKE KANJI (like WaniKani's "visually similar")
   Lists: Kanjium's look-alikes (CC BY-SA 4.0) first, then Lars Yencken's similarity data
   (radical and stroke-edit distance, CC BY 3.0, via the Niai project), JLPT kanji only.
   Tips: hand-written for the classic pairs, otherwise built from the parts each kanji is made of.
   ===================================================================== */
const LOOKS_RAW = '一土下互|二三|九丸|人入八|入八人久|八人入|力刀刃|十千|三二王|下不|口中西史|大太犬夫天|工土士王五|刀刃力辺|土士工五王|千干午牛十|夕夜|子了|小少|丁一丘|了子|又文|丸九丹犬不|中口史束|五工士互土|六文交|天夫失大矢|手毛千午牛|文又衣央大|日旬甲申旧|月用有|木本末未米|水氷永|犬大太不|王玉生主五|右石后舌合|四匹囚囲困|左在圧佐|本休体木末|正止士|玉王寺去芸|田由甲申画|白自旬百旨|目自甲申由|石右加召古|立辛幸位|万方切|久入反友|今令会合含|元完井夫天|公仏|内肉丙|切功万|午千干牛缶|友反返支大|太大犬不|少小|引弔弓|心必|戸戻|方万芳|牛干千午半|父交匁欠|毛手牛午|止正|兄克史|冬各|半羊平午牛|古早苦舌吉|外列例|市布|広庁玄応床|用月肝|矢失朱先夫|主全宝王生|他池休|代伐仏仁付|写号|去充寺至玉|号写|央大史夫天|平羊半来干|打折町灯抵|氷永水泳|申田由甲車|皮反|皿血|礼札社初祉|休体本朱林|先失朱矢売|名各台否|字学宇安穴|年缶午|早古卓草車|百白皇拍者|糸系|耳取|村材林朴杯|男勇町由田|町灯打訂田|花老|見貝児具昆|貝見貢員負|赤寺老考示|足定衷促史|車甲申更早|不太犬下|仕佳侍社吐|交衣父変六|会今令合余|光米完|同何伺向后|回固困石団|当尚肖光|毎侮|池汁江汗他|米光来木未|考老者赤|肉丙内|自白目但伸|色免角|行征|西四口|何伺同河使|体休本伏朱|作后伺|図因囲困囚|声走志吉|売帝壱先志|弟第兼|形刑杉研|来米末未林|社祈壮吐佳|角負色免|言訂計信告|谷容俗沿各|走志吉赴至|近辺逝斥斤|麦表坂抜|学宇字栄労|林村材枚桟|空究突窃窒|金余全|青責育肩肖|草単巣卓早|音竜章翌辛|化他|地垣封坑|両凸|全主金生狂|向同尚風否|安穴宅字宇|州川|曲由田|有月|次炊吹|羊半平美判|血皿|京哀享涼|国囲団困|夜夕変液|妹味抹株朱|姉肺妨婦姓|店石|明脂門胆胃|東束乗垂更|歩省劣渉|画面田車|直盾目値看|知族侯候和|長張帳|前削愉|南幸辛|室窒至志吉|後復役彼俊|思恩恵悪息|星晶皇|活浩括沿乱|海悔侮梅敏|科料私移秋|茶菌菊|食娘良|首夏盾看省|欠匁父|氏民|由甲田申曲|札礼林|民氏|辺近込刃刀|付附伐侍代|以似|失朱矢先夫|必泌心|未夫末朱木|末未夫朱木|校林郊効較|夏臭首息|家定塚嫁|弱沸|時侍待持詩|紙純紅紀糾|記託計訪訓|通週痛連|高尚商|強独蛇触蚊|教酵致都赦|理埋動班現|組紺細紡紅|船般沿俗|週通周造遠|雪雷需雲電|魚負漁|鳥島馬鳴|黄苗貢責項|黒墨量裏童|支反友|住往柱狂注|助阻祖|医疾送枢|君知建言石|対双村府庁|局居司后句|役彼般段没|投披没抜拠|決快涙沢沸|究空突窃完|者老考春百|研形刑|馬鳥焦|森集|場揚陽湯堤|朝潮乾幹|番審香|答筒箇管等|絵給紙純紀|買貫貢責員|道遂導首|間問聞閑閉|雲曇霊雷雪|数楼粒粋粉|楽薬|話詰語詞詐|電雷雪需雲|所祈析折浜|使便倹何休|具真貝呉典|受愛妥労栄|和利移科秋|始如胎治|定足穴家実|実突穴宇害|服肢肪肌|泳沢氷|物牧牲|苦若古吉舌|表麦衣契俵|部陪剖倍泣|乗東束垂朱|客各容落寄|屋握|度席庶床渡|待侍持特佳|持待侍特封|界卑鬼|発登完廃冠|相植|県呉具貝|美業羊善|負貞貝貧貢|送迷遅遂逆|重厘皇童動|談語詔詐診|勝朕|仮版板彼|起赴越超|速迷追違|配酔酌酢酪|終絡級約紙|習留皇宿皆|転軒軟軌軽|進焦隻|落客|葉菓菜|軽軸軒輪陣|運連蓮軍載|開関閑閉聞|集隻焦準森|飲飢飯飾飽|業美僕撲|漢漠嘆湖涼|路践跳踏距|農豊濃辱唇|鉄銑針銭銀|歌詞崎嗣飼|算笛筋鼻箱|聞間開閑閉|語詔詐詰諾|読誌詰詩諸|鳴礁鳥|線綿縮練緒|横構積演賃|調詰詩誌話|親新韻境|頭頼瀬類煩|顔韻類賠頻|病痘症疾痴|最是撮|争妻|仲沖何保使|伝仏仁会|共昔茂供坑|好姓妃如奴|成威我|老考者圧花|位倍泣剖立|低抵仕邸任|初被礼|別剣|利私和科秋|努怒奴|労栄学受|命含合令倉|岸岩炭|放倣旅族旋|昔晋普著借|波披没彼被|注住洋柱性|育青骨|拾捨搭哲吟|指拍担押掲|洋祥津|神伸岬紳捜|秒称移秋私|級約終紙純|追過造速迫|戦禅弾獣巣|良食|功切攻巧|特持侍待時|便使硬陳棟|働動衝種傷|令今会合命|意章竜億翌|味妹株耗耕|勉逸|庭廷度|息想臭思恵|旅族放旋施|根限恨浪娘|流硫泣|消硝清滑削|倍位陪部剖|員賀貝貴貢|島鳥|祭察禁票際|章童音意庫|第弟策筋答|都緒酵教者|動働種埋理|商竜尚|悪思恵|族旅知侯疑|深探栄染況|球救珠|童章竜量裏|陽腸湯揚傷|階陛脂皆舶|寒寡|悲罪輩怠扉|暑署著煮暗|期欺棋旗|植値殖相模|温湿漫混湯|港洪満殿|湯揚渇陽腸|登発豊澄|着春著差首|短咲朕族侯|野埋|泉習皇臭皆|生全王主住|合今令会含|風独属向|予矛|反友返皮大|新親断薪粒|返反近込|問間閣閑閉|宿宣|想息憩箱穂|感惑憾認歳|暗憶億障彰|様撲僕|橋矯稿|福幅副|緑縁録維紺|練細紳棟紺|詩詰誌時調|銀銭錬錠鉢|題顕|館飼飾|駅駄駆駐釈|億憶暗障意|士土工王五|料科粋粒粉|標漂襟禁|殺殴枝|然黙|熱塾熟勢|課謀裸談謁|賞賀償額|輪輸軽論軸|鏡鐘錯鎖|願頻顕頼顔|養義|像象傷衡|情清惰晴精|謝誘|映唱|疑擬凝族矯|皆旨昆百習|例列残|卒傘率辛|協励|参弁惨|周週造吉舎|囲困因国団|固回個居|季李秀香委|完元突冠宗|希布|念含志|折析所祈打|材林村杉枚|束乗東垂史|松私訟|残殊桟浅例|約級終紙純|芸芋芽芳会|基墓碁|性牲悔怖注|技伎抜枝披|格酪枯絡略|術街|私仏払和利|骨胃育肖青|妥受|雰雷雪雲需|頑煩項頂傾|寺去玉志吉|岩崎|帰掃婦滞侵|春著着者香|昼尽|晴清情請暑|秋秘秒移科|計討訂記託|列刑例序|区凶匹医|坂麦封地怪|式弐武|信詔詐訪記|勇男|単巣草軍弾|司后同局右|変恋交赤夜|夫末未失大|建廷健庭逮|昨酢昭|法却脚涯洪|泣位陪部粒|浅桟|紀紡紙純紅|軍早車宣単|飯飲飢飾飽|仏払私伝公|築箱|晩暁|猫描苗盾|園遠還|曜濯|書筆妻|遠園造還週|門明冒胃閉|係孫紺細紡|取服恥耳|守宇穴定|幸辛宰立南|真具慎置|箱策簡算想|荷若奇苦寄|面画|典具真曹呉|喜墜塑豊|府底庁対応|治冶沿浴沼|浴治冶沿溶|笑筆筋符|辞培陪部剖|関開閑閲閉|保休味促架|弁糸|政致攻証|留習貿|証誕詰訂政|険検倹剣拾|危厄|存在厚左|専博|冒昌晶門帽|原源頂迫|細紺紅練維|薬楽|鼻算|側則測偵財|兵岳哲|堂常掌党索|塩域詰塔培|席度庶庫麻|敗販財則賊|果東軌是某|栄采労学巣|梅侮海敏悔|結緒給紹続|因困囲図団|常帯堂党掌|識職織韻憶|非排俳|干千午牛平|是晶果提堤|渉渋歩淑|虚虐虜虞|官宮客|察祭禁擦際|底庁座庭応|愛受菜営|署暑著煮|警驚|恋窓変蛮忘|覚寛栄視|説税脱詳鋭|幻幼|訓託計詔詐|試討詐託誌|弓弔引|告吉舎舌志|種穂動働衝|達遅適造|類頼瀬頭顕|報執培辞|祈社断析折|等符|汽汗汚|借惜措供昔|焼暁洗|座底|忘忌恋応思|洗法陸陵浜|胸脳胞豚肝|脳悩胸|僧憎増層|禅弾戦|験騎騒|許託評詐詳|枚株林杉秩|句旬右向局|禁票慰崇標|煙詰酷誌|加召如石司|節算筋範|減滅涼|順煩傾頒項|容谷客宮浴|布市右希|財則敗販賊|若苦荷匿吉|詞訂嗣詔歌|昆旨皆見混|閥閑閉間問|歴暦摩麻|舌告古乱右|宇字学宅完|宙油|忙性快|履覆復|団寸因国囲|混渇温昆階|乱活括舌呼|徒待径征佳|得待復征|改放牧|続統結緒読|連蓮運迫載|善普美|困因囲囚回|絡終紹絹給|比批化|災炎|率傘卒畜蓄|害寄言宮実|余金会示|難護|妨防妃姉|被彼波披初|裕溶浴俗欲|震霊需雲零|尾尼|械桟林杯|確礁雄|嫌兼廉|個枯信固故|圧庄在左老|在圧存左仕|夢憲葬|産底|倒到佳致握|臭夏息具泉|厚原厘|妻書争妄|議犠識|罪扉悲罰|防妨肪|穴宅安定|論諭診|経絡結組緒|笛算筋策箇|史吏束中吸|敵嫡滴摘辞|済剤湾斉|委秀季妥香|挙誉掌|判刊畔伴羊|制刷刊|務放|査宜租畳粗|総維紺細|設託訓詔詐|資買貫貢員|権歓勧観疑|件仁伴併|派脈旅染|素索累系紫|断析新祈粋|評詳許託語|批比把指|任仕妊佐侮|検倹険剣株|審番藩富|条各朱休|責青貢債項|省劣歩首|増憎堤軽僧|税説脱悦鋭|解触|際擦察祭|認誌詔談感|義儀犠|誕証詠|脱悦税説祝|過追適造遇|寝浸|宮官営害客|各名客谷|置署買真|費貢責|勢熱|営党蛍常栄|示宗赤余|統続紋紡紀|領頒順煩傾|策筒箱笛|副幅福|観歓権|値植殖盾直|吸吹扱史|域城酷塩詰|姿盗|応広床忘底|提堤揚捜撮|援暖採授揺|状壮伏氷|態罷|賀員貴貸貧|停亭訂|革喪吉克|職識織憶億|鬼卑見塊|規現視頂|護穫謹|割害寄|裁栽越|崎河歌寄詞|演横漬|律健津|師帥|看盾首着直|準集隻准|則測側財敗|導道|幹乾軒朝輪|張帳脹長|優憂|宅穴宇安完|沢択泥涙泳|施旅旋放族|現規視貢責|乳浮採彩将|呼活括乱|城域茂街|俳非排作|秀季李委香|担垣胆但押|額頼瀬頭賞|製裂袋|違速遠|輸輪諭|祝況悦視税|届田|狭挟峡扶|肩青扇房脅|腕脚|腰煙|触解濁|載庫連責運|層僧増憎|型荘志吉|庁序床底斤|視現規祝褐|差着|管答筒箇|象像|量童黒裏墨|境培障暗増|環壊|武式弐|質誓循傾類|述迭|供洪借侍共|展屋尿|販敗財則賊|株枚珠殊秩|限郎恨眼根|与士土互|含吟合命舎|影就診景|況祝悦脱沖|渡度|票栗崇禁漂|景照影|抜技投披扱|訴許訂訟評|訟託訓詐松|逮康遂建|補捕浦複裸|候侯知族勧|構横溝講購|模膜漠棟棋|捕補浦挿|鮮鯨漁|効郊劾校|属風嘱|慣漬憤敗貫|豊登喜|満洪港滞溝|肥肝肌脂|巻券圏|捜提押神伸|絞紋紡校統|輩悲|隠穏採彩|掛封持塚堤|替賛潜暦春|居局舌据固|造週遠逓周|授援採揺暖|創剣|復複腹履後|往住柱注|較軟校|筆等書答筒|鉛銘鈍針銅|貯財頂敗預|故枯湖敬据|障彰陪境暗|従徒征併|我成威|激源|刺勅利剰|励協|討訂計訪託|郵睡邸艇|針鈍鉛鉄鉢|徴微徹|怪径経社殻|獣戦獄|突空究窃完|菓巣草募堤|河訂洞何崎|振娠抹|汗汁汽江汚|豚脈|再車工|接摘泣暗陪|独強風蛇蚊|占台召|招拐拓沼拘|段役没投殺|胃骨青脅肯|腹復脂複膜|痛通庸|退逐|屈堀掘|悩脳禅|織職識締繊|貸貨貧買貫|迷送遅逆遂|惑感患愁|誘程稿稚移|就砂影涼|訪記託討計|怒努|昇早|眠眼|睡郵錘艇|症痘病延疫|締織続網継|迫連原|濃農|端暗陪部粒|途逃送|健律津建|康庸逮|郎限朗廊郷|給絵結絡紹|逆迷遂送道|巨臣回|庫章連童運|児見旧更|冷令|凍涼棟陳東|幼幻|稚雑移程秘|博専|清情晴消精|潔維|録緑縁銭錠|隊墜|券巻|婦掃帰姉|奇寄荷吉何|妙抄秒砂|微徴|益盗|移秋秘秒稚|程誘稿稚移|精績請情清|絶約細純紺|傘卒率|浜祈析折洗|撃量暫|攻功政戻坂|監堅覧濫|杯村枢朴板|乾幹朝軟軌|催唯雅推准|促保足|欧殴炊枢|江汗汁壮法|請精諭語諸|雄雌推雅唯|壊懐壌|診談詐託訓|閣問閲閑閉|僚寮療貸傾|積債類績漬|督寂|臣巨|略酪格路閣|航般船抗坑|寄奇害崎荷|板枝仮林版|街術衝徒待|宗奈崇示完|緊紫|娘浪限根恨|宴宣|怖性|恐忍忘|添泌|烈裂蒸|索素累系室|詰誌調詩諸|詳群評許祥|渇湯掲喝混|系玄糸素索|旗棋欺期旋|照景|快決忙恨沢|版板仮坂販|貧貿買貫貢|乏芝|適滴過達週|預頂順煩領|延廷庭症|翌音意竜帝|覧賢監|懐壊徳|押抽挿拍捜|更東車便児|浮乳渓将採|符等筋策笛|購構講賦|越起赴超裁|飾飼飲飢飽|騒験騎|背肯肖青育|撮提最|盗姿盆益|離擁|融隔|華芽草|既慨即郷限|普昔晋音|豪褒稼塚|鑑艦|除徐陰斜叙|廊郎麻|掃帰婦浸滞|泥沢涙渇|棒俸|驚警|嘆漢|倉含舎命啓|孫係紺細紡|巣草単菓栄|帯常滞帝夢|径怪仕徒待|救枚球採挟|散撤|粉紛粋粒数|脈派豚|菜採菊愛受|貨貸賀員傾|陸陵陛洗読|似以位|均城封地|墓基幕募暮|富審幅|徳聴|探深搾換採|偵債賀貞員|序庁列|迎込辺迅近|志壱去吉走|恩思悪忌|採援授彩揺|桜採彩|永水氷|液湾夜|眼眠限根恨|祖租阻粗組|績精漬織緒|衛衝緯衡|複復腹褐裸|雑稚雅維|賛替頑煩買|酸醜|銭銀鉢釣鈍|飼飲飢詞嗣|傷陽腸湯揚|党営掌常堂|卵卯柳抑仰|捨拾括詰塔|込辺迅巡返|密窓|汚汗朽汽巧|欲浴俗溶裕|暖援緩授稲|机杉林枚|秘秋移私稚|訳詠釈記設|染派深|簡範箱|閉閑開問閥|誌認詰詩読|窓恋窒突空|否名向石|筋算笛第符|垂東束乗佳|宝宇|宣宜宴軍恒|尊導専遵|忠患怠思|拡払抗|操燥繰藻|敬故散|暮幕募慕墓|熟塾熱|異恭時|皇習皆百泉|盛盆|砂抄秒妙|漠漢膜模漬|納紡紺細純|肺肪肝姉|著着春暑署|蒸薫|装荘裏|裏童黒量墨|諸詰誌詩緒|賃貸貨貢債|誤証|貴員買貫貢|降隆峰|吐呈亜|奴妃如好努|芋芽芳芸|縮緒織線綿|純紙紀糾紺|縦網綱縮継|粋枠料数砕|磁滋|紅紡紙紀糾|幕募慕暮墓|推携准雅雄|揮挿陣輝軸|沿治冶浴沼|源原寮激漬|勤勅|歓勧観権疑|損噴財敗員|枝板技林枯|豆吏束亜|刻劾核利|遅送迷達逆|彫猿詰周週|測則側財漬|破彼披被設|舎告吉含合|講構請購|滞満帯締|紹絡紛紺紙|己巳|厄危|互一士土五|剣険検倹創|彼役破被波|恥摂取|杉枚材机林|汁汗斗|炎炊|為偽|獄訳|酔枠酢配酷|酢酪昨酔酬|湖潮活枯故|銅鉛銘銭鈍|払仏私拡抑|油抽酒宙泊|旧伸白日児|姓性妊狂|貿貸貧留順|将浮渓採揺|遺遣貴|伸岬旧神捜|債漬積偵側|奈宗|幅福副富|廃麻発|換喚探|摘滴嫡敵培|核該劾刻柄|沖仲沿沼治|縄練維|津律健浄洋|療寮僚|継紺組縦締|維紺細縁紹|舞葬|伎技|踏跳路跡践|般船搬役航|頼瀬頭煩類|依俵位衣袋|諾語詔詐詰|跳践踏路距|昭沼唱詔招|漁潟鮮魚|償賞|刑列形刊研|募慕幕暮墓|執報培幸珠|塁墨黒量裏|崩胃肯|患忠怠惑感|戻房戸扇攻|抗坑拠航投|抵低拾邸|旬句日旨白|湾涼|弾禅戦単|聴徳|跡践跳踏路|遣遺造過避|闘閲|陣陳軸軟軒|香秀季委菌|兆挑|削消愉硝肖|契表|恵思愚悪息|抱胞泡砲拘|掲揚渇喝提|葬夢|需雲雷雪震|宜宣査|繰燥|避癖適壁|妊任姓|娠振妹娘|致到倒握法|刊制刑判|奏秦奉泰春|伴畔判併件|併瓶従伴件|傾順煩頒領|却法致到社|奥森|慮虜膚|房戻肩扇啓|扱吸抜投|抑柳仰卵払|択沢扱扶|描猫措抽苗|称移秒秋秩|緒結縮続都|緩暖援縦|託記訓計詐|賄敗財賊随|贈賜韻|逃逐|還遠園|超赴越趣起|邦郡邪|鈴鉢鉛鈍針|岐枝技肢峡|隆降性姓|雇扉扇雅推|控搾探空|壁避|棋旗欺期模|渋渉浅|群詳郡|充去|免色負|勧歓権族疑|圏巻|埋理堤封動|奪奮焦|御卸|慎憤慣真|拒拐拓|枠粋酔砕析|甲田由申車|祉社祖礼祥|稲穏採彩暖|譲醸|謙譜|銃銑鉱銭鋭|項頂順傾煩|鋼綱銅銭鉢|顧類額|駐駄駆駅騒|駆駄駐駅|柱栓住往程|唱昭喝映帽|俊唆後陵|兼嫌廉|剤済刻|吹吸史足|堀掘塀封屈|巡込辺迅|戒栽|排非俳推扉|携推准雅唯|敏海梅悔侮|鋭鉛銘銃鈍|殿港殻|犠義儀議|獲穫雅|茂芳城共|繁緊|頻頼願賓領|殖植値殉|薄簿薫|衝衡働種街|誉挙|褒豪|透迷迭造痢|隣楼傑|雅推雑雄雇|伺同何河右|徹撤散徴微|瀬頼類頭額|撤徹散|措惜借描担|拠抗投挑|儀義犠餓|樹鼓膨|蛍営常蚕栄|艦濫鑑|潜替漠|炭岸峡|衣哀交表依|仁伝件代仕|鉱銃銭針鉢|至室去志吉|誠誘|郷限慨郎既|侵浸仮帰掃|偽為|克兄古党乱|到倒致法却|双対|哲岳兵括拾|喪衷革|堅監|床度応底広|括据活拓乱|弧孤強|挑兆桃拠眺|掘堀拙据握|揚湯場掲陽|握致屋倒|揺援採授浮|斎斉|暫質誓|析折断所祈|枢林欧殴医|軸軟軌転陣|柄林核|泊拍舶伯油|滑消清湖骨|潟漁|焦集隻奪進|範節簡|紛粉紹紡紙|糾紡紙純紅|綱網縦継鋼|網綱縦継締|肝肪用|芝乏芳芽|荒芳芽|袋裂装製依|珍珠診|裂製袋烈|貢責貫貝買|趣越超|距践跳路跡|籍簡|牧物牲枚改|刷制|朗郎明|潮朝湖幹漸|即既限根恨|垣恒堤封地|威成|封持地時掛|筒答箇策管|岳兵哲缶|慰禁|懇墾爵|摩磨|擦際察|撲僕業様|斉斎済|旨皆昆白旬|柔染|沈池|沼沿治招沖|泰奏春奉|滅減浜憾|滋磁網|炉灯涙偏|寸団|竜音童意章|縁録緑維|吉告舎志古|刃力刀辺|忍恐忌忘怒|桃桟枚杉林|辛宰幸立音|侍待持佳特|斗汁|朱矢失先未|丘正丁|僕撲業様|匹四区|叫呈|釣鈴銭鈍針|涙決泥沢炉|缶年午岳|粒粗泣暗陪|砲胞抱泡|雷電雪需雲|芽芳芋苦|塔搭拾捨塩|澄短登|矛予|肌肝肪肥|舟丹凡|鐘鏡鎮鎖|凶区|塊魂鬼埋堪|魂醜塊頑|脚法|井元夫干天|嬢壌|暦歴替|曇雲霊雷需|眺財敗|裸褐課複補|疲疫|塾熟熱壁|卓草早軍貞|磨摩|菌菓香季委|陰除険絵|霊雲震雷零|湿温混漫|硬便碑棟|稼嫁豪稚|嫁稼豚家塚|溝構清満|滝暗竜境|狂姓全住任|墨黒黙塁薫|穏隠稲|鈍針鉛銘鈴|寮療僚賓源|盆益盗貧盛|棟凍陳練模|寧憲|歳感|涼凍漢沿就|猿彫詰酷誌|零雰需雷雪|碁基|租祖粗阻査|泡胞抱砲|癖避|鍛銀銭錠銘|錬銀鉢錠銭|穂種意想|帝売辛音翌|菊茶菌菜|誇証詳許|庄圧|阻祖粗租組|黙然墨勲薫|俵依表袋|綿線紺細縮|架保|砕枠粋故酔|粘粗粒和|欺期棋旗|詐詔託訓計|霧霜|柳抑卵仰松|佐任佳仕圧|哀衰衷衣京|唇辱農|塀堀瓶|墜喜堕隊塑|如始|婆波|帽唱冒|幣弊|恨浪限根娘|憎僧増層|扇肩戻扉房|扉雇罪啓排|挿押揮拍指|掌堂党常蛍|滴適摘嫡敵|炊次炎|畳査|胴洞胎|帳脹張長|蚊蛇紋独強|蛇蚊独強|辱唇農|鉢針銭錬銅|霜需|飢飲飯飾飽|餓飲飾飽飯|畜蓄育率|迅述近|騎験|蓄畜率|尽昼尼|彩採稲浮桜|憶億暗識障|溶浴裕欲容|耐村附|踊践跳踏路|賢覧|輝揮|脅青胃肯肩|麻廊底|灯町打訂|咲朕短知|培境陪倍部|悔海侮性梅|遂逐逆送迷|班理珠|斜叙除徐科|殴欧殺投枢|盾眉看直値|穫獲護|紫累素緊索|抽押油描拍|誓質薪暫|拓招拘拐括|拘招拓抱括|礎確|剛剖|唯推雇准|壇塩境|尼尾尿尽|概慨|浸侵没沈掃|煮暑著署|覆履|謀課語|隔融|征径行得従|陛陸社佳|俗浴裕欲船|桑森条|珠株殊執|衰衷哀裏|奨菜渓将|劣省労歩|勘堪甚|妃妨如好|峰降隆|巧功攻朽汚|邪邦|駄駆駅駐|廷延庭|簿薄|彰障暗章憶|漫慢温湿混|訂計討詞訴|諮談|銘鉛銅鈍鈴|堤提場埋垣|漂標票|軌軟軒陣軸|后右合斤谷|奮奪|亭享停|仰柳抑卵仏|伯泊拍香旬|偶隅|墳憤噴項|壮状社吐江|把肥|搬般|晶冒間是星|洞河沿沼治|涯法佳詰封|疫疲|頂項預順貯|召加台石司|挟狭峡扶救|枯格枝故湖|沸決|濯曜|燥繰操|瓶併塀|耕耗林妹味|肯背青脅胃|脂胆腹指明|膚慮虜|軒転軟軌軽|軟軌転陣軸|郊効校絞|隅偶陳陣|隻集焦準進|邸抵低邦|郡群邦部|釈駅訳|肪肝肺|喚換|貞負貢員貝|玄系広|苗黄昔抽猫|渦禍洞滴満|襟標|蓮運連|浦捕補清|塚殻封家掛|陥陣|貫貢責買員|擁携維|孤弧孫|賠暗顔頭損|鎖鎮鏡鐘錬|噴憤墳賊損|祥洋詳|牲特牧性|秩秋枚称株|唆俊|膨樹鼓詰|芳芽茂英芋|恒垣但胆担|倫偏倹|陳棟凍陣練|偏倫炉|遇愚連|殊株珠残|慢漫憎|没波投段般|怠忠患惑|遭曹還|惰情清愉|猟脳禅弾|寛覚|胞泡抱砲胸|浄津汚|随堕賄|稿橋程矯誘|丹凡舟丸|壌嬢壊|舗諭補|騰謄|緯繰絹|艇睡郵|披波投技破|准推唯携雄|剰乗稚移科|繊織緒繕締|諭論請輸|惨参|虐虚|据括摘招拓|徐除斜叙|搭塔拾措捨|帥師棺|啓雇扉扇房|鯨鮮|荘茎装至志|栽裁載戒|拐招拒拘沼|冠完発|勲薫黙裏墨|酬酌酷|紋紡糾統紅|卸御|逸勉|尚党向商|顕頭願頼題|愚恵遇|庶遮度席|践跳路距跡|呈吐叫|疎勅|疾痴医痢族|謡詳|酷酵域詰諸|叙斜除徐|且旦|痴疾痢|茎荘至志吉|悠怒|伏状体|鎮鎖錯錬錘|奉奏俸|憂愛優|朴村机林杯|惜借措情昔|佳仕侍待社|悼陣単卓恒|該訪誘核読|赴起越超走|傍倍億暗|累素紫索|郭部郊|尿尼展|賓寮頻|虜慮膚虚|憾誌感認滅|粗租粒祖料|循値植盾質|凝疑擬権矯|昌冒|旦且|愉削情惰前|抹扶|栓柱鉢|拍指泊舶伯|猶酒猫|宰幸辛音翌|寂督宗叔淑|縫維|呉県具典|凡丹舟勺|恭異|錯鏡銭銅銀|穀殻塚種|陵陸洗|弊幣|舶泊拍階|悦脱祝税況|窒室空窓突|洪港供法|摂恥撮|飽飲飢飾飯|紳細練紺糾|庸痛康|搾控探|碑硬|尉款|匠斤斥近庁|賊財敗憤噴|鼓樹膨|旋旅族放施|腸陽湯揚傷|槽棟|伐代休|漬債慣績測|坪培封地幸|紺細紅糾紹|峡狭挟炭扶|俸棒奉|醸譲|弔弓引|遍遅|衡衝衛|款尉|閲閣閑闘間|喝渇掲褐唱|膜漠模腹|盲忘妄|胎始治|酵酷教都|堕墜随|遮庶|凸凹両|凹凸|硫流磁|赦教変|窃突空究窒|慨既概|扶挟抹狭峡|戯繊|忌忘応|濁触|肖宵青育肩|朽汚巧村材|殻穀塚怪軽|享亭京哀|藩審|媒某|嘱属融|迭述送造透|絹細維紺紹|陪部剖倍培|剖部倍陪泣|譜識謙|淑叔渉寂|憤噴墳慣慎|酌配酬酢酔|暁焼|傑殊隣|錠銭銀鉛銘|拙掘堀|峠崇崎|叔淑寂|雌雄雅|堪勘塊甚|吟含拾剣倹|甚勘堪|崇宗票禁峠|岬押神伸|紡紅紀糾紺|礁確鳴|姻婚|擬疑凝権矯|閑閉問閥間|曹昔遭典|詠訳設|卑鬼界|侮悔海梅敏|鋳銭鉢錯鈴|胆但脂担明|浪娘恨限根|禍渦稿|酪酷略酢格|亜豆吐|逝近|匿若|寡寒|痢痴疾透|坑封地埋抗|畔判伴|拷持|渓採将浮奨|廉麻兼嫌|謹護諾語請|醜魂酸|升斤斥午千|殉殖残|煩順頒頂傾|劾刻効核|桟桃村材林|婿消|慕幕募暮墓|罷態|矯橋権稿疑|某菓東軌果|囚四困因囲|泌必添秘|漸潮|藻操|妄盲忘衣|蛮蚕恋変|倹検険使剣|壱売志吉索|韻顔識贈職|卯卵|謁褐課|箇筒答等管|褐裸渇掲喝|棺稿帥|斤匠斥近升|栗票|薫勲墨黙裏|侯候知族|浩活|墾懇墓|采栄|蚕蛮蛍|嗣飼詞歌崎|肢服枝技岐|賜贈|勺凡|爵懇|儒需|愁惑菌|遵尊|宵肖肯骨育|抄妙秒砂|硝消削請|詔詐訓語詞|晋普昔|秦奏|薪新質誓|錘銑鉄鉢銭|斥斤近匠后|銑鉄銃錘鋭|繕織|塑墜堕喜|但胆担伸恒|逐遂速|嫡敵滴摘培|衷哀衰喪|脹帳張豚|勅刺疎|朕咲候勝短|逓近造週厘|痘症|謄請|弐式武|頒順煩領傾|眉盾|賦貯|附付村耐|丙内肉両|倣放微|繭羅|巳己|耗耕妹味|匁欠父|冶沿治浴|濫艦監|吏史束使豆|李秀季|厘埋厚皇重|楼数料隣精';
let LOOKMAP = null;
const lookList = () => LOOKMAP || (LOOKMAP = new Map(LOOKS_RAW.split('|').map(s => { const a = [...s]; return [a[0], a.slice(1)]; })));
/** look-alikes of a kanji that the app knows, most confusable first */
function looksOf(k, n = 4) {
  const out = [];
  for (const c of [...(k.lk || []), ...(lookList().get(k.k) || [])]) if (c !== k.k && KMAP[c] && !out.includes(KMAP[c])) out.push(KMAP[c]);
  // the pairs with a hand-written tip are the classic mix-ups: show those first
  return out.map((x, i) => [lookTipMap().has(k.k + x.k) ? 0 : 1, i, x]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(r => r[2]).slice(0, n);
}
/* the classic confusables. For each: what they share, then for each kanji what its different part
   means and why that gives the kanji its meaning. Real origins where they help, memory hooks otherwise. */
const LOOK_TIPS = [
  ['未末本木', 'Each of these is 木, a tree. The extra line is a marker: where it sits, and how long it is, says which part of the tree it points at.', {
    未: 'The short line near the top is a young branch that hasn’t grown out yet → not yet (未来, the future: what hasn’t come yet).',
    末: 'The long line right at the top marks the very tips of the branches, the far end of the tree → end, tip (週末, the end of the week).',
    本: 'The line at the bottom marks the roots, where the tree starts → origin, true, book (日本: where the sun originates).',
    木: 'No marker: just the tree → tree, wood.' }],
  ['土士', 'Same three strokes. Which line is longer tells you if it is lying on the ground or standing tall.', {
    土: 'The long line is at the bottom: the ground itself, with a lump of earth on it → soil, earth.',
    士: 'The long line is at the top: broad shoulders of a man standing straight → samurai, gentleman, a professional (弁護士, lawyer).' }],
  ['人入八', 'Two strokes each. How they lean on each other is the story.', {
    人: 'A person seen from the side, walking: the left stroke (the body) is on top and the right leg props it up → person.',
    入: 'The opposite: a short stroke slipping inside a long one, like something going in through an opening → enter.',
    八: 'Two strokes pulling apart, not touching: something split in two halves (eight splits evenly) → eight.' }],
  ['大犬太', 'All start from 大, a person standing with arms and legs spread wide. The dot adds something to that person.', {
    大: 'Nothing added: a person making themselves as wide as possible → big.',
    犬: 'The dot at the top right is a pricked-up ear: a big animal that’s always listening → dog.',
    太: 'The dot sits low, between the legs: extra weight at the bottom → fat, thick (太い).' }],
  ['千干', 'Both are a cross with a top stroke. Whether that top stroke leans or lies flat is the difference.', {
    千: 'The top stroke leans like a person (人) bending over 十, ten: ten bowing to the crowd → thousand.',
    干: 'The top is flat: a forked pole standing straight, the kind laundry hangs on → dry (干す, to hang out to dry).' }],
  ['牛午', 'Same body. Look for a horn.', {
    牛: 'The middle line pokes out through the top: that’s the horn → cow (牛乳, cow’s milk).',
    午: 'No horn: a straight pole like a sundial’s, with the sun right above it → noon (午後, afternoon).' }],
  ['日目白自', 'All are boxes. The number of lines inside, and a stroke on top, change the picture.', {
    日: 'A round sun drawn square, one line in the middle → sun, day.',
    目: 'An eye turned on its side: two lines are the iris → eye.',
    白: 'The sun with a ray of light shooting up from it: bright, shining → white.',
    自: 'Really a nose (the stroke on top is its bridge). In Japan you point at your nose to say “me” → self (自分).' }],
  ['右石', 'Both have 口 under a top part, but the top parts are different things.', {
    右: 'The top is a hand (𠂇) reaching down to the mouth 口: the hand you eat with → right. That’s why its slanting stroke starts above the line, like fingers.',
    石: 'The top is 厂, a cliff, with a rock 口 fallen beneath it → stone. The slant hangs under the line like a cliff face.' }],
  ['右左', 'Both are a hand (ナ). What the hand is holding tells you which one it is.', {
    右: 'Hand + 口, a mouth: the hand that brings food to your mouth → right.',
    左: 'Hand + 工, a tool: the hand that holds the tool steady while the other works → left.' }],
  ['問間聞開閉', 'All are 門, a double gate. What you find in the gate tells the story.', {
    問: '口, a mouth, calling out at the gate → ask, question.',
    間: '日, the sun, shining through the gap between the two doors → between, interval, space (時間).',
    聞: '耳, an ear pressed to the gate → hear, listen.',
    開: '开, two hands pushing the doors apart → open.',
    閉: '才, a bar laid across the doors → close, shut.' }],
  ['待持特侍時詩', 'All have 寺 on the right, and here 寺 only gives the sound (じ, じ, とく…). The meaning comes from the left side.', {
    待: '彳 is a crossroads, a place you walk to: you stand at the road and wait → wait.',
    持: '扌 is a hand: what a hand does with things → hold, have.',
    特: '牛 is a cow: the one bull picked out of the herd → special.',
    侍: '亻 is a person: someone who stands by and serves a lord → samurai, attend.',
    時: '日 is the sun: what the sun measures across the sky → time.',
    詩: '言 is words: words set in order → poem.' }],
  ['休体', 'Both are a person 亻 next to a tree.', {
    休: '亻 a person leaning against 木, a tree → rest, day off.',
    体: '亻 a person + 本, the root of the tree (the line at the bottom): what a person is rooted in → body.' }],
  ['鳥島烏', 'All are a bird. Look at its eye and what it is sitting on.', {
    鳥: 'The short line inside the head is the bird’s eye → bird.',
    烏: 'The eye line is missing: a crow is so black you can’t see its eye → crow.',
    島: 'A bird resting on 山, a mountain sticking out of the sea → island.' }],
  ['王玉主', 'All are 王. A dot changes what it is.', {
    王: 'Three lines (heaven, people, earth) joined by one line down the middle: the one who connects them all → king.',
    玉: 'The king’s dot, a jewel he keeps by his side → jewel, ball.',
    主: 'The dot on top is a flame on a lamp stand: the light at the centre of the house → master, main.' }],
  ['刀力', 'Both are two strokes. Does one cut through the other?', {
    刀: 'A blade on a handle; nothing crosses it → sword, knife.',
    力: 'The stroke cuts right through like a flexed arm (or a plough digging in) → power, strength.' }],
  ['貝見', 'Both have a box with lines on top of legs. What the legs belong to is the difference.', {
    貝: 'A cowrie shell with its two little feelers (ハ). Shells were once money, so 貝 shows up in 買 buy, 貯 save → shell.',
    見: 'An eye 目 on human legs 儿: an eye walking around looking → see.' }],
  ['天夫', 'Both are 大, a person, with one more line. Does the line sit above the head or go through it?', {
    天: 'The line floats over the head: the sky above everyone → heaven, sky.',
    夫: 'The line goes through the top of the head: a hairpin, worn by grown men → husband, man.' }],
  ['矢失', 'Both are an arrow shape. Does something stick out of the top?', {
    矢: 'Arrowhead at the top, feathers at the bottom → arrow.',
    失: 'A hand with something slipping out over the top → lose (失う).' }],
  ['今令会合', 'All start with 人, a roof or lid. What’s under it changes the meaning.', {
    今: 'One stroke held under the lid: this very moment, caught → now.',
    令: '卩, a person kneeling under the roof to receive a command → order, command.',
    会: '云, clouds of people under one roof → meet, meeting.',
    合: '口, a box, with the lid fitting on it → fit, join (合う).' }],
  ['比北', 'Both are two people (ヒ). Which way they face is the difference.', {
    比: 'Side by side, both facing the same way, lined up so you can measure them → compare.',
    北: 'Back to back, turning away. People sit with their backs to the cold north → north (北 is also inside 背, back).' }],
  ['己已巳', 'The same hook shape. How far the top-left stroke closes is all there is, so use the rhyme: 己 open, 已 half, 巳 shut.', {
    己: 'Open at the top left → self (自己).',
    已: 'Half closed → already.',
    巳: 'Fully closed, like a coiled snake → snake (zodiac sign).' }],
  ['住注柱主', 'All have 主, a lamp that stays in one spot, which gives the sound じゅう/ちゅう. The left side says what stays put.', {
    住: '亻 a person staying in one place → live (住む).',
    注: '氵 water poured onto one spot → pour, pay attention (注意).',
    柱: '木 wood standing fixed in place → pillar.',
    主: 'The lamp itself, the fixed centre of the house → master, main.' }],
  ['使便', 'Both are a person 亻 with something on the right.', {
    使: '吏, an official: a person sent on the official’s business → use, messenger (使う).',
    便: '更, to renew: a person making things smoother → convenient, mail (便利).' }],
  ['雪雲電', 'All sit under 雨, rain: things that come from the sky.', {
    雪: 'ヨ is a hand holding a broom: rain you have to sweep up → snow.',
    雲: '云 is swirling vapour (云 alone was the old word for cloud) → cloud.',
    電: '申 is a lightning bolt zigzagging down → electricity, lightning (電気).' }],
  ['晴清請情精', 'All have 青, fresh and clear (it gives the sound せい). The left side says what is clear.', {
    晴: '日 the sun: a clear sky → sunny, clear up.',
    清: '氵 water: clear water → pure, clean.',
    請: '言 words: asking in clear words → request.',
    情: '忄 the heart: what the heart feels → feelings, emotion.',
    精: '米 rice polished white and clean → refined, spirit, energy.' }],
  ['線緑綿', 'All have 糸, thread, on the left: things made of fibre or shaped like a thread.', {
    線: '泉 is a spring: water running out in a long thin line → line.',
    緑: '录 gives the sound りょく; think of thread dyed with plants → green.',
    綿: '帛 is white cloth → cotton.' }],
  ['輪論', 'Both have 侖, things set in good order (sound りん/ろん).', {
    輪: '車 a cart: spokes set in order around the hub → wheel, ring.',
    論: '言 words set in order → argument, theory.' }],
  ['険検験', 'All have 㑒 on the right, which gives the sound けん. The left side says what you are dealing with.', {
    険: '阝 a hill: a steep slope you could fall down → steep, risky (危険).',
    検: '木 wood: the wooden tags officials checked → inspect, examine.',
    験: '馬 a horse: you test a horse before buying it → test, experience (試験).' }],
  ['積績責', 'All have 責, a debt you have to pay (sound せき).', {
    積: '禾 grain: piling up grain bit by bit → pile up, accumulate.',
    績: '糸 thread: spinning thread little by little until it adds up → achievements, results.',
    責: 'On its own, the debt you owe → duty, blame (責任).' }],
  ['復複', 'Both have 复 (going back and forth). The left side says what goes back and forth.', {
    復: '彳 a road: going back the way you came → return, again (復習, review).',
    複: '衤 clothing: layer upon layer → double, multiple (複雑, complicated).' }],
  ['貸貨', 'Both have 貝, money, underneath.', {
    貸: '代, “in place of”: money that stands in for you for a while → lend.',
    貨: '化, “change”: what money changes into → goods, freight.' }],
  ['側測則', 'All have 則, a rule cut with a knife 刂 (sound そく).', {
    側: '亻 a person standing by the rule → side.',
    測: '氵 water: checking how deep it is against the rule → measure.',
    則: 'The rule itself → rule, law.' }],
  ['識織職', 'All have 戠, a mark (sound しき/しょく). The left side says where the mark is.', {
    識: '言 words: marks you can recognise → know (知識, knowledge).',
    織: '糸 thread: patterns woven into cloth → weave.',
    職: '耳 an ear: listening for your orders at work → job, post (職業).' }],
  ['暑署著者', 'All have 者, a person or thing (sound しょ/ちょ). What sits on top changes it.', {
    暑: '日 the sun beating down on a person → hot weather (暑い).',
    署: '罒 a net that catches people → police station, office.',
    著: '艹 on top: a person whose work grows and spreads → author, remarkable (著者).',
    者: 'Just the person → person (学者, scholar).' }],
  ['飯館飲', 'All start with 食, food: these are things about eating.', {
    飯: '反, coming back: the food you come back to every day → meal, rice.',
    館: '官, an official: the place officials were fed and housed → large building (図書館).',
    飲: '欠 is a person with the mouth wide open → drink.' }],
  ['読続売', 'All have 売 (originally a different shape that gave the sound どく/ぞく).', {
    読: '言 words: reading words out like a seller calling out goods → read.',
    続: '糸 thread: a thread that keeps going → continue.',
    売: 'On its own → sell.' }],
  ['妹姉', 'Both start with 女, woman.', {
    妹: '未, “not yet”: a girl not yet grown up → younger sister.',
    姉: '市, the market: a girl old enough to go to the market alone → older sister.' }],
  ['田由甲申', 'All start from 田. Does the middle line grow out of it, and which way?', {
    田: 'A field split into plots, nothing growing out → rice field.',
    由: 'A sprout pushing up out of the field: where something comes from → reason, origin (理由).',
    甲: 'A root pushing down from a seed: the first stage of growth → shell, first, A grade.',
    申: 'A lightning bolt going both up and down: speaking to the gods → say (humble, 申す).' }],
  ['水氷永', 'All are water. The dot is what makes the difference.', {
    水: 'Water flowing, no dot → water.',
    氷: 'A drop beside the water, frozen in place → ice.',
    永: 'A dot at the source on top: water flowing on and on from its spring → eternal (永遠).' }],
  ['小少', 'Both are three small strokes. One has a bit taken away.', {
    小: 'Three little grains → small.',
    少: 'A slash at the bottom takes a bit away from “small” → few, a little.' }],
  ['買売', 'Both are about trading.', {
    買: '罒, a net, scooping up goods with 貝, money → buy.',
    売: '士 on top: goods coming out to be sold → sell.' }],
  ['東車', 'Both have a box with a line through it.', {
    東: '日, the sun, rising behind 木, a tree → east.',
    車: 'A cart seen from above: the box is the body, the lines are the axle and wheels → car.' }],
  ['話活', 'Both have 舌, a tongue.', {
    話: '言 words + tongue → talk, story.',
    活: '氵 water + tongue: a wet, moving tongue, full of life → lively, active (生活).' }],
  ['花化', 'Both have 化, change: a person upright and a person upside down.', {
    化: 'One person turning into another → change, -ize (文化).',
    花: '艹, a plant, that changes: a bud turning into a blossom → flower.' }],
  ['作昨', 'Both have 乍 (sound さく).', {
    作: '亻 a person at work → make (作る).',
    昨: '日, a day: the day that has already gone → yesterday, previous (昨日).' }],
  ['思恩', 'Both have 心, the heart, underneath.', {
    思: '田 on top was once a head: head and heart together → think.',
    恩: '因, a cause: what your heart owes to someone who caused you good → kindness, favour.' }],
  ['年午', 'Both have the same top. 年 just keeps going.', {
    年: 'Once a person carrying a sheaf of grain: one harvest a year → year.',
    午: 'A straight pole like a sundial’s, with the sun right above it → noon.' }],
  ['名各', 'Both have 口, a mouth, underneath.', {
    名: '夕, evening: in the dark you call out your name so people know who you are → name.',
    各: '夂, feet arriving: each person who arrives is greeted → each.' }],
  ['帰掃', 'Both have 帚, a broom.', {
    帰: 'Someone coming back home where the broom is → return home (帰る).',
    掃: '扌, a hand, holding the broom → sweep (掃除, cleaning).' }]
];
let LOOKTIP = null;
function lookTipMap() {
  if (LOOKTIP) return LOOKTIP;
  LOOKTIP = new Map();
  for (const [ks, both, n] of LOOK_TIPS) for (const a of ks) for (const b of ks) if (a !== b && !LOOKTIP.has(a + b)) LOOKTIP.set(a + b, { both, a: n[a], b: n[b] });
  return LOOKTIP;
}
/* what a part means, and what kanji that carry it are usually about */
const RAD_HINT = {
  '氵': ['water', 'things to do with water and liquids'], '水': ['water', 'things to do with water'], '冫': ['ice', 'cold and frozen things'],
  '扌': ['a hand', 'things you do with your hands'], '手': ['a hand', 'things you do with your hands'], '又': ['a hand', 'holding and doing'],
  '亻': ['a person', 'what people are or do'], '人': ['a person', 'people'], '彳': ['a crossroads', 'going, walking, moving along'], '辶': ['a road with a foot on it', 'moving and travelling'],
  '言': ['words', 'speaking, saying and writing'], '口': ['a mouth', 'speaking, eating, or a box'], '糸': ['thread', 'weaving, tying, lines and cloth'],
  '木': ['a tree', 'trees and wooden things'], '日': ['the sun', 'days, time and light'], '月': ['flesh or the moon', 'body parts (or months)'],
  '忄': ['the heart', 'feelings'], '心': ['the heart', 'feelings and the mind'], '女': ['a woman', 'women and family'], '子': ['a child', 'children'],
  '阝': ['a hill or a village', 'places: slopes on the left, towns on the right'], '礻': ['an altar', 'gods, luck and rituals'], '示': ['an altar', 'gods and rituals'],
  '衤': ['clothing', 'clothes and cloth'], '艹': ['grass', 'plants'], '竹': ['bamboo', 'bamboo things, often writing tools'], '⺮': ['bamboo', 'bamboo things'],
  '金': ['metal', 'metals and money'], '糹': ['thread', 'weaving, tying, lines and cloth'], '⺼': ['flesh', 'body parts'], '飠': ['food', 'eating'], '訁': ['words', 'speaking and writing'], '釒': ['metal', 'metal things'], '食': ['food', 'eating'], '飠': ['food', 'eating'], '足': ['a foot', 'walking and legs'], '𧾷': ['a foot', 'walking and legs'],
  '車': ['a cart', 'vehicles and turning wheels'], '貝': ['a shell', 'money and value (shells were money)'], '火': ['fire', 'heat and burning'], '灬': ['fire', 'heat and cooking'],
  '土': ['earth', 'ground and building'], '石': ['a stone', 'rocks and hard things'], '目': ['an eye', 'seeing'], '耳': ['an ear', 'hearing'],
  '禾': ['a grain plant', 'harvests and amounts'], '米': ['rice', 'grains and fine particles'], '雨': ['rain', 'weather'], '門': ['a gate', 'doors and openings'],
  '宀': ['a roof', 'houses and what’s kept inside'], '广': ['a building', 'buildings and shelters'], '疒': ['a sickbed', 'illness'], '刂': ['a knife', 'cutting'], '刀': ['a knife', 'cutting'],
  '攵': ['a hand with a stick', 'making something happen'], '力': ['strength', 'effort'], '犭': ['an animal', 'animals'], '隹': ['a bird', 'birds'], '鳥': ['a bird', 'birds'],
  '頁': ['a head', 'heads and faces'], '欠': ['an open mouth', 'breathing, singing and lacking'], '王': ['a jewel', 'precious stones'], '玉': ['a jewel', 'precious stones'],
  '馬': ['a horse', 'horses and testing'], '魚': ['a fish', 'fish'], '虫': ['an insect', 'bugs and small creatures'], '弓': ['a bow', 'pulling and stretching'],
  '方': ['a flag', 'directions and ways'], '工': ['a tool', 'work and craft'], '巾': ['a cloth', 'cloth'], '山': ['a mountain', 'mountains'], '大': ['a big person', 'size'],
  '立': ['a person standing', 'standing'], '田': ['a field', 'fields'], '尸': ['a body lying down', 'bodies and houses'], '厂': ['a cliff', 'cliffs and slopes'], '戈': ['a halberd', 'fighting'],
  '斤': ['an axe', 'cutting and weighing'], '皿': ['a dish', 'containers'], '矢': ['an arrow', 'arrows'], '止': ['a foot standing still', 'stopping'], '走': ['a running person', 'running'],
  '見': ['an eye on legs', 'seeing'], '酉': ['a sake jar', 'alcohol and fermenting'], '彡': ['brush strokes', 'shapes and patterns'], '羽': ['wings', 'feathers and flying']
};
const radHint = el => RAD_HINT[el] || (partMean(el) ? [partMean(el), ''] : null);
/** How to tell kanji a from kanji b: { both, a, b } or null. Built from the parts: which part they share
    (often just the sound), and what the different part means, which is where each meaning comes from. */
function lookTip(a, b) {
  const t = lookTipMap().get(a.k + b.k); if (t) return t;
  const cap = x => x.charAt(0).toUpperCase() + x.slice(1);
  const oa = a.og || {}, ob = b.og || {};
  const pa = (a.pt || []).map(p => p[0]), pb = (b.pt || []).map(p => p[0]), shared = pa.filter(x => pb.includes(x));
  let soundPart = oa.pho && oa.pho === ob.pho ? oa.pho : (a.ph && a.ph === b.ph ? a.ph : '');
  if (soundPart && (soundPart === oa.sem || soundPart === ob.sem)) soundPart = '';   // it carries meaning in one of them, so it isn't just a sound
  // where each meaning comes from: the meaning part of a sound+meaning kanji, or the kanji's own origin story
  const why = (k, other) => {
    const o = k.og || {}, m = k.mean[0] || '';
    if (o.t === 'S' && o.sem) { const h = radHint(o.sem) || (o.h ? [o.h, ''] : null);
      if (h) return `${o.sem} is ${h[0]}${h[1] ? `, the mark of ${h[1]}` : ''}${o.pho ? `; ${o.pho} only gives the sound` : ''}. So ${k.k} → ${m}.`; }
    if (o.h) return `${cap(o.h.replace(/;[^;]*pronunciation.*$/i, '').replace(/[.;]\s*$/, ''))} → ${m}.`;
    const own = (k.pt || []).filter(p => !(other.pt || []).some(q => q[0] === p[0]));
    const p = own.find(q => radHint(q[0])) || own[0];
    if (p) { const h = radHint(p[0]); return h ? `${p[0]} is ${h[0]}${h[1] ? `, the mark of ${h[1]}` : ''}. So ${k.k} → ${m}.` : `${p[0]} → ${m}.`; }
    return '';
  };
  const wa = why(a, b), wb = why(b, a);
  if (!wa || !wb) return null;
  const rd = soundPart && KMAP[soundPart] && KMAP[soundPart].on[0] ? kata2hira(KMAP[soundPart].on[0]) : '';
  const sh = shared[0], shH = sh && radHint(sh);
  const both = soundPart ? `Both use ${soundPart} for the sound${rd ? ` (${rd})` : ''}, which is why they look and read alike. The meaning is in the other part.`
    : sh ? `Both have ${sh}${shH ? `, ${shH[0]}` : ''}. What each adds to it is where the meaning comes from.`
    : 'Similar shapes, different stories. Remember each one by its story.';
  return { both, a: wa, b: wb, auto: true };
}
const kReadShort = x => (x.on[0] ? kataOf(x.on[0]) : '') + (x.kun[0] ? (x.on[0] ? '・' : '') + x.kun[0].replace(/\..*$/, '').replace(/-/g, '') : '');
/** The "don't mix up" block in a kanji's page */
function lookBlock(k) {
  const ls = looksOf(k); if (!ls.length) return '';
  return `<div class="kr-row"><div class="kr-h">Looks similar, don’t mix them up</div><div class="lkx">${ls.map(x => {
    const t = lookTip(k, x);
    return `<button class="lkx-c" data-open="k:${esc(x.k)}"><span class="lkx-pair jp"><b>${k.k}</b><i>vs</i><b>${x.k}</b></span><span class="lkx-b"><span class="lkx-m"><b>${esc(x.mean[0] || '')}</b> <span class="jp">${esc(kReadShort(x))}</span></span>
      ${t ? `<span class="lkx-t">${esc(t.both)}</span><span class="lkx-d"><b class="jp">${k.k}</b> ${esc(t.a)}</span><span class="lkx-d"><b class="jp">${x.k}</b> ${esc(t.b)}</span>` : `<span class="lkx-t">${esc(k.k)} means ${esc(k.mean[0] || '')}; ${esc(x.k)} means ${esc(x.mean[0] || '')}.</span>`}</span></button>`;
  }).join('')}</div></div>`;
}
/** one line under a kanji answer: its closest look-alike and the tip */
function lookLine(k, wrong) {
  const x = wrong || looksOf(k, 1)[0]; if (!x) return '';
  const t = lookTip(k, x);
  return `<div class="ac-look ${wrong ? 'picked' : ''}"><span class="ac-lk jp">${k.k}<i>≠</i>${x.k}</span><span class="ac-lb">${wrong ? `You picked <b class="jp">${x.k}</b>, a look-alike. ` : ''}${t ? `<span class="ac-lt"><b class="jp">${k.k}</b> ${esc(t.a)}</span><span class="ac-lt"><b class="jp">${x.k}</b> ${esc(t.b)}</span>` : `<b class="jp">${x.k}</b> means ${esc(x.mean[0] || '')}`}</span></div>`;
}
/** wrong options for kanji questions: up to two look-alikes first, so you learn to tell them apart */
function lookDistract(item, pool, key, n = 3) {
  const ls = looksOf(item, 6).filter(x => !kanjiOverlap(item, x)).slice(0, 2), seen = new Set([key(item), ...ls.map(key)]);
  const rest = distract(item, pool.filter(x => !ls.includes(x)), key, () => true, n + 2).filter(x => !seen.has(key(x)) && (seen.add(key(x)), true));
  return [...ls, ...rest].slice(0, n);
}

/** the look-alike a wrong answer picked, if it was one (for "you picked 視, a look-alike") */
function lookPicked(q, chosen) {
  if (!q || !q.item || q.item.kind !== 'kanji' || chosen == null || chosen < 0 || !q.opts[chosen] || q.opts[chosen].ok) return null;
  const h = q.opts[chosen].html;
  return looksOf(q.item, 6).find(x => h.includes('>' + x.k + '<') || h === esc(x.m)) || null;
}

