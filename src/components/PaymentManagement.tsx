import { useState, useEffect, useRef } from 'react';
import { ArrowUpCircle, ArrowDownCircle, DollarSign, Plus, TrendingUp, TrendingDown, ChevronRight, Trash2, X, Calendar, CreditCard, Tag, Briefcase, Wallet, Building, FileText, Wrench, Settings, CalendarIcon, Type, Repeat, Lock, Edit3, RefreshCw, RotateCcw } from 'lucide-react';
import { IconWithTooltip } from './ui/icon-with-tooltip';

import { usePaymentContext } from '../context/PaymentContext';
import { useFinancialData } from '../hooks/useFinancialData';

interface Payment {
  id: string;
  amount: number;
  date: string;
  description: string;
  type: 'income' | 'expense';
}

export function PaymentManagement() {
  const { payments, deletePayment } = usePaymentContext();
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const { financialSummary } = useFinancialData(payments);

  useEffect(() => {
    if (filterType === 'all') {
      setFilteredPayments(payments);
    } else {
      setFilteredPayments(payments.filter(payment => payment.type === filterType));
    }
  }, [payments, filterType]);

  function handleDeletePayment(id: string) {
    deletePayment(id);
  }

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
          <p>{financialSummary.totalIncome.toFixed(2)}</p>
        </div>
        <div>
          <h3>Total Expense</h3>
          <p>{financialSummary.totalExpense.toFixed(2)}</p>
        </div>
        <div>
          <h3>Balance</h3>
          <p>{financialSummary.balance.toFixed(2)}</p>
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
