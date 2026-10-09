import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';

const STORAGE_KEY = 'marketos_voice_guide_enabled';

// The device voice is only used for the languages it reads well: English and
// (English-based) Pidgin.
const VOICE_LANGS = new Set(['en', 'pidgin']);

let enabled = true;
let activePage = 'home';

const listeners = new Set();

export async function hydrateVoiceGuide() {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      enabled = saved === '1';
      listeners.forEach((l) => l(enabled));
    }
  } catch {
    // storage unavailable - keep default
  }
  return enabled;
}

export function isVoiceGuideEnabled() {
  return enabled;
}

export function setVoiceGuideEnabled(on) {
  enabled = !!on;
  try {
    AsyncStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    // ignore
  }
  if (!enabled) {
    stopSpeech();
  }
  listeners.forEach((l) => l(enabled));
}

export function subscribeVoiceGuide(cb) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function setActivePage(page) {
  activePage = page;
}

export function getActivePage() {
  return activePage;
}

const PREFERRED_LOCALE = {
  en: 'en-NG',
  pidgin: 'en-NG',
  igbo: 'ig-NG',
  yoruba: 'yo-NG',
  hausa: 'ha-NG',
};

export function stopSpeech() {
  Speech.stop();
}

export function speak(text, lang) {
  if (!text) return;
  if (!VOICE_LANGS.has(lang)) return;
  try {
    Speech.stop();
    Speech.speak(text, {
      language: PREFERRED_LOCALE[lang] || 'en',
      rate: 0.92,
      pitch: 1,
    });
  } catch {
    // speech unavailable - fail silently
  }
}

export function readPage(page, lang) {
  const script = (AUDIO_GUIDES[lang] || AUDIO_GUIDES.en)?.[page];
  if (script) {
    speak(script, lang);
  }
}

export const AUDIO_GUIDES = {
  en: {
    landing:
      "Welcome to marketOS. This app helps you record your sales with one touch, know your real profit, keep your stock safe, and it works even without internet. When you are ready, tap Open marketOS App to begin.",
    home:
      "This is your shop home, the busiest page. It shows everything you need for today. Right here is the yellow Quick Sell box. When a customer buys from you, tap the item in the yellow box to record the sale in one touch. Below it are your recent sales, so you can correct a mistake if you press the wrong button. Your whole shop lives on this page.",
    products:
      "This is My Stock. Stock means the goods you have, like cartons, crates, or pieces. Here you add new goods after buying them, check how many pieces remain, and set your prices. To add a new item, tap Add Multiple Items at the top. You can also search, or arrange your goods by name, price, or the ones running low. Never forget what you have.",
    insights:
      "This is your Market Report. Every evening this page shows you the truth about your day. It tells you how much money came in from sales, how much profit you made, your expenses, and which goods sold fastest. Use this page when closing your shop, so you always know exactly how your business is doing. No more guessing.",
    settings:
      "This is Settings and Profile. Here you choose your app language, switch to light or dark mode to protect your eyes, update your photo and shop name, and turn the voice explanation on or off. If you ever want to clear all your data, this is also where you do it. Go slowly, there is no hurry.",
    admin:
      "This is Mission Control. Only the owner of this app is allowed here. In this page you can see all traders using marketOS, check complaints, and manage the system. If you are not the owner, please go back to the other pages.",
    guide:
      "This is the Help Guide. If you forget how something works, come here. This page explains every part of the app, from recording sales to checking your profit. Take your time, tap each heading, and learn at your own pace. Everything is fine and you can do this.",
  },
  pidgin: {
    landing:
      "Welcome to marketOS. Dis app dey help you record your sales with one touch, know your real gain, keep your stock safe, and e dey work even without network. When you ready, tap Open marketOS App to start.",
    home:
      "Dis na your shop home, the busiest page. E dey show everything you need for today. Right here na the yellow Quick Sell box. When customer buy from you, just tap the item for the yellow box, record the sale one touch. Below am na your recent sales, so if you press wrong button you fit correct am. Your whole shop dey live on dis page.",
    products:
      "Dis na My Stock. Stock mean the goods wey you get, like carton, crate, or piece. Na here you go add new goods after you buy am, check how many remain, and set your price. If you wan add new item, tap Add Multiple Items for top. You fit search, or arrange your goods by name, price, or the one wey dey finish small. Make you no forget wetin you get.",
    insights:
      "Dis na your Market Report. Every evening dis page go show you the truth about your day. E go tell you how much money komot from sales, how much gain you make, your expenses, and which goods sell fastest. Use dis page when de day dey end, so you go always know how your shop dey. No guess again.",
    settings:
      "Dis na Settings and Profile. Na here you go choose your app language, switch to light or dark mode so your eye go rest, update your photo and shop name, and turn the voice explanation on or off. If you ever wan clear all your data, na here too. Go slow, no dey rush.",
    admin:
      "Dis na Mission Control. Na only the owner of dis app fit enter here. For dis page you go see all traders wey dey use marketOS, check complains, and manage the system. If you no be the owner, abeg go back to the other pages.",
    guide:
      "Dis na Help Guide. If you forget how sometin dey work, come here. Dis page dey explain every part of the app, from recording sales to checking your gain. No dey rush, tap every heading, learn for your own pace. Everything dey alright and you fit do am.",
  },
  igbo: {
    landing:
      "Nnọọ na marketOS. Ngwa a na-enyere gị aka ịdekọ ahịa gị n'otu mkpọ, mara ezigbo uru gị, chekwaa ngwaahịa gị, ọ na-arụ ọrụ ọbụna enweghị netwọk. Mgbe ị dịla njikere, pịa Meghee marketOS Ugbu A ka ịmalite.",
    home:
      "Nke a bụ ebe obibi ụlọ ahịa gị, ibe kacha arụ ọrụ. Ọ na-egosi ihe niile ị chọrọ taa. N'ebe a bụ igbe odo Quick Sell. Mgbe onye ahịa zụtara ihe, pịa ngwaahịa n'ime igbe odo a ka e dekọọ ahịa n'otu mkpọ. N'okpuru ya bụ ahịa gị na-adịbeghị anya, ka i wee mezie mmejọ ma ị pịa bọtịnụ na-ezighị ezi. Ahịa gị niile dị na ibe a.",
    products:
      "Nke a bụ Ngwaahịa M. Ngwaahịa pụtara ihe ndị i nwere, dị ka katọn, kereki, ma ọ bụ otu otu. N'ebe a ka ị na-agbakwunye ngwaahịa ọhụrụ mgbe ị zụrụ ha, na-ahụ otu ole fọdụrụ, ma na-edozi ọnụahịa gị. Iji tinye ihe ọhụrụ, pịa Tinye Ngwaahịa n'elu. Ị nwekwara ike chọọ, ma ọ bụ hazie ngwaahịa gị site n'aha, ọnụahịa, ma ọ bụ nke na-ebelata. Etwela ntị ihe ị nwere.",
    insights:
      "Nke a bụ Akụkọ Ahịa Gị. Kwa mgbede, ibe a na-egosi gị eziokwu banyere ụbọchị gị. Ọ na-agwa gị ego ole batara site n'ahịa, uru ole i ritere, mmefu gị, na ngwaahịa ole kacha ere ngwa. Jiri ibe a mgbe a na-emechi ụlọ ahịa, ka ị marakwa otu azụmahịa gị si aga. Ị gaghị eke ihe ọzọ.",
    settings:
      "Nke a bụ Ntọala na Profaịl. N'ebe a ka ị na-ahọrọ asụsụ ngwa gị, na-agbanwe ọkụ ma ọ bụ ọchịchịrị iji chebe anya gị, na-emelite foto na aha ụlọ ahịa gị, ma na-agbanyụ ma ọ bụ gbanyụọ nkọwa olu. Ọ bụrụ na ị chọrọ ihichapụ data gị niile, ọ dịkwa ebe a. Jiri nwayọọ, enweghị ọsọ.",
    admin:
      "Nke a bụ Mission Control. Ọ bụ naanị onye nwe ngwa a ka enyere ikike ịbata ebe a. Na ibe a, ị na-ahụ ndị ahịa niile na-eji marketOS, na-enyocha mkpesa, ma na-elekọta sistemụ. Ọ bụrụ na ị bụghị onye nwe ya, biko laghachi na ibe ndị ọzọ.",
    guide:
      "Nke a bụ Ntuziaka Enyemaka. Ọ bụrụ na ị chefuo otu ihe si arụ ọrụ, bịa ebe a. Ibe a na-akọwapụta akụkụ ọ bụla nke ngwa, site na idekọ ahịa ruo na ịlele uru gị. Jiri aka gị, pịa isiokwu ọ bụla, ma mụta n'ụzọ dabara adabara gị. Ihe niile dị mma, ị nwere ike imeli ya.",
  },
  yoruba: {
    landing:
      "Káàbọ̀ sí marketOS. Ọ̀rọ̀ yìí ń ràn ọ́ lọ́wọ́ láti kọ ọjà títà sílẹ̀ lẹ́ẹ̀kan, mọ èrè gangan rẹ, pa ọjà rẹ mọ́ dáadáa, ó sì ń ṣiṣẹ́ láìsí intanẹ́ẹ̀tì. Tí o bá ti ṣe tán, tẹ Ṣí marketOS Nísinsìnyí láti bẹ̀rẹ̀.",
    home:
      "Èyí ni ilé ọjà rẹ, ojú-ewé tí kò pẹ́. Ó ń fi gbogbo ohun tí o nílò fún òní hàn ọ́. Níhìn-ín ni àpótí awọ̀ pọ́pọ̀ Quick Sell wà. Nígbà tí oníbàárà bá ra ọjà lọ́wọ́ rẹ, tẹ ọjà náà nínú àpótí pọ́pọ̀ yìí láti kọ ọjà títà náà sílẹ̀ lẹ́ẹ̀kan ṣoṣo. Nísàlẹ̀ rẹ̀ ni ọjà títà rẹ lọ́là. Bí o bá tẹ bọ́tìnnì tí kò tọ́, o lè ṣàtúnṣe. Gbogbo ọjà rẹ wà lórí ojú-ewé yìí.",
    products:
      "Èyí ni Ọjà Mi. Ọjà túmọ̀ sí ohun tí o ní, bíi kátọ́ọ̀nù, kireeti, tàbí ẹyọ. Níhìn-ín ni o máa fi ọjà tuntun sílẹ̀ lẹ́yìn tí o bá ti ra wọ́n, wo iye tó kù, kí o sì fi owó rẹ sílẹ̀. Bí o bá fẹ́ fi ohun tuntun kún, tẹ Fi Ọjà Síwájú Sí òkè. O tún lè wá, tàbí ṣètò ọjà rẹ nípa orúkọ, owó, tàbí èyí tó ń dín kù. Má ṣe gbàgbé ohun tí o ní.",
    insights:
      "Èyí ni Ìròyìn Ọjà Rẹ. Ní alẹ́ kọ̀ọ̀kan, ojú-ewé yìí máa fi òtítọ́ ọjọ́ rẹ hàn ọ́. Yóò sọ fún ọ bí owó mélòó tó wọlé, èrè mélòó tí o pa, owó tó jáde, àti èyí tó yára tà jù. Lo ọ́ nígbà tí ọjà bá ń pa dé, kí o lè mọ́ bi ọjà rẹ ṣe ń ṣe nígbàgbogbo. Má ṣe ro lásán mọ́.",
    settings:
      "Èyí ni Àtò àti Prófáìlì. Níhìn-ín ni o yan èdè ẹ̀rọ rẹ, yí sí imọ́lẹ̀ tàbí òkùnkùn láti dáàbò ojú rẹ, ṣàtúnṣe fọ́tò àti orúkọ ọjà rẹ, kí o sì tan àlàyé ohùn tàbí pa á. Bí o bá fẹ́ pa gbogbo dati rẹ rẹ́, níhìn-ín pẹ̀lú ni. Lọ dúró-dúró, má ṣe kánjú.",
    admin:
      "Èyí ni Mission Control. Onílé ẹ̀rọ náà nìkan ni ó ní ààyè síbí. Lórí ojú-ewé yìí, o máa rí gbogbo àwọn oníṣòwò tó ń lo marketOS, wo àwọn ẹ̀dùn-ọkàn, kí o sì ṣàkóso ètò náà. Bí o kì í ṣe onílé, jọ̀wọ́ padà sí àwọn ojú-ewé yòókù.",
    guide:
      "Èyí ni Àfọwọ́kọ Ìrànlọ́wọ́. Bí o bá gbàgbé bí ohun kan ṣe ń ṣiṣẹ́, wá síbí. Ojú-ewé yìí ń ṣàlàyé gbogbo apá ẹ̀rọ náà, láti kọ ọjà títà sílẹ̀ títí dé wíwo èrè rẹ. Má ṣe kánjú, tẹ àkòrí kọ̀ọ̀kan, kí o sì kọ́ ní ààyè tí ó rọ̀rùn fún ọ. Ohun gbogbo dára, o lè ṣe é.",
  },
  hausa: {
    landing:
      "Barka da zuwa marketOS. Wannan app yana taimaka maka rubuta cinikin ka da tabawa guda, san ainihin ribarka, kiyaye kayanka, kuma yana aiki ba tare da intanet ba. Idan ka shirya, danna Bude marketOS App don farawa.",
    home:
      "Wannan shi ne gidan shagonka, shafi mafi aiki. Yana nuna duk abin da kake bukata na yau. A nan ne akwatin rawaya na Quick Sell. Idan abokin ciniki ya sayi kaya, danna kayan a cikin akwatin rawaya nan don rubuta ciniki da tabawa guda. Ƙasan sa na cinikin ka na kwanan nan, domin idan ka danna maɓallin da ba daidai ba za ka iya gyara shi. Duk shagonka yana a wannan shafin.",
    products:
      "Wannan shine Kayana. Kaya na nufin abubuwan da kake da su, kamar katan, kwano, ko ɗai-ɗai. A nan ne za ka ƙara sabbin kaya bayan ka sayi su, duba nawa ya rage, kuma sa farashin ka. Idan kana son ƙara sabon abu, danna Ƙara Kaya a sama. Har ila yau za ka iya nema, ko tsara kayanka da suna, farashi, ko raguwar kaya. Kada ka manta abin da kake da shi.",
    insights:
      "Wannan shine Rahoton Kasuwanka. Kowace yamma wannan shafi zai nuna maka gaskiyar yau. Yana gaya maka nawa kuɗi ya shigo daga ciniki, nawa riba ka samu, kuɗin da ka kashe, da kuma wane kaya ya fi saurin sayarwa. Yi amfani da shi a lokacin rufe shago, don koyaushe ka san yadda kasuwancinka ke tafiya. Babu sake ƙiyasi.",
    settings:
      "Wannan shine Saiti da Profile. A nan ne za ka zaɓi harshen app, canza zuwa haske ko duhu don kare idanunka, sabunta hotonka da sunan shago, kuma kunna ko kashe bayanin murya. Idan ka taɓa son share duk bayananka, a nan ma ne. Yi a hankali, babu gaggawa.",
    admin:
      "Wannan shine Mission Control. Mai shi na app ne kaɗai aka ba izinin shiga nan. A wannan shafin, za ka ga duk ƴan kasuwan da suke amfani da marketOS, duba koke, da gudanar da tsarin. Idan ba kai ba ne mai shi, don Allah koma sauran shafukan.",
    guide:
      "Wannan shine Jagoran Taimako. Idan ka manta yadda abu ke aiki, zo nan. Wannan shafi yana bayyana kowane bangare na app, daga rubuta ciniki har zuwa duba ribarka. Yi a hankali, danna kowane taken, kuma koyi a hankalinka. Komai yana lafiya, za ka iya.",
  },
};
