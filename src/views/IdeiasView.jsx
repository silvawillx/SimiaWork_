import React, { useState } from 'react';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { ExternalLink, Trash2 } from 'lucide-react';

export default function IdeiasView({ ideias, createNotification }) {
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState('Produto');
  const [descricao, setDescricao] = useState('');
  const [linkRef, setLinkRef] = useState('');
  
  const handleAdd = async () => {
    if(!titulo) return;
    await addDoc(collection(db, 'ideias'), { titulo, tipo, descricao, linkRef, status: 'Nova', data: new Date().toISOString() });
    createNotification('Ideia Registrada', `${tipo}: ${titulo}`);
    setTitulo(''); setDescricao(''); setLinkRef('');
  };
  const handleDelete = async (id) => await deleteDoc(doc(db, 'ideias', id));

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Central de Ideias & Copy</h2>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border dark:border-gray-700 mb-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-2">
            <label className="text-xs text-gray-500 block mb-1">Título da Ideia / Copy</label>
            <input value={titulo} onChange={e=>setTitulo(e.target.value)} placeholder="Ex: Gancho matador para Público X" className="w-full border dark:border-gray-600 p-2 rounded dark:bg-gray-700" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Categoria</label>
            <select value={tipo} onChange={e=>setTipo(e.target.value)} className="w-full border dark:border-gray-600 p-2 rounded dark:bg-gray-700">
              <option>Copy / Script</option><option>Produto</option><option>Oferta</option><option>Criativo</option><option>Melhoria</option>
            </select>
          </div>
        </div>
        <div className="mb-4">
          <label className="text-xs text-gray-500 block mb-1">Descrição / Corpo do Texto</label>
          <textarea value={descricao} onChange={e=>setDescricao(e.target.value)} rows="4" placeholder="Escreva a copy completa, os diferenciais da oferta ou explique a ideia..." className="w-full border dark:border-gray-600 p-2 rounded dark:bg-gray-700 text-sm"></textarea>
        </div>
        <div className="flex gap-4 items-center">
          <input value={linkRef} onChange={e=>setLinkRef(e.target.value)} placeholder="Link de Referência/Inspiração (Concorrente)" className="flex-1 border dark:border-gray-600 p-2 rounded dark:bg-gray-700 text-sm" />
          <button onClick={handleAdd} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 font-bold">Salvar Ideia</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {ideias.map(i => (
          <div key={i.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl border dark:border-gray-700 shadow-sm flex flex-col relative">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-2 py-1 rounded">{i.tipo}</span>
              <button onClick={() => handleDelete(i.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
            </div>
            <h3 className="font-bold text-lg mb-2">{i.titulo}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 whitespace-pre-wrap flex-1">{i.descricao}</p>
            {i.linkRef && (
              <a href={i.linkRef} target="_blank" className="inline-flex items-center gap-1 text-sm text-indigo-500 hover:underline mt-auto pt-3 border-t dark:border-gray-700">
                <ExternalLink size={14}/> Ver Referência Anexada
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}