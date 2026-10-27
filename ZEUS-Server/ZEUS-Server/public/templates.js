'use strict';
// Vzorové šablony dokumentů. Pole {{...}} se při vytvoření dokumentu vyplní samy (klient, firma, naše firma, faktura…).
// Jsou to VZORY – před prvním použitím je nechte zkontrolovat právníkem a upravte si je v Nastavení → Šablony.
const DEFAULT_TEMPLATES = [
  {
    id: 'tpl_service_en', lang: 'en', type: 'contract', name: 'Service Agreement – company formation (EN)',
    subject: 'Service Agreement – {{company.name}}',
    mailText: 'Dear {{client.name}},\n\nplease find attached the Service Agreement for the formation of your {{company.jurisdiction}} {{company.entity}}. Kindly review it, sign it and send us a scanned copy.\n\nKind regards,\n{{user.name}}\n{{our.name}}',
    body: `<h1 style="text-align:center">SERVICE AGREEMENT</h1>
<p><b>Provider:</b> {{our.name}}, {{our.address}}, Reg. No. {{our.regNo}}, e-mail {{our.email}} (the "Provider")</p>
<p><b>Client:</b> {{client.name}}, {{client.address}}, nationality {{client.nationality}}, e-mail {{client.email}} (the "Client")</p>
<h2>1. Subject of the Agreement</h2>
<p>The Provider shall arrange for the Client the formation of a {{company.entity}} in {{company.jurisdiction}} under the proposed name <b>{{company.name}}</b>, including the services of a registered agent for the first year, and the related services listed in Article 2.</p>
<h2>2. Scope of Services</h2>
<ul><li>name availability check and reservation,</li><li>preparation and filing of the formation documents,</li><li>registered agent and registered office for the first year,</li><li>obtaining a tax identification number (e.g. EIN) where applicable,</li><li>delivery of the corporate documents to the Client.</li></ul>
<h2>3. Client's Obligations</h2>
<p>The Client shall provide true and complete information and the documents requested by the Provider, in particular:</p>
{{docs.required}}
<p>The Client is responsible for the lawful use of the company and for meeting its ongoing obligations (annual fees, reports, accounting, taxes).</p>
<h2>4. Fees and Payment</h2>
<p>The fee for the services is agreed in the Provider's invoice. Government fees are included unless stated otherwise. The Provider will start the work after the fee has been paid in full.</p>
<h2>5. Confidentiality and Data Protection</h2>
<p>The Provider shall keep all information about the Client confidential and process personal data only for the purpose of this Agreement and to comply with KYC/AML obligations.</p>
<h2>6. Liability</h2>
<p>The Provider is not liable for decisions of public authorities, banks or registered agents, nor for delays caused by incomplete documents from the Client.</p>
<h2>7. Final Provisions</h2>
<p>This Agreement becomes effective on the date of signature by both parties. It is executed in two copies, one for each party.</p>
<p>&nbsp;</p>
<table style="width:100%" data-pdfmake='{"layout":"noBorders"}'><tr><td>Date: {{date.today}}<br><br><br>______________________<br>{{our.signatory}}<br>for {{our.name}}</td><td>Date: ______________<br><br><br>______________________<br>{{client.name}}</td></tr></table>`,
  },
  {
    id: 'tpl_service_cs', lang: 'cs', type: 'contract', name: 'Smlouva o poskytování služeb – založení společnosti (CZ)',
    subject: 'Smlouva o poskytování služeb – {{company.name}}',
    mailText: 'Dobrý den,\n\nv příloze posílám smlouvu o poskytování služeb k založení společnosti {{company.name}} ({{company.jurisdiction}}). Prosím o kontrolu, podpis a zaslání skenu zpět.\n\nS pozdravem\n{{user.name}}\n{{our.name}}',
    body: `<h1 style="text-align:center">SMLOUVA O POSKYTOVÁNÍ SLUŽEB</h1>
<p><b>Poskytovatel:</b> {{our.name}}, se sídlem {{our.address}}, IČ {{our.regNo}}, e-mail {{our.email}} (dále jen „Poskytovatel“)</p>
<p><b>Klient:</b> {{client.name}}, bytem {{client.address}}, státní příslušnost {{client.nationality}}, e-mail {{client.email}} (dále jen „Klient“)</p>
<h2>1. Předmět smlouvy</h2>
<p>Poskytovatel zajistí pro Klienta založení společnosti typu {{company.entity}} v jurisdikci {{company.jurisdiction}} pod navrhovaným názvem <b>{{company.name}}</b>, včetně služby registrovaného agenta na první rok a souvisejících služeb dle čl. 2.</p>
<h2>2. Rozsah služeb</h2>
<ul><li>ověření a rezervace názvu,</li><li>příprava a podání zakladatelských dokumentů,</li><li>registrovaný agent a sídlo na první rok,</li><li>zajištění daňového čísla (např. EIN), je-li potřeba,</li><li>předání firemních dokumentů Klientovi.</li></ul>
<h2>3. Povinnosti Klienta</h2>
<p>Klient poskytne pravdivé a úplné údaje a dokumenty, zejména:</p>
{{docs.required}}
<p>Klient odpovídá za zákonné užívání společnosti a plnění jejích průběžných povinností (roční poplatky, hlášení, účetnictví, daně).</p>
<h2>4. Cena a platba</h2>
<p>Cena služeb je uvedena ve faktuře Poskytovatele. Poskytovatel zahájí práce po úhradě ceny v plné výši.</p>
<h2>5. Mlčenlivost a ochrana údajů</h2>
<p>Poskytovatel zachová mlčenlivost o všech informacích o Klientovi a zpracovává osobní údaje jen pro účely této smlouvy a povinností KYC/AML.</p>
<h2>6. Odpovědnost</h2>
<p>Poskytovatel neodpovídá za rozhodnutí úřadů, bank ani registrovaných agentů ani za prodlení způsobené neúplnými podklady Klienta.</p>
<h2>7. Závěrečná ustanovení</h2>
<p>Smlouva nabývá účinnosti dnem podpisu oběma stranami a je vyhotovena ve dvou stejnopisech.</p>
<p>&nbsp;</p>
<table style="width:100%" data-pdfmake='{"layout":"noBorders"}'><tr><td>V ______________ dne {{date.today}}<br><br><br>______________________<br>{{our.signatory}}<br>za {{our.name}}</td><td>V ______________ dne ___________<br><br><br>______________________<br>{{client.name}}</td></tr></table>`,
  },
  {
    id: 'tpl_invoice', lang: 'en', type: 'invoice', name: 'Faktura / Invoice',
    subject: 'Invoice {{invoice.number}} – {{our.name}}',
    mailText: 'Dear {{client.name}},\n\nplease find attached invoice No. {{invoice.number}} for {{invoice.total}}, due on {{invoice.due}}.\nPayment details are stated on the invoice – please use the invoice number as the payment reference.\n\nThank you and kind regards,\n{{user.name}}\n{{our.name}}',
    body: `<table style="width:100%" data-pdfmake='{"layout":"noBorders"}'><tr><td><h1>INVOICE / FAKTURA</h1><p>No. / Číslo: <b>{{invoice.number}}</b></p></td><td style="text-align:right"><b>{{our.name}}</b><br>{{our.address}}<br>Reg. No. / IČ: {{our.regNo}}<br>VAT / DIČ: {{our.vatNo}}<br>{{our.email}} · {{our.phone}}</td></tr></table>
<p>&nbsp;</p>
<table style="width:100%" data-pdfmake='{"layout":"noBorders"}'><tr><td><b>Bill to / Odběratel:</b><br>{{client.name}}<br>{{client.address}}<br>{{client.email}}</td><td><b>Issue date / Datum vystavení:</b> {{invoice.date}}<br><b>Due date / Splatnost:</b> {{invoice.due}}<br><b>Company / Společnost:</b> {{company.name}} ({{company.jurisdiction}})</td></tr></table>
<p>&nbsp;</p>
{{invoice.items}}
<p>&nbsp;</p>
<p><b>Payment details / Platební údaje</b><br>Bank: {{our.bank}}<br>IBAN: {{our.iban}}<br>SWIFT/BIC: {{our.swift}}<br>Reference / Variabilní symbol: <b>{{invoice.number}}</b></p>
<p><b>Total to pay / Celkem k úhradě: {{invoice.total}}</b></p>
<p style="font-size:9px">Not a VAT document unless a VAT number is stated. / Nejsme-li plátci DPH, nejedná se o daňový doklad.</p>`,
  },
  {
    id: 'tpl_docrequest_en', lang: 'en', type: 'letter', name: 'Document request – what we need from you (EN)',
    subject: 'Documents needed – {{company.name}} ({{company.jurisdiction}})',
    mailText: 'Dear {{client.name}},\n\nto proceed with your {{company.jurisdiction}} {{company.entity}} we still need the documents listed in the attached letter. Please pay attention to the apostille and certified translation requirements.\n\nKind regards,\n{{user.name}}\n{{our.name}}',
    body: `<p style="text-align:right">{{our.name}}<br>{{our.address}}<br>{{date.today}}</p>
<p><b>{{client.name}}</b><br>{{client.address}}</p>
<h2>Documents required – {{company.name}} ({{company.jurisdiction}}, {{company.entity}})</h2>
<p>Dear {{client.name}},</p>
<p>to continue with the formation of your company we kindly ask you to provide the following documents:</p>
{{docs.missing}}
<p><b>Apostille</b> = an official certificate attached to the document by the competent authority of the country that issued it (in the Czech Republic e.g. the Ministry of Foreign Affairs or a notary chamber). <b>Certified copy</b> = a copy certified by a notary or an authorised office. <b>Translation</b> = a certified translation into English.</p>
<p>Scanned copies may be sent by e-mail to {{our.email}}; originals (where requested) by courier to {{our.address}}.</p>
<p>Thank you,<br>{{user.name}}<br>{{our.name}} · {{our.phone}}</p>`,
  },
];

// fields that can be put into a template
const TPL_FIELDS = [
  ['client.name', 'f_name'], ['client.email', 'f_email'], ['client.phone', 'f_phone'], ['client.address', 'f_address'], ['client.nationality', 'f_nationality'],
  ['company.name', 'f_coName'], ['company.jurisdiction', 'f_jurisdiction'], ['company.entity', 'f_entity'], ['company.ein', 'f_ein'], ['company.formedDate', 'f_formedDate'], ['company.agent', 'f_agent'],
  ['our.name', 'our_name'], ['our.address', 'our_address'], ['our.regNo', 'our_regNo'], ['our.vatNo', 'our_vatNo'], ['our.email', 'our_email'], ['our.phone', 'our_phone'], ['our.web', 'our_web'],
  ['our.bank', 'our_bank'], ['our.iban', 'our_iban'], ['our.swift', 'our_swift'], ['our.signatory', 'our_signatory'],
  ['date.today', 'fld_today'], ['user.name', 'fld_user'],
  ['invoice.number', 'inv_number'], ['invoice.date', 'inv_date'], ['invoice.due', 'inv_due'], ['invoice.total', 'inv_total'], ['invoice.items', 'inv_items'],
  ['docs.required', 'fld_docsRequired'], ['docs.missing', 'fld_docsMissing'], ['steps.list', 'fld_steps'],
];
