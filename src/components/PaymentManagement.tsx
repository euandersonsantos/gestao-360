import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Calendar, DollarSign, FileText, Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { useFinancialData } from '../hooks/useFinancialData';

// Helper function to format numbers as currency
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

// Helper function to format dates as dd/mm/yyyy
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

interface Transaction {
  id: string;
  label: string;
  value: number;
  type: 'entrada' | 'saida';
  completed: boolean;
  description?: string;
  category?: string;
  dueDate?: string;
}

interface PaymentManagementProps {
  selectedMonth: string;
}

const categoryIcons: Record<string, React.ComponentType<any>> = {
  'Renda': DollarSign,
  'Retiradas': Users,
  'Impostos': FileText,
  'Serviços': FileText,
  'default': FileText
};

export function PaymentManagement({ selectedMonth }: PaymentManagementProps) {
  const { 
    getPaymentTransactionsForMonth, 
    updatePaymentTransactionsForMonth,
    getMonthlyData 
  } = useFinancialData();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'entrada' | 'saida'>('all');
  const [filterCompleted, setFilterCompleted] = useState<'all' | 'completed' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    label: '',
    value: '',
    type: 'entrada' as 'entrada' | 'saida',
    description: '',
    category: '',
    dueDate: ''
  });

  // Load transactions when selectedMonth changes
  useEffect(() => {
    const monthTransactions = getPaymentTransactionsForMonth(selectedMonth);
    setTransactions(monthTransactions);
  }, [selectedMonth, getPaymentTransactionsForMonth]);

  // Apply filters
  useEffect(() => {
    let filtered = transactions;

    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }

    if (filterCompleted !== 'all') {
      filtered = filtered.filter(t => 
        filterCompleted === 'completed' ? t.completed : !t.completed
      );
    }

    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredTransactions(filtered);
  }, [transactions, filterType, filterCompleted, searchTerm]);

  const resetForm = () => {
    setFormData({
      label: '',
      value: '',
      type: 'entrada',
      description: '',
      category: '',
      dueDate: ''
    });
  };

  const handleCreate = () => {
    if (!formData.label || !formData.value) return;

    const newTransaction: Transaction = {
      id: `custom_${Date.now()}`,
      label: formData.label,
      value: parseFloat(formData.value),
      type: formData.type,
      completed: false,
      description: formData.description,
      category: formData.category,
      dueDate: formData.dueDate
    };

    const updatedTransactions = [...transactions, newTransaction];
    setTransactions(updatedTransactions);
    updatePaymentTransactionsForMonth(selectedMonth, updatedTransactions);
    
    setIsCreateModalOpen(false);
    resetForm();
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      label: transaction.label,
      value: transaction.value.toString(),
      type: transaction.type,
      description: transaction.description || '',
      category: transaction.category || '',
      dueDate: transaction.dueDate || ''
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = () => {
    if (!editingTransaction || !formData.label || !formData.value) return;

    const updatedTransaction: Transaction = {
      ...editingTransaction,
      label: formData.label,
      value: parseFloat(formData.value),
      type: formData.type,
      description: formData.description,
      category: formData.category,
      dueDate: formData.dueDate
    };

    const updatedTransactions = transactions.map(t => 
      t.id === editingTransaction.id ? updatedTransaction : t
    );
    
    setTransactions(updatedTransactions);
    updatePaymentTransactionsForMonth(selectedMonth, updatedTransactions);
    
    setIsEditModalOpen(false);
    setEditingTransaction(null);
    resetForm();
  };

  const handleDelete = (id: string) => {
    const updatedTransactions = transactions.filter(t => t.id !== id);
    setTransactions(updatedTransactions);
    updatePaymentTransactionsForMonth(selectedMonth, updatedTransactions);
  };

  const toggleCompleted = (id: string) => {
    const updatedTransactions = transactions.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    setTransactions(updatedTransactions);
    updatePaymentTransactionsForMonth(selectedMonth, updatedTransactions);
  };

  // Calculate summary data
  const monthlyData = getMonthlyData(selectedMonth);
  const totalEntradas = transactions.filter(t => t.type === 'entrada').reduce((sum, t) => sum + t.value, 0);
  const totalSaidas = transactions.filter(t => t.type === 'saida').reduce((sum, t) => sum + t.value, 0);
  const saldo = totalEntradas - totalSaidas;

  const completedEntradas = transactions.filter(t => t.type === 'entrada' && t.completed).reduce((sum, t) => sum + t.value, 0);
  const completedSaidas = transactions.filter(t => t.type === 'saida' && t.completed).reduce((sum, t) => sum + t.value, 0);
  const realizedSaldo = completedEntradas - completedSaidas;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entradas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalEntradas)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Saídas</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalSaidas)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Previsto</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(saldo)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Realizado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${realizedSaldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(realizedSaldo)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Transações - {selectedMonth}</span>
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Transação
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Nova Transação</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="label">Descrição</Label>
                    <Input
                      id="label"
                      value={formData.label}
                      onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                      placeholder="Digite a descrição da transação"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="value">Valor</Label>
                    <Input
                      id="value"
                      type="number"
                      step="0.01"
                      value={formData.value}
                      onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                      placeholder="0,00"
                    />
                  </div>

                  <div>
                    <Label htmlFor="type">Tipo</Label>
                    <Select value={formData.type} onValueChange={(value: 'entrada' | 'saida') => 
                      setFormData(prev => ({ ...prev, type: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entrada">Entrada</SelectItem>
                        <SelectItem value="saida">Saída</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="category">Categoria</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      placeholder="Ex: Renda, Impostos, Serviços"
                    />
                  </div>

                  <div>
                    <Label htmlFor="dueDate">Data de Vencimento</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Observações</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Observações adicionais (opcional)"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreate}>
                      Criar Transação
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Buscar transações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={filterType} onValueChange={(value: 'all' | 'entrada' | 'saida') => setFilterType(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="entrada">Entradas</SelectItem>
                <SelectItem value="saida">Saídas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterCompleted} onValueChange={(value: 'all' | 'completed' | 'pending') => setFilterCompleted(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="completed">Concluídas</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Transactions List */}
          <div className="space-y-2">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma transação encontrada
              </div>
            ) : (
              filteredTransactions.map((transaction) => {
                const IconComponent = categoryIcons[transaction.category || 'default'];
                return (
                  <div
                    key={transaction.id}
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      transaction.completed ? 'bg-muted/50' : 'bg-background'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <Checkbox
                        checked={transaction.completed}
                        onCheckedChange={() => toggleCompleted(transaction.id)}
                      />
                      
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${
                          transaction.type === 'entrada' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        
                        <div>
                          <div className="font-medium">{transaction.label}</div>
                          {transaction.description && (
                            <div className="text-sm text-muted-foreground">{transaction.description}</div>
                          )}
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            {transaction.category && (
                              <Badge variant="secondary">{transaction.category}</Badge>
                            )}
                            {transaction.dueDate && (
                              <span className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {transaction.dueDate}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className={`text-lg font-semibold ${
                        transaction.type === 'entrada' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'entrada' ? '+' : '-'}{formatCurrency(transaction.value)}
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(transaction)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(transaction.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Transação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-label">Descrição</Label>
              <Input
                id="edit-label"
                value={formData.label}
                onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                placeholder="Digite a descrição da transação"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-value">Valor</Label>
              <Input
                id="edit-value"
                type="number"
                step="0.01"
                value={formData.value}
                onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                placeholder="0,00"
              />
            </div>

            <div>
              <Label htmlFor="edit-type">Tipo</Label>
              <Select value={formData.type} onValueChange={(value: 'entrada' | 'saida') => 
                setFormData(prev => ({ ...prev, type: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-category">Categoria</Label>
              <Input
                id="edit-category"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder="Ex: Renda, Impostos, Serviços"
              />
            </div>

            <div>
              <Label htmlFor="edit-dueDate">Data de Vencimento</Label>
              <Input
                id="edit-dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="edit-description">Observações</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Observações adicionais (opcional)"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdate}>
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
