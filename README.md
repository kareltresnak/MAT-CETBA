# 📂 Academic & Software Projects (OMEGA Suite)

Profesionální portfolio projektů zaměřených na distribuované systémy, kryptografickou validaci a pokročilou algoritmizaci.

---

## 📚 OMEGA: Distribuovaný asynchronní ekosystém (v9.0.0)

**Live Demos:** 
* [🏛️ Institucionální Edice (SPŠPB)](https://kareltresnak.github.io/MAT-CETBA/?theme=spspb) – Plný branding; persistentní UI kotva.
* [🦀 Rust Edition](https://kareltresnak.github.io/MAT-CETBA/?theme=default) – High-contrast estetika; branding-on-demand.

**Repozitář:** [📂 Zdrojový kód](https://github.com/kareltresnak/MAT-CETBA)

OMEGA v9.0.0 není pouhým generátorem seznamů; je to **kolaborativní platforma s 3-Way Merge enginem**, postavená na distribuované infrastruktuře (PWA + Cloudflare Workers). Verze 9.0.0 integruje pokročilou teorii grafů pro synchronizaci dat mezi více editory bez rizika kolize.

### 🏛️ Architektura a Algoritmizace (LIS Engine)

* **Detekce změn pomocí LIS (Longest Increasing Subsequence):** Pro vizualizaci rozdílů (Diff) v databázi nevyužíváme naivní porovnávání indexů. Implementovali jsme algoritmus nejdelší rostoucí podposloupnost v čase $\mathcal{O}(N^2)$, který matematicky rozlišuje mezi **manuálním přesunem děl** (žlutý příznak) a **kaskádovým posunem ID** způsobeným okolními změnami (modrý příznak).
* **3-Way Merge & Conflict Resolver:** Systém umožňuje asynchronní slučování cizích návrhů do rozpracovaného editoru. V případě konfliktu (shodná díla na různých pozicích) se aktivuje interaktivní Mergetool, který vynutí manuální rozlišení kolidujících vektorů.
* **Dual-Track Auditing (Smart Changelog):** Historie změn je rozdělena na systémové aktualizace (`dev`) a databázové revize (`db`). Každá schválená změna v seznamu děl automaticky generuje datový snapshot (počty změn + autorizace), čímž zaručuje 100% auditní integritu.

### 🛡️ Bezpečnostní protokoly Edge Gateway

* **L7 Volumetric DDoS Mitigation:** Perimetr je zajištěn asymetrickou výzvou (Cloudflare Turnstile). Náklady na výpočetní výkon jsou přeneseny na stranu útočníka ($E_{attack} \gg E_{defense}$).
* **Asymetrický Device Fingerprinting:** K ochraně proti brute-force útokům v NAT prostředí využíváme klientský CSPRNG (Web Crypto API), který generuje 256-bitový entropický vektor: $Hash(E_{client})$.
* **Optimistic Concurrency Control (OCC):** Ochrana proti "Lost Update" problému pomocí polynomiálního hashování stavu. Commit je přijat pouze tehdy, pokud se kontrolní součet klienta shoduje se snapshotem na serveru.

---

## 🔬 Technický Appendix: Algoritmický Deep-Dive

### 1. Matematické určení kaskádových přesunů
K identifikaci prvků, které zůstaly v "páteřním pořadí", využíváme dynamické programování:
$$L[i] = 1 + \max \{L[j] \mid 0 \le j < i, \, origId[j] < origId[i] \}$$
Prvky, které nejsou součástí vypočtené množiny $L_{max}$, jsou označeny jako "Manually Moved".

### 2. Stavový automat sezení (Hybrid Decay)
$$S(t) = 
\begin{cases} 
\text{Transparentní} & \text{pro } t < 10s \\
\text{HUD-Varování} & \text{pro } 10s \le t < 240s \\
\text{Modal-Takeover} & \text{pro } 240s \le t < 300s \\
\text{Terminace} & \text{pro } t \ge 300s 
\end{cases}$$