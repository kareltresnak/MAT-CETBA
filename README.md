## 📚 OMEGA: Enterprise Edge Infrastructure (v10.0.0)

**Live Demos:** 
* [🏛️ Institucionální Edice (SPŠPB)](https://kareltresnak.github.io/MAT-CETBA/?theme=spspb) – Plný branding; persistentní UI kotva.
* [🦀 Rust Edition](https://kareltresnak.github.io/MAT-CETBA/?theme=default) – High-contrast estetika; branding-on-demand.

OMEGA v10.0.0 redefinuje standardy akademických systémů. Původní kolaborativní platforma byla transformována na **komplexní Event-Driven Serverless Ekosystém** operující na hraně sítě (Cloudflare Edge). Desátá generace přináší plně bezestavový Zero-Trust backend, asynchronní Webhook pipeline a exaktní správu operační paměti s automatickou synchronizací do WYSIWYG PDF kompilátoru.

---

### 🌐 Event-Driven Pipeline & Teams Dispatcher

Systém již nečeká na manuální polling. Komunikace je striktně asynchronní a řízená událostmi.

* **Signal vs. Noise Webhook Filter:** Aplikace naslouchá na nativních GitHub Webhoocích (`workflow_run`). Pro eliminaci informačního šumu (např. systémové non-data commity) implementuje Worker dynamickou inspekci commit diffu přes GitHub API. Akce je propuštěna pouze tehdy, pokud je exaktně modifikován soubor `data-spspb.js`.
* **Adaptive Teams Dispatcher:** Integrovaný notifikační engine s kaskádovým vyhodnocováním kontextu. Odesílá interaktivní Adaptive Cards do MS Teams na základě stavového vektoru (Návrh ➔ Celnice ➔ Ostrá Produkce). Využívá hardwarově izolovaný výpočet lokálního pražského času (TZ offset) přímo v izolátu V8.

### 🛡️ Zero-Trust Edge Router & Kryptografie

Serverless infrastruktura je chráněna vrstveným bezpečnostním modelem, který odmítá implicitní důvěru.

* **Stateless JWT Ověřování:** Autentizace nevyužívá sessions. Každý chráněný endpoint vyžaduje kryptograficky podepsaný JWT token (HMAC-SHA256), ověřovaný přímo na Edge routeru v řádu milisekund.
* **L7 Volumetric DDoS Mitigation:** Perimetr je zajištěn asymetrickou výzvou (Cloudflare Turnstile). Náklady na výpočetní výkon jsou přeneseny na stranu útočníka: $E_{attack} \gg E_{defense}$.
* **Asymetrický Device Fingerprinting:** K ochraně proti brute-force útokům v NAT prostředí je generován 256-bitový entropický vektor: $Hash(E_{client})$.
* **Optimistic Concurrency Control (OCC):** Prevence "Lost Update" scénářů. Zápis do databáze je povolen pouze při shodě stavového hashe (State Hash). Verze 10 zavádí instrukci `BYPASS_OCC` výhradně pro kritické administrátorské Override zásahy.

### 🧠 Dynamic State Management & Data Integrity

Data musí být exaktní. Aplikace likviduje mrtvé stavy (Phantom States) a zaručuje bitově přesnou serializaci.

* **Amnesia-Proof WYSIWYG PDF Engine:** Generátor tiskových sestav již nepracuje s hardcodovanými DOM fragmenty. Využívá Just-in-Time kompilaci (JIT) závislou na agresivní synchronizaci lokální paměti (`window.OMEGA_CONFIG`). Změny v konfiguračních tabulkách ŠVP se okamžitě, beze ztrát a zacyklení, propisují do renderovacího stromu.
* **Exact-Line Serialization:** Opuštění křehkých regulárních výrazů. Exportní engine rekonstruuje databázi (KNIHY_DB i OBORY_CONFIG) od nuly pomocí dedikovaných formátovačů, čímž zajišťuje dokonalou jednořádkovou čistotu JSON struktury v cílovém repozitáři.

### 🏛️ Architektura a Algoritmizace (LIS Engine)

* **Detekce změn pomocí LIS (Longest Increasing Subsequence):** Pro vizualizaci rozdílů (Diff) v databázi nevyužíváme naivní porovnávání indexů. Aplikujeme algoritmus nejdelší rostoucí podposloupnosti v čase $\mathcal{O}(N^2)$, který matematicky rozlišuje mezi **manuálním přesunem děl** a **kaskádovým posunem ID**.
* **3-Way Merge & Conflict Resolver:** Asynchronní slučování cizích návrhů z Pošty. Detailní vizualizace kolizí ("Z čeho ➔ Na co") na úrovni jednotlivých datových uzlů.

### ⚙️ Zero-Friction PWA Lifecycle Engine

Tradiční SPA/PWA aplikace trpí na "Zombie Frontend" a destruktivní aktualizace. OMEGA implementuje pokročilý Observer Pattern.

* **Silent Hot-Swap (Public Mode):** Instalace nového jádra a invalidace cache asynchronně na pozadí. Přechod je vyřešen milisekundovým auto-reloadem přes `controllerchange` event.
* **State-Preserving Intercept (Admin Mode):** Při detekci modifikované instance (`_isEdited`) blokuje Observer restart aplikace. UI vynutí záchranný protokol (Zálohovací PIN) nebo uloží data do tichého Staging enginu (`OMEGA_STAGING_SAVED`), čímž garantuje nulovou ztrátu entropie (Data Loss Prevention).

---

## 🔬 Technický Appendix: Algoritmický Deep-Dive

### 1. Matematické určení kaskádových přesunů
K identifikaci prvků, které zůstaly v "páteřním pořadí", využíváme dynamické programování:
$$L[i] = 1 + \max \{L[j] \mid 0 \le j < i, \, origId[j] < origId[i] \}$$
Prvky neležící ve vypočtené množině $L_{max}$ jsou klasifikovány jako "Manually Moved".

### 2. Stavový automat sezení (Hybrid Decay)
$$S(t) = 
\begin{cases} 
\text{Transparentní} & \text{pro } t < 10s \\
\text{HUD-Varování} & \text{pro } 10s \le t < 240s \\
\text{Modal-Takeover} & \text{pro } 240s \le t < 300s \\
\text{Terminace} & \text{pro } t \ge 300s 
\end{cases}$$