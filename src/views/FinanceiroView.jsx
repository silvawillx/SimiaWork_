import React, { useState } from 'react';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Trash2 } from 'lucide-react';

export default function FinanceiroView({ financas, createNotification }) {
  const [produto, setProduto] = useState('');
  const [valorVenda, setValorVenda] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [gastosAds, setGastosAds] = useState('');
  const [statusProduto, setStatusProduto] = useState('Ativo');
  const [statusPagamento, setStatusPagamento] = useState('pago');
  const [dataAtual, setDataAtual] = useState(new Date().toISOString().split('T')[0]);

  const handleAdd = async () => {
    if(!produto || !valorVenda) return;
    await addDoc(collection(db, 'financas'), {
      produto,
      valorVenda: Number(valorVenda),
      quantidade: Number(quantidade),
      gastosAds: Number(gastosAds || 0),
      statusProduto,
      statusPagamento,
      data: new Date(dataAtual).toISOString()
    });
    createNotification('Lançamento Registrado', `${quantidade}x vendas de ${produto}.`);
    setProduto(''); setValorVenda(''); setGastosAds(''); setQuantidade('1');
  };

  const handleDelete = async (id) => await deleteDoc(doc(db, 'financas', id));

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Controle de Produtos e Vendas</h2>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border dark:border-gray-700 mb-6 shadow-sm">
        <h3 className="font-semibold mb-4 border-b pb-2 dark:border-gray-700">Novo Lançamento Diário</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="md:col-span-2">
            <label className="text-xs text-gray-500 block mb-1">Nome do Produto / Oferta</label>
            <input value={produto} onChange={e=>setProduto(e.target.value)} placeholder="Ex: E-book X, Mentoria Y" className="w-full border dark:border-gray-600 p-2 rounded dark:bg-gray-700" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Status do Produto</label>
            <select value={statusProduto} onChange={e=>setStatusProduto(e.target.value)} className="w-full border dark:border-gray-600 p-2 rounded dark:bg-gray-700">
              <option>Em Teste</option><option>Escala</option><option>Ativo</option><option>Pausado / Morto</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Data da Movimentação</label>
            <input type="date" value={dataAtual} onChange={e=>setDataAtual(e.target.value)} className="w-full border dark:border-gray-600 p-2 rounded dark:bg-gray-700" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 items-end">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Valor Un. da Venda (R$)</label>
            <input type="number" value={valorVenda} onChange={e=>setValorVenda(e.target.value)} placeholder="0.00" className="w-full border dark:border-gray-600 p-2 rounded dark:bg-gray-700" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Qtd. de Vendas</label>
            <input type="number" value={quantidade} onChange={e=>setQuantidade(e.target.value)} min="1" className="w-full border dark:border-gray-600 p-2 rounded dark:bg-gray-700" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Gasto em Ads no Dia (R$)</label>
            <input type="number" value={gastosAds} onChange={e=>setGastosAds(e.target.value)} placeholder="0.00" className="w-full border dark:border-gray-600 p-2 rounded dark:bg-gray-700" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Status de Pagamento</label>
            <select value={statusPagamento} onChange={e=>setStatusPagamento(e.target.value)} className="w-full border dark:border-gray-600 p-2 rounded dark:bg-gray-700">
              <option value="pago">Confirmado / Pago</option>
              <option value="pendente">Pendente / Boleto</option>
            </select>
          </div>
        </div>
        <button onClick={handleAdd} className="bg-green-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-green-700 w-full md:w-auto">Salvar Lançamento</button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
              <tr>
                <th className="p-4 font-medium">Data</th>
                <th className="p-4 font-medium">Produto</th>
                <th className="p-4 font-medium">Ciclo</th>
                <th className="p-4 font-medium">Receita Bruta</th>
                <th className="p-4 font-medium">Ads/Custo</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {financas.map(f => {
                const totalReceita = Number(f.valorVenda) * Number(f.quantidade);
                return (
                  <tr key={f.id} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="p-4 text-gray-500">{new Date(f.data).toLocaleDateString('pt-BR')}</td>
                    <td className="p-4 font-bold">{f.produto} <span className="text-xs font-normal text-gray-400">({f.quantidade}x)</span></td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold 
                        ${f.statusProduto.includes('Morto') ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                        {f.statusProduto}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-green-600 dark:text-green-400">R$ {totalReceita.toFixed(2)}</td>
                    <td className="p-4 font-bold text-red-500">R$ {Number(f.gastosAds || 0).toFixed(2)}</td>
                    <td className="p-4">
                      <span className={`text-xs font-semibold ${f.statusPagamento === 'pago' ? 'text-green-500' : 'text-yellow-500'}`}>
                        {f.statusPagamento.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => handleDelete(f.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}