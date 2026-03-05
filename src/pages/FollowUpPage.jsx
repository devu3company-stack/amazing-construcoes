import { useState, useMemo, useCallback } from 'react';
import { useData } from '../context/DataContext';
import {
    Search, ChevronRight, ChevronLeft, Phone, Mail,
    MapPin, Package, MessageSquare, MoreVertical, X, Edit3,
} from 'lucide-react';

const STATUS_LABELS = {
    new: 'Novo',
    contact: 'Contato',
    negotiation: 'Negociação',
    won: 'Fechado ✓',
    lost: 'Perdido',
};

function formatCurrency(val) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

export default function FollowUpPage() {
    const {
        getFilteredBudgets, selectedCompany, updateBudgetStatus,
        KANBAN_COLUMNS, updateBudget, addToast,
    } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCompany, setFilterCompany] = useState('all');
    const [draggedCard, setDraggedCard] = useState(null);
    const [editModal, setEditModal] = useState(null);
    const [detailModal, setDetailModal] = useState(null);

    const activeCompany = selectedCompany !== 'all' ? selectedCompany : filterCompany;

    const budgets = useMemo(() => {
        let filtered = getFilteredBudgets(activeCompany === 'all' ? 'all' : activeCompany);
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(b =>
                b.clientName.toLowerCase().includes(term) ||
                b.product.toLowerCase().includes(term) ||
                b.clientEmail.toLowerCase().includes(term)
            );
        }
        return filtered;
    }, [getFilteredBudgets, activeCompany, searchTerm]);

    const columns = useMemo(() => {
        return KANBAN_COLUMNS.map(col => ({
            ...col,
            cards: budgets
                .filter(b => b.status === col.id)
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
        }));
    }, [budgets, KANBAN_COLUMNS]);

    const totalValue = useMemo(() => ({
        won: budgets.filter(b => b.status === 'won').reduce((s, b) => s + b.value, 0),
        open: budgets.filter(b => !['won', 'lost'].includes(b.status)).reduce((s, b) => s + b.value, 0),
        lost: budgets.filter(b => b.status === 'lost').reduce((s, b) => s + b.value, 0),
    }), [budgets]);

    const handleDragStart = (e, card) => {
        setDraggedCard(card);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, columnId) => {
        e.preventDefault();
        if (draggedCard && draggedCard.status !== columnId) {
            updateBudgetStatus(draggedCard.id, columnId);
        }
        setDraggedCard(null);
    };

    const moveCard = (cardId, currentStatus, direction) => {
        const colIds = KANBAN_COLUMNS.map(c => c.id);
        const currentIdx = colIds.indexOf(currentStatus);
        const nextIdx = direction === 'right' ? currentIdx + 1 : currentIdx - 1;
        if (nextIdx >= 0 && nextIdx < colIds.length) {
            updateBudgetStatus(cardId, colIds[nextIdx]);
        }
    };

    const handleEditSave = (budgetId, updates) => {
        updateBudget(budgetId, updates);
        addToast('Orçamento atualizado!', 'success');
        setEditModal(null);
    };

    return (
        <>
            <div className="page-header">
                <h2>Follow-up de Orçamentos</h2>
                <p>Acompanhe o progresso dos orçamentos até o fechamento</p>
            </div>

            <div className="page-body">
                {/* Top Bar */}
                <div className="filters-bar">
                    <div className="search-wrapper">
                        <Search className="search-icon" size={16} />
                        <input
                            className="search-input"
                            type="text"
                            placeholder="Buscar cliente, produto..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {selectedCompany === 'all' && (
                        <select
                            className="filter-select"
                            value={filterCompany}
                            onChange={e => setFilterCompany(e.target.value)}
                        >
                            <option value="all">Todas as Empresas</option>
                            <option value="LojaDoAsfalto">Loja do Asfalto</option>
                            <option value="AsfaltoMulti">Asfalto Multi</option>
                        </select>
                    )}

                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 20, fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>
                            Em aberto: <strong style={{ color: 'var(--primary-light)' }}>{formatCurrency(totalValue.open)}</strong>
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>
                            Fechados: <strong style={{ color: 'var(--success-light)' }}>{formatCurrency(totalValue.won)}</strong>
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>
                            Perdidos: <strong style={{ color: 'var(--danger-light)' }}>{formatCurrency(totalValue.lost)}</strong>
                        </span>
                    </div>
                </div>

                {/* Kanban Board */}
                <div className="kanban-board">
                    {columns.map(column => (
                        <div
                            className="kanban-column"
                            key={column.id}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, column.id)}
                        >
                            <div className="kanban-column-header">
                                <h4>
                                    <span className={`kanban-dot ${column.dotClass}`} />
                                    {column.label}
                                </h4>
                                <span className="kanban-count">{column.cards.length}</span>
                            </div>

                            <div className="kanban-column-body">
                                {column.cards.map(card => (
                                    <div
                                        className="kanban-card"
                                        key={card.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, card)}
                                        onClick={() => setDetailModal(card)}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div className="kanban-card-title">{card.clientName}</div>
                                            <span className={`badge ${card.company === 'LojaDoAsfalto' ? 'amber' : 'purple'}`}
                                                style={{ fontSize: '0.55rem', padding: '2px 6px' }}>
                                                {card.company === 'LojaDoAsfalto' ? 'Loja' : 'Multi'}
                                            </span>
                                        </div>
                                        <div className="kanban-card-meta">
                                            <span><Package size={12} style={{ marginRight: 4 }} />{card.product}</span>
                                            <span>
                                                <MapPin size={12} style={{ marginRight: 4 }} />
                                                {card.company === 'LojaDoAsfalto'
                                                    ? card.region
                                                    : `${card.state} - ${card.city}`}
                                            </span>
                                        </div>
                                        <div className="kanban-card-footer">
                                            <span className="kanban-card-value">{formatCurrency(card.value)}</span>
                                            <div className="kanban-card-actions" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    title="Mover para esquerda"
                                                    onClick={() => moveCard(card.id, card.status, 'left')}
                                                    disabled={column.id === KANBAN_COLUMNS[0].id}
                                                >
                                                    <ChevronLeft size={14} />
                                                </button>
                                                <button
                                                    title="Mover para direita"
                                                    onClick={() => moveCard(card.id, card.status, 'right')}
                                                    disabled={column.id === KANBAN_COLUMNS[KANBAN_COLUMNS.length - 1].id}
                                                >
                                                    <ChevronRight size={14} />
                                                </button>
                                                <button
                                                    title="Editar"
                                                    onClick={() => setEditModal(card)}
                                                >
                                                    <Edit3 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="kanban-card-date">
                                            {new Date(card.updatedAt).toLocaleDateString('pt-BR', {
                                                day: '2-digit', month: 'short',
                                            })}
                                        </div>
                                    </div>
                                ))}

                                {column.cards.length === 0 && (
                                    <div style={{
                                        padding: 20,
                                        textAlign: 'center',
                                        color: 'var(--text-muted)',
                                        fontSize: '0.8rem',
                                    }}>
                                        Nenhum orçamento
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Detail Modal */}
            {detailModal && (
                <div className="modal-overlay" onClick={() => setDetailModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Detalhes do Orçamento</h3>
                            <button className="modal-close" onClick={() => setDetailModal(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: 'grid', gap: 16 }}>
                                <div>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
                                        Cliente
                                    </span>
                                    <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>{detailModal.clientName}</p>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                            <Mail size={12} /> Email
                                        </span>
                                        <p style={{ fontSize: '0.85rem' }}>{detailModal.clientEmail || '—'}</p>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                            <Phone size={12} /> Telefone
                                        </span>
                                        <p style={{ fontSize: '0.85rem' }}>{detailModal.clientPhone || '—'}</p>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Empresa</span>
                                        <p>
                                            <span className={`badge ${detailModal.company === 'LojaDoAsfalto' ? 'amber' : 'purple'}`}>
                                                {detailModal.company === 'LojaDoAsfalto' ? 'Loja do Asfalto' : 'Asfalto Multi'}
                                            </span>
                                        </p>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Status</span>
                                        <p>
                                            <span className={`badge ${detailModal.status === 'won' ? 'green' :
                                                    detailModal.status === 'lost' ? 'red' :
                                                        detailModal.status === 'negotiation' ? 'amber' : 'blue'
                                                }`}>
                                                {STATUS_LABELS[detailModal.status]}
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Produto</span>
                                        <p style={{ fontSize: '0.85rem' }}>{detailModal.product}</p>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Valor</span>
                                        <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--success-light)' }}>
                                            {formatCurrency(detailModal.value)}
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Localização</span>
                                        <p style={{ fontSize: '0.85rem' }}>
                                            {detailModal.company === 'LojaDoAsfalto'
                                                ? detailModal.region
                                                : `${detailModal.state} - ${detailModal.city}`}
                                        </p>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Quantidade</span>
                                        <p style={{ fontSize: '0.85rem' }}>{detailModal.quantity || '—'}</p>
                                    </div>
                                </div>

                                {detailModal.notes && (
                                    <div>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Observações</span>
                                        <p style={{
                                            fontSize: '0.85rem',
                                            background: 'var(--bg-input)',
                                            padding: '12px 16px',
                                            borderRadius: 'var(--radius-sm)',
                                            marginTop: 4,
                                        }}>{detailModal.notes}</p>
                                    </div>
                                )}

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Criado em</span>
                                        <p style={{ fontSize: '0.8rem' }}>
                                            {new Date(detailModal.createdAt).toLocaleDateString('pt-BR', {
                                                day: '2-digit', month: 'long', year: 'numeric',
                                            })}
                                        </p>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Atualizado em</span>
                                        <p style={{ fontSize: '0.8rem' }}>
                                            {new Date(detailModal.updatedAt).toLocaleDateString('pt-BR', {
                                                day: '2-digit', month: 'long', year: 'numeric',
                                            })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setDetailModal(null)}>
                                Fechar
                            </button>
                            <button className="btn btn-primary" onClick={() => {
                                setEditModal(detailModal);
                                setDetailModal(null);
                            }}>
                                <Edit3 size={14} />
                                Editar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editModal && (
                <EditModal
                    budget={editModal}
                    onClose={() => setEditModal(null)}
                    onSave={handleEditSave}
                />
            )}
        </>
    );
}

function EditModal({ budget, onClose, onSave }) {
    const [notes, setNotes] = useState(budget.notes || '');
    const [value, setValue] = useState(budget.value || 0);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Editar Orçamento</h3>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <div className="modal-body">
                    <div className="form-group">
                        <label className="form-label">Cliente</label>
                        <input className="form-input" value={budget.clientName} disabled />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Valor (R$)</label>
                        <input
                            className="form-input"
                            type="number"
                            value={value}
                            onChange={e => setValue(parseFloat(e.target.value) || 0)}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Observações</label>
                        <textarea
                            className="form-input"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={4}
                        />
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                    <button className="btn btn-primary" onClick={() => onSave(budget.id, { notes, value })}>
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    );
}
