import { useState, useRef, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { extractTextFromPDF, parseBudgetFromText, parseMultipleBudgets } from '../utils/pdfParser';
import * as XLSX from 'xlsx';
import {
    Upload as UploadIcon,
    FileSpreadsheet,
    FileText,
    X,
    Plus,
    CheckCircle2,
    AlertCircle,
    Loader,
    Edit3,
    Eye,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';

const REGIONS = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];
const PRODUCTS = [
    'Massa Asfáltica CBUQ',
    'Emulsão Asfáltica RR-1C',
    'Emulsão Asfáltica RR-2C',
    'Asfalto Diluído CM-30',
    'CAP 50/70',
    'Manta Asfáltica',
    'Outro',
];
const STATES = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

function formatCurrency(val) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

export default function UploadPage() {
    const { addBudget, importBudgetsFromData, addToast } = useData();
    const [activeTab, setActiveTab] = useState('pdf');
    const [dragOver, setDragOver] = useState(false);
    const [processing, setProcessing] = useState(false);
    const fileInputRef = useRef(null);
    const pdfInputRef = useRef(null);

    // PDF state
    const [pdfResults, setPdfResults] = useState([]);
    const [pdfCompany, setPdfCompany] = useState('LojaDoAsfalto');
    const [expandedRawText, setExpandedRawText] = useState(null);

    // Spreadsheet state
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [parsedData, setParsedData] = useState(null);
    const [importCompany, setImportCompany] = useState('LojaDoAsfalto');

    // Manual form state
    const [form, setForm] = useState({
        company: 'LojaDoAsfalto',
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        product: '',
        region: '',
        state: '',
        city: '',
        value: '',
        quantity: '',
        notes: '',
    });

    // =============== PDF HANDLING ===============
    const processPDF = useCallback(async (file) => {
        setProcessing(true);
        try {
            const { fullText, pages, totalPages } = await extractTextFromPDF(file);

            if (!fullText.trim()) {
                addToast('Não foi possível extrair texto do PDF. O arquivo pode ser uma imagem escaneada.', 'error');
                setProcessing(false);
                return;
            }

            const budgets = parseMultipleBudgets(pages);

            const results = budgets.map((budget, idx) => ({
                ...budget,
                fileName: file.name,
                pageCount: totalPages,
                company: pdfCompany,
                editing: false,
            }));

            setPdfResults(prev => [...prev, ...results]);
            addToast(`PDF "${file.name}" processado! ${results.length} orçamento(s) encontrado(s) em ${totalPages} página(s).`, 'success');
        } catch (err) {
            console.error('PDF processing error:', err);
            addToast(`Erro ao processar "${file.name}": ${err.message}`, 'error');
        }
        setProcessing(false);
    }, [addToast, pdfCompany]);

    const handlePDFDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        const files = Array.from(e.dataTransfer.files).filter(f =>
            f.type === 'application/pdf' || f.name.endsWith('.pdf')
        );
        if (files.length === 0) {
            addToast('Por favor, envie apenas arquivos PDF.', 'error');
            return;
        }
        files.forEach(f => processPDF(f));
    }, [processPDF, addToast]);

    const handlePDFSelect = useCallback((e) => {
        const files = Array.from(e.target.files);
        files.forEach(f => processPDF(f));
        e.target.value = '';
    }, [processPDF]);

    const updatePdfResult = (index, field, value) => {
        setPdfResults(prev => prev.map((r, i) =>
            i === index ? { ...r, [field]: value } : r
        ));
    };

    const removePdfResult = (index) => {
        setPdfResults(prev => prev.filter((_, i) => i !== index));
    };

    const importPdfBudget = (index) => {
        const result = pdfResults[index];
        addBudget({
            company: result.company,
            clientName: result.clientName,
            clientEmail: result.clientEmail,
            clientPhone: result.clientPhone,
            product: result.product,
            region: result.region,
            state: result.state,
            city: result.city,
            value: parseFloat(result.value) || 0,
            quantity: result.quantity,
            notes: result.notes,
        });
        removePdfResult(index);
    };

    const importAllPdfBudgets = () => {
        pdfResults.forEach((result) => {
            addBudget({
                company: result.company,
                clientName: result.clientName || 'Cliente não identificado',
                clientEmail: result.clientEmail,
                clientPhone: result.clientPhone,
                product: result.product,
                region: result.region,
                state: result.state,
                city: result.city,
                value: parseFloat(result.value) || 0,
                quantity: result.quantity,
                notes: result.notes,
            });
        });
        addToast(`${pdfResults.length} orçamento(s) importado(s) com sucesso!`, 'success');
        setPdfResults([]);
    };

    // =============== SPREADSHEET HANDLING ===============
    const processFile = useCallback((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet);
                if (jsonData.length === 0) {
                    addToast('Arquivo vazio ou formato não reconhecido.', 'error');
                    return;
                }
                setParsedData(jsonData);
                setUploadedFiles(prev => [...prev, {
                    name: file.name,
                    size: file.size,
                    rows: jsonData.length,
                    columns: Object.keys(jsonData[0]),
                }]);
                addToast(`Arquivo "${file.name}" processado! ${jsonData.length} registros encontrados.`, 'success');
            } catch (err) {
                addToast('Erro ao processar arquivo. Verifique o formato.', 'error');
            }
        };
        reader.readAsArrayBuffer(file);
    }, [addToast]);

    const handleFileDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        const files = Array.from(e.dataTransfer.files);
        files.forEach(processFile);
    }, [processFile]);

    const handleFileSelect = useCallback((e) => {
        const files = Array.from(e.target.files);
        files.forEach(processFile);
    }, [processFile]);

    const handleImport = () => {
        if (parsedData) {
            importBudgetsFromData(parsedData, importCompany);
            setParsedData(null);
            setUploadedFiles([]);
        }
    };

    // =============== MANUAL FORM ===============
    const handleFormChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.clientName || !form.product) {
            addToast('Preencha pelo menos o nome do cliente e o produto.', 'error');
            return;
        }
        addBudget({ ...form, value: parseFloat(form.value) || 0 });
        setForm({
            company: form.company, clientName: '', clientEmail: '', clientPhone: '',
            product: '', region: '', state: '', city: '', value: '', quantity: '', notes: '',
        });
    };

    return (
        <>
            <div className="page-header">
                <h2>Subir Orçamentos</h2>
                <p>Importe orçamentos em PDF, planilhas ou cadastre manualmente</p>
            </div>

            <div className="page-body">
                <div className="tabs">
                    <button className={`tab-btn ${activeTab === 'pdf' ? 'active' : ''}`} onClick={() => setActiveTab('pdf')}>
                        <FileText size={14} style={{ marginRight: 6 }} />
                        PDF de Orçamento
                    </button>
                    <button className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`} onClick={() => setActiveTab('upload')}>
                        <UploadIcon size={14} style={{ marginRight: 6 }} />
                        Planilha
                    </button>
                    <button className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`} onClick={() => setActiveTab('manual')}>
                        <Plus size={14} style={{ marginRight: 6 }} />
                        Cadastro Manual
                    </button>
                </div>

                {/* ============== PDF TAB ============== */}
                {activeTab === 'pdf' && (
                    <div>
                        {/* Company Selection */}
                        <div className="card" style={{ marginBottom: 20 }}>
                            <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                                <div style={{ flex: 1 }}>
                                    <label className="form-label">Empresa destino dos orçamentos</label>
                                    <select
                                        className="form-select"
                                        value={pdfCompany}
                                        onChange={e => setPdfCompany(e.target.value)}
                                        style={{ maxWidth: 300 }}
                                    >
                                        <option value="LojaDoAsfalto">Loja do Asfalto</option>
                                        <option value="AsfaltoMulti">Asfalto Multi</option>
                                    </select>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: 400 }}>
                                    <AlertCircle size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                                    O sistema irá extrair automaticamente: nome do cliente, email, telefone, produto, valor, localização e observações do PDF.
                                </div>
                            </div>
                        </div>

                        {/* PDF Upload Zone */}
                        <div
                            className={`upload-zone ${dragOver ? 'dragover' : ''} ${processing ? 'processing' : ''}`}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handlePDFDrop}
                            onClick={() => !processing && pdfInputRef.current?.click()}
                            style={processing ? { pointerEvents: 'none', opacity: 0.7 } : {}}
                        >
                            <div className="upload-zone-icon">
                                {processing ? <Loader size={28} className="spin-animation" /> : <FileText size={28} />}
                            </div>
                            <h3>{processing ? 'Processando PDF...' : 'Arraste seus PDFs de orçamento aqui'}</h3>
                            <p>
                                {processing
                                    ? 'Extraindo informações automaticamente...'
                                    : 'Ou clique para selecionar. O sistema irá extrair os dados automaticamente.'}
                            </p>
                            <input
                                ref={pdfInputRef}
                                type="file"
                                accept=".pdf"
                                multiple
                                onChange={handlePDFSelect}
                                style={{ display: 'none' }}
                            />
                        </div>

                        {/* PDF Results */}
                        {pdfResults.length > 0 && (
                            <div style={{ marginTop: 24 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                                        {pdfResults.length} orçamento(s) extraído(s)
                                    </h3>
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <button className="btn btn-secondary btn-sm" onClick={() => setPdfResults([])}>
                                            <X size={14} /> Limpar Tudo
                                        </button>
                                        <button className="btn btn-primary" onClick={importAllPdfBudgets}>
                                            <CheckCircle2 size={16} /> Importar Todos
                                        </button>
                                    </div>
                                </div>

                                {pdfResults.map((result, index) => (
                                    <PDFResultCard
                                        key={index}
                                        result={result}
                                        index={index}
                                        onUpdate={updatePdfResult}
                                        onRemove={removePdfResult}
                                        onImport={importPdfBudget}
                                        expandedRawText={expandedRawText}
                                        setExpandedRawText={setExpandedRawText}
                                        pdfCompany={pdfCompany}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ============== SPREADSHEET TAB ============== */}
                {activeTab === 'upload' && (
                    <div>
                        <div className="card" style={{ marginBottom: 20 }}>
                            <div className="card-body">
                                <label className="form-label">Empresa destino</label>
                                <select
                                    className="form-select"
                                    value={importCompany}
                                    onChange={e => setImportCompany(e.target.value)}
                                    style={{ maxWidth: 300 }}
                                >
                                    <option value="LojaDoAsfalto">Loja do Asfalto</option>
                                    <option value="AsfaltoMulti">Asfalto Multi</option>
                                </select>
                            </div>
                        </div>

                        <div
                            className={`upload-zone ${dragOver ? 'dragover' : ''}`}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleFileDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="upload-zone-icon"><UploadIcon size={28} /></div>
                            <h3>Arraste e solte seus arquivos aqui</h3>
                            <p>Formatos aceitos: .xlsx, .xls, .csv</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                multiple
                                onChange={handleFileSelect}
                                style={{ display: 'none' }}
                            />
                        </div>

                        {uploadedFiles.length > 0 && (
                            <div className="file-list">
                                {uploadedFiles.map((file, i) => (
                                    <div className="file-item" key={i}>
                                        <div className="file-item-icon"><FileSpreadsheet size={18} /></div>
                                        <div className="file-item-info">
                                            <div className="file-item-name">{file.name}</div>
                                            <div className="file-item-size">
                                                {(file.size / 1024).toFixed(1)} KB • {file.rows} registros
                                            </div>
                                        </div>
                                        <button className="file-item-remove" onClick={() => {
                                            setUploadedFiles(prev => prev.filter((_, idx) => idx !== i));
                                            if (uploadedFiles.length === 1) setParsedData(null);
                                        }}>
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {parsedData && (
                            <div className="card" style={{ marginTop: 20 }}>
                                <div className="card-header">
                                    <h3>Pré-visualização ({parsedData.length} registros)</h3>
                                    <button className="btn btn-primary" onClick={handleImport}>
                                        <CheckCircle2 size={16} /> Importar
                                    </button>
                                </div>
                                <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                {Object.keys(parsedData[0]).map(key => <th key={key}>{key}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parsedData.slice(0, 10).map((row, idx) => (
                                                <tr key={idx}>
                                                    {Object.values(row).map((val, i) => <td key={i}>{String(val)}</td>)}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ============== MANUAL TAB ============== */}
                {activeTab === 'manual' && (
                    <div className="card">
                        <div className="card-header"><h3>Novo Orçamento</h3></div>
                        <div className="card-body">
                            <form onSubmit={handleSubmit}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
                                    <div className="form-group">
                                        <label className="form-label">Empresa</label>
                                        <select className="form-select" value={form.company} onChange={e => handleFormChange('company', e.target.value)}>
                                            <option value="LojaDoAsfalto">Loja do Asfalto</option>
                                            <option value="AsfaltoMulti">Asfalto Multi</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Produto</label>
                                        <select className="form-select" value={form.product} onChange={e => handleFormChange('product', e.target.value)}>
                                            <option value="">Selecione...</option>
                                            {PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Nome do Cliente *</label>
                                        <input className="form-input" type="text" value={form.clientName} onChange={e => handleFormChange('clientName', e.target.value)} placeholder="Ex: Construtora XYZ" required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Email</label>
                                        <input className="form-input" type="email" value={form.clientEmail} onChange={e => handleFormChange('clientEmail', e.target.value)} placeholder="contato@empresa.com" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Telefone</label>
                                        <input className="form-input" type="text" value={form.clientPhone} onChange={e => handleFormChange('clientPhone', e.target.value)} placeholder="(11) 99999-9999" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Valor (R$)</label>
                                        <input className="form-input" type="number" value={form.value} onChange={e => handleFormChange('value', e.target.value)} placeholder="0,00" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Quantidade</label>
                                        <input className="form-input" type="text" value={form.quantity} onChange={e => handleFormChange('quantity', e.target.value)} placeholder="Ex: 30 toneladas" />
                                    </div>
                                    {form.company === 'LojaDoAsfalto' && (
                                        <div className="form-group">
                                            <label className="form-label">Região</label>
                                            <select className="form-select" value={form.region} onChange={e => handleFormChange('region', e.target.value)}>
                                                <option value="">Selecione...</option>
                                                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    {form.company === 'AsfaltoMulti' && (
                                        <>
                                            <div className="form-group">
                                                <label className="form-label">Estado (UF)</label>
                                                <select className="form-select" value={form.state} onChange={e => handleFormChange('state', e.target.value)}>
                                                    <option value="">Selecione...</option>
                                                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Cidade</label>
                                                <input className="form-input" type="text" value={form.city} onChange={e => handleFormChange('city', e.target.value)} placeholder="Nome da cidade" />
                                            </div>
                                        </>
                                    )}
                                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                        <label className="form-label">Observações</label>
                                        <textarea className="form-input" value={form.notes} onChange={e => handleFormChange('notes', e.target.value)} placeholder="Notas sobre o orçamento..." rows={3} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                                    <button type="submit" className="btn btn-primary"><Plus size={16} /> Cadastrar Orçamento</button>
                                    <button type="button" className="btn btn-secondary" onClick={() => setForm({
                                        company: form.company, clientName: '', clientEmail: '', clientPhone: '',
                                        product: '', region: '', state: '', city: '', value: '', quantity: '', notes: '',
                                    })}>Limpar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

// ============== PDF RESULT CARD COMPONENT ==============
function PDFResultCard({ result, index, onUpdate, onRemove, onImport, expandedRawText, setExpandedRawText, pdfCompany }) {
    const [editing, setEditing] = useState(false);
    const isExpanded = expandedRawText === index;
    const company = result.company || pdfCompany;

    const confidenceColor = (val) => {
        if (val && String(val).trim()) return 'var(--success-light)';
        return 'var(--danger-light)';
    };

    const FieldDisplay = ({ label, value, field, editable = true }) => (
        <div style={{ marginBottom: 10, minWidth: 0 }}>
            <span style={{
                fontSize: '0.65rem',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                marginBottom: 2,
            }}>
                <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: confidenceColor(value),
                    display: 'inline-block',
                    flexShrink: 0,
                }} />
                {label}
            </span>
            {editing && editable ? (
                <input
                    className="form-input"
                    value={value || ''}
                    onChange={e => onUpdate(index, field, e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '0.8rem', marginTop: 2 }}
                />
            ) : (
                <p style={{
                    fontSize: '0.85rem',
                    color: value ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontStyle: value ? 'normal' : 'italic',
                    wordBreak: 'break-word',
                    margin: 0,
                }}>
                    {value || 'Não identificado'}
                </p>
            )}
        </div>
    );

    return (
        <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 auto', minWidth: 0 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 'var(--radius-sm)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        background: 'rgba(239, 68, 68, 0.1)', color: '#f87171',
                    }}>
                        <FileText size={18} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <h3 style={{ fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {result.clientName || 'Orçamento ' + (result.budgetNumber || (index + 1))}
                        </h3>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {result.fileName} • {result.pageCount} página(s)
                            {result.budgetNumber ? ` • Nº ${result.budgetNumber}` : ''}
                        </span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditing(!editing)}>
                        <Edit3 size={12} /> {editing ? 'Fechar' : 'Editar'}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => onRemove(index)}>
                        <X size={12} />
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => onImport(index)}>
                        <CheckCircle2 size={12} /> Importar
                    </button>
                </div>
            </div>

            <div className="card-body">
                {/* Company Selector for this result */}
                {editing && (
                    <div style={{ marginBottom: 16 }}>
                        <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>
                            Empresa
                        </span>
                        <select
                            className="form-select"
                            value={company}
                            onChange={e => onUpdate(index, 'company', e.target.value)}
                            style={{ maxWidth: 250, marginTop: 4, padding: '6px 10px', fontSize: '0.8rem' }}
                        >
                            <option value="LojaDoAsfalto">Loja do Asfalto</option>
                            <option value="AsfaltoMulti">Asfalto Multi</option>
                        </select>
                    </div>
                )}

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '8px 24px',
                }}>
                    <FieldDisplay label="Cliente" value={result.clientName} field="clientName" />
                    <FieldDisplay label="CNPJ" value={result.cnpj} field="cnpj" />
                    <FieldDisplay label="Nº Orçamento" value={result.budgetNumber} field="budgetNumber" />
                    <FieldDisplay label="Email" value={result.clientEmail} field="clientEmail" />
                    <FieldDisplay label="Telefone" value={result.clientPhone} field="clientPhone" />
                    <FieldDisplay label="Cidade" value={result.city ? `${result.city}${result.state ? ' - ' + result.state : ''}` : ''} field="city" />
                    <FieldDisplay label="Descrição (Produto)" value={result.product} field="product" />
                    <FieldDisplay label="Quantidade" value={result.quantity} field="quantity" />
                    <FieldDisplay label="Valor Unitário (R$)" value={result.unitPrice ? formatCurrency(result.unitPrice) : ''} field="unitPrice" />
                    <FieldDisplay label="Valor Total (R$)" value={result.value ? formatCurrency(result.value) : ''} field="value" />
                    <div style={{ gridColumn: '1 / -1' }}>
                        <FieldDisplay label="Observações" value={result.notes} field="notes" />
                    </div>
                </div>

                {/* Raw Text Toggle */}
                <button
                    onClick={() => setExpandedRawText(isExpanded ? null : index)}
                    style={{
                        background: 'none', border: 'none', color: 'var(--text-muted)',
                        fontSize: '0.75rem', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', gap: 4, marginTop: 12, padding: 0,
                    }}
                >
                    <Eye size={12} />
                    {isExpanded ? 'Ocultar' : 'Ver'} texto extraído do PDF
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {isExpanded && (
                    <div style={{
                        marginTop: 8, padding: '12px 16px',
                        background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem', color: 'var(--text-secondary)',
                        maxHeight: 200, overflowY: 'auto', whiteSpace: 'pre-wrap',
                        fontFamily: 'monospace', lineHeight: 1.6,
                    }}>
                        {result.rawText || 'Nenhum texto extraído.'}
                    </div>
                )}
            </div>
        </div>
    );
}
