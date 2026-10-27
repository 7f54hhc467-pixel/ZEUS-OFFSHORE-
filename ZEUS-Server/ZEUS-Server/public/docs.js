'use strict';
/* =========================================================
   ZEUS Offshore – šablony (smlouvy, faktury, dopisy) a e-mail (Gmail)
   Používá funkce a stav z app.js (state, put, modal, t, …).
   ========================================================= */

Object.assign(STR, {
  nav_mail: ['Pošta', 'Mail', 'Correo'],
  newDoc: ['Vytvořit dokument', 'Create document', 'Crear documento'],
  templates: ['Šablony smluv a faktur', 'Contract & invoice templates', 'Plantillas de contratos y facturas'],
  templatesSub: ['Smlouvy, faktury a dopisy. Pole v {{závorkách}} se vyplní samy podle klienta a firmy. Text můžeš zkopírovat i z Wordu.', 'Contracts, invoices and letters. Fields in {{brackets}} are filled in automatically from the client and company. You can paste text from Word.', 'Contratos, facturas y cartas. Los campos entre {{llaves}} se rellenan solos. Puedes pegar texto desde Word.'],
  newTemplate: ['Nová šablona', 'New template', 'Nueva plantilla'],
  tplType_contract: ['Smlouva', 'Contract', 'Contrato'], tplType_invoice: ['Faktura', 'Invoice', 'Factura'], tplType_letter: ['Dopis', 'Letter', 'Carta'], tplType_other: ['Jiné', 'Other', 'Otro'],
  tplLang: ['Jazyk dokumentu', 'Document language', 'Idioma del documento'], tplLangHint: ['V tomhle jazyce se doplní seznam dokumentů a kroků.', 'Lists of documents and steps are filled in this language.', 'Las listas de documentos y pasos se rellenan en este idioma.'],
  tplName: ['Název šablony', 'Template name', 'Nombre de la plantilla'], tplType: ['Druh', 'Type', 'Tipo'],
  tplBody: ['Text dokumentu', 'Document text', 'Texto del documento'],
  tplBodyHint: ['Piš rovnou sem nebo sem vlož text z Wordu. Pole vložíš tlačítkem „Vložit pole“.', 'Type here or paste from Word. Insert fields with the “Insert field” button.', 'Escribe aquí o pega desde Word. Inserta campos con «Insertar campo».'],
  insertField: ['Vložit pole…', 'Insert field…', 'Insertar campo…'],
  tplSubject: ['Předmět e-mailu', 'E-mail subject', 'Asunto del correo'], tplMailText: ['Text e-mailu', 'E-mail text', 'Texto del correo'],
  tplForJur: ['Jen pro jurisdikce', 'Only for jurisdictions', 'Solo para jurisdicciones'], tplForJurHint: ['Nic nezaškrtnuto = pro všechny.', 'Nothing ticked = all.', 'Nada marcado = todas.'],
  tplSample: ['Vzor – nech zkontrolovat právníkem a uprav podle sebe.', 'Sample – have it checked by a lawyer and adjust it.', 'Modelo – revísalo con un abogado y adáptalo.'],
  duplicate: ['Kopie', 'Duplicate', 'Duplicar'], copySuffix: ['(kopie)', '(copy)', '(copia)'],
  chooseTemplate: ['Šablona', 'Template', 'Plantilla'], forCompany: ['Pro firmu', 'For company', 'Para la sociedad'],
  invItems: ['Položky faktury', 'Invoice items', 'Conceptos'], invItemsHint: ['Každá položka na nový řádek: popis | částka. Předvyplněno z nezaplacených plateb.', 'One item per line: description | amount. Prefilled from unpaid payments.', 'Un concepto por línea: descripción | importe.'],
  inv_number: ['Číslo faktury', 'Invoice number', 'Número de factura'], inv_date: ['Datum vystavení', 'Issue date', 'Fecha de emisión'], inv_due: ['Splatnost', 'Due date', 'Vencimiento'],
  inv_total: ['Celkem k úhradě', 'Total', 'Total'], inv_items: ['Tabulka položek', 'Items table', 'Tabla de conceptos'],
  invAddPayment: ['Přidat fakturu do plateb (nezaplaceno)', 'Add the invoice to payments (unpaid)', 'Añadir la factura a los pagos (pendiente)'],
  invDesc: ['Popis', 'Description', 'Descripción'], invAmount: ['Částka', 'Amount', 'Importe'],
  fld_today: ['Dnešní datum', 'Today’s date', 'Fecha de hoy'], fld_user: ['Moje jméno', 'My name', 'Mi nombre'],
  fld_docsRequired: ['Seznam potřebných dokumentů', 'List of required documents', 'Lista de documentos necesarios'], fld_docsMissing: ['Seznam chybějících dokumentů', 'List of missing documents', 'Lista de documentos que faltan'],
  fld_steps: ['Postup krok za krokem', 'Step-by-step list', 'Lista de pasos'],
  ourCompany: ['Naše firma (do smluv a faktur)', 'Our company (for contracts and invoices)', 'Nuestra empresa (para contratos y facturas)'],
  ourCompanySub: ['Vyplň jednou – automaticky se doplní do všech smluv a faktur.', 'Fill in once – used in all contracts and invoices.', 'Rellénalo una vez – se usa en todos los contratos y facturas.'],
  our_name: ['Naše firma – název', 'Our company – name', 'Nuestra empresa – nombre'], our_address: ['Naše adresa', 'Our address', 'Nuestra dirección'],
  our_regNo: ['IČ / Reg. No.', 'Reg. No.', 'N.º de registro'], our_vatNo: ['DIČ / VAT', 'VAT No.', 'NIF/IVA'], our_email: ['Náš e-mail', 'Our e-mail', 'Nuestro correo'],
  our_phone: ['Náš telefon', 'Our phone', 'Nuestro teléfono'], our_web: ['Náš web', 'Our website', 'Nuestra web'], our_bank: ['Banka', 'Bank', 'Banco'],
  our_iban: ['IBAN / číslo účtu', 'IBAN / account', 'IBAN / cuenta'], our_swift: ['SWIFT / BIC', 'SWIFT / BIC', 'SWIFT / BIC'], our_signatory: ['Kdo podepisuje', 'Signatory', 'Firmante'],
  preview: ['Náhled – můžeš v něm ještě cokoliv přepsat', 'Preview – you can still edit anything', 'Vista previa – aún puedes editar'],
  fileName: ['Název souboru', 'File name', 'Nombre del archivo'],
  saveToDocs: ['Uložit PDF do dokumentů', 'Save PDF to documents', 'Guardar PDF en documentos'],
  downloadPdf: ['Stáhnout PDF', 'Download PDF', 'Descargar PDF'], downloadWord: ['Stáhnout Word', 'Download Word', 'Descargar Word'], printDoc: ['Tisk', 'Print', 'Imprimir'],
  saveAndMail: ['Uložit a poslat e-mailem', 'Save and e-mail', 'Guardar y enviar'],
  docSaved: ['Dokument uložen do dokumentů klienta', 'Document saved to the client’s documents', 'Documento guardado'],
  makingPdf: ['Vytvářím PDF…', 'Creating PDF…', 'Creando PDF…'],
  noTemplates: ['Zatím žádné šablony.', 'No templates yet.', 'Aún no hay plantillas.'],
  ev_doc: ['{who} vytvořil(a) dokument: {name}', '{who} created a document: {name}', '{who} creó un documento: {name}'],
  ev_mail_in: ['✉️ Nový e-mail od klienta – {name}', '✉️ New e-mail from a client – {name}', '✉️ Nuevo correo de un cliente – {name}'],
  ev_mail_out: ['{who} poslal(a) e-mail: {name}', '{who} sent an e-mail: {name}', '{who} envió un correo: {name}'],
  ev_tplsave: ['{who} upravil(a) šablonu: {name}', '{who} edited the template: {name}', '{who} editó la plantilla: {name}'],
  kind_template: ['Šablona', 'Template', 'Plantilla'],
  // mail
  emails: ['E-maily', 'E-mails', 'Correos'], writeMail: ['Napsat e-mail', 'Write e-mail', 'Escribir correo'], reply: ['Odpovědět', 'Reply', 'Responder'],
  toNote: ['Do poznámky', 'To notes', 'A notas'], addedToNote: ['Přidáno do poznámky klienta', 'Added to the client’s notes', 'Añadido a las notas'],
  attSave: ['Do dokumentů', 'To documents', 'A documentos'], attSaved: ['Příloha uložena do dokumentů klienta', 'Attachment saved to the client’s documents', 'Adjunto guardado'],
  mailLoading: ['Načítám e-maily…', 'Loading e-mails…', 'Cargando correos…'],
  mailNoEmail: ['Doplň klientovi e-mail (✏️ Upravit) a uvidíš tu celou korespondenci s ním.', 'Add the client’s e-mail (✏️ Edit) to see your correspondence here.', 'Añade el correo del cliente para ver aquí la correspondencia.'],
  mailNone: ['S tímto klientem zatím žádné e-maily.', 'No e-mails with this client yet.', 'Aún no hay correos con este cliente.'],
  mailOff: ['Gmail ještě není napojený. Návod je v menu ✉️ Pošta.', 'Gmail is not connected yet. See ✉️ Mail for how to do it.', 'Gmail aún no está conectado. Mira ✉️ Correo.'],
  mailErr: ['Nepodařilo se načíst poštu', 'Could not load mail', 'No se pudo cargar el correo'],
  mailTo: ['Komu', 'To', 'Para'], mailCc: ['Kopie (Cc)', 'Cc', 'Cc'], mailSubject: ['Předmět', 'Subject', 'Asunto'], mailText: ['Zpráva', 'Message', 'Mensaje'],
  mailAtt: ['Přílohy', 'Attachments', 'Adjuntos'], mailAttAdd: ['Přiložit dokumenty klienta', 'Attach client documents', 'Adjuntar documentos del cliente'],
  send: ['Odeslat', 'Send', 'Enviar'], mailSent: ['E-mail odeslán ✔', 'E-mail sent ✔', 'Correo enviado ✔'],
  mailSending: ['Odesílám…', 'Sending…', 'Enviando…'], mailFailed: ['E-mail se nepodařilo odeslat: {x}', 'Sending failed: {x}', 'No se pudo enviar: {x}'],
  mailWaitUpload: ['Čekám, až se nahrají přílohy…', 'Waiting for attachments to upload…', 'Esperando a que se suban los adjuntos…'],
  mailInbox: ['Pošta od klientů', 'Client mail', 'Correo de clientes'],
  mailInboxSub: ['Jen e-maily, které jdou od klientů nebo klientům (podle e-mailu u klienta). Ostatní pošta sem nechodí.', 'Only e-mails to or from clients (by the client’s e-mail address). Nothing else from your mailbox.', 'Solo correos de o para clientes. Nada más de tu buzón.'],
  mailConnected: ['Napojeno na {x}', 'Connected to {x}', 'Conectado a {x}'], lastCheck: ['poslední kontrola', 'last check', 'última comprobación'],
  checkNow: ['Zkontrolovat poštu', 'Check mail now', 'Comprobar correo'],
  mailSetupTitle: ['Jak napojit Gmail (5 minut)', 'How to connect Gmail (5 minutes)', 'Cómo conectar Gmail (5 minutos)'],
  mailSetup: [
    '<ol><li>Na <b>myaccount.google.com</b> → Zabezpečení zapni <b>Dvoufázové ověření</b> (pokud ho ještě nemáš).</li><li>Otevři <b>myaccount.google.com/apppasswords</b>, napiš název „ZEUS“ a klikni <b>Vytvořit</b>. Google ukáže 16 písmen – to je <b>heslo pro aplikace</b>.</li><li>V Railway → služba ZEUS → <b>Variables</b> přidej:<br><code>GMAIL_USER</code> = tvoje gmail adresa<br><code>GMAIL_APP_PASSWORD</code> = těch 16 písmen</li><li>Klikni <b>Deploy</b>. Za minutu tu uvidíš poštu od klientů.</li></ol>',
    '<ol><li>At <b>myaccount.google.com</b> → Security turn on <b>2-Step Verification</b>.</li><li>Open <b>myaccount.google.com/apppasswords</b>, type “ZEUS” and click <b>Create</b>. Google shows 16 letters – the <b>app password</b>.</li><li>In Railway → ZEUS service → <b>Variables</b> add:<br><code>GMAIL_USER</code> = your gmail address<br><code>GMAIL_APP_PASSWORD</code> = the 16 letters</li><li>Click <b>Deploy</b>. Client mail shows up here within a minute.</li></ol>',
    '<ol><li>En <b>myaccount.google.com</b> → Seguridad activa la <b>verificación en dos pasos</b>.</li><li>Abre <b>myaccount.google.com/apppasswords</b>, escribe «ZEUS» y pulsa <b>Crear</b>. Google muestra 16 letras – la <b>contraseña de aplicación</b>.</li><li>En Railway → servicio ZEUS → <b>Variables</b> añade:<br><code>GMAIL_USER</code> = tu dirección gmail<br><code>GMAIL_APP_PASSWORD</code> = las 16 letras</li><li>Pulsa <b>Deploy</b>. En un minuto verás aquí el correo de clientes.</li></ol>'],
  mailHint: ['Více adres odděl čárkou – uvidíš poštu ze všech.', 'Separate several addresses with commas.', 'Separa varias direcciones con comas.'],
  unknownClient: ['neznámý klient', 'unknown client', 'cliente desconocido'],
});

// ---------- our company & field values ----------
const ourCompany = () => state.settings.ourCompany || {};
const docDate = s => { if (!s) return ''; const [y, m, d] = String(s).split('-'); return d ? `${Number(d)}. ${Number(m)}. ${y}` : s; };
function docsListHtml(c, docs) {
  if (!c || !docs.length) return '<p>—</p>';
  const cs = LANG === 'cs';
  const tags = d => [d.certified && (cs ? 'ověřená kopie' : 'certified copy'), d.apostille && (cs ? 'apostila' : 'apostille'), d.translation && (cs ? 'překlad do angličtiny' : 'English translation')].filter(Boolean).join(', ');
  return '<ul>' + docs.map(d => `<li><b>${esc(L(c, 'docs', d, 'title'))}</b>${tags(d) ? ` – ${tags(d)}` : ''}${L(c, 'docs', d, 'info') ? `<br><span style="font-size:10px">${esc(L(c, 'docs', d, 'info'))}</span>` : ''}</li>`).join('') + '</ul>';
}
function invoiceTable(inv) {
  const rows = inv.items.map(i => `<tr><td>${esc(i.desc)}</td><td style="text-align:right">${esc(fmtMoney(i.amount, inv.currency))}</td></tr>`).join('');
  return `<table style="width:100%;border-collapse:collapse" border="1" cellpadding="6"><thead><tr><th style="text-align:left">Popis / Description</th><th style="text-align:right">Částka / Amount</th></tr></thead>
    <tbody>${rows}<tr><td><b>Total / Celkem</b></td><td style="text-align:right"><b>${esc(fmtMoney(inv.total, inv.currency))}</b></td></tr></tbody></table>`;
}
const fmtMoney = (a, c) => Number(a || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' ' + (c || '');
// texts from the jurisdiction templates (documents list, steps) in the language of the document
function docContext(o) {
  const prev = LANG; LANG = o.lang === 'cs' ? 'cs' : 'en';
  try { return docContextIn(o); } finally { LANG = prev; }
}
function docContextIn({clientId, companyId, invoice}) {
  const cl = client(clientId) || {}, co = company(companyId) || {}, c = country(co.countryId);
  const our = ourCompany();
  const v = {
    'client.name': cl.name, 'client.email': (cl.email || '').split(/[,;]/)[0], 'client.phone': cl.phone, 'client.address': cl.address, 'client.nationality': cl.nationality,
    'company.name': co.name || (c ? cName(c) + ' ' + cEntity(c) : ''), 'company.jurisdiction': c ? cName(c) : '', 'company.entity': c ? cEntity(c) : '', 'company.ein': co.ein,
    'company.formedDate': docDate(co.formedDate), 'company.agent': co.agent,
    'date.today': docDate(today()), 'user.name': me,
  };
  for (const [k] of TPL_FIELDS) if (k.startsWith('our.')) v[k] = our[k.slice(4)];
  const html = {
    'docs.required': docsListHtml(c, c ? c.docs.filter(d => d.required) : []),
    'docs.missing': docsListHtml(c, c ? (co.id ? missingDocs(co) : c.docs.filter(d => d.required)) : []),
    'steps.list': c ? '<ol>' + c.steps.map(s => `<li>${esc(L(c, 'steps', s, 'title'))}</li>`).join('') + '</ol>' : '',
  };
  if (invoice) {
    Object.assign(v, {'invoice.number': invoice.number, 'invoice.date': docDate(invoice.date), 'invoice.due': docDate(invoice.due), 'invoice.total': fmtMoney(invoice.total, invoice.currency)});
    html['invoice.items'] = invoiceTable(invoice);
  }
  return {v, html};
}
// fill {{fields}}; text fields are escaped, list/table fields are HTML
function fillText(s, ctx) { return String(s || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, k) => k in ctx.v ? (ctx.v[k] ?? '') : m); }
const EMPTY = '\u0001';
function fillHtml(s, ctx) {
  // a list/table field alone in a paragraph replaces the whole paragraph
  const out = String(s || '').replace(/<p>\s*\{\{\s*([\w.]+)\s*\}\}\s*<\/p>|\{\{\s*([\w.]+)\s*\}\}/g, (m, k1, k2) => {
    const k = k1 || k2;
    if (k in ctx.html) return ctx.html[k];
    const inner = k in ctx.v ? (ctx.v[k] ? esc(ctx.v[k]) : EMPTY) : `{{${k}}}`;
    return k1 ? `<p>${inner}</p>` : inner;
  });
  // empty fields: drop "Label: …" lines and dangling separators, so the document has no blank gaps
  return out.replace(/(?:<br\s*\/?>)?[^<>:]{0,40}:\s*(?:<\/?b>\s*)*\u0001(?:\s*<\/?b>)*/g, '')
    .replace(/\s*[·,]\s*\u0001/g, '').replace(/\u0001\s*[·,]\s*/g, '').replace(/<br\s*\/?>\s*\u0001/g, '').replace(/\u0001\s*<br\s*\/?>/g, '').replace(/\u0001/g, '');
}

// ---------- invoice numbers ----------
function nextInvoiceNumber() {
  const y = new Date().getFullYear(), s = state.settings.invoiceSeq || {};
  const n = s.year === y ? (s.n || 0) + 1 : 1;
  return `${y}${String(n).padStart(3, '0')}`;
}
function useInvoiceNumber(num) {
  const y = new Date().getFullYear(), m = String(num).match(/^(\d{4})(\d+)$/);
  if (!m || Number(m[1]) !== y) return;
  const s = state.settings.invoiceSeq || {id: 'invoiceSeq'};
  if (s.year !== y || Number(m[2]) > (s.n || 0)) put('setting', {...s, id: 'invoiceSeq', year: y, n: Number(m[2])}, {silent: true});
}

// ---------- PDF / Word / print ----------
const loadScript = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
let pdfReady = null;
const loadPdf = () => pdfReady || (pdfReady = loadScript('vendor/pdfmake.min.js').then(() => loadScript('vendor/vfs_fonts.js')).then(() => loadScript('vendor/html-to-pdfmake.js')).catch(e => { pdfReady = null; throw e; }));
async function htmlToPdf(html) {
  await loadPdf();
  const content = htmlToPdfmake(html, {window, tableAutoSize: true, defaultStyles: {h1: {fontSize: 18, bold: true, marginBottom: 8}, h2: {fontSize: 12.5, bold: true, marginTop: 10, marginBottom: 4}, p: {margin: [0, 3, 0, 5]}, td: {}, th: {bold: true, fillColor: '#eeeeee'}}});
  const dd = {content, pageSize: 'A4', pageMargins: [50, 50, 50, 55], defaultStyle: {fontSize: 10, lineHeight: 1.25},
    footer: (p, n) => ({text: n > 1 ? `${p} / ${n}` : '', alignment: 'center', fontSize: 8, color: '#888'})};
  return new Promise((res, rej) => { try { pdfMake.createPdf(dd).getBlob(res); } catch (e) { rej(e); } });
}
const wordBlob = (html, title) => new Blob(['﻿', `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt}table{border-collapse:collapse}td,th{vertical-align:top;padding:4px}</style></head><body>${html}</body></html>`], {type: 'application/msword'});
function printHtml(html, title) {
  const w = window.open('', '_blank'); if (!w) return alert('Pop-up blocked');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font:11pt/1.4 Georgia,serif;max-width:720px;margin:30px auto;color:#111}table{border-collapse:collapse}td,th{vertical-align:top;padding:4px}h1{font-size:20pt}h2{font-size:13pt}</style></head><body>${html}</body></html>`);
  w.document.close(); setTimeout(() => { w.focus(); w.print(); }, 400);
}
// a new file in the client's documents (uploaded to the server in the background)
async function addFileBlob(blob, name, {clientId, companyId, docId}) {
  const id = uid();
  await DB.put('files', id, blob);
  pendingFiles.push(id);
  put('file', {id, clientId, companyId: companyId || null, docId: docId || null, name, type: blob.type, size: blob.size}, {silent: true});
  scheduleSync(0);
  return id;
}
const safeName = s => String(s || 'dokument').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80);

// ---------- create a document from a template ----------
function templatesFor(co) {
  return state.templates.filter(x => !co || !x.countryIds || !x.countryIds.length || x.countryIds.includes(co.countryId));
}
actions.newdoc = ({client: clientId, co: coId}) => {
  coId = coId || companiesOf(clientId)[0]?.id || '';
  const cl = client(clientId); if (!cl) return;
  const list = templatesFor(company(coId));
  if (!list.length) { location.hash = '#/sablony'; return toast(t('noTemplates')); }
  const unpaid = state.payments.filter(p => p.clientId === clientId && p.status !== 'paid' && (!coId || !p.companyId || p.companyId === coId));
  const cur = unpaid[0]?.currency || 'EUR';
  const body = F(t('chooseTemplate'), `<select name="tpl" id="nd-tpl">${opt(list.map(x => [x.id, `${t('tplType_' + (x.type || 'other'))} – ${x.name}`]), list[0].id)}</select>`) +
    F(t('forCompany'), `<select name="co">${opt([['', '—'], ...companiesOf(clientId).map(c => [c.id, `${country(c.countryId)?.flag || ''} ${c.name || t('noName')}`])], coId)}</select>`) +
    `<div id="nd-inv">${'' +
      `<div class="f2">${F(t('inv_number'), inp('number', nextInvoiceNumber()))}${F(t('f_currency'), `<select name="currency">${opt([['EUR', 'EUR'], ['USD', 'USD'], ['CZK', 'CZK']], cur)}</select>`)}</div>` +
      `<div class="f2">${F(t('inv_date'), inp('date', today(), 'type="date"'))}${F(t('inv_due'), inp('due', unpaid[0]?.due || addDays(today(), 14), 'type="date"'))}</div>` +
      F(t('invItems'), `<textarea name="items" class="tall">${esc(unpaid.map(p => `${p.title} | ${p.amount}`).join('\n'))}</textarea>`, t('invItemsHint')) +
      `<label class="check"><input type="checkbox" name="addPay" ${unpaid.length ? '' : 'checked'}> ${t('invAddPayment')}</label>`}</div>`;
  const form = modal(`📝 ${t('newDoc')} – ${esc(cl.name)}`, body, d => {
    const tpl = state.templates.find(x => x.id === d.tpl); if (!tpl) return false;
    let invoice = null;
    if (tpl.type === 'invoice') {
      const items = d.items.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const i = l.lastIndexOf('|'); return i < 0 ? {desc: l, amount: 0} : {desc: l.slice(0, i).trim(), amount: Number(l.slice(i + 1).replace(/\s/g, '').replace(',', '.')) || 0}; });
      invoice = {number: d.number.trim(), date: d.date, due: d.due, currency: d.currency, items, total: items.reduce((a, i) => a + i.amount, 0), addPay: d.addPay};
    }
    setTimeout(() => docPreview({tpl, clientId, companyId: d.co || null, invoice}), 50);
  }, {submit: t('preview').split(' – ')[0] + ' ›', wide: true});
  const sel = form.querySelector('#nd-tpl'), inv = form.querySelector('#nd-inv');
  const upd = () => { inv.hidden = state.templates.find(x => x.id === sel.value)?.type !== 'invoice'; };
  sel.onchange = upd; upd();
};

function docPreview({tpl, clientId, companyId, invoice}) {
  const ctx = docContext({clientId, companyId, invoice, lang: tpl.lang});
  const cl = client(clientId), co = company(companyId);
  const title = safeName(invoice ? `Invoice ${invoice.number} – ${cl.name}` : `${tpl.name.replace(/\s*\((EN|CZ|CS)\)\s*$/, '')} – ${co?.name || cl.name}`);
  const form = modal(`📄 ${esc(tpl.name)}`, `<p class="small muted">${t('preview')}</p>
    <div class="doc-paper" contenteditable="true" id="dp-body">${fillHtml(tpl.body, ctx)}</div>
    ${F(t('fileName'), inp('fname', title, 'required'))}
    <div class="row wrapgap"><button type="button" class="btn" data-dp="pdf">⬇️ ${t('downloadPdf')}</button><button type="button" class="btn" data-dp="word">⬇️ ${t('downloadWord')}</button>
      <button type="button" class="btn" data-dp="print">🖨 ${t('printDoc')}</button><button type="button" class="btn gold" data-dp="mail">✉️ ${t('saveAndMail')}</button></div>`,
    async (d, f) => { await save(f); }, {submit: '💾 ' + t('saveToDocs'), wide: true});
  let saved = null;
  const html = () => form.querySelector('#dp-body').innerHTML;
  const fname = () => safeName(form.fname.value);
  async function save() {
    if (saved) return saved;
    toast(t('makingPdf'));
    let blob; try { blob = await htmlToPdf(html()); } catch (e) { alert('PDF: ' + e.message); return null; }
    const id = await addFileBlob(blob, fname() + '.pdf', {clientId, companyId});
    if (invoice) {
      useInvoiceNumber(invoice.number);
      if (invoice.addPay) put('payment', {id: uid(), clientId, companyId: companyId || '', title: `Invoice ${invoice.number}`, amount: invoice.total, currency: invoice.currency, due: invoice.due, status: 'unpaid', invoiceNo: invoice.number, fileId: id, paidDate: null}, {silent: true});
    }
    logEvent('doc', `${fname()} (${cl.name})`, {clientId, companyId: companyId || null});
    toast(t('docSaved')); scheduleRender();
    return saved = id;
  }
  form.querySelectorAll('[data-dp]').forEach(b => b.onclick = async () => {
    const k = b.dataset.dp;
    if (k === 'pdf') { toast(t('makingPdf')); try { download(fname() + '.pdf', await htmlToPdf(html())); } catch (e) { alert('PDF: ' + e.message); } }
    if (k === 'word') download(fname() + '.doc', wordBlob(html(), fname()));
    if (k === 'print') printHtml(html(), fname());
    if (k === 'mail') {
      const id = await save(); if (!id) return;
      $('#modal-root').innerHTML = '';
      composeMail({clientId, companyId, to: ctx.v['client.email'] || '', subject: fillText(tpl.subject || tpl.name, ctx), text: fillText(tpl.mailText || '', ctx), fileIds: [id]});
    }
  });
}

// ---------- templates: list & editor ----------
function viewTemplates() {
  const types = ['contract', 'invoice', 'letter', 'other'];
  return `<div class="crumb"><a href="#/nastaveni">${t('nav_set')}</a> ›</div>
  <div class="head"><div class="grow"><h1>📝 ${t('templates')}</h1><p class="sub m0">${t('templatesSub')}</p></div>
    <button class="btn primary" data-act="newtpl">＋ ${t('newTemplate')}</button></div>
  ${types.map(ty => { const list = state.templates.filter(x => (x.type || 'other') === ty); if (!list.length) return '';
    return `<div class="card"><h2>${t('tplType_' + ty)}</h2><div class="list">${list.map(x => `<div class="item"><div class="main"><a class="t plain" href="#/sablona/${x.id}">${esc(x.name)}</a>
      <div class="d">${x.countryIds && x.countryIds.length ? x.countryIds.map(id => esc(cName(country(id)))).join(', ') : ''}${x.updatedBy ? ` · ${t('lastChange')}: ${esc(x.updatedBy)}` : ''}</div></div>
      <button class="btn small ghost" data-act="duptpl" data-id="${x.id}">⧉ ${t('duplicate')}</button><a class="btn small" href="#/sablona/${x.id}">✏️ ${t('edit')}</a></div>`).join('')}</div></div>`; }).join('') || `<div class="card empty">${t('noTemplates')}</div>`}`;
}
let tplDraft = null;
function collectTplDraft() {
  const ed = $('#tpl-ed'); if (!ed || !tplDraft) return;
  ed.querySelectorAll('[data-tf]').forEach(el => tplDraft[el.dataset.tf] = el.value);
  const ids = [...ed.querySelectorAll('[data-tc]')].filter(x => x.checked).map(x => x.dataset.tc); tplDraft.countryIds = ids;
  tplDraft.body = $('#tpl-body').innerHTML;
}
function viewTemplate(r) {
  const x = state.templates.find(y => y.id === r.a); if (!x) return notFound();
  if (!tplDraft || tplDraft.id !== x.id) tplDraft = JSON.parse(JSON.stringify(x));
  const d = tplDraft;
  const groups = [['client.', t('kind_client')], ['company.', t('kind_company')], ['our.', t('ourCompany').split(' (')[0]], ['invoice.', t('tplType_invoice')], ['', '…']];
  const fieldOpts = groups.map(([p, l]) => `<optgroup label="${esc(l)}">${TPL_FIELDS.filter(([k]) => p ? k.startsWith(p) : !groups.slice(0, 4).some(([q]) => k.startsWith(q))).map(([k, lab]) => `<option value="${k}">${esc(t(lab))}</option>`).join('')}</optgroup>`).join('');
  return `<div class="crumb"><a href="#/nastaveni">${t('nav_set')}</a> › <a href="#/sablony">${t('templates')}</a> ›</div>
  <div class="head"><div class="grow"><h1>📝 ${esc(d.name)}</h1>${whoLine(x)}</div>
    <a class="btn" href="#/sablony" data-act="canceltpl">${t('cancel')}</a><button class="btn primary" data-act="savetpl">💾 ${t('save')}</button></div>
  ${DEFAULT_TEMPLATES.some(y => y.id === d.id) ? `<div class="note small">⚠️ ${t('tplSample')}</div>` : ''}
  <div id="tpl-ed"><div class="card"><div class="f2">${F(t('tplName'), `<input data-tf="name" value="${esc(d.name)}">`)}${F(t('tplType'), `<select data-tf="type">${opt(['contract', 'invoice', 'letter', 'other'].map(k => [k, t('tplType_' + k)]), d.type || 'other')}</select>`)}
    ${F(t('tplLang'), `<select data-tf="lang">${opt([['en', 'English'], ['cs', 'Čeština']], d.lang || 'en')}</select>`, t('tplLangHint'))}</div>
    ${F(t('tplForJur'), `<div class="checks">${state.countries.map(c => `<label class="check small"><input type="checkbox" data-tc="${c.id}" ${(d.countryIds || []).includes(c.id) ? 'checked' : ''}> ${c.flag || ''} ${esc(cName(c))}</label>`).join('')}</div>`, t('tplForJurHint'))}</div>
  <div class="card"><h2>${t('tplBody')}</h2><p class="small muted">${t('tplBodyHint')}</p>
    <div class="row toolbar"><button type="button" class="btn small" data-cmd="bold"><b>B</b></button><button type="button" class="btn small" data-cmd="italic"><i>I</i></button>
      <button type="button" class="btn small" data-cmd="formatBlock" data-v="h2">H</button><button type="button" class="btn small" data-cmd="formatBlock" data-v="p">¶</button>
      <button type="button" class="btn small" data-cmd="insertUnorderedList">• ≡</button><button type="button" class="btn small" data-cmd="insertOrderedList">1. ≡</button>
      <select id="tpl-field" class="grow1"><option value="">＋ ${t('insertField')}</option>${fieldOpts}</select></div>
    <div class="doc-paper" contenteditable="true" id="tpl-body">${d.body || ''}</div></div>
  <div class="card"><h2>✉️ ${t('emails')}</h2>${F(t('tplSubject'), `<input data-tf="subject" value="${esc(d.subject || '')}">`)}${F(t('tplMailText'), `<textarea data-tf="mailText" class="tall">${esc(d.mailText || '')}</textarea>`)}</div>
  <button class="btn danger" data-act="deltpl" data-id="${d.id}">🗑 ${t('toTrash')}</button></div>`;
}
let tplRange = null;
document.addEventListener('selectionchange', () => {
  const ed = $('#tpl-body'), s = getSelection(); if (!ed || !s.rangeCount) return;
  const r = s.getRangeAt(0); if (ed.contains(r.commonAncestorContainer)) tplRange = r.cloneRange();
});
document.addEventListener('mousedown', e => { if (e.target.closest('[data-cmd]')) e.preventDefault(); });
document.addEventListener('click', e => {
  const b = e.target.closest('[data-cmd]'); if (!b) return;
  $('#tpl-body').focus(); document.execCommand(b.dataset.cmd, false, b.dataset.v ? `<${b.dataset.v}>` : null);
});
document.addEventListener('change', e => {
  if (e.target.id !== 'tpl-field' || !e.target.value) return;
  const ed = $('#tpl-body'), v = `{{${e.target.value}}}`; e.target.value = '';
  ed.focus(); const s = getSelection();
  if (tplRange) { s.removeAllRanges(); s.addRange(tplRange); } else { const r = document.createRange(); r.selectNodeContents(ed); r.collapse(false); s.removeAllRanges(); s.addRange(r); }
  document.execCommand('insertText', false, v);
});
Object.assign(actions, {
  newtpl: () => modal(t('newTemplate'), F(t('tplName'), inp('name', '', 'required'), '', true) + F(t('tplType'), `<select name="type">${opt(['contract', 'invoice', 'letter', 'other'].map(k => [k, t('tplType_' + k)]), 'contract')}</select>`), d => {
    const x = put('template', {id: uid(), name: d.name.trim(), type: d.type, body: '<p></p>', subject: '', mailText: '', countryIds: []}, {silent: true});
    tplDraft = null; location.hash = '#/sablona/' + x.id;
  }),
  duptpl: ({id}) => { const x = state.templates.find(y => y.id === id); const n = put('template', {...JSON.parse(JSON.stringify(x)), id: uid(), name: `${x.name} ${t('copySuffix')}`, created: null}, {silent: true}); tplDraft = null; location.hash = '#/sablona/' + n.id; },
  savetpl: () => { collectTplDraft(); if (!tplDraft.name.trim()) return alert(t('needName')); put('template', tplDraft, {silent: true}); logEvent('tplsave', tplDraft.name); tplDraft = null; location.hash = '#/sablony'; toast(t('saved')); },
  canceltpl: () => { tplDraft = null; },
  deltpl: ({id}) => {
    const x = state.templates.find(y => y.id === id); if (!x || !confirm(t('confirmTrash'))) return;
    if (DEFAULT_TEMPLATES.some(l => l.id === id)) { const s = state.settings.removedTpl || {id: 'removedTpl', list: []}; put('setting', {...s, list: [...(s.list || []), id]}, {silent: true}); }
    softDelete('template', {...x}, uid()); tplDraft = null; location.hash = '#/sablony'; toast(t('movedToTrash'));
  },
  ourcompany: () => {
    const o = ourCompany();
    const keys = ['name', 'address', 'regNo', 'vatNo', 'email', 'phone', 'web', 'bank', 'iban', 'swift', 'signatory'];
    modal('🏢 ' + t('ourCompany'), `<p class="small muted">${t('ourCompanySub')}</p><div class="f2">${keys.map(k => F(t('our_' + k), inp(k, o[k]))).join('')}</div>`, d => { put('setting', {...o, ...d, id: 'ourCompany'}); toast(t('saved')); }, {wide: true});
  },
});
function seedTemplates() {
  const removed = (state.settings.removedTpl || {}).list || [];
  for (const x of DEFAULT_TEMPLATES) if (!(cache.recs.template || {})[x.id] && !removed.includes(x.id)) put('template', JSON.parse(JSON.stringify(x)), {silent: true});
}

// ---------- e-mail ----------
const mailCache = {}; // emails -> {at, data, err}
let mailOpen = null, mailStatus = null;
const clientEmails = cl => String(cl?.email || '').toLowerCase().split(/[,;\s]+/).filter(x => x.includes('@'));
async function loadMail(key, force) {
  const c = mailCache[key];
  if (c && c.loading) return;
  if (c && !force && Date.now() - c.at < 60000) return;
  mailCache[key] = {...(c || {}), loading: true, at: Date.now()};
  try {
    const r = await apiFetch('/api/mail?emails=' + encodeURIComponent(key));
    if (!r.ok) throw new Error(r.status);
    mailCache[key] = {at: Date.now(), data: await r.json()};
  } catch (e) { mailCache[key] = {at: Date.now(), data: c?.data, err: String(e.message || e)}; }
  scheduleRender();
}
function mailRow(m, cl) {
  const open = mailOpen === m.id;
  const atts = m.attachments || [];
  return `<div class="item mail ${m.incoming ? 'in' : 'out'} ${open ? 'open' : ''}"><span class="mdir">${m.incoming ? '⬅️' : '➡️'}</span><div class="main mw">
    <a href="#" class="t plain" data-act="mailtoggle" data-id="${esc(m.id)}">${esc(m.subject || '(bez předmětu)')}</a>
    <div class="d">${m.incoming ? esc(m.from_name || m.from_addr) : '→ ' + esc((m.addrs || []).filter(a => a !== m.from_addr).join(', '))} · ${fmtTime(m.date)}${atts.length ? ' · 📎 ' + atts.length : ''}</div>
    ${open ? `<div class="mailtext pre">${esc(m.text || m.snippet || '')}</div>
      ${atts.length ? `<div class="mt8">${atts.map(a => `<div class="row mt4"><span>📎 ${esc(a.filename)} <span class="muted small">${fmtSize(a.size || 0)}</span></span>
        <button class="btn small" data-act="mailatt" data-id="${esc(m.id)}" data-idx="${a.idx}">${t('open')}</button>
        ${cl ? `<button class="btn small" data-act="mailattsave" data-id="${esc(m.id)}" data-idx="${a.idx}" data-name="${esc(a.filename)}" data-type="${esc(a.type || '')}" data-client="${cl.id}">💾 ${t('attSave')}</button>` : ''}</div>`).join('')}</div>` : ''}
      ${cl ? `<div class="row mt8"><button class="btn small" data-act="mailreply" data-id="${esc(m.id)}" data-client="${cl.id}">↩ ${t('reply')}</button>
        <button class="btn small ghost" data-act="mailnote" data-id="${esc(m.id)}" data-client="${cl.id}">📝 ${t('toNote')}</button></div>` : ''}`
      : `<div class="d">${esc(m.snippet || '')}</div>`}</div></div>`;
}
function clientMailCard(cl) {
  const emails = clientEmails(cl);
  const head = `<div class="row mb8"><h2 class="m0">✉️ ${t('emails')}</h2>
    ${emails.length ? `<button class="btn small ghost right" data-act="mailreload" data-key="${esc(emails.join(','))}" title="🔄">🔄</button>` : ''}
    <button class="btn small ${emails.length ? '' : 'right'}" data-act="mailnew" data-client="${cl.id}">✉️ ${t('writeMail')}</button></div>`;
  if (!emails.length) return `<div class="card">${head}<div class="empty">${t('mailNoEmail')}</div></div>`;
  const key = emails.join(','); loadMail(key);
  const c = mailCache[key] || {};
  let body;
  if (!c.data) body = c.err ? `<div class="note bad">${t('mailErr')} (${esc(c.err)})</div>` : `<div class="empty">⏳ ${t('mailLoading')}</div>`;
  else if (!c.data.enabled) body = `<div class="note">${t('mailOff')}</div>`;
  else body = `<div class="list">${c.data.messages.map(m => mailRow(m, cl)).join('') || `<div class="empty">${t('mailNone')}</div>`}</div>`;
  return `<div class="card">${head}${body}</div>`;
}
const findMail = id => { for (const c of Object.values(mailCache)) { const m = c.data?.messages?.find(x => x.id === id); if (m) return m; } return null; };
async function mailAttBlob(id, idx) {
  const r = await apiFetch(`/api/mail/att/${encodeURIComponent(id)}/${idx}`);
  if (!r.ok) throw new Error(r.status);
  return r.blob();
}
function composeMail({clientId, companyId, to, subject = '', text = '', fileIds = [], inReplyTo}) {
  const cl = client(clientId);
  const files = state.files.filter(f => f.clientId === clientId);
  const form = modal('✉️ ' + t('writeMail'), F(t('mailTo'), inp('to', to ?? clientEmails(cl).join(', '), 'required')) + F(t('mailCc'), inp('cc', '')) +
    F(t('mailSubject'), inp('subject', subject, 'required')) + F(t('mailText'), `<textarea name="text" class="tall" style="min-height:200px">${esc(text)}</textarea>`) +
    (files.length ? F(t('mailAtt'), `<div class="checks col">${files.map(f => `<label class="check small"><input type="checkbox" name="att_${f.id}" ${fileIds.includes(f.id) ? 'checked' : ''}> 📄 ${esc(f.name)} <span class="muted">${fmtSize(f.size)}</span></label>`).join('')}</div>`, t('mailAttAdd')) : ''),
  async d => {
    const ids = Object.keys(d).filter(k => k.startsWith('att_') && d[k]).map(k => k.slice(4));
    const btn = form.querySelector('.mf .primary'); btn.disabled = true; btn.textContent = t('mailSending');
    try {
      // attachments must be on the server first
      for (let i = 0; i < 60 && ids.some(id => pendingFiles.includes(id)); i++) { if (i === 0) toast(t('mailWaitUpload')); scheduleSync(0); await new Promise(r => setTimeout(r, 1000)); }
      const r = await apiFetch('/api/mail/send', {method: 'POST', body: JSON.stringify({to: d.to, cc: d.cc, subject: d.subject, text: d.text, fileIds: ids, inReplyTo})});
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error === 'mail_off' ? t('mailOff') : (j.detail || j.error || r.status));
    } catch (e) { btn.disabled = false; btn.textContent = t('send'); alert(t('mailFailed', {x: e.message})); return false; }
    logEvent('mail_out', `${cl?.name || d.to}: ${d.subject}`, {clientId, companyId: companyId || null});
    toast(t('mailSent'));
    const key = clientEmails(cl).join(','); setTimeout(() => loadMail(key, true), 6000);
  }, {submit: '➤ ' + t('send'), wide: true});
  return form;
}
Object.assign(actions, {
  mailtoggle: ({id}) => { mailOpen = mailOpen === id ? null : id; render(); },
  mailreload: async ({key}) => { try { await apiFetch('/api/mail/refresh', {method: 'POST'}); } catch {} loadMail(key, true); },
  mailnew: ({client: id}) => composeMail({clientId: id}),
  mailreply: ({id, client: cid}) => {
    const m = findMail(id); if (!m) return;
    const quote = `\n\n\n— ${fmtTime(m.date)}, ${m.from_name || m.from_addr}:\n` + String(m.text || '').split('\n').slice(0, 40).map(l => '> ' + l).join('\n');
    composeMail({clientId: cid, to: m.incoming ? m.from_addr : undefined, subject: /^re:/i.test(m.subject || '') ? m.subject : 'Re: ' + (m.subject || ''), text: quote});
  },
  mailnote: ({id, client: cid}) => {
    const m = findMail(id), cl = client(cid); if (!m || !cl) return;
    const add = `[${fmtTime(m.date)} ✉️ ${m.subject || ''}]\n${String(m.text || m.snippet || '').slice(0, 1500)}`;
    put('client', {...cl, note: (cl.note ? cl.note + '\n\n' : '') + add}); toast(t('addedToNote'));
  },
  mailatt: async ({id, idx}) => {
    let blob; try { blob = await mailAttBlob(id, idx); } catch { return alert(t('fileUnavailable')); }
    const url = URL.createObjectURL(blob); if (!window.open(url, '_blank')) download('priloha', blob); setTimeout(() => URL.revokeObjectURL(url), 60000);
  },
  mailattsave: async ({id, idx, name, type, client: cid}) => {
    let blob; try { blob = await mailAttBlob(id, idx); } catch { return alert(t('fileUnavailable')); }
    if (type && !blob.type) blob = new Blob([blob], {type});
    await addFileBlob(blob, name, {clientId: cid});
    logEvent('file', `${name} (${client(cid)?.name || ''})`, {clientId: cid}); toast(t('attSaved')); scheduleRender();
  },
  mailcheck: async () => { try { const r = await apiFetch('/api/mail/refresh', {method: 'POST'}); mailStatus = await r.json(); } catch {} loadMail('', true); },
});
function viewMail() {
  loadMail('');
  const c = mailCache[''] || {}, data = c.data;
  const byAddr = {}; for (const cl of state.clients) for (const a of clientEmails(cl)) byAddr[a] = cl;
  const st = data?.status || mailStatus || {};
  let body;
  if (!data) body = c.err ? `<div class="note bad">${t('mailErr')} (${esc(c.err)})</div>` : `<div class="card empty">⏳ ${t('mailLoading')}</div>`;
  else if (!data.enabled) body = `<div class="card"><h2>🔌 ${t('mailSetupTitle')}</h2>${t('mailSetup')}</div>`;
  else body = `<div class="card"><div class="row mb8"><span class="pill ${st.ok ? 'ok' : st.error ? 'bad' : 'muted'}">${st.ok ? '✔' : st.error ? '✖' : '…'} ${t('mailConnected', {x: esc(data.user)})}</span>
      <span class="small muted">${st.lastPoll ? t('lastCheck') + ' ' + fmtTime(st.lastPoll) : ''}</span>
      <button class="btn small right" data-act="mailcheck">🔄 ${t('checkNow')}</button></div>
      ${st.error ? `<div class="note bad small">${esc(st.error)}</div>` : ''}
      <div class="list">${data.messages.map(m => { const cl = (m.addrs || []).map(a => byAddr[a]).find(Boolean);
        return `<div class="item"><span>${m.incoming ? '⬅️' : '➡️'}</span><div class="main"><div class="t">${cl ? `<a class="plain" href="#/klient/${cl.id}">${esc(cl.name)}</a>` : `<span class="muted">${t('unknownClient')}</span>`} · ${esc(m.subject || '')}</div>
          <div class="d">${esc(m.incoming ? (m.from_name || m.from_addr) : '→ ' + (m.addrs || []).filter(a => a !== m.from_addr).join(', '))} · ${fmtTime(m.date)}${(m.attachments || []).length ? ' · 📎 ' + m.attachments.length : ''}</div>
          <div class="d">${esc(m.snippet || '')}</div></div></div>`; }).join('') || `<div class="empty">${t('mailNone')}</div>`}</div></div>`;
  return `<div class="head"><div class="grow"><h1>✉️ ${t('mailInbox')}</h1><p class="sub m0">${t('mailInboxSub')}</p></div></div>${body}`;
}
