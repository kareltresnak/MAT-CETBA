# 📚 Selekce maturitní četby (OMEGA v10.1.0)

Webová progresivní aplikace (PWA) navržená pro **Střední průmyslovou školu a Vyšší odbornou školu Příbram** sloužící k interaktivnímu sestavení, validaci a tisku oficiálního maturitního seznamu literárních děl z českého jazyka a literatury, doplněná o zabezpečený administrační systém pro katedru ČJL.

**Živé ukázky aplikace:**
* [🏛️ Institucionální verze SPŠ Příbram](https://kareltresnak.github.io/MAT-CETBA/?theme=spspb) – Oficiální zelený vizuál školy s logem.
* [🦀 Výchozí Rust Edice](https://kareltresnak.github.io/MAT-CETBA/?theme=default) – Neutrální oranžovo-tmavá estetika.

---

## 🌟 Stručné představení aplikace

Aplikace řeší každoroční administrativní zátěž spojenou s výběrem a kontrolou maturitní četby jak na straně studentů, tak na straně vyučujících.

### 🎓 Pro studenty
1. **Intuitivní výběr děl:** Studenti si ze školního kánonu (60+ titulů) kliknutím vybírají 20 děl k ústní maturitní zkoušce.
2. **Reálná validace kritérií CERMAT / SPŠ:** V reálném čase aplikace počítá a vizuálně indikuje splnění všech povinných kvót:
   * **Časová období:** min. 2 díla do konce 18. století, min. 3 díla z 19. století, min. 4 díla ze světové literatury 20. a 21. století, min. 5 děl z české literatury 20. a 21. století.
   * **Literární druhy:** min. 2 díla z poezie (lyrika), min. 2 díla z prózy (epika), min. 2 díla z dramatu.
3. **Oficiální maturitní tiskopis (PDF):** Po splnění podmínek aplikace vygeneruje oficiální formulář s logem školy a záhlavím přesně podle standardu školy.
4. **Přenášení a sdílení výběru:** Možnost okamžitého přenosu výběru na jiné zařízení pomocí QR kódu nebo sdílecího URL odkazu.
5. **100% soukromí (Zero-Knowledge):** Žádná osobní data studentů (jméno, datum narození, třída) se neukládají na žádném serveru – vše zůstává striktně v lokální paměti prohlížeče (`localStorage`).
6. **Offline provoz (PWA):** Aplikaci lze jedním kliknutím nainstalovat na plochu telefonu (iOS i Android) či PC a používat ji i bez připojení k internetu.

---

### 👨‍🏫 Pro vyučující a vedoucí katedry ČJL
1. **Doporučená četba pro studenty (Stealth režim):**
   * Učitelé mohou studentům připravit doporučený seznam 20 knih.
   * **5× rychlé poklepání na nadpis „SELEKCE ČETBY“** aktivuje režim učitele: tlačítko se přepne na *„Export bez os. údajů (Učitel)“*, nevyžadují se žádné osobní údaje a vygeneruje se tiskopis, kde i kolonka **školního roku zůstává prázdná** pro čistý ruční zápis. Opětovným 5× klikem se režim deaktivuje.
2. **Správa kánonu v reálném čase:**
   * Přidávání nových děl s automatickým či volitelným ID.
   * Vyřazování zastaralých titulů a přímá editace názvů či autorů v tabulce.
   * Přečíslování a změna pořadí pomocí drag & drop (☰) nebo funkce *Teleport*.
3. **Týmová spolupráce vyučujících:**
   * Řadoví učitelé mohou sestavovat návrhy a odesílat je vedoucí katedry do schvalovací schránky (*Inbox nápadů*).
   * Vedoucí katedry návrhy prohlíží, schvaluje nebo zamítá s odůvodněním.
4. **Ostrý zápis do produkce:**
   * Publikace změn jedním kliknutím přímo do GitHub repozitáře přes Cloudflare Edge Worker bez nutnosti ručního editování zdrojového kódu.
5. **Veřejný changelog (Historie změn):**
   * Automatické verzování kánonu s přepočtem platnosti změn pro nadcházející školní rok.

---

## 🛠️ Technikum (Architektura a technologie)

Aplikace je postavena na moderní architektuře **Jamstack** kombinující čistý klientský frontend bez těžkých frameworků s bezestavovým serverless backendem na hraně sítě.

```
                    ┌────────────────────────────────────────┐
                    │          Prohlížeč klienta             │
                    │   (PWA / Vanilla JS Modular Engine)   │
                    └──────────────────┬─────────────────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │ HTTPS (REST API)       │ HTTPS                  │ Local
              ▼                        ▼                        ▼
┌───────────────────────────┐ ┌───────────────────┐ ┌──────────────────┐
│ Cloudflare Edge Worker    │ │ GitHub Pages      │ │ IndexedDB /      │
│ - V8 Isolate runtime      │ │ - Statický host   │ │ localStorage     │
│ - Turnstile ochrana       │ │ - data-spspb.js   │ │ - Zero-Knowledge │
│ - OCC ochrana kolizí      │ └───────────────────┘ │ - PWA cache      │
│ - KV Stash (PIN záloha)   │                       └──────────────────┘
└─────────────┬─────────────┘
              │ GitHub API
              ▼
┌───────────────────────────┐
│ GitHub Repozitář (Prod)   │
│ - Automatický commit      │
│ - CI/CD GitHub Actions    │
│ - Teams Webhook Dispatch  │
└───────────────────────────┘
```

---

### 1. Klientská modulární Clean Architecture

Zdrojový kód aplikace je dekomponován do specializovaných, vzájemně oddělených modulů s jednotným jmenným prostorem `window.Omega.*`:

```
js/
├── core/                  # Jádro a perzistence aplikace
│   ├── config.js          # Centrální konfigurace, API endpointy a limity
│   ├── security.js        # Klientská sanitace, Turnstile ověřování, tokeny
│   ├── telemetry.js       # Diagnostika sezení, sledování neaktivity
│   ├── theme.js           # Kinematika motivů (Dark/Light) s plynulým přechodem
│   └── pwa.js             # Service Worker lifecycle, offline cache management
├── shared/                # Sdílené komponenty a governance
│   ├── toast.js           # Globální notifikační toast systém
│   ├── notifications.js   # Klientské dialogy a systémová upozornění
│   ├── status.js          # Smart polling (/sync) a detekce nových buildů
│   ├── profile.js         # Správa uživatelských preferencí a Teams notifikací
│   ├── changelog.js       # Veřejný changelog kánonu s přepočtem šk. roku
│   └── manual.js          # Interaktivní onboarding a nápověda pro studenty i správce
├── diff/                  # Matematické porovnávací jádro
│   └── lis-engine.js      # LIS algoritmus pro detekci kaskádových posunů ID
├── student/               # Uživatelské rozhraní pro studenty
│   ├── state.js           # Lokální stav výběru knih a validace limitů
│   ├── stats.js           # Výpočet splnění maturitních kritérií v reálném čase
│   ├── table.js           # Renderování kánonu a interaktivní výběr děl
│   ├── filters.js         # Vyhledávání, filtrování podle období a žánrů
│   ├── transfer.js        # Import / Export výběru (JSON, URL hash, QR)
│   ├── print.js           # Tiskový engine, stealth režim učitele (5-klik)
│   └── reset.js           # Bezpečné obnovení výchozího stavu
└── admin/                 # Správcovské rozhraní pro katedru ČJL
    ├── state.js           # Virtuální paměť databáze děl a stav změn
    ├── auth.js            # Multi-device přihlašování a ochrana proti kolizím
    ├── session.js         # Správa tokenů a bezpečnostního odhlášení
    ├── ui.js              # Řízení záložek a administračních modálů
    ├── database.js        # Manipulace s tabulkou, editace řádků
    ├── table.js           # Vykreslování adminské tabulky a řazení
    ├── teleport.js        # Rychlý přesun děl na přesnou číselnou pozici
    ├── users.js           # Správa učitelských účtů a rolí
    ├── changelog.js       # Tvorba a publikace revizních záznamů
    ├── audit.js           # Auditní logování administrátorských operací
    ├── inbox.js           # Pošta nápadů od vyučujících, schvalování
    ├── recovery.js        # Disaster recovery ze záložních .js souborů
    └── export.js          # Kompilace databáze a odeslání na Cloudflare Edge
```

---

### 2. Tiskový engine (A4 JIT Canvas & CSS Klonování)

Pro tisk oficiálních maturitních protokolů je využit dedikovaný tiskový firewall v `js/student/print.js`:
* **Izolovaný skrytý iFrame:** Tiskový dokument se sestavuje v izolovaném DOM kontextu, do kterého jsou dynamicky naklonovány všechny aktivní CSS styly.
* **Anti-Fracture protokol:** Striktní CSS pravidla (`page-break-inside: avoid; break-inside: avoid;`) zajišťují, že žádný řádek knihy ani záhlaví nebude zlomeno mezi stránkami.
* **Normalizace prázdných buněk:** Při tisku bez osobních údajů vkládá engine do buněk nezlomitelnou mezeru (`&nbsp;`), což zaručuje, že tabulkový procesor prohlížeče nezbortí výšku řádků a vytiskne rovnoměrné ohraničené linky.

---

### 3. Serverless Edge Backend (Cloudflare Worker)

Backend běží jako bezestavová serverless funkce na globální síti Cloudflare:
* **Zero-Trust & Cloudflare Turnstile:** Ochrana proti zneužití a botům při administrátorských akcích.
* **Optimistic Concurrency Control (OCC):** Prevence kolizí při souběžné práci více pedagogů. Před zápisem do repozitáře Worker ověřuje hash výchozího stavu oproti `main` větvi na GitHubu:
  $$\text{Hash}(\text{Client DB}) \stackrel{?}{=} \text{Hash}(\text{Remote DB})$$
  Pokud dojde ke kolizi, zápis je zastaven s kódem HTTP 409 a je nabídnuta obnova přes Cloud Stash.
* **Cloud Stash (PIN):** Rozpracovaná práce je zašifrována a uložena do Cloudflare KV pod 4místným PIN kódem s automatickou expirací 7 dní.
* **Microsoft Teams Webhook Dispatcher:** Asynchronní odesílání strukturovaných karet *Adaptive Cards v1.4* s informacemi o schválených změnách do školního Teams kanálu.

---

### 4. Matematický aparát: LIS Engine (Longest Increasing Subsequence)

Při úpravách pořadí děl je zapotřebí přesně rozlišit, které knihy uživatel **aktivně přesunul**, a které se posunuly pouze pasivně v důsledku změny indexů (kaskádový posun).

K nalezení páteřního nepřemístěného řetězce slouží algoritmus nejdelší rostoucí podposloupnosti v $O(n \log n)$:
$$L[i] = 1 + \max \{L[j] \mid 0 \le j < i, \, origId[j] < origId[i] \}$$

Prvky mimo množinu $L_{\max}$ jsou v changelogu a náhledu označeny jako přesunuté, zatímco prvky uvnitř tvoří stabilní kostru.

---

### 5. Bezpečnostní model (Zero-Knowledge & RBAC)

* **Zero-Knowledge Privacy:** Žádná data studentů nejsou odesílána na servery, ukládána do cookies ani předávána třetím stranám.
* **Role-Based Access Control (RBAC):**
  * `vedouci`: Plná práva správy kánonu, schvalování nápadů a ostrý zápis do produkce.
  * `ucitel`: Možnost sestavovat koncepty a odesílat nápady do schránky vedoucí.
  * `omega`: Systémový administrátor pro správu uživatelů a disaster recovery.
* **Automatické odhlášení (Hybrid Decay):** Relace administrátora automaticky vyprší po 5 minutách nečinnosti s předchozím varováním.

---

## 💻 Spuštění projektu lokálně

Aplikace nevyžaduje žádné sestavovací nástroje (Webpack, Vite apod.) ani instalaci závislostí:

1. Naklonujte repozitář:
   ```bash
   git clone https://github.com/kareltresnak/MAT-CETBA.git
   cd MAT-CETBA
   ```
2. Spusťte libovolný lokální webový server:
   ```bash
   # Např. pomocí Pythonu
   python -m http.server 8000
   
   # Nebo pomocí Node.js npx
   npx serve .
   ```
3. Otevřete v prohlížeči: `http://localhost:8000`

---

## 📜 Licence a autorská práva

* **Autor:** Karel Třešňák
* **Vlastník práv / Určení:** Určeno výhradně pro potřeby SPŠ a VOŠ Příbram
* **Licence:** Všechna práva vyhrazena (All rights reserved)

Zdrojový kód je zveřejněn výhradně pro účely transparentnosti a nezávislého auditu (Zero-Knowledge ochrana soukromí). Jakékoliv šíření, kopírování, modifikace či komerční využití bez předchozího písemného souhlasu autora je zakázáno.