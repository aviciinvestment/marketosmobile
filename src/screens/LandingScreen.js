import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BrandLogo from '../components/BrandLogo';
import LegalModal from '../components/LegalModal';
import SupportWidget from '../components/SupportWidget';
import VoiceGuideButton from '../components/VoiceGuideButton';
import { setAppLang } from '../i18n';

// ---------------------------------------------------------------------------
// i18n dictionary — verbatim port of web/src/components/LandingPage.tsx
// ---------------------------------------------------------------------------
const TRANSLATIONS = {
  en: {
    name: 'English',
    flag: '\u{1F1EC}\u{1F1E7}',
    hero: {
      badge: 'Built for Every Shop Owner, Market Trader & Retailer',
      title: 'Stop Guessing Your Real Gain. Know Every Naira Entering & Leaving',
      titleHighlight: 'Your Shop with 100% Truth.',
      subtitle:
        'Record customer sales with 1 tap, protect your restock money from getting spent, track generator and shop bills, and work smoothly without internet.',
      ctaPrimary: 'Open marketOS App',
      ctaSecondary: 'Explore Why MarketOS',
      trust1: 'Works Without Internet (Offline)',
      trust2: 'Capital Shield (Never Eat Capital)',
      trust3: 'Cartons into Pieces Calculation',
    },
    features: {
      tag: 'Why Nigerian Merchants Choose MarketOS',
      title: 'Built for Real African Market Realities',
      subtitle: 'No complex accounting grammar. No slow internet buffering. Just plain, honest cash truth.',
      items: [
        {
          title: 'Works Deep in Concrete Markets',
          desc: 'Works inside Balogun, Alaba, Onitsha Main Market, Ariaria, or Wuse without internet. Saves locally and syncs to cloud automatically once online.',
        },
        {
          title: 'Shields Your Seed Capital',
          desc: 'Separates supplier restock money from profit automatically. You will never mistakenly spend capital meant for buying new market.',
        },
        {
          title: 'Syncs Across Multiple Phones',
          desc: 'Use your Android phone, iPhone, or shop laptop on the same account. All records and deletions update concurrently without duplicates.',
        },
        {
          title: 'Carton to Pieces Breakdown',
          desc: 'Buy in cartons, crates, or bags; sell in sachets, bottles, or pieces. marketOS automatically calculates your exact profit on every piece.',
        },
        {
          title: 'Check Any Time Period Instantly',
          desc: 'One master filter at the top lets you inspect Today, This Week, This Month, or All Time with a single tap.',
        },
        {
          title: 'Private & Secure for Your Shop',
          desc: 'Your sales, stock counts, and prices belong to you alone. Fully encrypted and compliant with Nigerian Data Protection laws (NDPA 2023).',
        },
      ],
    },
    notice: 'Works Without Internet • No Monthly Fee • Your Money Stays Safe',
    steps: {
      tag: 'Made Simple',
      title: 'Only 3 Things You Do',
      items: [
        { title: 'Add Your Stock', desc: 'When you buy goods, write the name and price once. That is all.' },
        { title: 'Tap an Item When a Customer Buys', desc: 'When someone buys, just tap the item. Your sale is recorded.' },
        { title: 'See Your Real Profit Every Evening', desc: 'marketOS shows what you sold, what still remains, and your exact profit.' },
      ],
    },
    bottomCta: {
      title: 'Ready to Know Your Exact Shop Profit Every Evening?',
      subtitle:
        'Join hundreds of retail merchants who have dumped messy paper notebooks and know their exact take-home profit without headache.',
      button: 'Start Free on marketOS Now',
    },
    footer: {
      tagline: 'marketOS • Nigeria Retail Operating System',
      terms: 'Terms of Service',
      privacy: 'Privacy & NDPA Policy',
      rights: 'All rights reserved.',
    },
  },

  pidgin: {
    name: 'Pidgin',
    flag: '\u{1F1F3}\u{1F1EC}',
    hero: {
      badge: 'Dem Build Am For Every Trader, Shop Owner & Supermarket',
      title: 'Stop To Dey Guess Your Gain. Know Every Kobo Weh Enter & Comot',
      titleHighlight: 'For Your Shop With 100% Truth.',
      subtitle:
        'Press 1-tap record sale quick-quick, protect money to buy new market make you no chop capital, write fuel and shop bills, and use am well even if network no dey.',
      ctaPrimary: 'Open marketOS App',
      ctaSecondary: 'See Why MarketOS',
      trust1: 'E Dey Work Without Network',
      trust2: 'No Fit Chop Your Seed Capital',
      trust3: 'Break Down Carton into Pieces',
    },
    features: {
      tag: 'Wetin Make Naija Traders Dey Choose MarketOS',
      title: 'Dem Build Am For Real African Market Reality',
      subtitle: 'No big-big grammar. No slow network buffering. Just plain, honest cash truth.',
      items: [
        {
          title: 'E Dey Work Deep Inside Market Stalls',
          desc: 'E dey work inside Balogun, Alaba, Onitsha Main Market, Ariaria, or Wuse without internet. E go save for phone and sync once network come.',
        },
        {
          title: 'E Dey Protect Your Seed Capital',
          desc: 'E go strictly separate supplier restock money from your gain. You no go ever mistakenly chop capital take buy something else.',
        },
        {
          title: 'Use Am For Many Phones Together',
          desc: 'Use your Android phone, iPhone, or laptop on the same account. Everything dey update concurrently without mistake or duplicate.',
        },
        {
          title: 'Carton to Piece Calculation',
          desc: 'Buy carton, crate, or bag; sell pieces or sachets. marketOS go calculate your exact gain for each single piece automatically.',
        },
        {
          title: 'Check Any Time Period Sharp-Sharp',
          desc: 'One master button for top dey allow you check Today, This Week, This Month, or All Time with just one tap.',
        },
        {
          title: 'Your Money Secret Dey 100% Safe',
          desc: 'Your sales, stock numbers, and prices na your secret alone. Dem lock am well under Nigerian Data Protection Act (NDPA 2023).',
        },
      ],
    },
    notice: 'E Dey Work Without Network • No Koko Fee • Your Money Dey Safe',
    steps: {
      tag: 'Dem Make Am Easy',
      title: 'Just 3 Things You Go Do',
      items: [
        { title: 'Add Your Goods', desc: 'When you buy goods, write the name and price once. Na only that.' },
        { title: 'Tap Am When Customer Buy', desc: 'When customer buy, just tap the goods. Your sale don record.' },
        { title: 'See Your Real Gain Every Evening', desc: 'marketOS go show wetin you sell, wetin remain, and your exact gain.' },
      ],
    },
    bottomCta: {
      title: 'You Ready To Know Your Real Evening Shop Gain?',
      subtitle:
        'Join hundreds of smart market traders weh don throway paper book and dey balance their money every evening without headache.',
      button: 'Start Free for marketOS Now',
    },
    footer: {
      tagline: 'marketOS • Nigeria Retail Operating System',
      terms: 'Terms of Service',
      privacy: 'Privacy & NDPA Policy',
      rights: 'All rights reserved.',
    },
  },

  igbo: {
    name: 'Igbo',
    flag: '\u{1F1F3}\u{1F1EC}',
    hero: {
      badge: 'E mere ya maka ndị na-azụ ahịa, ndị nwe ụlọ ahịa na kanti',
      title: 'Kwụsị ịkọ nkọ uru ahịa gị. Mara ego niile na-abata ma na-apụ',
      titleHighlight: 'na shọọpụ gị n’eziokwu 100%.',
      subtitle:
        'Dekọọ ahịa ngwa ngwa site na otu aka, chekwaa ego isi ahịa gị ka ị ghara iri ya, dekọọ ego mmanụ jenereto na njem, jiri ya rụọ ọrụ ọbụna mgbe netwọk na-adịghị.',
      ctaPrimary: 'Meghee marketOS Ugbu A',
      ctaSecondary: 'Hụ Ihe Mere Ị Ga-eji Jiri Ya',
      trust1: 'Ọ na-arụ ọrụ n’enweghị netwọk (Offline)',
      trust2: 'Chekwaa Ego Isi Ahịa (E rila jare)',
      trust3: 'Mgbakọ Katọn n’Otu n’Otu',
    },
    features: {
      tag: 'Ihe Mere Ndị Ahịa Naijiria Ji Hụ MarketOS n’Anya',
      title: 'E Mere Ya Maka Ahịa Anyị n’Afrịka',
      subtitle: 'Enweghị ụtọasụsụ gbara ọkpụrụkpụ. Enweghị nkwụsị netwọk. Naanị eziokwu ego gị dị larịị.',
      items: [
        {
          title: 'Ọ na-arụ Ọrụ n’Ime Ụlọ Ahịa nke Ọma',
          desc: 'Ọ na-arụ ọrụ n’ime ahịa Balogun, Alaba, Onitsha Main Market, Ariaria, ma ọ bụ Wuse n’enweghị netwọk. Ọ na-echekwa na ekwentị ma bulite ya na kọmputa ozugbo netwọk batara.',
        },
        {
          title: 'Ọ na-echekwa Ego Isi Ahịa Gị',
          desc: 'Ọ na-ekewa ego iji zụtaghachi ahịa na uru gị iche. Ị gaghị ejiri aka gị mefuo ego isi ahịa n’amaghị ama ọzọ.',
        },
        {
          title: 'Jiri Ekwentị Dị Iche Iche n’Otu Oge',
          desc: 'Jiri ekwentị Android, iPhone, ma ọ bụ laptọọpụ rụọ ọrụ n’otu akaụntụ. Ihe niile ị gbanwere na-apụta ozugbo n’enweghị mgbagwoju anya.',
        },
        {
          title: 'Mgbakọ Katọn gaa n’Otu n’Otu',
          desc: 'Zụta katọn ma ọ bụ akpa; ree n’otu n’otu ma ọ bụ paki. marketOS na-agbakọ ezigbo uru gị n’otu n’otu ozugbo.',
        },
        {
          title: 'Lelee Oge Ọ Bụla n’Otu Aka',
          desc: 'Otu bọtịnụ dị n’elu na-enyere gị aka ilele Taa, Izu a, Ọnwa a, ma ọ bụ Oge Niile n’otu ntabi anya.',
        },
        {
          title: 'Ihe Nzuzo Ego Gị Dị 100% Nchebe',
          desc: 'Ahịa gị, ọnụahịa gị na ngwaahịa gị bụ naanị nke gị. Echedoro ya nke ọma n’okpuru iwu nchekwa data Naijiria (NDPA 2023).',
        },
      ],
    },
    notice: 'Ọ na-arụ ọrụ n’enweghị netwọk • Enweghị ụgwọ ọnwa • Ego gị dị nchebe',
    steps: {
      tag: 'E Mere Ya Dị Mfe',
      title: 'Naanị Ihe Atọ I Na-eme',
      items: [
        { title: 'Tinye Ngwaahịa Gị', desc: 'Mgbe ị zụrụ ngwaahịa, dee aha na ọnụahịa otu ugboro. Ọ bụ naanị nke ahụ.' },
        { title: 'Pịa Ngwaahịa Mgbe Onye Ahịa Zụtara', desc: 'Mgbe onye zụtara ihe, pịa naanị ngwaahịa ahụ. Edekọla ahịa gị.' },
        { title: 'Hụ Ezigbo Uru Gị Kwa Mgbede', desc: 'marketOS na-egosi ihe i ree, ihe fọdụrụ, na ezigbo uru gị.' },
      ],
    },
    bottomCta: {
      title: 'Ị Dịla Njikere Ịmata Ezigbo Uru Ahịa Gị Kwa Mgbede?',
      subtitle:
        'Sonyere ọtụtụ narị ndị ahịa maara ihe tụfuru akwụkwọ ndekọ ochie ma na-agbakọ ego ha kwa mgbede n’enweghị isi ọwụwa.',
      button: 'Bido n’efu na marketOS Ugbu A',
    },
    footer: {
      tagline: 'marketOS • Nigeria Retail Operating System',
      terms: 'Usoro Ọrụ',
      privacy: 'Iwu Nzuzo & NDPA',
      rights: 'Ikike niile echekwabara.',
    },
  },

  yoruba: {
    name: 'Yoruba',
    flag: '\u{1F1F3}\u{1F1EC}',
    hero: {
      badge: 'Fun gbogbo oníṣòwò, onílé-ìtajà àti ilé-ìtajà ńlá',
      title: 'Dẹkun láti máa ro èrè rẹ lásán. Mọ gbogbo owó tó ń wọlé àti èyí tó ń jáde',
      titleHighlight: 'nínú ṣọ́ọ̀bù rẹ pẹ̀lú òtítọ́ 100%.',
      subtitle:
        'Kọ ọjà títà sílẹ̀ lẹ́ẹ̀kan ṣoṣo, dáàbò bo owó ìpìlẹ̀ rẹ kó má baà jẹ́ jíjẹ, ṣàkọsílẹ̀ owó epo jẹ́nẹ́rẹ́tọ̀ àti owó ọkọ̀, kí o sì lo ètò yìí láìsí intanẹ́ẹ̀tì.',
      ctaPrimary: 'Ṣí marketOS Nísinsìnyí',
      ctaSecondary: 'Wo Ìdí Tí O Fi Yan MarketOS',
      trust1: 'Ó ń ṣiṣẹ́ láìsí intanẹ́ẹ̀tì (Offline)',
      trust2: 'Dáàbò Bo Owó Ìpìlẹ̀ (Má Jẹ Ìpìlẹ̀)',
      trust3: 'Ìṣirò Kátọ́ọ̀nù sí Ẹyọ Kọ̀ọ̀kan',
    },
    features: {
      tag: 'Ìdí Tí Àwọn Oníṣòwò Nàìjíríà Fi Yan MarketOS',
      title: 'A Kọ Ọ́ Fún Àwọn Ọjà Ilẹ̀ Adúláwọ̀ Tòótọ́',
      subtitle: 'Kò sí gírámà tó nira. Kò sí dídúró de intanẹ́ẹ̀tì tó lọ́ra. Òtítọ́ owó tí ó ṣe kedere nìkan.',
      items: [
        {
          title: 'Ó ń Ṣiṣẹ́ Nínú Àwọn Ọjà Nla',
          desc: 'Ó ń ṣiṣẹ́ dáadáa nínú ọjà Balogun, Alaba, Onitsha Main Market, Ariaria, tàbí Wuse láìsí intanẹ́ẹ̀tì. Yóò fi pamọ́ sórí fóònù rẹ, yóò sì gbé e sókè lẹ́yìn tí intanẹ́ẹ̀tì bá dé.',
        },
        {
          title: 'Ó ń Dáàbò Bo Owó Ìpìlẹ̀ Ọjà Rẹ',
          desc: 'Ó ń ya owó àtúnrà ọjà sọ́tọ̀ kúrò nínú èrè rẹ láìsí àṣìṣe. O ò ní jẹ owó ìpìlẹ̀ rẹ mọ́ láé.',
        },
        {
          title: 'Lo Fóònù Púpọ̀ Lẹ́ẹ̀kan Náà',
          desc: 'Lo fóònù Android, iPhone, tàbí laptọ́ọ̀pù lórí àkántì kan náà. Gbogbo àkọsílẹ̀ yóò jẹ́ kíkọ láìsí àṣìṣe tàbí dídàrúdàpọ̀.',
        },
        {
          title: 'Ìṣirò Kátọ́ọ̀nù sí Ẹyọ Kọ̀ọ̀kan',
          desc: 'Ra kátọ́ọ̀nù, kireeti, tàbí àpò; tà á ní ẹyọ tàbí pọ́ọ̀sì. marketOS yóò ṣirò èrè rẹ lórí ẹyọ kọ̀ọ̀kan fún ọ lẹ́sẹ̀kẹsẹ̀.',
        },
        {
          title: 'Wo Àkókò Yòówù Ní Ìṣẹ́jú Kan',
          desc: 'Bọ́tìnì kan lókè ń jẹ́ kí o wo Lónìí, Lọ́sẹ̀ yìí, Lóṣù yìí, tàbí Gbogbo Ìgbà pẹ̀lú fífọwọ́kan ẹ̀ẹ̀kan péré.',
        },
        {
          title: 'Àṣírí Ọjà Rẹ Wà Ní Ìpamọ́ 100%',
          desc: 'Ọjà títà, iye ọjà àti iye owó rẹ jẹ́ àṣírí tìrẹ nìkan. A fi ààbò bò ó lábẹ́ òfin ààbò dátà ti Nàìjíríà (NDPA 2023).',
        },
      ],
    },
    notice: 'Ó ń ṣiṣẹ́ láìsí intanẹ́ẹ̀tì • Kò sí owó oṣù • Owó rẹ wà ní ààbò',
    steps: {
      tag: 'Ẹ Rọrùn Rẹ́',
      title: 'Nǹkan Mẹ́ta Péré Tí O Máa Ṣe',
      items: [
        { title: 'Fi Ọjà Rẹ Sílẹ̀', desc: 'Nígbà tí o bá ra ọjà, kọ orúkọ àti owó rẹ lẹ́ẹ̀kan péré. Ìyẹn nìkan.' },
        { title: 'Tẹ Ọjà Nígbà Tí Oníbàárà Bá Ra', desc: 'Nígbà tí oníbàárà bá ra ọjà, tẹ ọjà náà péré. A ti kọ ọjà títà rẹ sílẹ̀.' },
        { title: 'Wo Èrè Rẹ Ní Alẹ́ Kọ̀ọ̀kan', desc: 'marketOS máa fi ohun tí o tà, ohun tó kù, àti èrè rẹ gangan hàn ọ́.' },
      ],
    },
    bottomCta: {
      title: 'Ṣé O Ti Ṣe Tán Láti Mọ Èrè Ṣọ́ọ̀bù Rẹ Tòótọ́ Ní Alẹ́?',
      subtitle:
        'Dara pọ̀ mọ́ ọgọ́rọ̀ọ̀rún àwọn oníṣòwò ọlọ́gbọ́n tí wọ́n ti ju ìwé àkọsílẹ̀ àtijọ́ nù tí wọ́n sì ń mọ èrè wọn láìsí wàhálà.',
      button: 'Bẹ̀rẹ̀ Lọ́fẹ̀ẹ́ Lórí marketOS Nísinsìnyí',
    },
    footer: {
      tagline: 'marketOS • Nigeria Retail Operating System',
      terms: 'Àwọn Ìlànà Iṣẹ́',
      privacy: 'Ètò Àṣírí & NDPA',
      rights: 'Gbogbo ẹ̀tọ́ wà ní ìpamọ́.',
    },
  },

  hausa: {
    name: 'Hausa',
    flag: '\u{1F1F3}\u{1F1EC}',
    hero: {
      badge: 'An ƙera don ƴan kasuwa, masu shaguna da manyan kanti',
      title: 'Daina ƙiyasi kan ainihin ribarka. San kowane naira da ke shiga da fita',
      titleHighlight: 'a shagonka da gaskiya 100%.',
      subtitle:
        'Rubuta ciniki da taɓawa ɗaya, kare jarin sayo kaya don kada ka cinye shi, rubuta kuɗin man janareta da sufuri, kuma yi aiki ba tare da intanet ba.',
      ctaPrimary: 'Bude marketOS App',
      ctaSecondary: 'Duba Amfanin MarketOS',
      trust1: 'Yana Aiki Ba Intanet (Offline)',
      trust2: 'Kare Jarin Saye (Kada Ka Ci Jari)',
      trust3: 'Lissafin Katan zuwa Dai-ɗai',
    },
    features: {
      tag: 'Abin da Ya Sa Ƴan Kasuwar Najeriya Suka Zaɓi MarketOS',
      title: 'An Ƙera Shi Don Yanayin Kasuwancin Afirka',
      subtitle: 'Babu dogon turanci mai wuya. Babu jiran intanet mai jinkiri. Gaskiyar kuɗin shagonka kawai.',
      items: [
        {
          title: 'Yana Aiki Cikin Manyan Kasuwanni',
          desc: 'Yana aiki a cikin kasuwannin Balogun, Alaba, Onitsha Main Market, Ariaria, ko Wuse ba tare da intanet ba. Yana adanawa a wayarka kuma ya daidaita idan an samu intanet.',
        },
        {
          title: 'Yana Kare Jarin Saye Kaya',
          desc: 'Yana ware kuɗin da za a mayar kasuwa daban da ainihin ribarka. Ba za ka taɓa cinye jarin sayo kaya a cikin kuskure ba.',
        },
        {
          title: 'Yi Amfani da Wayoyi Da Yawa Lokaci Ɗaya',
          desc: 'Yi amfani da wayar Android, iPhone, ko kwamfuta a kan asusu ɗaya. Kowane lissafi zai daidaita nan take ba tare da rikici ko maimaici ba.',
        },
        {
          title: 'Lissafin Katan zuwa Dai-ɗaiku',
          desc: 'Sayo katan, kwano, ko buhu; sayar da ɗai-ɗai ko pakiti. marketOS yana lissafa maka ainihin ribarka a kowane guda nan take.',
        },
        {
          title: 'Duba Kowane Lokaci Cikin Sauƙi',
          desc: 'Maballi ɗaya a sama yana ba ka damar bincika cinikin Yau, Wannan Makon, Wannan Watan, ko Duk Lokaci da dannawa ɗaya.',
        },
        {
          title: 'Sirrin Shagonka A Tsare Yake 100%',
          desc: 'Cinikinka, adadin kayanka da farashinka naka ne kai kaɗai. An kare su a ƙarƙashin dokar kare bayanan Najeriya (NDPA 2023).',
        },
      ],
    },
    notice: 'Yana Aiki Ba Intanet • Babu Kuɗin Wata • Kuɗinka Yana A Tsare',
    steps: {
      tag: 'An Sauƙaƙe Shi',
      title: 'Abubuwa Uku Kaɗai ZaKa Yi',
      items: [
        { title: 'Ƙara Kayanka', desc: 'Idan ka sayi kaya, rubuta suna da farashi sau ɗaya kaɗai. Shi ke nan.' },
        { title: 'Danna Kaya Idan Abokin Ciniki Ya Sayi', desc: 'Idan abokin ciniki ya sayi, danna kayan kawai. An rubuta cinikinka.' },
        { title: 'Duba Ainihin Ribarka Kowace Yamma', desc: 'marketOS zai nuna abin da ka sayar, abin da ya rage, da ainihin ribarka.' },
      ],
    },
    bottomCta: {
      title: 'Ka Shirya Sanin Ainihin Ribar Shagonka a Kowace Yamma?',
      subtitle:
        'Haɗu da ɗaruruwan ƴan kasuwa masu basira waɗanda suka jefar da tsohon littafin takarda kuma suke lissafin kuɗinsu ba tare da ciwon kai ba.',
      button: 'Fara Kyauta a marketOS Yanzu',
    },
    footer: {
      tagline: 'marketOS • Tsarin Gudanar da Kasuwanci a Najeriya',
      terms: 'Sharuɗɗan Sabis',
      privacy: 'Tsarin Tsare Sirri & NDPA',
      rights: 'Duk haƙƙoƙi an kiyaye su.',
    },
  },
};

const LANG_KEYS = ['en', 'pidgin', 'igbo', 'yoruba', 'hausa'];

const FEATURE_ICONS = [
  'cloud-offline-outline',
  'cash-outline',
  'phone-portrait-outline',
  'cube-outline',
  'bar-chart-outline',
  'shield-checkmark-outline',
];
const FEATURE_TAGS = [
  'OFFLINE FIRST',
  'CAPITAL SHIELD',
  'MULTI-DEVICE',
  'PIECE BREAKDOWN',
  'MASTER FILTER',
  'BANK-GRADE PRIVACY',
];
const FEATURE_METRICS = [
  '100% Offline Capability',
  'Protects Supplier Funds',
  'Live Cloud Concurrency',
  'Instant Piece Profit',
  'One-Tap Recalculation',
  'NDPA 2023 Compliant',
];

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function LandingScreen({ navigation }) {
  const [currentLang, setCurrentLang] = useState('en');
  const [legalTab, setLegalTab] = useState(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const [featBox, setFeatBox] = useState(null);
  const [cardBoxes, setCardBoxes] = useState({});
  const scrollRef = useRef(null);
  const featuresY = useRef(0);
  const scrollY = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    AsyncStorage.getItem('marketos_landing_lang').then((saved) => {
      if (saved && LANG_KEYS.includes(saved)) {
        setCurrentLang(saved);
        setAppLang(saved);
      }
    });
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const handleLanguageChange = (lang) => {
    setCurrentLang(lang);
    AsyncStorage.setItem('marketos_landing_lang', lang).catch(() => {});
    setAppLang(lang);
  };

  const launchApp = () => navigation.goBack();
  const scrollToFeatures = () => {
    scrollRef.current?.scrollTo({ y: Math.max(0, featuresY.current), animated: true });
  };

  const t = TRANSLATIONS[currentLang];
  const sparkleRotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  // Sticky stacking cards (web: position sticky, top: 4.5rem + i*18px).
  // Each card pins near the viewport top as it scrolls up, and later cards
  // stack over it; it releases when the features section bottom is reached.
  const cardStyle = (index) => {
    const box = cardBoxes[index];
    if (!featBox || !box) return { zIndex: 10 + index };
    const cardY = featBox.y + box.y;
    const stickyTop = 4 + index * 18;
    const start = cardY - stickyTop;
    const maxT = featBox.y + featBox.h - (cardY + box.h);
    if (maxT <= 0.5) return { zIndex: 10 + index };
    const translateY = scrollY.interpolate({
      inputRange: [start, start + maxT],
      outputRange: [0, maxT],
      extrapolate: 'clamp',
    });
    return { transform: [{ translateY }], zIndex: 10 + index };
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      {/* TOP NOTIFICATION BAR */}
      <LinearGradient
        colors={['#d97706', '#eab308', '#d97706']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[s.topBar, { paddingTop: (insets.top || 0) + 7 }]}
      >
        <Animated.View style={{ transform: [{ rotate: sparkleRotate }] }}>
          <Ionicons name="sparkles" size={13} color="#020617" />
        </Animated.View>
        <Text style={s.topBarText}>{t.notice}</Text>
      </LinearGradient>

      {/* HEADER */}
      <View style={s.header}>
        <BrandLogo size="md" />
        <View style={s.headerActions}>
          <VoiceGuideButton page="landing" />
          <TouchableOpacity onPress={scrollToFeatures} activeOpacity={0.7} style={s.navLink}>
            <Text style={s.navLinkText}>Why MarketOS</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={launchApp} activeOpacity={0.85}>
            <LinearGradient
              colors={['#f59e0b', '#d97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.headerCta}
            >
              <Text style={s.headerCtaText}>{t.hero.ctaPrimary}</Text>
              <Ionicons name="chevron-forward" size={14} color="#020617" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* LANGUAGE SELECTOR BAR */}
      <View style={s.langBar}>
        <View style={s.langLabelRow}>
          <Ionicons name="language" size={14} color="#fbbf24" />
          <Text style={s.langLabel}>Language / Èdè / Asụsụ / Harshe:</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.langChips}>
          {LANG_KEYS.map((key) => {
            const active = currentLang === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => handleLanguageChange(key)}
                activeOpacity={0.8}
                style={[s.langChip, active && s.langChipActive]}
              >
                <Text style={[s.langChipText, active && s.langChipTextActive]}>
                  {TRANSLATIONS[key].flag} {TRANSLATIONS[key].name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
      >
        {/* HERO */}
        <View style={s.hero}>
          <View style={s.heroGlow} />
          <View style={s.badge}>
            <Ionicons name="sparkles" size={13} color="#fbbf24" />
            <Text style={s.badgeText}>{t.hero.badge}</Text>
          </View>

          <Text style={s.heroTitle}>
            {t.hero.title} <Text style={s.heroTitleHighlight}>{t.hero.titleHighlight}</Text>
          </Text>

          <Text style={s.heroSubtitle}>{t.hero.subtitle}</Text>

          <View style={s.heroCtas}>
            <TouchableOpacity onPress={launchApp} activeOpacity={0.9} style={s.heroCtaPrimaryWrap}>
              <LinearGradient
                colors={['#f59e0b', '#fbbf24', '#f59e0b']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.heroCtaPrimary}
              >
                <Text style={s.heroCtaPrimaryText}>{t.hero.ctaPrimary}</Text>
                <Ionicons name="arrow-forward" size={16} color="#020617" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={scrollToFeatures} activeOpacity={0.8} style={s.heroCtaSecondary}>
              <Ionicons name="sparkles" size={15} color="#fbbf24" />
              <Text style={s.heroCtaSecondaryText}>{t.hero.ctaSecondary}</Text>
            </TouchableOpacity>
          </View>

          <View style={s.trustRow}>
            {[t.hero.trust1, t.hero.trust2, t.hero.trust3].map((item) => (
              <View key={item} style={s.trustItem}>
                <Ionicons name="checkmark-circle" size={15} color="#34d399" />
                <Text style={s.trustText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* FEATURES */}
        <View
          style={s.featuresSection}
          onLayout={(e) => {
            featuresY.current = e.nativeEvent.layout.y;
            const { y, height } = e.nativeEvent.layout;
            setFeatBox((prev) =>
              prev && Math.abs(prev.y - y) < 0.5 && Math.abs(prev.h - height) < 0.5
                ? prev
                : { y, h: height }
            );
          }}
        >
          <View style={s.featuresHead}>
            <View style={s.featuresTag}>
              <Ionicons name="sparkles" size={12} color="#fbbf24" />
              <Text style={s.featuresTagText}>{t.features.tag}</Text>
            </View>
            <Text style={s.featuresTitle}>{t.features.title}</Text>
            <Text style={s.featuresSubtitle}>{t.features.subtitle}</Text>
          </View>

          {t.features.items.map((item, index) => (
            <Animated.View
              key={index}
              style={[s.card, cardStyle(index)]}
              onLayout={(e) => {
                const { y, height } = e.nativeEvent.layout;
                setCardBoxes((prev) => {
                  const cur = prev[index];
                  if (cur && Math.abs(cur.y - y) < 0.5 && Math.abs(cur.h - height) < 0.5) return prev;
                  return { ...prev, [index]: { y, h: height } };
                });
              }}
            >
              <View style={s.cardHead}>
                <View style={s.cardIconBox}>
                  <Ionicons name={FEATURE_ICONS[index] || 'sparkles'} size={22} color="#fbbf24" />
                </View>
                <View style={s.cardHeadRight}>
                  <Text style={s.cardTag}>{FEATURE_TAGS[index]}</Text>
                  <Text style={s.cardIndex}>0{index + 1}</Text>
                </View>
              </View>
              <Text style={s.cardTitle}>{item.title}</Text>
              <Text style={s.cardDesc}>{item.desc}</Text>
              <View style={s.cardFoot}>
                <Text style={s.cardMetric}>{FEATURE_METRICS[index]}</Text>
                <Ionicons name="checkmark-circle" size={15} color="#34d399" />
              </View>
            </Animated.View>
          ))}
        </View>

        {/* HOW IT WORKS — 3 SIMPLE STEPS */}
        <View style={s.stepsSection}>
          <View style={s.stepsTag}>
            <Ionicons name="checkmark-circle" size={13} color="#34d399" />
            <Text style={s.stepsTagText}>{t.steps.tag}</Text>
          </View>
          <Text style={s.featuresTitle}>{t.steps.title}</Text>
          <View style={s.stepsList}>
            {t.steps.items.map((step, index) => (
              <View key={index} style={s.stepCard}>
                <View style={s.stepNum}>
                  <Text style={s.stepNumText}>{index + 1}</Text>
                </View>
                <Text style={s.stepTitle}>{step.title}</Text>
                <Text style={s.stepDesc}>{step.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* BOTTOM CTA */}
        <LinearGradient
          colors={['rgba(245,158,11,0.10)', 'rgba(234,179,8,0.20)', 'rgba(245,158,11,0.10)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.bottomCta}
        >
          <Text style={s.bottomCtaTitle}>{t.bottomCta.title}</Text>
          <Text style={s.bottomCtaSubtitle}>{t.bottomCta.subtitle}</Text>
          <TouchableOpacity onPress={launchApp} activeOpacity={0.9} style={s.bottomCtaBtnWrap}>
            <LinearGradient colors={['#f59e0b', '#fbbf24']} style={s.bottomCtaBtn}>
              <Text style={s.bottomCtaBtnText}>{t.bottomCta.button}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>

        {/* FOOTER */}
        <View style={s.footer}>
          <View style={s.footerBrand}>
            <BrandLogo size="sm" />
            <Text style={s.footerTagline}>{t.footer.tagline}</Text>
          </View>
          <View style={s.footerLinks}>
            <TouchableOpacity onPress={() => setLegalTab('terms')}>
              <Text style={s.footerLink}>{t.footer.terms}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setLegalTab('privacy')}>
              <Text style={s.footerLink}>{t.footer.privacy}</Text>
            </TouchableOpacity>
            <Text style={s.footerRights}>© {new Date().getFullYear()} marketOS. {t.footer.rights}</Text>
          </View>
        </View>
      </Animated.ScrollView>

      {/* Floating support button (web parity) */}
      <TouchableOpacity style={s.fab} activeOpacity={0.85} onPress={() => setSupportOpen(true)}>
        <Ionicons name="headset" size={22} color="#000000" />
      </TouchableOpacity>

      <SupportWidget visible={supportOpen} onClose={() => setSupportOpen(false)} />

      <LegalModal
        visible={!!legalTab}
        initialTab={legalTab || 'privacy'}
        onClose={() => setLegalTab(null)}
        onAccept={() => {
          AsyncStorage.setItem('marketos_consent_agreed', '1').catch(() => {});
          setLegalTab(null);
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07090E' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  topBarText: {
    color: '#020617',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.3,
    textAlign: 'center',
    flexShrink: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30,41,59,0.8)',
    backgroundColor: '#07090E',
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navLink: { paddingHorizontal: 8, paddingVertical: 6 },
  navLinkText: { color: '#cbd5e1', fontSize: 12, fontWeight: '700' },
  headerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  headerCtaText: { color: '#020617', fontSize: 12, fontWeight: '900' },
  langBar: {
    backgroundColor: '#0B0E17',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30,41,59,0.8)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 8,
  },
  langLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  langLabel: { color: '#fbbf24', fontSize: 11, fontWeight: '800' },
  langChips: { gap: 6, paddingRight: 8 },
  langChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    backgroundColor: 'rgba(15,23,42,0.8)',
  },
  langChipActive: {
    backgroundColor: '#F5C518',
    borderColor: '#fde68a',
  },
  langChipText: { color: '#cbd5e1', fontSize: 11, fontWeight: '700' },
  langChipTextActive: { color: '#000000', fontWeight: '900' },
  scrollContent: { paddingBottom: 40 },
  hero: { paddingHorizontal: 16, paddingTop: 40, paddingBottom: 36, alignItems: 'center' },
  heroGlow: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    width: 300,
    height: 260,
    borderRadius: 200,
    backgroundColor: 'rgba(245,158,11,0.10)',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
    marginBottom: 22,
    maxWidth: '100%',
  },
  badgeText: { color: '#fbbf24', fontSize: 11, fontWeight: '700', flexShrink: 1 },
  heroTitle: {
    color: '#f1f5f9',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.8,
    lineHeight: 37,
    textAlign: 'center',
    maxWidth: 640,
  },
  heroTitleHighlight: { color: '#fbbf24' },
  heroSubtitle: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 16,
    maxWidth: 560,
  },
  heroCtas: { marginTop: 28, width: '100%', maxWidth: 420, gap: 12 },
  heroCtaPrimaryWrap: { borderRadius: 14, overflow: 'hidden' },
  heroCtaPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  heroCtaPrimaryText: { color: '#020617', fontSize: 14, fontWeight: '900' },
  heroCtaSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
  },
  heroCtaSecondaryText: { color: '#e2e8f0', fontSize: 14, fontWeight: '700' },
  trustRow: {
    marginTop: 40,
    paddingTop: 26,
    borderTopWidth: 1,
    borderTopColor: 'rgba(30,41,59,0.8)',
    width: '100%',
    gap: 10,
  },
  trustItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  trustText: { color: '#cbd5e1', fontSize: 12, fontWeight: '600' },
  featuresSection: { paddingHorizontal: 16, paddingTop: 44, paddingBottom: 44, gap: 18 },
  featuresHead: { alignItems: 'center', marginBottom: 10, gap: 10 },
  featuresTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  featuresTagText: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  featuresTitle: {
    color: '#f1f5f9',
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  featuresSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    maxWidth: 460,
  },
  stepsSection: {
    paddingHorizontal: 20,
    paddingVertical: 48,
    gap: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(30,41,59,0.25)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#1e293b',
  },
  stepsTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  stepsTagText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  stepsList: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  stepCard: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(13,17,26,0.95)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 24,
  },
  stepNum: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  stepNumText: {
    color: '#020617',
    fontSize: 20,
    fontWeight: '900',
  },
  stepTitle: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  stepDesc: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'rgba(13,17,26,0.95)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    borderTopWidth: 2,
    borderTopColor: 'rgba(251,191,36,0.9)',
    padding: 20,
    gap: 8,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  cardIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeadRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTag: {
    color: '#fbbf24',
    fontSize: 9,
    fontWeight: '800',
    fontFamily: 'monospace',
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cardIndex: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cardTitle: { color: '#f1f5f9', fontSize: 16, fontWeight: '900' },
  cardDesc: { color: '#cbd5e1', fontSize: 12.5, lineHeight: 19 },
  cardFoot: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(30,41,59,0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardMetric: { color: 'rgba(251,191,36,0.9)', fontSize: 11, fontWeight: '600', flexShrink: 1, marginRight: 8 },
  bottomCta: {
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 14,
  },
  bottomCtaTitle: { color: '#f1f5f9', fontSize: 24, fontWeight: '900', textAlign: 'center', lineHeight: 32 },
  bottomCtaSubtitle: { color: '#cbd5e1', fontSize: 13, lineHeight: 21, textAlign: 'center', maxWidth: 480 },
  bottomCtaBtnWrap: { borderRadius: 14, overflow: 'hidden', marginTop: 6 },
  bottomCtaBtn: { paddingHorizontal: 30, paddingVertical: 15, borderRadius: 14 },
  bottomCtaBtnText: { color: '#020617', fontSize: 14, fontWeight: '900' },
  footer: {
    backgroundColor: '#05070B',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingVertical: 28,
    paddingHorizontal: 20,
    gap: 16,
    alignItems: 'center',
  },
  footerBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  footerTagline: { color: '#94a3b8', fontSize: 11, fontWeight: '600' },
  footerLinks: { alignItems: 'center', gap: 10 },
  footerLink: { color: '#94a3b8', fontSize: 12, fontWeight: '500' },
  footerRights: { color: '#64748b', fontSize: 11 },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F5C518',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F5C518',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
});
