import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import {
    Search, Trash2, Eye, Filter, Download,
} from 'lucide-react';
import * as XLSX from 'xlsx';

const STATUS_LABELS = {
    new: 'Novo',
    contact: 'Contato',
    negotiation: 'Negociação',
    won: 'Fechado',
    lost: 'Perdido',
};

function formatCurrency(val) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

export default function BudgetsPage() {
    const { getFilteredBudgets, selectedCompany, deleteBudget, updateBudgetStatus } = useData();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [companyFilter, setCompanyFilter] = useState('all');
    const [productFilter, setProductFilter] = useState('all');

    const activeCompany = selectedCompany !== 'all' ? selectedCompany : companyFilter;

    const budgets = useMemo(() => {
        let filtered = getFilteredBudgets(activeCompany === 'all' ? 'all' : activeCompany);

        if (statusFilter !== 'all') {
            filtered = filtered.filter(b => b.status === statusFilter);
        }

        if (productFilter !== 'all') {
            filtered = filtered.filter(b => b.product === productFilter);
        }

        if (search) {
            const term = search.toLowerCase();
            filtered = filtered.filter(b =>
                b.clientName.toLowerCase().includes(term) ||
                b.product.toLowerCase().includes(term) ||
                b.clientEmail.toLowerCase().includes(term) ||
                (b.city || '').toLowerCase().includes(term) ||
                (b.state || '').toLowerCase().includes(term) ||
                (b.region || '').toLowerCase().includes(term)
            );
        }

        return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }, [getFilteredBudgets, activeCompany, statusFilter, productFilter, search]);

    const products = useMemo(() => {
        const all = getFilteredBudgets('all');
        return [...new Set(all.map(b => b.product).filter(Boolean))];
    }, [getFilteredBudgets]);

    const exportToExcel = () => {
        const data = budgets.map(b => ({
            Cliente: b.clientName,
            Email: b.clientEmail,
            Telefone: b.clientPhone,
            Empresa: b.company === 'LojaDoAsfalto' ? 'Loja do Asfalto' : 'Asfalto Multi',
            Produto: b.product,
            Região: b.region,
            Estado: b.state,
            Cidade: b.city,
            Valor: b.value,
            Quantidade: b.quantity,
            Status: STATUS_LABELS[b.status],
            Observações: b.notes,
            'Data Criação': new Date(b.createdAt).toLocaleDateString('pt-BR'),
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Orçamentos');
        XLSX.writeFile(wb, `orcamentos_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <>
            <div className="page-header">
                <h2>Orçamentos</h2>
                <p>Lista completa de todos os orçamentos cadastrados</p>
            </div>

            <div className="page-body">
                <div className="filters-bar">
                    <div className="search-wrapper">
                        <Search className="search-icon" size={16} />
                        <input
                            className="search-input"
                            type="text"
                            placeholder="Buscar por cliente, produto, região..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    <select
                        className="filter-select"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="all">Todos os Status</option>
                        <option value="new">Novo</option>
                        <option value="contact">Contato</option>
                        <option value="negotiation">Negociação</option>
                        <option value="won">Fechado</option>
                        <option value="lost">Perdido</option>
                    </select>

                    {selectedCompany === 'all' && (
                        <select
                            className="filter-select"
                            value={companyFilter}
                            onChange={e => setCompanyFilter(e.target.value)}
                        >
                            <option value="all">Todas as Empresas</option>
                            <option value="LojaDoAsfalto">Loja do Asfalto</option>
                            <option value="AsfaltoMulti">Asfalto Multi</option>
                        </select>
                    )}

                    <select
                        className="filter-select"
                        value={productFilter}
                        onChange={e => setProductFilter(e.target.value)}
                    >
                        <option value="all">Todos os Produtos</option>
                        {products.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>

                    <button className="btn btn-secondary btn-sm" onClick={exportToExcel} style={{ marginLeft: 'auto' }}>
                        <Download size={14} />
                        Exportar Excel
                    </button>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3>{budgets.length} orçamento{budgets.length !== 1 ? 's' : ''} encontrado{budgets.length !== 1 ? 's' : ''}</h3>
                    </div>
                    <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
                        {budgets.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">
                                    <Filter size={32} />
                                </div>
                                <h3>Nenhum orçamento encontrado</h3>
                                <p>Tente ajustar os filtros ou adicione novos orçamentos.</p>
                            </div>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Cliente</th>
                                        <th>Empresa</th>
                                        <th>Produto</th>
                                        <th>Localização</th>
                                        <th>Valor</th>
                                        <th>Quantidade</th>
                                        <th>Status</th>
                                        <th>Data</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {budgets.map(budget => (
                                        <tr key={budget.id}>
                                            <td>
                                                <div>
                                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                                        {budget.clientName}
                                                    </span>
                                                    {budget.clientPhone && (
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                            {budget.clientPhone}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${budget.company === 'LojaDoAsfalto' ? 'amber' : 'purple'}`}>
                                                    {budget.company === 'LojaDoAsfalto' ? 'Loja Asfalto' : 'Multi'}
                                                </span>
                                            </td>
                                            <td>{budget.product}</td>
                                            <td>
                                                {budget.city || budget.state
                                                    ? `${budget.city || ''}${budget.city && budget.state ? ' - ' : ''}${budget.state || ''}`
                                                    : '—'}
                                            </td>
                                            <td style={{ fontWeight: 600, color: 'var(--success-light)' }}>
                                                {formatCurrency(budget.value)}
                                            </td>
                                            <td>{budget.quantity || '—'}</td>
                                            <td>
                                                <select
                                                    className="filter-select"
                                                    value={budget.status}
                                                    onChange={e => updateBudgetStatus(budget.id, e.target.value)}
                                                    style={{ minWidth: 120, padding: '4px 8px' }}
                                                >
                                                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                                                        <option key={key} value={key}>{label}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>{new Date(budget.createdAt).toLocaleDateString('pt-BR')}</td>
                                            <td>
                                                <button
                                                    className="btn btn-danger btn-sm"
                                                    onClick={() => {
                                                        if (confirm('Tem certeza que deseja remover este orçamento?')) {
                                                            deleteBudget(budget.id);
                                                        }
                                                    }}
                                                    style={{ padding: '4px 8px' }}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
