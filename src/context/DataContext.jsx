import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

const STORAGE_KEY = 'amazing_budgets';

const KANBAN_COLUMNS = [
  { id: 'new', label: 'Novo', dotClass: 'new' },
  { id: 'contact', label: 'Contato', dotClass: 'contact' },
  { id: 'negotiation', label: 'Negociação', dotClass: 'negotiation' },
  { id: 'won', label: 'Fechado ✓', dotClass: 'won' },
  { id: 'lost', label: 'Perdido', dotClass: 'lost' },
];

function loadBudgets() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveBudgets(budgets) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(budgets));
  } catch {
    // localStorage full or unavailable
  }
}

export function DataProvider({ children }) {
  const [budgets, setBudgets] = useState(loadBudgets);
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [toasts, setToasts] = useState([]);

  // Save budgets to localStorage whenever they change
  useEffect(() => {
    saveBudgets(budgets);
  }, [budgets]);

  const addToast = useCallback((message, type = 'info') => {
    const id = uuidv4();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const addBudget = useCallback((budget) => {
    const newBudget = {
      ...budget,
      id: uuidv4(),
      status: 'new',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setBudgets(prev => [newBudget, ...prev]);
    addToast('Orçamento adicionado com sucesso!', 'success');
    return newBudget;
  }, [addToast]);

  const updateBudgetStatus = useCallback((budgetId, newStatus) => {
    setBudgets(prev => prev.map(b =>
      b.id === budgetId
        ? { ...b, status: newStatus, updatedAt: new Date().toISOString() }
        : b
    ));
    addToast('Status atualizado!', 'success');
  }, [addToast]);

  const updateBudget = useCallback((budgetId, updates) => {
    setBudgets(prev => prev.map(b =>
      b.id === budgetId
        ? { ...b, ...updates, updatedAt: new Date().toISOString() }
        : b
    ));
  }, []);

  const deleteBudget = useCallback((budgetId) => {
    setBudgets(prev => prev.filter(b => b.id !== budgetId));
    addToast('Orçamento removido.', 'info');
  }, [addToast]);

  const getFilteredBudgets = useCallback((company = selectedCompany) => {
    if (company === 'all') return budgets;
    return budgets.filter(b => b.company === company);
  }, [budgets, selectedCompany]);

  const getStats = useCallback((company = selectedCompany) => {
    const filtered = getFilteredBudgets(company);
    const total = filtered.length;
    const totalValue = filtered.reduce((sum, b) => sum + (b.value || 0), 0);
    const won = filtered.filter(b => b.status === 'won');
    const lost = filtered.filter(b => b.status === 'lost');
    const open = filtered.filter(b => !['won', 'lost'].includes(b.status));
    const wonValue = won.reduce((sum, b) => sum + (b.value || 0), 0);
    const conversionRate = total > 0 ? ((won.length / total) * 100).toFixed(1) : 0;

    return {
      total,
      totalValue,
      wonCount: won.length,
      wonValue,
      lostCount: lost.length,
      openCount: open.length,
      conversionRate,
    };
  }, [getFilteredBudgets, selectedCompany]);

  const getByRegion = useCallback(() => {
    const lojaBudgets = budgets.filter(b => b.company === 'LojaDoAsfalto');
    const regionMap = {};
    lojaBudgets.forEach(b => {
      if (!regionMap[b.region]) {
        regionMap[b.region] = { region: b.region, count: 0, value: 0 };
      }
      regionMap[b.region].count++;
      regionMap[b.region].value += b.value || 0;
    });
    return Object.values(regionMap);
  }, [budgets]);

  const getByProduct = useCallback((company = selectedCompany) => {
    const filtered = getFilteredBudgets(company);
    const productMap = {};
    filtered.forEach(b => {
      if (!productMap[b.product]) {
        productMap[b.product] = { product: b.product, count: 0, value: 0 };
      }
      productMap[b.product].count++;
      productMap[b.product].value += b.value || 0;
    });
    return Object.values(productMap);
  }, [getFilteredBudgets, selectedCompany]);

  const getByStateCity = useCallback(() => {
    const multiBudgets = budgets.filter(b => b.company === 'AsfaltoMulti');
    const stateMap = {};
    multiBudgets.forEach(b => {
      const key = `${b.state} - ${b.city}`;
      if (!stateMap[key]) {
        stateMap[key] = { location: key, state: b.state, city: b.city, count: 0, value: 0 };
      }
      stateMap[key].count++;
      stateMap[key].value += b.value || 0;
    });
    return Object.values(stateMap);
  }, [budgets]);

  const getByStatus = useCallback((company = selectedCompany) => {
    const filtered = getFilteredBudgets(company);
    const statusMap = {};
    filtered.forEach(b => {
      if (!statusMap[b.status]) {
        statusMap[b.status] = { status: b.status, count: 0, value: 0 };
      }
      statusMap[b.status].count++;
      statusMap[b.status].value += b.value || 0;
    });
    return Object.values(statusMap);
  }, [getFilteredBudgets, selectedCompany]);

  const importBudgetsFromData = useCallback((data, company) => {
    const newBudgets = data.map(row => ({
      id: uuidv4(),
      company,
      clientName: row['Cliente'] || row['client'] || row['nome'] || row['Nome'] || '',
      clientEmail: row['Email'] || row['email'] || '',
      clientPhone: row['Telefone'] || row['telefone'] || row['phone'] || '',
      product: row['Produto'] || row['produto'] || row['product'] || '',
      region: row['Região'] || row['regiao'] || row['region'] || '',
      state: row['Estado'] || row['estado'] || row['state'] || row['UF'] || row['uf'] || '',
      city: row['Cidade'] || row['cidade'] || row['city'] || '',
      value: parseFloat(row['Valor'] || row['valor'] || row['value'] || 0),
      quantity: row['Quantidade'] || row['quantidade'] || row['quantity'] || '',
      status: 'new',
      notes: row['Observações'] || row['observacoes'] || row['notes'] || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    setBudgets(prev => [...newBudgets, ...prev]);
    addToast(`${newBudgets.length} orçamentos importados com sucesso!`, 'success');
  }, [addToast]);

  const value = {
    budgets,
    selectedCompany,
    setSelectedCompany,
    addBudget,
    updateBudgetStatus,
    updateBudget,
    deleteBudget,
    getFilteredBudgets,
    getStats,
    getByRegion,
    getByProduct,
    getByStateCity,
    getByStatus,
    importBudgetsFromData,
    KANBAN_COLUMNS,
    toasts,
    addToast,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}
