// =====================================================================
// KONFIGURACE PROSTŘEDÍ: SPŠ a VOŠ PŘÍBRAM (VÝCHOZÍ)
// =====================================================================

window.OMEGA_CONFIG = {
    LAST_UPDATE: "25. 5. 2026",
    REQUIREMENTS: { do18: 2, "19": 3, svet20: 4, cz20: 5, lyrika: 2, epika: 2, drama: 2 },
    
    FORM_HTML: `
        <div class="input-group">
            <input type="text" id="student-name" class="styled-input" placeholder="Jméno a příjmení" autocomplete="name">
            <input type="text" id="student-dob" class="styled-input" placeholder="Datum nar. (např. 1. 1. 2007)" autocomplete="bday">
            <input type="text" id="student-class" class="styled-input" placeholder="Třída (např. 4.IT)">
            <div class="styled-input" id="year-wrapper" style="display: flex; align-items: center; gap: 6px; color: var(--text-muted); cursor: text;" onclick="document.getElementById('student-year').focus()">
                <span>Školní rok: 20</span>
                <input type="text" id="student-year" maxlength="2" placeholder="25" autocomplete="off" style="width: 30px; border: none; background: transparent; color: var(--text-main); font-weight: 900; font-family: inherit; font-size: 1.15em; outline: none; text-align: center; border-bottom: 2px solid var(--accent-primary); padding: 0 0 2px 0; border-radius: 0; box-shadow: none; -webkit-appearance: none; appearance: none;">
                <span> / 20</span><span id="student-year-next" style="color: var(--text-main); font-weight: bold;">26</span>
            </div>
        </div>
    `,
    RULES_HTML: "",
    FORM_FIELDS: ['name', 'dob', 'class', 'year'],
    OBORY_CONFIG: [{"kod":"18-20-M/01 IT","svp":"Informační technologie"}],

    renderPdf: function(selectedBooks, student, sanitize) {
        const buckets = { do18: [], "19": [], svet20: [], cz20: [], dalsi: [] };
        const limits = { do18: 2, "19": 3, svet20: 4, cz20: 5 };
        const counts = { do18: 0, "19": 0, svet20: 0, cz20: 0 };

        selectedBooks.forEach(k => {
            if (counts[k.obdobi] < limits[k.obdobi]) {
                buckets[k.obdobi].push(k);
                counts[k.obdobi]++;
            } else {
                buckets.dalsi.push(k);
            }
        });

        let counter = 1; 
        const renderRows = (books) => {
            return books.map(k => `
                <tr>
                    <td class="col-c">${counter++}.</td>
                    <td class="col-cs">${k.id}</td>
                    <td class="col-autor">${sanitize(k.autor)}</td>
                    <td class="col-nazev">${sanitize(k.dilo)}</td>
                </tr>
            `).join('');
        };

        return `
            <style>
                @page { size: A4 portrait; margin: 0 !important; }
                
                @media print {
                    body > * { display: none !important; }
                    body > #print-area { display: block !important; }
                    body, html { margin: 0 !important; padding: 0 !important; background: white !important; }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }

                .print-page {
                    /* Topologie A4 formátu */
                    width: 210mm !important; 
                    min-height: 297mm !important;
                    margin: 0 auto;
                    padding: 20mm 15mm; 
                    background: white !important;
                    color: black !important;
                    font-family: 'Times New Roman', 'Arial', sans-serif !important; 
                    position: relative;
                    box-sizing: border-box;
                }

                /* 📐 ANTI-FRACTURE PROTOKOL: Ochrana proti zlomení textu */
                .official-table { width: 100%; border-collapse: collapse; }
                .official-table tr { 
                    page-break-inside: avoid; 
                    break-inside: avoid; 
                }
                .official-table .subheader { 
                    page-break-after: avoid; 
                    break-after: avoid; 
                }
            </style>
            
            <div class="print-page">
                <table class="official-table">
                    <colgroup>
                        <col style="width: 5%;">
                        <col style="width: 5%;">
                        <col style="width: 40%;">
                        <col style="width: 50%;">
                    </colgroup>
                    <tbody>
                        <tr>
                            <td colspan="4" class="title-cell">
                                <table class="header-layout">
                                    <tr>
                                        <td class="header-logo-col"><img src="spspb-logo-2000px.png" class="print-logo" alt="Znak SPŠ"></td>
                                        <td class="header-text-col">
                                            Střední průmyslová škola a Vyšší odborná škola Příbram II, Hrabákova 271<br>
                                            Seznam literárních děl: <strong>MATURITNÍ ZKOUŠKA Z ČJL - ústní část</strong>
                                        </td>
                                        <td class="header-spacer-col"></td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr><td colspan="3" class="info-label">jméno a příjmení:</td><td class="info-value">${sanitize(student.name)}</td></tr>
                        <tr><td colspan="3" class="info-label">datum narození:</td><td class="info-value">${sanitize(student.dob)}</td></tr>
                        <tr><td colspan="3" class="info-label">třída:</td><td class="info-value">${sanitize(student.class)}</td></tr>
                        <tr><td colspan="3" class="info-label">školní rok:</td><td class="info-value">${sanitize(student.year)}</td></tr>

                        <tr class="col-headers">
                            <td class="col-c">č.</td><td class="col-cs">č.s.</td><td class="col-autor">autor:</td><td class="col-nazev">název díla:</td>
                        </tr>

                        <tr class="subheader"><td colspan="4">Světová a česká literatura do konce 18.století</td></tr>
                        ${renderRows(buckets.do18)}

                        <tr class="subheader"><td colspan="4">Světová a česká literatura 19.století</td></tr>
                        ${renderRows(buckets['19'])}

                        <tr class="subheader"><td colspan="4">Světová literatura 20. a 21. století</td></tr>
                        ${renderRows(buckets.svet20)}

                        <tr class="subheader"><td colspan="4">Česká literatura 20. a 21. století</td></tr>
                        ${renderRows(buckets.cz20)}

                        <tr class="subheader"><td colspan="4">Další četba</td></tr>
                        ${renderRows(buckets.dalsi)}

                        <tr>
                            <td colspan="3" class="footer-cell">podpis:</td>
                            <td class="footer-cell">zkontroloval:</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    },
    CHANGELOG_DB: [
        {
                "type": "db",
                "version": "Revize databáze (9.3.0)",
                "date": "25. 5. 2026",
                "notes": [
                        "<strong style=\"color: #f59e0b; display: block; margin-bottom: 10px; font-size: 1.1em; letter-spacing: 0.5px;\">✏️ UPRAVENÁ DĚLA:</strong><div style=\"display: flex; flex-direction: column; gap: 6px; margin-bottom: 20px;\"><div style=\"padding: 8px 12px; background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.15); border-radius: 6px;\">\n            <div style=\"display: grid; grid-template-columns: 55px 3fr 2.5fr 1fr 1.5fr; gap: 10px; align-items: center; width: 100%;\">\n                <strong style=\"color: var(--accent-primary-light);\">ID 2</strong>\n                <span style=\"font-weight: bold; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;\">Romeo a Džilí</span>\n                <span style=\"color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;\">William Shakespeare</span>\n                <span style=\"color: var(--text-muted); font-size: 0.9em;\">drama</span>\n                <span style=\"color: var(--text-muted); font-size: 0.9em; text-align: right;\">Do konce 18. st.</span>\n            </div><div style=\"margin-top: 8px; padding-top: 8px; border-top: 1px dashed rgba(245, 158, 11, 0.3); font-size: 0.85em; color: var(--text-muted); display: flex; flex-direction: column; gap: 4px;\"><div><strong>Dílo:</strong> <span style=\"text-decoration:line-through; opacity:0.6;\">Romeo a Julie</span> ➔ <span style=\"color: #f59e0b;\">Romeo a Džilí</span></div></div></div></div>"
                ]
        }
],
    KNIHY_DB: [
{ "id": 1, "origId": 1, "dilo": "Ilias", "autor": "Homér", "druh": "epika", "obdobi": "do18" },
{ "id": 2, "origId": 2, "dilo": "Romeo a Džilí", "autor": "William Shakespeare", "druh": "drama", "obdobi": "do18" },
{ "id": 3, "origId": 3, "dilo": "Kytice", "autor": "Karel Jaromír Erben", "druh": "lyrika", "obdobi": "19" },
{ "id": 4, "origId": 4, "dilo": "Máj", "autor": "Karel Hynek Mácha", "druh": "lyrika", "obdobi": "19" },
{ "id": 5, "origId": 5, "dilo": "Povídky malostranské", "autor": "Jan Neruda", "druh": "epika", "obdobi": "19" },
{ "id": 6, "origId": 6, "dilo": "Oliver Twist", "autor": "Charles Dickens", "druh": "epika", "obdobi": "19" },
{ "id": 7, "origId": 7, "dilo": "Slezské písně", "autor": "Petr Bezruč", "druh": "lyrika", "obdobi": "cz20" },
{ "id": 8, "origId": 8, "dilo": "Krysař", "autor": "Viktor Dyk", "druh": "epika", "obdobi": "cz20" },
{ "id": 9, "origId": 9, "dilo": "R. U. R.", "autor": "Karel Čapek", "druh": "drama", "obdobi": "cz20" },
{ "id": 10, "origId": 10, "dilo": "Osudy dobrého vojáka Švejka", "autor": "Jaroslav Hašek", "druh": "epika", "obdobi": "cz20" },
{ "id": 11, "origId": 11, "dilo": "Proměna", "autor": "Franz Kafka", "druh": "epika", "obdobi": "svet20" },
{ "id": 12, "origId": 12, "dilo": "Na západní frontě klid", "autor": "Erich Maria Remarque", "druh": "epika", "obdobi": "svet20" },
{ "id": 13, "origId": 13, "dilo": "Stařec a moře", "autor": "Ernest Hemingway", "druh": "epika", "obdobi": "svet20" },
{ "id": 14, "origId": 14, "dilo": "Spalovač mrtvol", "autor": "Ladislav Fuks", "druh": "epika", "obdobi": "cz20" },
{ "id": 15, "origId": 15, "dilo": "Vyšetřování ztráty třídní knihy", "autor": "Smoljak, Svěrák", "druh": "drama", "obdobi": "cz20" },
{ "id": 16, "origId": 16, "dilo": "Píseň o Viktorce", "autor": "Jaroslav Seifert", "druh": "lyrika", "obdobi": "cz20" },
{ "id": 17, "origId": 17, "dilo": "Smrt je mým řemeslem", "autor": "Robert Merle", "druh": "epika", "obdobi": "svet20" },
{ "id": 18, "origId": 18, "dilo": "Farma zvířat", "autor": "George Orwell", "druh": "epika", "obdobi": "svet20" },
{ "id": 19, "origId": 19, "dilo": "Ostře sledované vlaky", "autor": "Bohumil Hrabal", "druh": "epika", "obdobi": "cz20" },
{ "id": 20, "origId": 20, "dilo": "Báječná léta pod psa", "autor": "Michal Viewegh", "druh": "epika", "obdobi": "cz20" },
{ "id": 21, "origId": 21, "dilo": "Král Oidipus", "autor": "Sofokles", "druh": "drama", "obdobi": "do18" },
{ "id": 22, "origId": 22, "dilo": "Bible pro děti", "autor": "Hadaway, Atcheson", "druh": "epika", "obdobi": "do18" },
{ "id": 23, "origId": 23, "dilo": "Lakomec", "autor": "Moliére", "druh": "drama", "obdobi": "do18" },
{ "id": 24, "origId": 24, "dilo": "Revizor", "autor": "Nikolaj V. Gogol", "druh": "drama", "obdobi": "19" },
{ "id": 25, "origId": 25, "dilo": "Tyrolské elegie", "autor": "Karel Havlíček Borovský", "druh": "lyrika", "obdobi": "19" },
{ "id": 26, "origId": 26, "dilo": "Jáma a kyvadlo", "autor": "Edgar Allan Poe", "druh": "epika", "obdobi": "19" },
{ "id": 27, "origId": 27, "dilo": "O myších a lidech", "autor": "John Steinbeck", "druh": "epika", "obdobi": "svet20" },
{ "id": 28, "origId": 28, "dilo": "Rozmarné léto", "autor": "Vladislav Vančura", "druh": "epika", "obdobi": "cz20" },
{ "id": 29, "origId": 29, "dilo": "Válka s mloky", "autor": "Karel Čapek", "druh": "epika", "obdobi": "cz20" },
{ "id": 30, "origId": 30, "dilo": "451 stupňů Fahrenheita", "autor": "Ray Bradbury", "druh": "epika", "obdobi": "svet20" },
{ "id": 31, "origId": 31, "dilo": "Audience", "autor": "Václav Havel", "druh": "drama", "obdobi": "cz20" },
{ "id": 32, "origId": 32, "dilo": "Kníška", "autor": "Karel Kryl", "druh": "lyrika", "obdobi": "cz20" },
{ "id": 33, "origId": 33, "dilo": "Zbabělci", "autor": "Josef Škvorecký", "druh": "epika", "obdobi": "cz20" },
{ "id": 34, "origId": 34, "dilo": "Žert", "autor": "Milan Kundera", "druh": "epika", "obdobi": "cz20" },
{ "id": 35, "origId": 35, "dilo": "Chrám Matky Boží v Paříži", "autor": "Victor Hugo", "druh": "epika", "obdobi": "19" },
{ "id": 36, "origId": 36, "dilo": "Robinson Crusoe", "autor": "Daniel Defoe", "druh": "epika", "obdobi": "do18" },
{ "id": 37, "origId": 37, "dilo": "Malý princ", "autor": "Antoine de Saint-Exupéry", "druh": "epika", "obdobi": "svet20" },
{ "id": 38, "origId": 38, "dilo": "Němá barikáda", "autor": "Jan Drda", "druh": "epika", "obdobi": "cz20" },
{ "id": 39, "origId": 39, "dilo": "Smrt krásných srnců", "autor": "Ota Pavel", "druh": "epika", "obdobi": "cz20" },
{ "id": 40, "origId": 40, "dilo": "Misery", "autor": "Stephen King", "druh": "epika", "obdobi": "svet20" },
{ "id": 41, "origId": 41, "dilo": "Společenstvo Prstenu", "autor": "J.R.R. Tolkien", "druh": "epika", "obdobi": "svet20" },
{ "id": 42, "origId": 42, "dilo": "Občanský průkaz", "autor": "Petr Šabach", "druh": "epika", "obdobi": "cz20" },
{ "id": 43, "origId": 43, "dilo": "Den trifidů", "autor": "John Wyndham", "druh": "epika", "obdobi": "svet20" },
{ "id": 44, "origId": 44, "dilo": "Edison", "autor": "Vítězslav Nezval", "druh": "lyrika", "obdobi": "cz20" },
{ "id": 45, "origId": 45, "dilo": "Zkrocení zlé ženy", "autor": "William Shakespeare", "druh": "drama", "obdobi": "do18" },
{ "id": 46, "origId": 46, "dilo": "Strakonický dudák", "autor": "Josef Kajetán Tyl", "druh": "drama", "obdobi": "19" },
{ "id": 47, "origId": 47, "dilo": "Babička", "autor": "Božena Němcová", "druh": "epika", "obdobi": "19" },
{ "id": 48, "origId": 48, "dilo": "Balady a romance", "autor": "Jan Neruda", "druh": "lyrika", "obdobi": "19" },
{ "id": 49, "origId": 49, "dilo": "Nový epochální výlet pana Broučka, tentokráte do 15. století", "autor": "Svatopluk Čech", "druh": "epika", "obdobi": "19" },
{ "id": 50, "origId": 50, "dilo": "Bylo nás pět", "autor": "Karel Poláček", "druh": "epika", "obdobi": "cz20" },
{ "id": 51, "origId": 51, "dilo": "Maryša", "autor": "Alois a Vilém Mrštíkové", "druh": "drama", "obdobi": "19" },
{ "id": 52, "origId": 52, "dilo": "Nikola Šuhaj loupežník", "autor": "Ivan Olbracht", "druh": "epika", "obdobi": "cz20" },
{ "id": 53, "origId": 53, "dilo": "Saturnin", "autor": "Zdeněk Jirotka", "druh": "epika", "obdobi": "cz20" },
{ "id": 54, "origId": 54, "dilo": "České nebe", "autor": "Smoljak, Svěrák", "druh": "drama", "obdobi": "cz20" },
{ "id": 55, "origId": 55, "dilo": "Postřižiny", "autor": "Bohumil Hrabal", "druh": "epika", "obdobi": "cz20" },
{ "id": 56, "origId": 56, "dilo": "Hana", "autor": "Alena Mornštajnová", "druh": "epika", "obdobi": "cz20" },
{ "id": 57, "origId": 57, "dilo": "Tankový prapor", "autor": "Josef Škvorecký", "druh": "epika", "obdobi": "cz20" },
{ "id": 58, "origId": 58, "dilo": "Memento", "autor": "Radek John", "druh": "epika", "obdobi": "cz20" },
{ "id": 59, "origId": 59, "dilo": "Jeden den Ivana Děnisoviče", "autor": "Alexandr Solženicyn", "druh": "epika", "obdobi": "svet20" },
{ "id": 60, "origId": 60, "dilo": "Alchymista", "autor": "Paulo Coelho", "druh": "epika", "obdobi": "svet20" },
{ "id": 61, "origId": 61, "dilo": "Tartuffe", "autor": "Moliére", "druh": "drama", "obdobi": "do18" },
{ "id": 62, "origId": 62, "dilo": "Modlitba pro K. Horovitzovou", "autor": "Arnošt Lustig", "druh": "epika", "obdobi": "cz20" },
{ "id": 63, "origId": 63, "dilo": "Pes baskervillský", "autor": "Arthur Conan Doyle", "druh": "epika", "obdobi": "svet20" },
{ "id": 64, "origId": 64, "dilo": "Vražda v Orient-expresu", "autor": "Agatha Christie", "druh": "epika", "obdobi": "svet20" },
{ "id": 65, "origId": 65, "dilo": "Velký Gatsby", "autor": "Francis Scott Fitzgerald", "druh": "epika", "obdobi": "svet20" },
{ "id": 66, "origId": 66, "dilo": "Pýcha a předsudek", "autor": "Jane Austenová", "druh": "epika", "obdobi": "19" }
    ]
};