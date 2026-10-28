import React, { useState } from 'react';
import { isToday, isThisWeek, isThisMonth, parseISO } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export default function DashboardView({ financas }) {
  const [periodo, setPeriodo] = useState('mes');

  // Filtro de Data
  const financasFiltradas = financas.filter(f => {
    if (!f.data) return false;
    const itemDate = parseISO(f.data);
    if (periodo === 'hoje') return isToday(itemDate);
    if (periodo === 'semana') return isThisWeek(itemDate, { weekStartsOn: 0 });
    if (periodo === 'mes') return isThisMonth(itemDate);
    return true; 
  });

  let receita = 0;
  let custos = 0;
  let pendente = 0;

  financasFiltradas.forEach(f => {
    const valorTotal = Number(f.valorVenda) * Number(f.quantidade);
    if (f.statusPagamento === 'pago') receita += valorTotal;
    if (f.statusPagamento === 'pendente') pendente += valorTotal;
    custos += Number(f.gastosAds || 0);
  });

  const lucro = receita - custos;
  const roas = custos > 0 ? (receita / custos).toFixed(2) : 0;
  const roi = custos > 0 ? (((receita - custos) / custos) * 100).toFixed(1) : 0;

  const dadosGraficoBarras = Object.values(financasFiltradas.reduce((acc, f) => {
    const dataFormatada = new Date(f.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    if (!acc[dataFormatada]) acc[dataFormatada] = { data: dataFormatada, Receita: 0, Gastos: 0 };
    if (f.statusPagamento === 'pago') acc[dataFormatada].Receita += (Number(f.valorVenda) * Number(f.quantidade));
    acc[dataFormatada].Gastos += Number(f.gastosAds || 0);
    return acc;
  }, {})).reverse(); 

  const dadosGraficoPizza = Object.values(financasFiltradas.reduce((acc, f) => {
    if (f.statusPagamento !== 'pago') return acc;
    if (!acc[f.produto]) acc[f.produto] = { name: f.produto, value: 0 };
    acc[f.produto].value += (Number(f.valorVenda) * Number(f.quantidade));
    return acc;
  }, {}));
  
  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Performance Financeira</h2>
        <select value={periodo} onChange={e => setPeriodo(e.target.value)} className="border dark:border-gray-700 bg-white dark:bg-gray-800 p-2 rounded-lg font-medium shadow-sm">
          <option value="hoje">Hoje</option>
          <option value="semana">Esta Semana</option>
          <option value="mes">Este Mês</option>
          <option value="tudo">Todo o Período</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Receita (Vendas Pagas)</p>
          <h3 className="text-3xl font-bold text-green-600 dark:text-green-400">R$ {receita.toFixed(2)}</h3>
        </div>
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Investimento (Ads)</p>
          <h3 className="text-3xl font-bold text-red-600 dark:text-red-400">R$ {custos.toFixed(2)}</h3>
        </div>
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Lucro Líquido Estimado</p>
          <h3 className="text-3xl font-bold text-blue-600 dark:text-blue-400">R$ {lucro.toFixed(2)}</h3>
        </div>
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">ROAS / ROI</p>
          <h3 className="text-3xl font-bold text-purple-600 dark:text-purple-400">{roas}x / {roi}%</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl border dark:border-gray-700 shadow-sm h-96">
          <h3 className="font-semibold mb-4 text-gray-700 dark:text-gray-200">Receita vs Gastos (Evolução)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosGraficoBarras}>
              <XAxis dataKey="data" stroke="#888" fontSize={12} />
              <YAxis stroke="#888" fontSize={12} />
              <Tooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff'}} />
              <Legend />
              <Bar dataKey="Receita" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border dark:border-gray-700 shadow-sm h-96">
          <h3 className="font-semibold mb-4 text-gray-700 dark:text-gray-200">Vendas por Produto (R$)</h3>
          {dadosGraficoPizza.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">Sem dados pagos neste período</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dadosGraficoPizza} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                  {dadosGraficoPizza.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff'}} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}