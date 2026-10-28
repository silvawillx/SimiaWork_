import React, { useState } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Video, HardDrive, Sparkles, Trash2 } from 'lucide-react';

export default function TrabalhoView({ tarefas, createNotification }) {
  const [titulo, setTitulo] = useState('');
  const [responsavel, setResponsavel] = useState('William');
  const [linkVideo, setLinkVideo] = useState('');
  const [linkDrive, setLinkDrive] = useState('');
  const [dicasIA, setDicasIA] = useState('');
  const [statusError, setStatusError] = useState('');

  const handleSimulateAI = () => {
    if(!titulo) return;
    setDicasIA("Analisando tarefa...\n1. Estudar a copy da referência.\n2. Montar 3 ganchos iniciais focados na dor.\n3. Editar mantendo ritmo rápido (jump cuts).\n4. Subir no Drive com nomenclatura padrão.");
  };

  const handleAddTarefa = async () => {
    if (!titulo) return;
    await addDoc(collection(db, 'tarefas'), {
      titulo, responsavel, linkVideo, linkDrive, dicasIA, status: 'A Fazer'
    });
    createNotification('Nova Tarefa', `${titulo} atribuída a ${responsavel}`);
    setTitulo(''); setLinkVideo(''); setLinkDrive(''); setDicasIA('');
  };

  const handleStatusChange = async (id, novoStatus, titulo) => {
    setStatusError('');
    try {
      await updateDoc(doc(db, 'tarefas', id), { status: novoStatus });
      await createNotification('Tarefa Atualizada', `"${titulo}" foi para ${novoStatus}`);
    } catch (error) {
      console.error('Erro ao atualizar o status da tarefa:', error);
      setStatusError('Não foi possível atualizar o status da tarefa. Verifique a conexão e tente novamente.');
    }
  };

  const handleDelete = async (id) => await deleteDoc(doc(db, 'tarefas', id));

  const colunas = ['A Fazer', 'Em Andamento', 'Concluído'];

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-2xl font-bold mb-6">Gestão de Criativos e Tarefas</h2>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border dark:border-gray-700 mb-6 shadow-sm">
        <h3 className="font-semibold mb-4 border-b pb-2 dark:border-gray-700">Nova Entrega</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input value={titulo} onChange={e=>setTitulo(e.target.value)} placeholder="Ex: Editar Vídeo VSL Produto X" className="border dark:border-gray-600 p-2 rounded dark:bg-gray-700 w-full" />
          <select value={responsavel} onChange={e=>setResponsavel(e.target.value)} className="border dark:border-gray-600 p-2 rounded dark:bg-gray-700 w-full">
            <option>William</option><option>Cayo</option>
          </select>
          <input value={linkVideo} onChange={e=>setLinkVideo(e.target.value)} placeholder="Link do Vídeo Base (Opcional)" className="border dark:border-gray-600 p-2 rounded dark:bg-gray-700 w-full text-sm" />
          <input value={linkDrive} onChange={e=>setLinkDrive(e.target.value)} placeholder="Link da Pasta no Drive (Opcional)" className="border dark:border-gray-600 p-2 rounded dark:bg-gray-700 w-full text-sm" />
        </div>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Recomendações / Passo a passo</label>
            <button onClick={handleSimulateAI} className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 px-3 py-1 rounded-full font-bold hover:bg-purple-200 transition-colors">
              <Sparkles size={12}/> Gerar Dicas com IA
            </button>
          </div>
          <textarea value={dicasIA} onChange={e=>setDicasIA(e.target.value)} rows="3" className="w-full border dark:border-gray-600 p-2 rounded dark:bg-gray-700 text-sm" placeholder="O que deve ser feito exatamente..."></textarea>
        </div>
        <button onClick={handleAddTarefa} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2">
          <Plus size={18}/> Salvar Entrega
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {statusError && <p role="alert" className="md:col-span-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{statusError}</p>}
        {colunas.map(coluna => (
          <div key={coluna} className="bg-gray-100 dark:bg-gray-800/50 p-4 rounded-xl border dark:border-gray-700 min-h-[500px]">
            <h3 className="font-bold mb-4 flex justify-between items-center text-gray-700 dark:text-gray-300">
              {coluna} <span className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full text-xs">{tarefas.filter(t => t.status === coluna).length}</span>
            </h3>
            <div className="space-y-3">
              {tarefas.filter(t => t.status === coluna).map(t => (
                <div key={t.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border-l-4 border-indigo-500 dark:border-gray-700 group">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-semibold text-sm leading-tight">{t.titulo}</p>
                    <button onClick={() => handleDelete(t.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                  </div>
                  <span className="text-[10px] font-bold bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded mb-3 inline-block">Resp: {t.responsavel}</span>
                  
                  {t.dicasIA && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 whitespace-pre-wrap p-2 bg-gray-50 dark:bg-gray-700/30 rounded border dark:border-gray-700">
                      {t.dicasIA}
                    </p>
                  )}

                  {(t.linkVideo || t.linkDrive) && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {t.linkVideo && <a href={t.linkVideo} target="_blank" className="flex items-center gap-1 text-[10px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 px-2 py-1 rounded hover:underline"><Video size={10}/> Referência</a>}
                      {t.linkDrive && <a href={t.linkDrive} target="_blank" className="flex items-center gap-1 text-[10px] font-bold bg-orange-50 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400 px-2 py-1 rounded hover:underline"><HardDrive size={10}/> Pasta Drive</a>}
                    </div>
                  )}

                  <select value={t.status} onChange={(e) => handleStatusChange(t.id, e.target.value, t.titulo)} className="w-full text-xs p-1 mt-2 border rounded dark:bg-gray-700 dark:border-gray-600 font-medium cursor-pointer">
                    {colunas.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}