'use strict';
// ---------- knihovna jurisdikcí (výchozí šablony) ----------
// Pomocníci pro opakující se kroky a dokumenty
const stepsBase = (reg, extra = []) => [
  {id:'s1', title:'Konzultace s klientem a nabídka odeslána', info:'Domluvit strukturu (vlastníci, ředitelé, beneficienti), návrh názvu, cenu a termín.'},
  {id:'s2', title:'Platba / záloha od klienta přijata', info:'Zkontrolujte v záložce Platby, že je platba označená jako „Zaplaceno“.', check:'payment'},
  {id:'s3', title:'Všechny dokumenty od klienta jsou kompletní', info:'Záložka Dokumenty – všechny povinné dokumenty musí být „Schváleno“.', check:'docs'},
  {id:'s4', title:'KYC / due diligence schválena registrovaným agentem', info:'Agent v jurisdikci musí klienta schválit dřív, než firmu založí. Kontrola sankčních seznamů a PEP.'},
  ...reg, ...extra,
  {id:'s98', title:'Bankovní / platební účet otevřen', info:'Podle potřeb klienta (banka, EMI, platební instituce).'},
  {id:'s99', title:'Vše předáno klientovi', info:'Klient dostal kompletní balík dokumentů (originály / apostilované kopie) a přístupy.'}
];
const kyc = (o = {}) => [
  {id:'d1', title:'Cestovní pas', info:'Ověřená kopie (notář), barevná a čitelná, pas platný ještě min. 6 měsíců.', required:true, certified:true, apostille:true, translation:false},
  {id:'d2', title:'Doklad o adrese bydliště', info:'Výpis z banky nebo faktura za energie / internet, ne starší 3 měsíců, se jménem a adresou klienta.', required:true, certified:true, apostille:true, translation:true},
  {id:'d3', title:'Druhý doklad totožnosti (OP nebo řidičák)', info:'Kopie obou stran.', required:false, certified:false, apostille:false, translation:false},
  {id:'d4', title:'Vyplněný a podepsaný dotazník klienta (KYC)', info:'Osobní údaje, činnost, původ peněz.', required:true, certified:false, apostille:false, translation:false},
  {id:'d7', title:'Prohlášení o původu prostředků / majetku (Source of Funds / Wealth)', info:'Odkud peníze pocházejí (podnikání, mzda, prodej majetku…), ideálně s doklady.', required:!!o.sow, certified:false, apostille:false, translation:true},
  {id:'d8', title:'Bankovní reference', info:'Dopis z banky, že je klient jejím klientem v dobrém postavení (obvykle ne starší 3 měsíců), v angličtině.', required:!!o.bankref, certified:false, apostille:false, translation:true},
  {id:'d10', title:'Profesní reference (advokát / účetní)', info:'Dopis od advokáta nebo účetního, který klienta zná min. 2 roky, v angličtině.', required:!!o.proref, certified:false, apostille:false, translation:true},
  {id:'d11', title:'Životopis (CV)', info:'Krátký profesní životopis v angličtině.', required:!!o.cv, certified:false, apostille:false, translation:false},
  ...(o.extra || [])
];
const D_NAMES = {id:'d5', title:'3 návrhy názvu', info:'Seřazené podle priority.', required:true, certified:false, apostille:false, translation:false};
const D_ACT = {id:'d6', title:'Popis podnikatelské činnosti (anglicky)', info:'Krátce: co bude firma dělat, kdo jsou zákazníci, v jakých zemích.', required:true, certified:false, apostille:false, translation:false};
const T_RA = {id:'t_ra', title:'Roční poplatek registrovanému agentovi', rule:'anniv', remind:30, info:'Prodloužení služeb registrovaného agenta a sídla (podle smlouvy s agentem).'};
const T_5472 = {id:'t3', title:'IRS Form 5472 + pro-forma 1120', rule:'yearly', month:4, day:15, remind:45, info:'Pro LLC vlastněné cizincem, za předchozí kalendářní rok. Pokuta za nepodání je vysoká – ověřte s účetním.'};

const DEFAULT_COUNTRIES = [
{
  id:'wy', name:'Wyoming (USA)', entity:'LLC', flag:'🇺🇸',
  about:'Oblíbená americká LLC – levná, jednoduchá, vysoká anonymita (vlastníci nejsou ve veřejném rejstříku).\n• Daně: LLC je „průhledná“ – pro nerezidenta bez příjmů z USA obvykle 0 % federální daň; Wyoming nemá státní daň z příjmu.\n• Minimum: 1 vlastník (member), registered agent ve Wyomingu.\n• Povinnosti: Annual Report každý rok, Form 5472 u zahraničního vlastníka, Operating Agreement.\n• Účetnictví: vést evidenci; audit se nevyžaduje.',
  steps: stepsBase([
    {id:'s5', title:'Ověřena dostupnost názvu firmy', info:'Wyoming Secretary of State – Business Entity Search (wyobiz.wyo.gov). Název musí končit „LLC“, „L.L.C.“ nebo „Limited Liability Company“.'},
    {id:'s6', title:'Registered Agent ve Wyomingu sjednán', info:'Každá firma musí mít registrovaného agenta s adresou ve Wyomingu. Platí se každý rok.'},
    {id:'s7', title:'Articles of Organization podány', info:'Online u Wyoming Secretary of State. Státní poplatek cca 100 USD + poplatek za online platbu.'},
    {id:'s8', title:'Firma schválena – Certificate / Articles uloženy', info:'Nahrajte schválené dokumenty. Zadáte datum založení – podle něj aplikace počítá roční termíny.', askDate:true},
    {id:'s9', title:'Operating Agreement připravena a podepsaná', info:'Smlouva vlastníků LLC. Nikam se nepodává, ale firma ji musí mít.'},
    {id:'s10', title:'Žádost o EIN podána (IRS, formulář SS-4)', info:'Zahraniční vlastník bez SSN: nejrychleji telefonem na IRS (po–pá 6:00–23:00 času New York = cca 12:00–5:00 u nás), EIN dostanete hned do telefonu. Nebo poslat podepsaný SS-4 faxem (cca 4 týdny) či poštou na IRS, Attn: EIN International Operation, Cincinnati, OH 45999, USA. Pozor: IRS vydá jen 1 EIN denně na jednu osobu (responsible party).'},
    {id:'s11', title:'EIN přidělen – dopis CP 575 uložen', info:'Vyplňte EIN v údajích firmy a nahrajte potvrzení z IRS.'},
    {id:'s12', title:'BOI / FinCEN – ověřena aktuální povinnost hlášení', info:'Pravidla se v letech 2024–2025 několikrát změnila. Před každým založením ověřte na fincen.gov/boi.'}
  ]),
  docs: [...kyc(), D_NAMES, D_ACT, {id:'d9', title:'Podepsaný formulář SS-4 (žádost o EIN)', info:'Připravíme my, klient jen podepíše.', required:true, certified:false, apostille:false, translation:false}],
  deadlines: [
    {id:'t1', title:'Annual Report + License Tax (Wyoming)', rule:'anniv_month_first', remind:30, info:'Splatné 1. den měsíce, ve kterém byla firma založena. Minimum 60 USD. Podává se online u Wyoming Secretary of State. Když se nezaplatí, firma bude zrušena.'},
    {...T_RA, id:'t2', title:'Prodloužení Registered Agenta'}, T_5472
  ]
},
{
  id:'de', name:'Delaware (USA)', entity:'LLC', flag:'🇺🇸',
  about:'Nejprestižnější americká jurisdikce, známá pro firemní právo a soud Court of Chancery. Dražší než Wyoming.\n• Daně: LLC je „průhledná“ – pro nerezidenta bez příjmů z USA obvykle 0 % federální daň.\n• Minimum: 1 vlastník, registered agent v Delaware.\n• Povinnosti: roční franchise tax 300 USD (vždy do 1. června), Form 5472 u zahraničního vlastníka.',
  steps: stepsBase([
    {id:'s5', title:'Ověřena dostupnost názvu firmy', info:'Delaware Division of Corporations – Entity Search.'},
    {id:'s6', title:'Registered Agent v Delaware sjednán', info:'Povinný, platí se ročně.'},
    {id:'s7', title:'Certificate of Formation podán', info:'Delaware Division of Corporations, státní poplatek cca 110 USD.'},
    {id:'s8', title:'Firma schválena – Certificate uložen', info:'Zadejte datum založení – podle něj se počítají termíny.', askDate:true},
    {id:'s9', title:'Operating Agreement připravena a podepsaná', info:'Nikam se nepodává, ale firma ji musí mít.'},
    {id:'s10', title:'Žádost o EIN podána (IRS, SS-4)', info:'Zahraniční vlastník bez SSN: telefonem na IRS (po–pá 6:00–23:00 času New York), faxem nebo poštou. IRS vydá jen 1 EIN denně na jednu osobu.'},
    {id:'s11', title:'EIN přidělen – dopis CP 575 uložen', info:'Vyplňte EIN v údajích firmy.'},
    {id:'s12', title:'BOI / FinCEN – ověřena aktuální povinnost hlášení', info:'Ověřte na fincen.gov/boi.'}
  ]),
  docs: [...kyc(), D_NAMES, D_ACT, {id:'d9', title:'Podepsaný formulář SS-4 (žádost o EIN)', info:'Připravíme my, klient jen podepíše.', required:true, certified:false, apostille:false, translation:false}],
  deadlines: [
    {id:'t1', title:'Delaware Annual Franchise Tax (LLC) – 300 USD', rule:'yearly', month:6, day:1, remind:30, info:'Každý rok do 1. června. Za pozdní platbu pokuta 200 USD + úroky.'},
    T_RA, T_5472
  ]
},
{
  id:'hk', name:'Hong Kong', entity:'Private Limited Company', flag:'🇭🇰',
  about:'Renomovaná asijská obchodní firma, dobrá pro obchod s Asií a bankovnictví.\n• Daně: teritoriální – zdaňují se jen zisky ze zdrojů v Hongkongu (8,25 % do 2 mil. HKD, pak 16,5 %). Zisky mimo HK lze nárokovat jako offshore (nutné doložit).\n• Minimum: 1 ředitel (fyzická osoba), 1 akcionář, company secretary s bydlištěm/sídlem v HK, registrované sídlo v HK.\n• Povinnosti: KAŽDÝ ROK audit účetní závěrky, daňové přiznání, Annual Return, obnova Business Registration, vedení registru skutečných majitelů (SCR).',
  steps: stepsBase([
    {id:'s5', title:'Ověřena dostupnost názvu (Companies Registry)', info:'Anglický a/nebo čínský název, končí „Limited“.'},
    {id:'s6', title:'Company secretary a registrované sídlo v HK sjednány', info:'Secretary musí být rezident HK nebo HK firma.'},
    {id:'s7', title:'Podána žádost o založení (formulář NNC1 přes e-Registry)', info:'Současně se podává registrace k Business Registration.'},
    {id:'s8', title:'Certificate of Incorporation + Business Registration Certificate uloženy', info:'Zadejte datum založení – podle něj se počítají termíny.', askDate:true},
    {id:'s9', title:'Registr skutečných majitelů (SCR) a registr členů založeny', info:'Musí být uložené v sídle firmy v HK.'},
    {id:'s10', title:'Auditor jmenován', info:'Povinný audit každý rok – domluvit auditora hned na začátku.'}
  ]),
  docs: [...kyc({bankref:true, cv:true}), D_NAMES, D_ACT,
    {id:'d12', title:'Údaje ředitelů a akcionářů (pas + adresa každého)', info:'Pro každou osobu ve struktuře stejné dokumenty jako u klienta.', required:true, certified:true, apostille:false, translation:false}],
  deadlines: [
    {id:'t1', title:'Annual Return (NAR1) – Companies Registry', rule:'anniv_offset', offset:42, remind:30, info:'Do 42 dní po výročí založení. Za pozdní podání vyšší poplatek.'},
    {id:'t2', title:'Obnova Business Registration Certificate', rule:'anniv', remind:30, info:'Každý rok k výročí (nebo 3 roky, pokud byla zvolena tříletá registrace).'},
    {id:'t4', title:'Profits Tax Return (BIR51) + auditovaná závěrka', rule:'yearly', month:5, day:2, remind:60, info:'Přiznání se obvykle vydává 1. dubna a podává do 1 měsíce; přes daňového zástupce lze prodloužit. První přiznání přichází cca 18 měsíců po založení. Ověřte s účetním.'},
    T_RA
  ]
},
{
  id:'bvi', name:'Britské Panenské ostrovy (BVI)', entity:'BVI Business Company', flag:'🇻🇬',
  about:'Klasická offshore firma, uznávaná po celém světě, často jako holdingová.\n• Daně: 0 % daň z příjmu i kapitálových zisků.\n• Minimum: 1 ředitel, 1 akcionář, registrovaný agent a sídlo na BVI.\n• Povinnosti: roční poplatek státu, skuteční majitelé v systému BOSS (neveřejné), Economic Substance report, roční finanční výkaz (Annual Return) agentovi.\n• Rejstřík ředitelů se podává registru (neveřejně).',
  steps: stepsBase([
    {id:'s5', title:'Ověřena dostupnost názvu', info:'Přes registrovaného agenta (BVI Registry – VIRRGIN). Název končí Limited / Ltd / Corp / Inc.'},
    {id:'s7', title:'Memorandum & Articles of Association podány agentem', info:'Agent registruje firmu u BVI Registry of Corporate Affairs.'},
    {id:'s8', title:'Certificate of Incorporation uložen', info:'Zadejte datum založení – podle něj se počítají termíny.', askDate:true},
    {id:'s9', title:'Jmenován první ředitel, vydány akcie, registry založeny', info:'Register of Directors, Register of Members, skuteční majitelé do BOSS.'}
  ]),
  docs: [...kyc({bankref:true, sow:true}), D_NAMES, D_ACT],
  deadlines: [
    {id:'t1', title:'BVI roční poplatek státu (Annual Fee)', rule:'by_half', month:5, day:31, month2:11, day2:30, remind:30, info:'Firmy založené leden–červen platí do 31. 5., založené červenec–prosinec do 30. 11. Při pozdní platbě penále, pak výmaz z rejstříku.'},
    {id:'t5', title:'Economic Substance report (přes agenta)', rule:'yearly', month:6, day:30, remind:30, info:'Do 6 měsíců po konci účetního roku (zde předpoklad: kalendářní rok).'},
    {id:'t6', title:'Annual Financial Return registrovanému agentovi', rule:'yearly', month:9, day:30, remind:30, info:'Do 9 měsíců po konci účetního roku (předpoklad: kalendářní rok). Rozvaha + výkaz zisku a ztráty.'},
    T_RA
  ]
},
{
  id:'sc', name:'Seychely', entity:'IBC (International Business Company)', flag:'🇸🇨',
  about:'Levná a rychlá offshore firma.\n• Daně: IBC nemá daň ze zisku ze zahraničních zdrojů (ověřte aktuální pravidla – od 2019 se zdaňují příjmy ze Seychel).\n• Minimum: 1 ředitel, 1 akcionář, registrovaný agent a sídlo na Seychelách.\n• Povinnosti: roční licenční poplatek k výročí, vedení účetnictví, roční předání účetních záznamů agentovi, registr skutečných majitelů.',
  steps: stepsBase([
    {id:'s5', title:'Ověřena dostupnost názvu', info:'Přes registrovaného agenta (Financial Services Authority).'},
    {id:'s7', title:'Memorandum & Articles podány agentem', info:'Registrace u Registrar of International Business Companies.'},
    {id:'s8', title:'Certificate of Incorporation uložen', info:'Zadejte datum založení.', askDate:true},
    {id:'s9', title:'Jmenován ředitel, vydány akcie, registr skutečných majitelů vyplněn', info:'Registr majitelů je u agenta, neveřejný.'}
  ]),
  docs: [...kyc({sow:true}), D_NAMES, D_ACT],
  deadlines: [
    {id:'t1', title:'Roční licenční poplatek (Seychely IBC)', rule:'anniv', remind:30, info:'Platí se k výročí založení přes agenta. Při prodlení penále a hrozí výmaz.'},
    {id:'t6', title:'Roční účetní záznamy / Annual Return agentovi', rule:'yearly', month:6, day:30, remind:30, info:'Do 6 měsíců po konci účetního roku (předpoklad: kalendářní rok). Ověřte u agenta.'},
    T_RA
  ]
},
{
  id:'bs', name:'Bahamy', entity:'IBC (International Business Company)', flag:'🇧🇸',
  about:'Prestižní offshore centrum blízko USA, silný bankovní sektor.\n• Daně: 0 % daň z příjmu, kapitálových zisků i dědictví.\n• Minimum: 1 ředitel, 1 akcionář, registrovaný agent a sídlo na Bahamách.\n• Povinnosti: roční vládní poplatek, registr skutečných majitelů (SRBO – neveřejný), Economic Substance a účetní záznamy podle pokynů agenta.\n• Banky vyžadují důkladné KYC (bankovní a profesní reference).',
  steps: stepsBase([
    {id:'s5', title:'Ověřena dostupnost názvu', info:'Přes registrovaného agenta u Registrar General.'},
    {id:'s7', title:'Memorandum & Articles podány agentem', info:'Registrace u Registrar General\'s Department.'},
    {id:'s8', title:'Certificate of Incorporation uložen', info:'Zadejte datum založení.', askDate:true},
    {id:'s9', title:'Ředitelé jmenováni, akcie vydány, SRBO vyplněn', info:'Skuteční majitelé do Secure Search System (neveřejné).'}
  ]),
  docs: [...kyc({bankref:true, proref:true, sow:true}), D_NAMES, D_ACT],
  deadlines: [
    {id:'t1', title:'Bahamy – roční vládní poplatek IBC', rule:'yearly', month:1, day:31, remind:45, info:'Obvykle splatný na začátku roku (do konce ledna) – ověřte přesné datum a částku u registrovaného agenta.'},
    {id:'t5', title:'Economic Substance / účetní záznamy pro agenta', rule:'yearly', month:9, day:30, remind:30, info:'Termín podle pokynů agenta – upravte si datum v Nastavení → Bahamy.'},
    T_RA
  ]
},
{
  id:'pa', name:'Panama', entity:'Sociedad Anónima (S.A.)', flag:'🇵🇦',
  about:'Tradiční offshore akciová společnost, vhodná pro holding a mezinárodní obchod.\n• Daně: teritoriální – příjmy ze zdrojů mimo Panamu nejsou zdaněny.\n• Minimum: 3 ředitelé (prezident, tajemník, pokladník – mohou to být nominovaní), 1 akcionář, rezidentní agent (panamský advokát).\n• Povinnosti: roční franchise tax 300 USD, vedení účetnictví a předávání účetních záznamů rezidentnímu agentovi.',
  steps: stepsBase([
    {id:'s5', title:'Ověřena dostupnost názvu', info:'Přes rezidentního agenta u Registro Público de Panamá.'},
    {id:'s6', title:'Ředitelé a úředníci (Directors / Officers) určeni', info:'Minimálně 3 ředitelé – prezident, tajemník, pokladník.'},
    {id:'s7', title:'Pacto Social (stanovy) podepsány a zapsány do Registro Público', info:'Zakladatelská listina se zapisuje veřejně.'},
    {id:'s8', title:'Firma zapsána – výpis z Registro Público uložen', info:'Zadejte datum zápisu – podle něj se počítá roční daň.', askDate:true},
    {id:'s9', title:'Akcie vydány, registr akcionářů založen, plná moc / Power of Attorney', info:'Akcie jsou na jméno (akcie na majitele jsou zrušené).'},
    {id:'s10', title:'Apostilace dokumentů firmy (pokud jsou potřeba v zahraničí)', info:'Panama je členem Haagské úmluvy.'}
  ]),
  docs: [...kyc({bankref:true, proref:true, sow:true}), D_NAMES, D_ACT],
  deadlines: [
    {id:'t1', title:'Panama – roční franchise tax S.A. (300 USD)', rule:'by_half', month:7, day:15, month2:1, day2:15, remind:30, info:'Firmy zapsané leden–červen platí do 15. 7., zapsané červenec–prosinec do 15. 1. Za neplacení pokuty a po čase pozastavení firmy.'},
    {id:'t7', title:'Předání účetních záznamů rezidentnímu agentovi', rule:'yearly', month:4, day:30, remind:30, info:'Povinnost dle zákona 254/2021. Přesný termín ověřte u rezidentního agenta.'},
    T_RA
  ]
},
{
  id:'paf', name:'Panama – nadace', entity:'Soukromá nadace (Private Interest Foundation)', flag:'🇵🇦',
  about:'Nadace pro ochranu a předání majetku (náhrada závěti, rodinný majetek). Nemá akcionáře – majetek patří nadaci.\n• Daně: příjmy ze zdrojů mimo Panamu nejsou zdaněny.\n• Struktura: zakladatel (Founder), nadační rada (min. 3 fyzické osoby nebo 1 právnická osoba), protektor (nepovinný), beneficienti (v neveřejném Statutu / Regulations).\n• Povinnosti: roční poplatek 400 USD, účetní záznamy u rezidentního agenta.',
  steps: stepsBase([
    {id:'s5', title:'Ověřena dostupnost názvu nadace', info:'Přes rezidentního agenta.'},
    {id:'s6', title:'Nadační rada, protektor a beneficienti určeni', info:'Beneficienti se uvádějí v neveřejném Statutu (Regulations).'},
    {id:'s7', title:'Zakládací listina (Foundation Charter) podepsána a zapsána', info:'Charter se zapisuje do Registro Público.'},
    {id:'s8', title:'Nadace zapsána – výpis z Registro Público uložen', info:'Zadejte datum zápisu.', askDate:true},
    {id:'s9', title:'Statut / Regulations podepsán (neveřejný)', info:'Určuje beneficienty a pravidla rozdělení majetku.'},
    {id:'s10', title:'Majetek převeden do nadace', info:'Počáteční jmění (min. 10 000 USD nebo ekvivalent) a další aktiva.'}
  ]),
  docs: [...kyc({bankref:true, proref:true, sow:true}),
    {id:'d5', title:'3 návrhy názvu nadace', info:'Seřazené podle priority.', required:true, certified:false, apostille:false, translation:false},
    {id:'d13', title:'Seznam beneficientů (jména, data narození, podíly)', info:'Pro neveřejný Statut.', required:true, certified:false, apostille:false, translation:false},
    {id:'d14', title:'Přehled majetku, který se vloží do nadace', info:'Účty, nemovitosti, podíly ve firmách…', required:false, certified:false, apostille:false, translation:false}],
  deadlines: [
    {id:'t1', title:'Panama – roční poplatek nadace (400 USD)', rule:'by_half', month:7, day:15, month2:1, day2:15, remind:30, info:'Nadace zapsané leden–červen platí do 15. 7., zapsané červenec–prosinec do 15. 1.'},
    {id:'t7', title:'Předání účetních záznamů rezidentnímu agentovi', rule:'yearly', month:4, day:30, remind:30, info:'Přesný termín ověřte u rezidentního agenta.'},
    T_RA
  ]
},
{
  id:'ck', name:'Cookovy ostrovy – trust', entity:'International Trust (svěřenský fond)', flag:'🇨🇰',
  about:'Jedna z nejsilnějších ochran majetku na světě (asset protection).\n• Princip: klient (Settlor) převede majetek na licencovaného trustee na Cookových ostrovech, který ho spravuje pro beneficienty. Často se kombinuje s LLC, která drží účty.\n• Ochrana: cizí rozsudky se neuznávají, věřitel musí žalovat na Cookových ostrovech, krátké promlčecí lhůty a vysoké důkazní břemeno.\n• Struktura: Settlor, Trustee (licencovaná trustee společnost), Protektor (doporučen), beneficienti, Letter of Wishes.\n• Povinnosti: roční registrační poplatek a poplatky trustee.\n• Trust se musí založit DŘÍV, než má klient problém s věřiteli.',
  steps: stepsBase([
    {id:'s5', title:'Trustee společnost vybrána a přijala klienta', info:'Licencovaná trustee společnost na Cookových ostrovech.'},
    {id:'s6', title:'Struktura navržena (protektor, beneficienti, případně LLC pod trustem)', info:''},
    {id:'s7', title:'Trust Deed (svěřenská listina) připravena a podepsána', info:'Podepisuje Settlor a Trustee.'},
    {id:'s8', title:'Trust zaregistrován (Financial Supervisory Commission)', info:'Zadejte datum registrace – podle něj se počítají roční poplatky.', askDate:true},
    {id:'s9', title:'Letter of Wishes podepsán', info:'Neformální přání Settlora pro trustee (kdo, kdy, co dostane).'},
    {id:'s10', title:'Majetek převeden do trustu', info:'Převody účtů, podílů, nemovitostí – vše doložit.'}
  ]),
  docs: [...kyc({bankref:true, proref:true, sow:true, cv:true}),
    {id:'d13', title:'Seznam beneficientů (jména, data narození, vztah)', info:'Pro Trust Deed a Letter of Wishes.', required:true, certified:false, apostille:false, translation:false},
    {id:'d14', title:'Přehled majetku, který se vloží do trustu', info:'Účty, nemovitosti, podíly ve firmách…', required:true, certified:false, apostille:false, translation:false},
    {id:'d15', title:'Čestné prohlášení o solventnosti (Affidavit of Solvency)', info:'Klient prohlašuje, že převodem majetku neobchází věřitele. Ověřený podpis.', required:true, certified:true, apostille:true, translation:false},
    {id:'d16', title:'Pasy a adresy protektora a dospělých beneficientů', info:'Trustee je obvykle vyžaduje také.', required:false, certified:true, apostille:true, translation:true}],
  deadlines: [
    {id:'t1', title:'Roční registrační poplatek trustu (Cookovy ostrovy)', rule:'anniv', remind:45, info:'Hradí se přes trustee k výročí registrace.'},
    {id:'t2', title:'Roční poplatek trustee společnosti', rule:'anniv', remind:45, info:'Podle smlouvy s trustee.'},
    {id:'t8', title:'Roční revize trustu s klientem', rule:'anniv_offset', offset:30, remind:14, info:'Zkontrolovat beneficienty, Letter of Wishes, majetek v trustu.'}
  ]
}
];
// ---------- English texts for the template library (used for EN and ES while a template is unedited) ----------
const GEN_EN = {
  steps: {
    s1: ['Consultation with the client, offer sent', 'Agree the structure (owners, directors, beneficiaries), proposed name, price and timeline.'],
    s2: ['Payment / deposit received from the client', 'Check in the Payments tab that the payment is marked “Paid”.'],
    s3: ['All client documents are complete', 'Documents tab – every required document must be “Approved”.'],
    s4: ['KYC / due diligence approved by the registered agent', 'The agent in the jurisdiction must approve the client before forming the entity. Sanctions and PEP screening.'],
    s98: ['Bank / payment account opened', 'Depending on the client’s needs (bank, EMI, payment institution).'],
    s99: ['Everything handed over to the client', 'The client received the full document pack (originals / apostilled copies) and logins.']
  },
  docs: {
    d1: ['Passport', 'Certified copy (notary), in colour and legible, valid for at least 6 more months.'],
    d2: ['Proof of residential address', 'Bank statement or utility / internet bill, not older than 3 months, showing the client’s name and address.'],
    d3: ['Second ID (national ID card or driving licence)', 'Copy of both sides.'],
    d4: ['Completed and signed client questionnaire (KYC)', 'Personal details, business activity, source of funds.'],
    d5: ['3 proposed names', 'In order of preference.'],
    d6: ['Description of business activity (in English)', 'Briefly: what the company will do, who the customers are, in which countries.'],
    d7: ['Source of Funds / Source of Wealth declaration', 'Where the money comes from (business, salary, sale of assets…), ideally with evidence.'],
    d8: ['Bank reference letter', 'Letter from the bank confirming the client is in good standing (usually not older than 3 months), in English.'],
    d10: ['Professional reference (lawyer / accountant)', 'Letter from a lawyer or accountant who has known the client for at least 2 years, in English.'],
    d11: ['CV', 'Short professional CV in English.']
  },
  deadlines: {
    t_ra: ['Annual registered agent fee', 'Renewal of registered agent and registered office services (per the agent agreement).'],
    t3: ['IRS Form 5472 + pro-forma 1120', 'For foreign-owned LLCs, for the previous calendar year. Penalties for not filing are high – check with the accountant.']
  }
};
const LIB_EN = {
  wy: {name: 'Wyoming (USA)', entity: 'LLC',
    about: 'Popular US LLC – cheap, simple, high privacy (owners are not in the public register).\n• Tax: the LLC is “pass-through” – for a non-resident with no US-source income usually 0 % federal tax; Wyoming has no state income tax.\n• Minimum: 1 owner (member), a registered agent in Wyoming.\n• Obligations: Annual Report every year, Form 5472 for a foreign owner, Operating Agreement.\n• Accounting: keep records; no audit required.',
    steps: {s5: ['Company name availability checked', 'Wyoming Secretary of State – Business Entity Search (wyobiz.wyo.gov). The name must end with “LLC”, “L.L.C.” or “Limited Liability Company”.'],
      s6: ['Wyoming registered agent arranged', 'Every company must have a registered agent with a Wyoming address. Paid every year.'],
      s7: ['Articles of Organization filed', 'Online with the Wyoming Secretary of State. State fee approx. USD 100 + online payment fee.'],
      s8: ['Company approved – Certificate / Articles saved', 'Upload the approved documents. You will enter the formation date – the app calculates annual deadlines from it.'],
      s9: ['Operating Agreement prepared and signed', 'Agreement between the LLC owners. It is not filed anywhere, but the company must have one.'],
      s10: ['EIN application filed (IRS, Form SS-4)', 'Foreign owner without an SSN: fastest by phone to the IRS (Mon–Fri 6 am–11 pm New York time) – you get the EIN during the call. Or send the signed SS-4 by fax (approx. 4 weeks) or mail to IRS, Attn: EIN International Operation, Cincinnati, OH 45999, USA. Note: the IRS issues only 1 EIN per day per responsible party.'],
      s11: ['EIN assigned – CP 575 letter saved', 'Enter the EIN in the company details and upload the IRS confirmation.'],
      s12: ['BOI / FinCEN – current reporting obligation checked', 'The rules changed several times in 2024–2025. Check fincen.gov/boi before every formation.']},
    docs: {d9: ['Signed Form SS-4 (EIN application)', 'We prepare it, the client only signs.']},
    deadlines: {t1: ['Annual Report + License Tax (Wyoming)', 'Due on the 1st day of the month in which the company was formed. Minimum USD 60. Filed online with the Wyoming Secretary of State. If unpaid, the company will be dissolved.'],
      t2: ['Registered agent renewal', 'Renewal of registered agent and registered office services (per the agent agreement).']}},
  de: {name: 'Delaware (USA)', entity: 'LLC',
    about: 'The most prestigious US jurisdiction, known for its corporate law and the Court of Chancery. More expensive than Wyoming.\n• Tax: the LLC is “pass-through” – for a non-resident with no US-source income usually 0 % federal tax.\n• Minimum: 1 owner, a registered agent in Delaware.\n• Obligations: annual franchise tax USD 300 (always by 1 June), Form 5472 for a foreign owner.',
    steps: {s5: ['Company name availability checked', 'Delaware Division of Corporations – Entity Search.'],
      s6: ['Delaware registered agent arranged', 'Mandatory, paid annually.'],
      s7: ['Certificate of Formation filed', 'Delaware Division of Corporations, state fee approx. USD 110.'],
      s8: ['Company approved – Certificate saved', 'Enter the formation date – deadlines are calculated from it.'],
      s9: ['Operating Agreement prepared and signed', 'Not filed anywhere, but the company must have one.'],
      s10: ['EIN application filed (IRS, SS-4)', 'Foreign owner without an SSN: by phone to the IRS (Mon–Fri 6 am–11 pm New York time), fax or mail. The IRS issues only 1 EIN per day per person.'],
      s11: ['EIN assigned – CP 575 letter saved', 'Enter the EIN in the company details.'],
      s12: ['BOI / FinCEN – current reporting obligation checked', 'Check at fincen.gov/boi.']},
    docs: {d9: ['Signed Form SS-4 (EIN application)', 'We prepare it, the client only signs.']},
    deadlines: {t1: ['Delaware Annual Franchise Tax (LLC) – USD 300', 'Every year by 1 June. Late payment penalty USD 200 + interest.']}},
  hk: {name: 'Hong Kong', entity: 'Private Limited Company',
    about: 'Reputable Asian trading company, good for trade with Asia and banking.\n• Tax: territorial – only Hong Kong-sourced profits are taxed (8.25 % up to HKD 2m, then 16.5 %). Profits from outside HK can be claimed as offshore (must be documented).\n• Minimum: 1 director (individual), 1 shareholder, a company secretary resident/based in HK, a registered office in HK.\n• Obligations: EVERY YEAR an audit of the financial statements, tax return, Annual Return, Business Registration renewal, keeping a Significant Controllers Register (SCR).',
    steps: {s5: ['Name availability checked (Companies Registry)', 'English and/or Chinese name, ending with “Limited”.'],
      s6: ['Company secretary and HK registered office arranged', 'The secretary must be an HK resident or an HK company.'],
      s7: ['Incorporation filed (form NNC1 via e-Registry)', 'Business Registration is applied for at the same time.'],
      s8: ['Certificate of Incorporation + Business Registration Certificate saved', 'Enter the formation date – deadlines are calculated from it.'],
      s9: ['Significant Controllers Register (SCR) and register of members set up', 'Must be kept at the company’s office in HK.'],
      s10: ['Auditor appointed', 'Audit is mandatory every year – arrange an auditor right at the start.']},
    docs: {d12: ['Details of directors and shareholders (passport + address of each)', 'For every person in the structure, the same documents as for the client.']},
    deadlines: {t1: ['Annual Return (NAR1) – Companies Registry', 'Within 42 days after the incorporation anniversary. Higher fee if filed late.'],
      t2: ['Business Registration Certificate renewal', 'Every year on the anniversary (or every 3 years if the 3-year registration was chosen).'],
      t4: ['Profits Tax Return (BIR51) + audited accounts', 'The return is usually issued on 1 April and due within 1 month; extensions possible via a tax representative. The first return comes about 18 months after incorporation. Check with the accountant.']}},
  bvi: {name: 'British Virgin Islands (BVI)', entity: 'BVI Business Company',
    about: 'Classic offshore company, recognised worldwide, often used as a holding company.\n• Tax: 0 % income and capital gains tax.\n• Minimum: 1 director, 1 shareholder, a registered agent and office in the BVI.\n• Obligations: annual government fee, beneficial owners in the BOSS system (not public), Economic Substance report, annual financial return to the agent.\n• The register of directors is filed with the registry (not public).',
    steps: {s5: ['Name availability checked', 'Via the registered agent (BVI Registry – VIRRGIN). Name ends with Limited / Ltd / Corp / Inc.'],
      s7: ['Memorandum & Articles of Association filed by the agent', 'The agent registers the company with the BVI Registry of Corporate Affairs.'],
      s8: ['Certificate of Incorporation saved', 'Enter the formation date – deadlines are calculated from it.'],
      s9: ['First director appointed, shares issued, registers set up', 'Register of Directors, Register of Members, beneficial owners in BOSS.']},
    deadlines: {t1: ['BVI annual government fee', 'Companies incorporated January–June pay by 31 May, July–December by 30 November. Late payment penalties, then strike-off.'],
      t5: ['Economic Substance report (via the agent)', 'Within 6 months after the financial year end (assumed: calendar year).'],
      t6: ['Annual Financial Return to the registered agent', 'Within 9 months after the financial year end (assumed: calendar year). Balance sheet + profit and loss.']}},
  sc: {name: 'Seychelles', entity: 'IBC (International Business Company)',
    about: 'Cheap and fast offshore company.\n• Tax: no tax on foreign-source profits for the IBC (check current rules – Seychelles-source income has been taxed since 2019).\n• Minimum: 1 director, 1 shareholder, a registered agent and office in the Seychelles.\n• Obligations: annual licence fee on the anniversary, keeping accounting records, annual submission of accounting records to the agent, register of beneficial owners.',
    steps: {s5: ['Name availability checked', 'Via the registered agent (Financial Services Authority).'],
      s7: ['Memorandum & Articles filed by the agent', 'Registration with the Registrar of International Business Companies.'],
      s8: ['Certificate of Incorporation saved', 'Enter the formation date.'],
      s9: ['Director appointed, shares issued, register of beneficial owners completed', 'The register of owners is held by the agent, not public.']},
    deadlines: {t1: ['Annual licence fee (Seychelles IBC)', 'Paid via the agent on the incorporation anniversary. Late payment penalties and risk of strike-off.'],
      t6: ['Annual accounting records / Annual Return to the agent', 'Within 6 months after the financial year end (assumed: calendar year). Check with the agent.']}},
  bs: {name: 'Bahamas', entity: 'IBC (International Business Company)',
    about: 'Prestigious offshore centre close to the USA, strong banking sector.\n• Tax: 0 % income, capital gains and inheritance tax.\n• Minimum: 1 director, 1 shareholder, a registered agent and office in the Bahamas.\n• Obligations: annual government fee, register of beneficial ownership (SRBO – not public), Economic Substance and accounting records as instructed by the agent.\n• Banks require thorough KYC (bank and professional references).',
    steps: {s5: ['Name availability checked', 'Via the registered agent with the Registrar General.'],
      s7: ['Memorandum & Articles filed by the agent', 'Registration with the Registrar General’s Department.'],
      s8: ['Certificate of Incorporation saved', 'Enter the formation date.'],
      s9: ['Directors appointed, shares issued, SRBO completed', 'Beneficial owners in the Secure Search System (not public).']},
    deadlines: {t1: ['Bahamas – annual IBC government fee', 'Usually due at the start of the year (by the end of January) – check the exact date and amount with the registered agent.'],
      t5: ['Economic Substance / accounting records for the agent', 'Date per the agent’s instructions – adjust it in Settings → Bahamas.']}},
  pa: {name: 'Panama', entity: 'Sociedad Anónima (S.A.)',
    about: 'Traditional offshore corporation, suitable for holding and international trade.\n• Tax: territorial – income from sources outside Panama is not taxed.\n• Minimum: 3 directors (president, secretary, treasurer – can be nominees), 1 shareholder, a resident agent (Panamanian lawyer).\n• Obligations: annual franchise tax USD 300, keeping accounts and submitting accounting records to the resident agent.',
    steps: {s5: ['Name availability checked', 'Via the resident agent at the Registro Público de Panamá.'],
      s6: ['Directors and officers determined', 'At least 3 directors – president, secretary, treasurer.'],
      s7: ['Pacto Social (articles) signed and registered in the Registro Público', 'The articles of incorporation are registered publicly.'],
      s8: ['Company registered – Registro Público extract saved', 'Enter the registration date – the annual tax is calculated from it.'],
      s9: ['Shares issued, share register set up, Power of Attorney', 'Shares are registered (bearer shares are abolished).'],
      s10: ['Apostille of company documents (if needed abroad)', 'Panama is a member of the Hague Convention.']},
    deadlines: {t1: ['Panama – annual franchise tax S.A. (USD 300)', 'Companies registered January–June pay by 15 July, July–December by 15 January. Non-payment leads to penalties and eventually suspension.'],
      t7: ['Accounting records handed to the resident agent', 'Obligation under Law 254/2021. Check the exact date with the resident agent.']}},
  paf: {name: 'Panama – foundation', entity: 'Private Interest Foundation',
    about: 'Foundation for asset protection and succession (a substitute for a will, family wealth). It has no shareholders – the assets belong to the foundation.\n• Tax: income from sources outside Panama is not taxed.\n• Structure: founder, foundation council (min. 3 individuals or 1 legal entity), protector (optional), beneficiaries (in the private Regulations).\n• Obligations: annual fee USD 400, accounting records with the resident agent.',
    steps: {s5: ['Foundation name availability checked', 'Via the resident agent.'],
      s6: ['Foundation council, protector and beneficiaries determined', 'Beneficiaries are named in the private Regulations.'],
      s7: ['Foundation Charter signed and registered', 'The Charter is registered in the Registro Público.'],
      s8: ['Foundation registered – Registro Público extract saved', 'Enter the registration date.'],
      s9: ['Regulations signed (private)', 'Defines the beneficiaries and the rules for distributing assets.'],
      s10: ['Assets transferred to the foundation', 'Initial endowment (min. USD 10,000 or equivalent) and other assets.']},
    docs: {d5: ['3 proposed foundation names', 'In order of preference.'],
      d13: ['List of beneficiaries (names, dates of birth, shares)', 'For the private Regulations.'],
      d14: ['Overview of assets to be placed in the foundation', 'Accounts, real estate, company shares…']},
    deadlines: {t1: ['Panama – annual foundation fee (USD 400)', 'Foundations registered January–June pay by 15 July, July–December by 15 January.'],
      t7: ['Accounting records handed to the resident agent', 'Check the exact date with the resident agent.']}},
  ck: {name: 'Cook Islands – trust', entity: 'International Trust',
    about: 'One of the strongest asset protection structures in the world.\n• Principle: the client (Settlor) transfers assets to a licensed trustee in the Cook Islands, who manages them for the beneficiaries. Often combined with an LLC that holds the accounts.\n• Protection: foreign judgments are not recognised, a creditor must sue in the Cook Islands, short limitation periods and a high burden of proof.\n• Structure: Settlor, Trustee (licensed trustee company), Protector (recommended), beneficiaries, Letter of Wishes.\n• Obligations: annual registration fee and trustee fees.\n• The trust must be set up BEFORE the client has problems with creditors.',
    steps: {s5: ['Trustee company selected and accepted the client', 'Licensed trustee company in the Cook Islands.'],
      s6: ['Structure designed (protector, beneficiaries, optionally an LLC under the trust)', ''],
      s7: ['Trust Deed prepared and signed', 'Signed by the Settlor and the Trustee.'],
      s8: ['Trust registered (Financial Supervisory Commission)', 'Enter the registration date – annual fees are calculated from it.'],
      s9: ['Letter of Wishes signed', 'The Settlor’s informal wishes for the trustee (who gets what and when).'],
      s10: ['Assets transferred to the trust', 'Transfers of accounts, shares, real estate – document everything.']},
    docs: {d13: ['List of beneficiaries (names, dates of birth, relationship)', 'For the Trust Deed and Letter of Wishes.'],
      d14: ['Overview of assets to be placed in the trust', 'Accounts, real estate, company shares…'],
      d15: ['Affidavit of Solvency', 'The client declares that the transfer of assets does not defraud creditors. Certified signature.'],
      d16: ['Passports and addresses of the protector and adult beneficiaries', 'The trustee usually requires these too.']},
    deadlines: {t1: ['Annual trust registration fee (Cook Islands)', 'Paid via the trustee on the registration anniversary.'],
      t2: ['Annual trustee company fee', 'Per the agreement with the trustee.'],
      t8: ['Annual trust review with the client', 'Check beneficiaries, Letter of Wishes, assets in the trust.']}}
};

// ---------- "how to do it": official websites, phone numbers and who from the address book helps ----------
const IRS_EIN = {link: 'https://www.irs.gov/businesses/small-businesses-self-employed/how-to-apply-for-an-ein', phone: '+1 267 941 1099'};
const EXTRAS = {
  _: {steps: {s4: {role: 'agent'}, s98: {role: 'bank'}}, deadlines: {t_ra: {role: 'agent'}, t3: {role: 'accountant', link: 'https://www.irs.gov/forms-pubs/about-form-5472'}}},
  wy: {steps: {s5: {link: 'https://wyobiz.wyo.gov/Business/FilingSearch.aspx'}, s6: {role: 'agent'}, s7: {link: 'https://wyobiz.wyo.gov', phone: '+1 307 777 7311'}, s9: {role: 'lawyer'},
    s10: IRS_EIN, s12: {link: 'https://www.fincen.gov/boi'}}, deadlines: {t1: {link: 'https://wyobiz.wyo.gov', phone: '+1 307 777 7311'}, t2: {role: 'agent'}}},
  de: {steps: {s5: {link: 'https://icis.corp.delaware.gov/ecorp/entitysearch/namesearch.aspx'}, s6: {role: 'agent'}, s7: {link: 'https://corp.delaware.gov', phone: '+1 302 739 3073'}, s9: {role: 'lawyer'},
    s10: IRS_EIN, s12: {link: 'https://www.fincen.gov/boi'}}, deadlines: {t1: {link: 'https://corp.delaware.gov/paytaxes/'}}},
  hk: {steps: {s5: {link: 'https://www.e-services.cr.gov.hk'}, s6: {role: 'agent'}, s7: {link: 'https://www.eregistry.gov.hk', phone: '+852 2234 9933'}, s10: {role: 'accountant'}},
    deadlines: {t1: {link: 'https://www.eregistry.gov.hk', role: 'agent'}, t2: {link: 'https://www.ird.gov.hk'}, t4: {role: 'accountant'}}},
  bvi: {steps: {s5: {role: 'agent', link: 'https://www.bvifsc.vg'}, s7: {role: 'agent'}, s9: {role: 'agent'}}, deadlines: {t1: {role: 'agent'}, t5: {role: 'agent'}, t6: {role: 'accountant'}}},
  sc: {steps: {s5: {role: 'agent', link: 'https://www.fsaseychelles.sc'}, s7: {role: 'agent'}, s9: {role: 'agent'}}, deadlines: {t1: {role: 'agent'}, t6: {role: 'accountant'}}},
  bs: {steps: {s5: {role: 'agent'}, s7: {role: 'agent'}, s9: {role: 'agent'}}, deadlines: {t1: {role: 'agent'}, t5: {role: 'accountant'}}},
  pa: {steps: {s5: {role: 'agent', link: 'https://www.rp.gob.pa'}, s6: {role: 'agent'}, s7: {role: 'agent'}, s9: {role: 'agent'}, s10: {role: 'notary'}}, deadlines: {t1: {role: 'agent'}, t7: {role: 'accountant'}}},
  paf: {steps: {s5: {role: 'agent', link: 'https://www.rp.gob.pa'}, s6: {role: 'lawyer'}, s7: {role: 'agent'}, s9: {role: 'lawyer'}, s10: {role: 'bank'}}, deadlines: {t1: {role: 'agent'}, t7: {role: 'accountant'}}},
  ck: {steps: {s5: {role: 'agent', link: 'https://www.fsc.gov.ck'}, s6: {role: 'lawyer'}, s7: {role: 'agent'}, s8: {role: 'agent'}, s9: {role: 'lawyer'}, s10: {role: 'bank'}}, deadlines: {t1: {role: 'agent'}, t2: {role: 'agent'}}}
};
for (const c of DEFAULT_COUNTRIES) for (const kind of ['steps', 'deadlines']) for (const it of c[kind]) {
  Object.assign(it, (EXTRAS._[kind] || {})[it.id] || {}, ((EXTRAS[c.id] || {})[kind] || {})[it.id] || {});
}
