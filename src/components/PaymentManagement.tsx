
import { useState, useEffect, useRef } from 'react';
import { ArrowUpCircle, ArrowDownCircle, DollarSign, Plus, TrendingUp, TrendingDown, ChevronRight, Trash2, X, Calendar, CreditCard, Tag, Briefcase, Wallet, Building, FileText, Wrench, Settings, CalendarIcon, Type, Repeat, Lock, Edit3, RefreshCw, RotateCcw } from 'lucide-react';
import { IconWithTooltip } from './ui/icon-with-tooltip';

import { usePaymentContext } from '../hooks/useFinancialData';
import { useFinancialData } from '../hooks/useFinancialData';

interface Payment {
  id: string;
  amount: number;
  date: string;
  description: string;
  type: 'income' | 'expense';
}

export function PaymentManagement() {
  const { getPaymentTransactionsForMonth, updatePaymentTransactionsForMonth } = usePaymentContext();
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [payments, setPayments] = useState<Payment[]>([]);
  const { getMonthlyData } = useFinancialData();

  // Simular dados de pagamentos por enquanto
  useEffect(() => {
    const mockPayments: Payment[] = [
      { id: '1', amount: 1500, date: '2024-01-15', description: 'Salary', type: 'income' },
      { id: '2', amount: 300, date: '2024-01-10', description: 'Groceries', type: 'expense' },
      { id: '3', amount: 2000, date: '2024-01-20', description: 'Freelance', type: 'income' },
      { id: '4', amount: 150, date: '2024-01-25', description: 'Utilities', type: 'expense' },
    ];
    setPayments(mockPayments);
  }, []);

  useEffect(() => {
    if (filterType === 'all') {
      setFilteredPayments(payments);
    } else {
      setFilteredPayments(payments.filter(payment => payment.type === filterType));
    }
  }, [payments, filterType]);

  function handleDeletePayment(id: string) {
    setPayments(prev => prev.filter(payment => payment.id !== id));
  }

  // Calcular resumo financeiro
  const totalIncome = payments.filter(p => p.type === 'income').reduce((sum, p) => sum + p.amount, 0);
  const totalExpense = payments.filter(p => p.type === 'expense').reduce((sum, p) => sum + p.amount, 0);
  const balance = totalIncome - totalExpense;

  return (
    <div className="payment-management">
      <div className="filter-buttons">
        <button onClick={() => setFilterType('all')} className={filterType === 'all' ? 'active' : ''}>All</button>
        <button onClick={() => setFilterType('income')} className={filterType === 'income' ? 'active' : ''}>Income</button>
        <button onClick={() => setFilterType('expense')} className={filterType === 'expense' ? 'active' : ''}>Expense</button>
      </div>

      <table className="payments-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Amount</th>
            <th>Type</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredPayments.map(payment => (
            <tr key={payment.id}>
              <td>{payment.date}</td>
              <td>{payment.description}</td>
              <td>{payment.amount.toFixed(2)}</td>
              <td>{payment.type}</td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => handleDeletePayment(payment.id)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  <IconWithTooltip icon={Trash2} className="w-4 h-4" tooltip="Excluir pagamento" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="financial-summary">
        <div>
          <h3>Total Income</h3>
          <p>{totalIncome.toFixed(2)}</p>
        </div>
        <div>
          <h3>Total Expense</h3>
          <p>{totalExpense.toFixed(2)}</p>
        </div>
        <div>
          <h3>Balance</h3>
          <p>{balance.toFixed(2)}</p>
        </div>
      </div>

      <div className="recent-payments">
        <h2>Recent Payments</h2>
        <table className="payments-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Type</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.slice(-5).map(payment => (
              <tr key={payment.id}>
                <td>{payment.date}</td>
                <td>{payment.description}</td>
                <td>{payment.amount.toFixed(2)}</td>
                <td>{payment.type}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleDeletePayment(payment.id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <IconWithTooltip icon={Trash2} className="w-4 h-4" tooltip="Excluir pagamento" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="other-section">
        <IconWithTooltip icon={Trash2} className="w-4 h-4" tooltip="Excluir receita" />
      </div>
    </div>
  );
}
