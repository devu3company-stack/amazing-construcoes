import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../firebase';
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

const BUDGETS_COLLECTION = 'budgets';

const KANBAN_COLUMNS = [
  { id: 'new', label: 'Novo', dotClass: 'new' },
  { id: 'contact', label: 'Contato', dotClass: 'contact' },
  { id: 'negotiation', label: 'Negociação', dotClass: 'negotiation' },
  { id: 'won', label: 'Fechado ✓', dotClass: 'won' },
  { id: 'lost', label: 'Perdido', dotClass: 'lost' },
];

export function DataProvider({ children }) {
  const [budgets, setBudgets] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [toasts, setToasts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Real-time listener for Firestore budgets
  useEffect(() => {
    const q = query(collection(db, BUDGETS_COLLECTION), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const budgetList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setBudgets(budgetList);
      setIsLoading(false);
    }, (error) => {
      console.error('Erro ao carregar orçamentos:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addToast = useCallback((message, type = 'info') => {
    const id = uuidv4();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const addBudget = useCallback(async (budget) => {
    try {
      const newBudget = {
        ...budget,
        status: 'new',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const docRef = await addDoc(collection(db, BUDGETS_COLLECTION), newBudget);
      addToast('Orçamento adicionado com sucesso!', 'success');
      return { ...newBudget, id: docRef.id };
    } catch (error) {
      console.error('Erro ao adicionar orçamento:', error);
      addToast('Erro ao salvar orçamento', 'error');
      return null;
    }
  }, [addToast]);

  const updateBudgetStatus = useCallback(async (budgetId, newStatus) => {
    try {
      const budgetRef = doc(db, BUDGETS_COLLECTION, budgetId);
      await updateDoc(budgetRef, {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      addToast('Status atualizado!', 'success');
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      addToast('Erro ao atualizar status', 'error');
    }
  }, [addToast]);

  const updateBudget = useCallback(async (budgetId, updates) => {
    try {
      const budgetRef = doc(db, BUDGETS_COLLECTION, budgetId);
      await updateDoc(budgetRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Erro ao atualizar orçamento:', error);
    }
  }, []);

  const deleteBudget = useCallback(async (budgetId) => {
    try {
      await deleteDoc(doc(db, BUDGETS_COLLECTION, budgetId));
      addToast('Orçamento removido.', 'info');
    } catch (error) {
      console.error('Erro ao remover orçamento:', error);
      addToast('Erro ao remover orçamento', 'error');
    }
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

  const importBudgetsFromData = useCallback(async (data, company) => {
    try {
      const promises = data.map(row => {
        const budget = {
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
        };
        return addDoc(collection(db, BUDGETS_COLLECTION), budget);
      });
      await Promise.all(promises);
      addToast(`${data.length} orçamentos importados com sucesso!`, 'success');
    } catch (error) {
      console.error('Erro ao importar orçamentos:', error);
      addToast('Erro ao importar orçamentos', 'error');
    }
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
    isLoading,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}
