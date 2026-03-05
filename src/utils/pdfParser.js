import * as pdfjsLib from 'pdfjs-dist';

// Set up the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
).toString();

// ============================================
// Company names to EXCLUDE from client detection
// ============================================
const OWN_COMPANY_NAMES = [
    'DW CONSTRUCOES',
    'DW CONSTRUÇÕES',
    'AMAZING COMERCIO',
    'AMAZING COMÉRCIO',
    'AMAZING CONSTRUCOES',
    'AMAZING CONSTRUÇÕES',
];

/**
 * Extracts all text from a PDF file, preserving spatial layout
 */
export async function extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;
    let fullText = '';
    const pages = [];

    for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        // Preserve line breaks by grouping items by Y position
        const lineMap = {};
        textContent.items.forEach(item => {
            if (!item.str.trim()) return;
            const y = Math.round(item.transform[5]);
            if (!lineMap[y]) lineMap[y] = [];
            lineMap[y].push({ x: item.transform[4], text: item.str });
        });

        const sortedYs = Object.keys(lineMap).sort((a, b) => Number(b) - Number(a));
        let pageText = '';
        for (const y of sortedYs) {
            const lineItems = lineMap[y].sort((a, b) => a.x - b.x);
            pageText += lineItems.map(l => l.text).join(' ') + '\n';
        }

        pages.push(pageText.trim());
        fullText += pageText + '\n';
    }

    return { fullText: fullText.trim(), pages, totalPages };
}

/**
 * Check if a name matches one of our own companies
 */
function isOwnCompany(name) {
    const upper = name.toUpperCase();
    return OWN_COMPANY_NAMES.some(own => upper.includes(own));
}

/**
 * Parse budget data from extracted PDF text.
 */
export function parseBudgetFromText(text) {
    const budget = {
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        product: '',        // Descrição do item
        region: '',
        state: '',
        city: '',
        value: 0,           // Valor Total (R$)
        unitPrice: 0,       // Unit. (R$)
        quantity: '',        // Quant.
        notes: '',
        budgetNumber: '',
        cnpj: '',
        rawText: text,
    };

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // ============================================
    // 1. BUDGET NUMBER (Orçamento Nº XXX)
    // ============================================
    const budgetNumMatch = text.match(/[Oo]r[çc]amento\s*(?:N[ºo°]?|n[ºo°]?|#)\s*(\d+)/i);
    if (budgetNumMatch) {
        budget.budgetNumber = budgetNumMatch[1];
    }

    // ============================================
    // 2. CLIENT NAME — always in ALL CAPS, below "Informações do Cliente"
    // ============================================
    let clientHeaderIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (/informa[çc][õo]es\s+do\s+cliente/i.test(lines[i])) {
            clientHeaderIndex = i;
            break;
        }
    }

    if (clientHeaderIndex >= 0) {
        for (let i = clientHeaderIndex + 1; i < Math.min(clientHeaderIndex + 8, lines.length); i++) {
            const line = lines[i].trim();
            if (line.length < 5) continue;
            if (/^(CNPJ|CPF|CEP|Inscri|Telefone|Tel\b|Email|Fone|Cel\b)/i.test(line)) continue;
            if (/^\d/.test(line)) continue;

            const letters = line.replace(/[^A-ZÀ-Úa-zà-ú]/g, '');
            if (letters.length < 5) continue;
            const upperLetters = line.replace(/[^A-ZÀ-ÚÇÑ]/g, '');
            const upperRatio = upperLetters.length / letters.length;

            if (upperRatio >= 0.7) {
                const cleanName = line.replace(/\s+/g, ' ').trim();
                if (!isOwnCompany(cleanName)) {
                    budget.clientName = cleanName;
                    break;
                }
            }
        }
    }

    // Fallback: scan all lines for first ALL-CAPS name (not ours)
    if (!budget.clientName) {
        const headerWords = new Set([
            'ORÇAMENTO', 'PROPOSTA', 'COMERCIAL', 'INFORMAÇÕES', 'DO', 'CLIENTE',
            'DADOS', 'CNPJ', 'CPF', 'CEP', 'INSCRIÇÃO', 'ESTADUAL', 'CONDIÇÕES',
            'PAGAMENTO', 'FORMA', 'PRAZO', 'ENTREGA', 'VALIDADE', 'OBSERVAÇÕES',
            'TOTAL', 'SUBTOTAL', 'QUANTIDADE', 'DESCRIÇÃO', 'ITEM', 'VALOR',
            'UNITÁRIO', 'SERVIÇO', 'PRODUTO', 'PREÇO', 'IMPOSTOS', 'FRETE',
            'BANCO', 'AGÊNCIA', 'CONTA', 'PIX', 'NOTA', 'FISCAL', 'ITENS',
        ]);

        for (const line of lines) {
            if (line.length < 10) continue;
            if (/^(CNPJ|CPF|CEP|Inscri|Telefone|Tel\b|Email|Fone|Cel\b|Rua |Av |Avenida |Alameda |Rod |Estrada |Travessa |CONJ )/i.test(line)) continue;
            if (/^\d/.test(line)) continue;
            if (/R\$/.test(line)) continue;

            const letters = line.replace(/[^A-ZÀ-Úa-zà-ú]/g, '');
            if (letters.length < 5) continue;
            const upperLetters = line.replace(/[^A-ZÀ-ÚÇÑ]/g, '');
            const upperRatio = upperLetters.length / letters.length;

            if (upperRatio >= 0.8) {
                const words = line.split(/\s+/).filter(w => w.length >= 2);
                if (words.length >= 2) {
                    const isHeader = words.every(w => headerWords.has(w.toUpperCase().replace(/[^A-ZÀ-ÚÇÑ]/g, '')));
                    const cleanName = line.replace(/\s+/g, ' ').trim();
                    if (!isHeader && !isOwnCompany(cleanName)) {
                        budget.clientName = cleanName;
                        break;
                    }
                }
            }
        }
    }

    // ============================================
    // 3. CNPJ (client's, not ours)
    // ============================================
    const cnpjMatches = [...text.matchAll(/CNPJ\s*[:;\-–]?\s*(\d{2}[.\s]?\d{3}[.\s]?\d{3}[\/\s]?\d{4}[\-\s]?\d{2})/gi)];
    for (const match of cnpjMatches) {
        const cnpj = match[1].trim();
        if (cnpj.replace(/[.\-\/\s]/g, '') === '26844630000136') continue;
        budget.cnpj = cnpj;
        break;
    }

    // ============================================
    // 4. EMAIL
    // ============================================
    const emailMatch = text.match(/([\w._%+\-]+@[\w.\-]+\.\w{2,})/i);
    if (emailMatch) {
        budget.clientEmail = emailMatch[1];
    }

    // ============================================
    // 5. PHONE (client's, skip ours: 19 99520-5215)
    // ============================================
    const allPhones = [...text.matchAll(/(\(?\d{2}\)?\s*\d{4,5}[\-.\s]?\d{4})/g)];
    for (const match of allPhones) {
        const phone = match[1].replace(/[\s\-().]/g, '');
        if (phone === '19995205215') continue;
        budget.clientPhone = match[1].trim();
        break;
    }

    // ============================================
    // 6. CITY and STATE (client's, skip Mogi Mirim)
    // ============================================
    const cityStateMatches = [...text.matchAll(
        /([A-ZÀ-Úa-zà-ú][A-ZÀ-Úa-zà-ú\s]+?)\s*[\-–]\s*(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\s*[\-–]?\s*(?:CEP|cep)\s*[:;\-–]?\s*([\d.\-]+)/g
    )];

    for (const match of cityStateMatches) {
        const city = match[1].trim();
        const cep = match[3].replace(/[.\-\s]/g, '');
        if (cep === '13800165' || city.toLowerCase() === 'mogi mirim') continue;
        budget.city = city;
        budget.state = match[2];
        break;
    }

    if (!budget.state) {
        const cityState = text.match(
            /([A-ZÀ-Úa-zà-ú][A-ZÀ-Úa-zà-ú\s]{2,20})\s*[\/\-–]\s*(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/
        );
        if (cityState) {
            const possibleCity = cityState[1].trim();
            if (!/^(AVENIDA|RUA|ALAMEDA|RODOVIA|ESTRADA|TRAVESSA|CONJ|STO)\b/i.test(possibleCity) &&
                possibleCity.toLowerCase() !== 'mogi mirim') {
                budget.city = possibleCity;
                budget.state = cityState[2];
            }
        }
    }

    // ============================================
    // 7. REGION (derived from state)
    // ============================================
    const regionMap = {
        'Norte': ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'],
        'Nordeste': ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
        'Centro-Oeste': ['DF', 'GO', 'MT', 'MS'],
        'Sudeste': ['ES', 'MG', 'RJ', 'SP'],
        'Sul': ['PR', 'RS', 'SC'],
    };
    if (budget.state) {
        for (const [region, states] of Object.entries(regionMap)) {
            if (states.includes(budget.state)) {
                budget.region = region;
                break;
            }
        }
    }

    // ============================================
    // 8. ITEMS TABLE: Descrição, Quant., Unit. (R$), Valor Total (R$)
    // ============================================
    // Find the "Itens do Orçamento" section and extract from the table
    let itemsSectionIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (/itens\s+do\s+or[çc]amento/i.test(lines[i])) {
            itemsSectionIndex = i;
            break;
        }
    }

    if (itemsSectionIndex >= 0) {
        // Look for the data row(s) after the table header
        // Header: "Código Descrição NCM Quant. Unit. (R$) Valor Total (R$)"
        // Data:   "6 ASFALTO MULTI ENSACADO 25KG 2715.00.00 100,00 UN 47,0000 4.700,00"
        for (let i = itemsSectionIndex + 1; i < Math.min(itemsSectionIndex + 10, lines.length); i++) {
            const line = lines[i];

            // Skip the header row
            if (/c[óo]digo/i.test(line) && /descri[çc][ãa]o/i.test(line)) continue;
            if (!line || line.length < 5) continue;

            // Try to extract item data from a row that starts with a code number
            // Pattern: CODE DESCRIPTION NCM QUANTITY UNIT_PRICE TOTAL_VALUE
            // The numbers at the end follow patterns like: 100,00 UN 47,0000 4.700,00
            const itemMatch = line.match(
                /^\s*(\d+)\s+(.+?)\s+(\d{4}[\d.]*)\s+([\d.,]+)\s*(UN|KG|L|M|M2|M3|TON|PÇ|PC|CX|SC|BB|BD|GL|LT|MT|FD|RL|TB|UN\.)?\s*([\d.,]+)\s+([\d.,]+)\s*$/i
            );

            if (itemMatch) {
                budget.product = itemMatch[2].trim();
                budget.quantity = itemMatch[4] + (itemMatch[5] ? ' ' + itemMatch[5] : '');
                budget.unitPrice = parseMoneyValue(itemMatch[6]);
                budget.value = parseMoneyValue(itemMatch[7]);
            } else {
                // Simpler approach: find all monetary values at the end of the line
                // Try to grab description and values
                const valuesMatch = line.match(/([\d.,]+)\s+([\d.,]+)\s*$/);
                if (valuesMatch) {
                    const unitPriceCandidate = parseMoneyValue(valuesMatch[1]);
                    const totalCandidate = parseMoneyValue(valuesMatch[2]);

                    if (totalCandidate > 0) {
                        budget.unitPrice = unitPriceCandidate;
                        budget.value = totalCandidate;

                        // Extract product description (text before the numbers)
                        const descPart = line.replace(/[\d.,]+\s+[\d.,]+\s*$/, '').trim();
                        // Remove leading code number and NCM
                        const cleanDesc = descPart.replace(/^\d+\s+/, '').replace(/\s+\d{4}[\d.]*\s*$/, '').trim();
                        if (cleanDesc.length > 3) {
                            budget.product = cleanDesc;
                        }

                        // Try to extract quantity (between description and prices)
                        const qtyMatch = line.match(/(\d+[.,]\d+)\s*(UN|KG|L|M|M2|M3|TON|PÇ|PC|CX|SC|BB|BD|GL|LT|MT|FD|RL|TB)\b/i);
                        if (qtyMatch) {
                            budget.quantity = qtyMatch[1] + ' ' + qtyMatch[2];
                        }
                    }
                }
            }

            // If we found product data, stop looking
            if (budget.product) break;
        }
    }

    // ============================================
    // 9. FALLBACK: Product from text patterns (if table not found)
    // ============================================
    if (!budget.product) {
        const productPatterns = [
            /(?:produto|material|descri[çc][ãa]o\s*(?:do)?\s*(?:produto|material|servi[çc]o)|item)\s*[:;\-–]\s*(.+)/i,
            /(?:massa\s*asf[áa]ltica|CBUQ|emuls[ãa]o\s*asf[áa]ltica|RR-\d+C?|asfalto\s*dilu[ií]do|CM-\d+|CAP\s*\d+\/?\d*|manta\s*asf[áa]ltica|PMF|concreto\s*asf[áa]ltico|binder|TSD|micro[\s\-]?revestimento|ASFALTO\s+\w+)[^\n,;]*/i,
        ];
        for (const pattern of productPatterns) {
            const match = text.match(pattern);
            if (match) {
                budget.product = cleanValue(match[1] || match[0]);
                break;
            }
        }
    }

    // ============================================
    // 10. FALLBACK: Value from R$ patterns (if table not found)
    // ============================================
    if (!budget.value) {
        const totalPatterns = [
            /(?:valor\s*total|total\s*(?:geral|final|do\s*or[çc]amento)|valor\s*(?:final|global))\s*[:;\-–]?\s*R?\$?\s*([\d.,]+)/i,
            /(?:total)\s*[:;\-–]?\s*R\$\s*([\d.,]+)/i,
        ];

        for (const pattern of totalPatterns) {
            const match = text.match(pattern);
            if (match) {
                budget.value = parseMoneyValue(match[1]);
                if (budget.value > 0) break;
            }
        }

        if (!budget.value) {
            const allValues = [];
            const regex = /R\$\s*([\d.,]+)/g;
            let m;
            while ((m = regex.exec(text)) !== null) {
                const val = parseMoneyValue(m[1]);
                if (val > 0) allValues.push(val);
            }
            if (allValues.length > 0) {
                budget.value = Math.max(...allValues);
            }
        }
    }

    // ============================================
    // 11. FALLBACK: Quantity from text patterns
    // ============================================
    if (!budget.quantity) {
        const qtyMatch = text.match(/(?:quantidade|qtd\.?|qtde\.?|volume)\s*[:;\-–]\s*(.+)/i);
        if (qtyMatch) {
            budget.quantity = cleanValue(qtyMatch[1]);
        } else {
            const unitMatch = text.match(/([\d.,]+)\s*(toneladas?|ton\.?|t\b|m[²³]|m2|m3|litros?|l\b|kg|metros?|unid(?:ades?)?|pe[çc]as?|sacos?|UN\b)/i);
            if (unitMatch) {
                budget.quantity = cleanValue(unitMatch[0]);
            }
        }
    }

    // ============================================
    // 12. NOTES
    // ============================================
    const notesParts = [];
    if (budget.budgetNumber) {
        notesParts.push(`Orçamento Nº ${budget.budgetNumber}`);
    }
    const notesPatterns = [
        /(?:validade\s*(?:da\s*proposta)?|prazo\s*de\s*validade)\s*[:;\-–]\s*([^\n]+)/i,
        /(?:condi[çc][õo]es\s*(?:de\s*pagamento)?)\s*[:;\-–]\s*([^\n]+)/i,
        /(?:prazo\s*de\s*entrega)\s*[:;\-–]\s*([^\n]+)/i,
        /(?:obs(?:erva[çc][õo]es)?)\s*[:;\-–]\s*([^\n]+)/i,
    ];
    for (const pattern of notesPatterns) {
        const match = text.match(pattern);
        if (match) {
            notesParts.push(cleanValue(match[0]));
        }
    }
    if (notesParts.length > 0) {
        budget.notes = notesParts.join(' | ');
    }

    return budget;
}

/**
 * Parse multiple budgets if the PDF contains several
 */
export function parseMultipleBudgets(pages) {
    if (pages.length > 1) {
        const budgets = pages.map(pageText => parseBudgetFromText(pageText));
        const validBudgets = budgets.filter(b => b.value > 0 || b.clientName);
        if (validBudgets.length > 1) {
            return validBudgets;
        }
    }
    return [parseBudgetFromText(pages.join('\n'))];
}

// ============================================
// HELPERS
// ============================================

function cleanValue(str) {
    return (str || '')
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 200);
}

function parseMoneyValue(str) {
    if (!str) return 0;
    let cleaned = str.trim();

    // Reject NCM-like patterns: "2715.00.00" (has multiple dots with small groups)
    const dotParts = cleaned.split('.');
    if (dotParts.length > 2) {
        // Could be NCM format like 2715.00.00 — not money
        // Real money would be 1.234.567,89 (dots separate thousands, comma for decimals)
        if (!/,\d{2}$/.test(cleaned)) {
            return 0; // No comma ending = not Brazilian money format
        }
    }

    // Handle Brazilian format: 1.234.567,89 or 47,0000
    if (/\d+\.\d{3}/.test(cleaned) || /,\d{2,4}$/.test(cleaned)) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    }
    const val = parseFloat(cleaned);
    return isNaN(val) ? 0 : val;
}
