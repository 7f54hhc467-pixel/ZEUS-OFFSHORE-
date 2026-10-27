# ZEUS Offshore – návod (server na Railway)

Sdílená aplikace pro tým **Johny, Pablo, Lukas, Camila**. Data jsou na vašem serveru (Railway + PostgreSQL) a zároveň v každém zařízení, takže to jede i bez internetu.

## 1. Nahrání do GitHubu
1. V repozitáři **ZEUS-OFFSHORE-** klikni **Add file → Upload files**.
2. Přetáhni **všechno ze složky ZEUS-Server**: `package.json`, `package-lock.json`, `server.js`, `NAVOD.md` a složku `public`.
3. Dole klikni **Commit changes**.

## 2. Railway
1. V projektu musí být **PostgreSQL** (+ New → Database → PostgreSQL).
2. Klikni na službu **ZEUS-OFFSHORE-** → **Settings → Root Directory** nech prázdné.
3. **Variables** → **New Variable**:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (nebo „Add Reference“ → Postgres → DATABASE_URL)
   - `TEAM_CODE` = tajný kód týmu, např. `zeus-2026-tajne` (potřebuje ho každý jen při prvním přihlášení)
4. **Settings → Networking → Generate Domain**. Vznikne adresa typu `https://zeus-offshore-production.up.railway.app`.
5. Railway po každém commitu nasadí novou verzi sám.

## 3. Instalace jako appka
- **iPhone / iPad (Safari):** otevři adresu → Sdílet → **Přidat na plochu**
- **Mac (Safari):** Soubor → **Přidat do Docku**
- **Android / Chrome:** ⋮ → **Instalovat aplikaci**

## 4. První přihlášení
Každý klikne na své jméno, zadá **kód týmu** a zvolí si heslo. Pak zůstane přihlášený napořád.
Kdo zapomene heslo: kolega v **Nastavení → Kolega zapomněl heslo** mu ho resetuje (data zůstanou).

## 5. Co aplikace umí
- Klienti → firmy / nadace / trusty (Wyoming, Delaware, Hong Kong, BVI, Seychely, Bahamy, Panama, Cook Islands…)
- Postup krok za krokem; u kroku odkaz na úřad, telefon a kdo z **Kontaktů** pomůže (účetní, agent, notář…)
- Dokumenty od klienta (apostila, překlad, ověřená kopie), nahrávání souborů
- Roční termíny se počítají samy, kalendář + export do kalendáře v Macu/iPhonu
- Platby: Nezaplaceno → V procesu → Zaplaceno
- 🔔 Upozornění: kdo co přidal; nový klient svítí jako „Čeká na zpracování“, dokud ho někdo nedá do procesu
- Nic se nemaže natrvalo: **koš** + server si pamatuje každou starší verzi
- Čeština / English / Español
- Data ze staré offline verze: Nastavení → **Nahrát zálohu**

## 6. Smlouvy, faktury, dopisy
1. **Nastavení → 🏢 Naše firma**: jednou vyplň název, adresu, IČ, IBAN, kdo podepisuje.
2. U klienta (nebo u firmy) klikni **📝 Vytvořit dokument** → vyber šablonu.
   - **Faktura**: číslo se dá samo (2026001, 2026002…), položky se předvyplní z nezaplacených plateb. Faktura se může sama přidat do Plateb.
3. Uvidíš hotový dokument, můžeš v něm ještě cokoliv přepsat. Pak:
   **💾 Uložit PDF do dokumentů** · **⬇️ PDF** · **⬇️ Word** · **🖨 Tisk** · **✉️ Uložit a poslat e-mailem**
4. Šablony upravíš v **Nastavení → 📝 Šablony smluv a faktur**. Text můžeš vložit i z Wordu, pole (jméno klienta, firma…) přidáš tlačítkem **Vložit pole**.
   Vzorové šablony jsou jen vzor – nech je jednou zkontrolovat právníkem.

## 7. Gmail v aplikaci
Co to umí: u každého klienta vidíš celou e-mailovou konverzaci s ním, přílohy uložíš jedním klikem do jeho dokumentů, odpovídáš a posíláš smlouvy/faktury přímo z appky. Když klient napíše, přijde upozornění 🔔.
Do appky se dostanou **jen e-maily od klientů / klientům** (podle e-mailu vyplněného u klienta), nic jiného.

Napojení (5 minut):
1. **myaccount.google.com → Zabezpečení** → zapni **Dvoufázové ověření** (když ještě není).
2. Otevři **myaccount.google.com/apppasswords** → napiš „ZEUS“ → **Vytvořit**. Google ukáže 16 písmen = **heslo pro aplikace**.
3. Railway → služba ZEUS → **Variables** → přidej:
   - `GMAIL_USER` = tvoje gmail adresa
   - `GMAIL_APP_PASSWORD` = těch 16 písmen
4. **Deploy**. V appce v menu **✉️ Pošta** uvidíš „Napojeno“.

## 8. Cena
Railway: zkušební kredit, potom tarif Hobby cca **5 USD měsíčně** (stačí pro celý tým).
