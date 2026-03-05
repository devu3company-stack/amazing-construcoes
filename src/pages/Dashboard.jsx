import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
    AreaChart, Area,
} from 'recharts';
import {
    FileText, DollarSign, TrendingUp, TrendingDown, Target,
    CheckCircle2, XCircle, Clock,
} from 'lucide-react';

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];
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

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: 'rgba(26, 26, 46, 0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '0.8rem',
        }}>
            <p style={{ fontWeight: 600, marginBottom: 4, color: '#f1f5f9' }}>{label}</p>
            {payload.map((entry, i) => (
                <p key={i} style={{ color: entry.color, fontSize: '0.75rem' }}>
                    {entry.name}: {typeof entry.value === 'number' && entry.name.includes('Valor')
                        ? formatCurrency(entry.value)
                        : entry.value}
                </p>
            ))}
        </div>
    );
};

export default function Dashboard() {
    const {
        selectedCompany, getStats, getByRegion, getByProduct,
        getByStateCity, getByStatus, getFilteredBudgets,
    } = useData();
    const [companyView, setCompanyView] = useState('all');

    const activeCompany = selectedCompany !== 'all' ? selectedCompany : companyView;

    const stats = useMemo(() => getStats(activeCompany === 'all' ? 'all' : activeCompany), [getStats, activeCompany]);
    const regionData = useMemo(() => getByRegion(), [getByRegion]);
    const productData = useMemo(() => getByProduct(activeCompany === 'all' ? 'all' : activeCompany), [getByProduct, activeCompany]);
    const stateCityData = useMemo(() => getByStateCity(), [getByStateCity]);
    const statusData = useMemo(() => getByStatus(activeCompany === 'all' ? 'all' : activeCompany).map(s => ({
        ...s,
        label: STATUS_LABELS[s.status] || s.status,
    })), [getByStatus, activeCompany]);

    // Monthly trend (simulated from data)
    const trendData = useMemo(() => {
        const budgets = getFilteredBudgets(activeCompany === 'all' ? 'all' : activeCompany);
        const months = {};
        budgets.forEach(b => {
            const date = new Date(b.createdAt);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const label = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
            if (!months[key]) {
                months[key] = { month: label, count: 0, value: 0 };
            }
            months[key].count++;
            months[key].value += b.value || 0;
        });
        return Object.values(months).sort((a, b) => a.month.localeCompare(b.month));
    }, [getFilteredBudgets, activeCompany]);

    const showLojaCharts = activeCompany === 'all' || activeCompany === 'LojaDoAsfalto';
    const showMultiCharts = activeCompany === 'all' || activeCompany === 'AsfaltoMulti';

    return (
        <>
            <div className="page-header">
                <h2>Dashboard</h2>
                <p>Visão geral dos orçamentos — {
                    activeCompany === 'all' ? 'Todas as empresas' :
                        activeCompany === 'LojaDoAsfalto' ? 'Loja do Asfalto' : 'Asfalto Multi'
                }</p>
            </div>

            <div className="page-body">
                {selectedCompany === 'all' && (
                    <div className="tabs" style={{ marginBottom: 28 }}>
                        <button className={`tab-btn ${companyView === 'all' ? 'active' : ''}`} onClick={() => setCompanyView('all')}>
                            Todas
                        </button>
                        <button className={`tab-btn ${companyView === 'LojaDoAsfalto' ? 'active' : ''}`} onClick={() => setCompanyView('LojaDoAsfalto')}>
                            Loja do Asfalto
                        </button>
                        <button className={`tab-btn ${companyView === 'AsfaltoMulti' ? 'active' : ''}`} onClick={() => setCompanyView('AsfaltoMulti')}>
                            Asfalto Multi
                        </button>
                    </div>
                )}

                {/* Stats Cards */}
                <div className="stats-grid">
                    <div className="stat-card purple">
                        <div className="stat-icon purple">
                            <FileText size={24} />
                        </div>
                        <div className="stat-info">
                            <h4>Total de Orçamentos</h4>
                            <div className="stat-value">{stats.total}</div>
                            <span className="stat-change positive">Gerados até agora</span>
                        </div>
                    </div>

                    <div className="stat-card green">
                        <div className="stat-icon green">
                            <DollarSign size={24} />
                        </div>
                        <div className="stat-info">
                            <h4>Valor Total</h4>
                            <div className="stat-value" style={{ fontSize: '1.5rem' }}>{formatCurrency(stats.totalValue)}</div>
                            <span className="stat-change positive">Em orçamentos</span>
                        </div>
                    </div>

                    <div className="stat-card amber">
                        <div className="stat-icon amber">
                            <CheckCircle2 size={24} />
                        </div>
                        <div className="stat-info">
                            <h4>Fechados</h4>
                            <div className="stat-value">{stats.wonCount}</div>
                            <span className="stat-change positive">{formatCurrency(stats.wonValue)}</span>
                        </div>
                    </div>

                    <div className="stat-card red">
                        <div className="stat-icon red">
                            <XCircle size={24} />
                        </div>
                        <div className="stat-info">
                            <h4>Perdidos</h4>
                            <div className="stat-value">{stats.lostCount}</div>
                        </div>
                    </div>

                    <div className="stat-card blue">
                        <div className="stat-icon blue">
                            <Target size={24} />
                        </div>
                        <div className="stat-info">
                            <h4>Taxa de Conversão</h4>
                            <div className="stat-value">{stats.conversionRate}%</div>
                            <span className="stat-change positive">
                                {stats.openCount} em aberto
                            </span>
                        </div>
                    </div>
                </div>

                {/* Charts */}
                <div className="charts-grid">
                    {/* Status Distribution */}
                    <div className="card">
                        <div className="card-header">
                            <h3>Distribuição por Status</h3>
                        </div>
                        <div className="card-body">
                            <ResponsiveContainer width="100%" height={280}>
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        dataKey="count"
                                        nameKey="label"
                                        label={({ label, count }) => `${label}: ${count}`}
                                        labelLine={false}
                                    >
                                        {statusData.map((entry, index) => (
                                            <Cell key={entry.status} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        formatter={(value) => <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{value}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Products */}
                    <div className="card">
                        <div className="card-header">
                            <h3>Orçamentos por Produto</h3>
                        </div>
                        <div className="card-body">
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={productData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
                                    <YAxis dataKey="product" type="category" width={140} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="count" name="Quantidade" fill="#6366f1" radius={[0, 6, 6, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Region chart (Loja do Asfalto) */}
                    {showLojaCharts && regionData.length > 0 && (
                        <div className="card">
                            <div className="card-header">
                                <h3>🏪 Loja do Asfalto — Por Região</h3>
                            </div>
                            <div className="card-body">
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={regionData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="region" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="count" name="Quantidade" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                                        <Bar dataKey="value" name="Valor (R$)" fill="#6366f1" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* State/City chart (Asfalto Multi) */}
                    {showMultiCharts && stateCityData.length > 0 && (
                        <div className="card">
                            <div className="card-header">
                                <h3>🏗️ Asfalto Multi — Por Estado / Cidade</h3>
                            </div>
                            <div className="card-body">
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={stateCityData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="location" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="count" name="Quantidade" fill="#10b981" radius={[6, 6, 0, 0]} />
                                        <Bar dataKey="value" name="Valor (R$)" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Monthly Trend */}
                    <div className="card" style={showLojaCharts && showMultiCharts ? { gridColumn: '1 / -1' } : {}}>
                        <div className="card-header">
                            <h3>Tendência Mensal</h3>
                        </div>
                        <div className="card-body">
                            <ResponsiveContainer width="100%" height={280}>
                                <AreaChart data={trendData}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        name="Qtd. Orçamentos"
                                        stroke="#6366f1"
                                        fill="url(#colorValue)"
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Recent Budgets Table */}
                <div className="card">
                    <div className="card-header">
                        <h3>Últimos Orçamentos</h3>
                    </div>
                    <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Cliente</th>
                                    <th>Empresa</th>
                                    <th>Produto</th>
                                    <th>Localização</th>
                                    <th>Valor</th>
                                    <th>Status</th>
                                    <th>Data</th>
                                </tr>
                            </thead>
                            <tbody>
                                {getFilteredBudgets(activeCompany === 'all' ? 'all' : activeCompany)
                                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                                    .slice(0, 8)
                                    .map(budget => (
                                        <tr key={budget.id}>
                                            <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{budget.clientName}</td>
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
                                            <td>
                                                <span className={`badge ${budget.status === 'won' ? 'green' :
                                                    budget.status === 'lost' ? 'red' :
                                                        budget.status === 'negotiation' ? 'amber' :
                                                            budget.status === 'contact' ? 'purple' : 'blue'
                                                    }`}>
                                                    {STATUS_LABELS[budget.status]}
                                                </span>
                                            </td>
                                            <td>{new Date(budget.createdAt).toLocaleDateString('pt-BR')}</td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}
