import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { format, isToday, isThisWeek, isThisMonth, parseISO } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { 
  LayoutDashboard, Lightbulb, CircleDollarSign, KanbanSquare, 
  Bell, LogOut, Plus, Video, HardDrive, Lock, Sun, Moon, Sparkles, ExternalLink, Download, Trash2, Calendar
} from 'lucide-react';

const parseFinancialDate = (value) => parseISO(value.slice(0, 10));
const includesInRevenue = (entry) => entry.statusPagamento !== 'pendente';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [tarefas, setTarefas] = useState([]);
  const [ideias, setIdeias] = useState([]);
  const [financas, setFinancas] = useState([]);
  const [notificacoes, setNotificacoes] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubTarefas = onSnapshot(collection(db, 'tarefas'), (snap) => setTarefas(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubIdeias = onSnapshot(collection(db, 'ideias'), (snap) => setIdeias(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubFinancas = onSnapshot(query(collection(db, 'financas'), orderBy('data', 'desc')), (snap) => setFinancas(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubNotif = onSnapshot(query(collection(db, 'notificacoes'), orderBy('timestamp', 'desc')), (snap) => setNotificacoes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubTarefas(); unsubIdeias(); unsubFinancas(); unsubNotif(); };
  }, [user]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isRegistering) await createUserWithEmailAndPassword(auth, email, password);
      else await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setAuthError('Erro na autenticação. Verifique os dados ou as regras do Firebase.');
    }
  };

  const createNotification = async (title, message) => {
    await addDoc(collection(db, 'notificacoes'), { title, message, read: false, autor: user.email, timestamp: serverTimestamp() });
    if (Notification.permission === 'granted') new Notification("SimiaWork: " + title, { body: message });
    else if (Notification.permission !== 'denied') Notification.requestPermission();
  };

  const markNotifRead = async (id) => await updateDoc(doc(db, 'notificacoes', id), { read: true });

  if (loading) return <div className="h-screen flex items-center justify-center dark:bg-gray-900 dark:text-white">Carregando SimiaWork...</div>;

  if (!user) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors p-4">
        <div className="absolute right-4 top-4">
          <InstallButton />
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-lg w-full max-w-md border dark:border-gray-700">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg"><Lock className="text-white w-8 h-8" /></div>
          </div>
          <h1 className="text-2xl font-bold text-center mb-2 text-gray-800 dark:text-white">SimiaWork Pro</h1>
          <p className="text-center text-gray-500 dark:text-gray-400 mb-6">{isRegistering ? 'Criar conta (Apenas Admin)' : 'Acesso Restrito'}</p>
          {authError && <p className="text-red-500 text-sm text-center mb-4 bg-red-50 p-2 rounded">{authError}</p>}
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium dark:text-gray-300">E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
            </div>
            <div>
              <label className="block text-sm font-medium dark:text-gray-300">Senha</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white p-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors">{isRegistering ? 'Cadastrar' : 'Entrar'}</button>
          </form>
          <div className="mt-6 text-center">
            <button onClick={() => setIsRegistering(!isRegistering)} className="text-sm text-indigo-600 hover:underline">{isRegistering ? 'Já tem conta? Entrar' : 'Registrar-se'}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors">
      <aside className="hidden md:flex md:w-64 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex-col z-10 shrink-0">
        <div className="p-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">SimiaWork</h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <SidebarItem icon={<LayoutDashboard size={20}/>} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={<Lightbulb size={20}/>} label="Ideias & Base" active={activeTab === 'ideias'} onClick={() => setActiveTab('ideias')} />
          <SidebarItem icon={<CircleDollarSign size={20}/>} label="Financeiro" active={activeTab === 'financeiro'} onClick={() => setActiveTab('financeiro')} />
          <SidebarItem icon={<KanbanSquare size={20}/>} label="Trabalho" active={activeTab === 'trabalho'} onClick={() => setActiveTab('trabalho')} />
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
          <button onClick={() => setDarkMode(!darkMode)} className="flex items-center gap-3 w-full p-3 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            {darkMode ? <Sun size={20} /> : <Moon size={20} />} <span>{darkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
          </button>
          <button onClick={() => signOut(auth)} className="flex items-center gap-3 w-full p-3 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
            <LogOut size={20} /> <span>Sair</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden relative">
        <header className="min-h-16 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-950/90 backdrop-blur flex items-center justify-between px-4 sm:px-8 py-2 z-20">
          <h2 className="text-lg sm:text-xl font-semibold capitalize">{activeTab}</h2>
          <div className="flex items-center gap-1 sm:gap-3 relative">
            <InstallButton />
            <button onClick={() => setDarkMode(!darkMode)} aria-label={darkMode ? 'Ativar modo claro' : 'Ativar modo escuro'} className="md:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={() => signOut(auth)} aria-label="Sair" className="md:hidden p-2 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
              <LogOut size={20} />
            </button>
            <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 relative">
              <Bell size={20} />
              {notificacoes.filter(n => !n.read).length > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900"></span>}
            </button>
            {showNotifications && (
              <div className="absolute top-12 right-0 sm:right-12 w-[min(20rem,calc(100vw-2rem))] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 p-4 max-h-96 overflow-y-auto">
                <h3 className="font-bold mb-3 border-b pb-2 dark:border-gray-700">Notificações</h3>
                {notificacoes.map(n => (
                  <div key={n.id} onClick={() => markNotifRead(n.id)} className={`p-2 mb-2 rounded cursor-pointer border-l-2 ${n.read ? 'border-transparent opacity-60' : 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'}`}>
                    <p className="text-sm font-semibold">{n.title}</p>
                    <p className="text-[10px] text-gray-500">{n.message} (Por: {n.autor})</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8 bg-gray-50 dark:bg-gray-900">
          {activeTab === 'dashboard' && <DashboardView financas={financas} tarefas={tarefas} />}
          {activeTab === 'trabalho' && <TrabalhoView tarefas={tarefas} createNotification={createNotification} />}
          {activeTab === 'ideias' && <IdeiasView ideias={ideias} createNotification={createNotification} />}
          {activeTab === 'financeiro' && <FinanceiroView financas={financas} createNotification={createNotification} />}
        </div>
      </main>
      <nav aria-label="Navegação principal" className="md:hidden fixed bottom-0 inset-x-0 z-30 grid grid-cols-4 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <MobileNavItem icon={<LayoutDashboard size={20} />} label="Início" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <MobileNavItem icon={<Lightbulb size={20} />} label="Ideias" active={activeTab === 'ideias'} onClick={() => setActiveTab('ideias')} />
        <MobileNavItem icon={<CircleDollarSign size={20} />} label="Financeiro" active={activeTab === 'financeiro'} onClick={() => setActiveTab('financeiro')} />
        <MobileNavItem icon={<KanbanSquare size={20} />} label="Trabalho" active={activeTab === 'trabalho'} onClick={() => setActiveTab('trabalho')} />
      </nav>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all font-medium ${active ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
      {icon} {label}
    </button>
  );
}

function MobileNavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} aria-current={active ? 'page' : undefined} className={`flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-medium ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

function InstallButton() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [installed, setInstalled] = useState(
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  );

  useEffect(() => {
    const handleBeforeInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) {
      setShowInstructions(true);
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') setInstalled(true);
    setInstallPrompt(null);
  };

  if (installed) return null;

  return (
    <>
      <button onClick={handleInstall} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-2.5 py-2 text-xs sm:px-3 sm:text-sm font-semibold text-white hover:bg-indigo-700">
        <Download size={16} />
        <span className="hidden sm:inline">Instalar app</span>
        <span className="sm:hidden">Baixar</span>
      </button>
      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowInstructions(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="install-title" className="w-full max-w-sm rounded-xl bg-white p-5 text-gray-900 shadow-xl dark:bg-gray-800 dark:text-gray-100" onClick={event => event.stopPropagation()}>
            <h2 id="install-title" className="mb-2 text-lg font-bold">Adicionar SimiaWork ao celular</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">No Android, abra o menu do navegador e toque em <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>. No iPhone, toque em <strong>Compartilhar</strong> no Safari e depois em <strong>Adicionar à Tela de Início</strong>.</p>
            <button onClick={() => setShowInstructions(false)} className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700">Entendi</button>
          </section>
        </div>
      )}
    </>
  );
}

// ======================= DASHBOARD VIEW =======================
function DashboardView({ financas }) {
  const [periodo, setPeriodo] = useState('mes');

  // Filtro de Data
  const financasFiltradas = financas.filter(f => {
    if (!f.data) return false;
    const itemDate = parseFinancialDate(f.data);
    if (periodo === 'hoje') return isToday(itemDate);
    if (periodo === 'semana') return isThisWeek(itemDate, { weekStartsOn: 0 });
    if (periodo === 'mes') return isThisMonth(itemDate);
    return true; // 'tudo'
  });

  // Cálculos Consolidados
  let receita = 0;
  let custos = 0;
  let unidadesVendidas = 0;

  financasFiltradas.forEach(f => {
    const valorTotal = Number(f.valorVenda) * Number(f.quantidade);
    if (includesInRevenue(f)) {
      receita += valorTotal;
      unidadesVendidas += Number(f.quantidade || 0);
    }
    custos += Number(f.gastosAds || 0);
  });

  const lucro = receita - custos;
  const roas = custos > 0 ? (receita / custos).toFixed(2) : 0;
  const roi = custos > 0 ? (((receita - custos) / custos) * 100).toFixed(1) : 0;

  // Dados Gráfico de Torre (Barras) - Agrupado por Dia
  const dadosGraficoBarras = Object.values(financasFiltradas.reduce((acc, f) => {
    const dataFormatada = format(parseFinancialDate(f.data), 'dd/MM');
    if (!acc[dataFormatada]) acc[dataFormatada] = { data: dataFormatada, Faturamento: 0, 'Meta Ads': 0 };
    if (includesInRevenue(f)) acc[dataFormatada].Faturamento += (Number(f.valorVenda) * Number(f.quantidade));
    acc[dataFormatada]['Meta Ads'] += Number(f.gastosAds || 0);
    return acc;
  }, {})).reverse(); // Reverter para ordem cronológica se vier do firebase ordenado desc

  // Dados Gráfico de Pizza (Receita por Produto)
  const dadosGraficoPizza = Object.values(financasFiltradas.reduce((acc, f) => {
    if (!includesInRevenue(f)) return acc;
    if (!acc[f.produto]) acc[f.produto] = { name: f.produto, value: 0 };
    acc[f.produto].value += (Number(f.valorVenda) * Number(f.quantidade));
    return acc;
  }, {}));
  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold">Performance Financeira</h2>
        <select value={periodo} onChange={e => setPeriodo(e.target.value)} className="border dark:border-gray-700 bg-white dark:bg-gray-800 p-2 rounded-lg font-medium shadow-sm">
          <option value="hoje">Hoje</option>
          <option value="semana">Esta Semana</option>
          <option value="mes">Este Mês</option>
          <option value="tudo">Todo o Período</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 sm:gap-6">
        <div className="min-w-0 p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Faturamento</p>
          <h3 className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400 break-words">R$ {receita.toFixed(2)}</h3>
        </div>
        <div className="min-w-0 p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Investimento em Meta Ads</p>
          <h3 className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400 break-words">R$ {custos.toFixed(2)}</h3>
        </div>
        <div className="min-w-0 p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Resultado após anúncios (estimado)</p>
          <h3 className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400 break-words">R$ {lucro.toFixed(2)}</h3>
        </div>
        <div className="min-w-0 p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Unidades vendidas</p>
          <h3 className="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400">{unidadesVendidas}</h3>
        </div>
        <div className="min-w-0 p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">ROAS / ROI</p>
          <h3 className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400 break-words">{roas}x / {roi}%</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Gráfico de Barras */}
        <div className="min-w-0 lg:col-span-2 bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl border dark:border-gray-700 shadow-sm h-96">
          <h3 className="font-semibold mb-4 text-gray-700 dark:text-gray-200">Faturamento vs investimento em Meta Ads</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosGraficoBarras}>
              <XAxis dataKey="data" stroke="#888" fontSize={12} />
              <YAxis stroke="#888" fontSize={12} />
              <Tooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff'}} />
              <Legend />
              <Bar dataKey="Faturamento" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Meta Ads" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Gráfico de Pizza */}
        <div className="min-w-0 bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl border dark:border-gray-700 shadow-sm h-96">
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

// ======================= FINANCEIRO VIEW =======================
function FinanceiroView({ financas, createNotification }) {
  const [dataAtual, setDataAtual] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [produto, setProduto] = useState('');
  const [valorVenda, setValorVenda] = useState('');
  const [quantidade, setQuantidade] = useState('0');
  const [gastosAds, setGastosAds] = useState('0');
  const [statusOferta, setStatusOferta] = useState('Em teste');
  const [formError, setFormError] = useState('');

  const handleAdd = async () => {
    const unidades = Number(quantidade);
    const precoUnitario = Number(valorVenda || 0);
    const investimento = Number(gastosAds || 0);

    if (!produto.trim() || !dataAtual || !Number.isInteger(unidades) || unidades < 0 || !Number.isFinite(precoUnitario) || precoUnitario < 0 || !Number.isFinite(investimento) || investimento < 0 || (unidades > 0 && precoUnitario === 0)) {
      setFormError('Informe a oferta, a data e valores válidos. Para registrar vendas, preencha o preço por unidade.');
      return;
    }

    setFormError('');
    await addDoc(collection(db, 'financas'), {
      produto: produto.trim(),
      valorVenda: precoUnitario,
      quantidade: unidades,
      gastosAds: investimento,
      statusOferta,
      data: dataAtual
    });
    createNotification('Resultado diário registrado', `${unidades} unidade(s) de ${produto.trim()} e ${formatCurrency(investimento)} em Meta Ads.`);
    setProduto('');
    setValorVenda('');
    setQuantidade('0');
    setGastosAds('0');
    setStatusOferta('Em teste');
  };

  const handleDelete = async (id) => await deleteDoc(doc(db, 'financas', id));
  const formatCurrency = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const getEntryMetrics = entry => {
    const receita = includesInRevenue(entry) ? Number(entry.valorVenda || 0) * Number(entry.quantidade || 0) : 0;
    const investimento = Number(entry.gastosAds || 0);
    const unidades = includesInRevenue(entry) ? Number(entry.quantidade || 0) : 0;
    return {
      receita,
      investimento,
      unidades,
      resultado: receita - investimento,
      custoPorVenda: unidades > 0 ? investimento / unidades : null,
      roas: investimento > 0 ? receita / investimento : null
    };
  };
  const statusClass = status => {
    if (status === 'Pausada' || status === 'Encerrada' || status === 'Pausado / Morto') return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
    if (status === 'Em teste' || status === 'Em Teste') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold">Desempenho das ofertas</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Registre diariamente as vendas e o investimento em Meta Ads.</p>
      </div>

      <section className="rounded-xl border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
        <h3 className="mb-4 border-b pb-3 font-semibold dark:border-gray-700">Registrar resultado do dia</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <label htmlFor="finance-date" className="mb-1 block text-xs font-medium text-gray-500">Data (DD/MM/AA)</label>
            <input id="finance-date" type="date" value={dataAtual} onChange={event => setDataAtual(event.target.value)} className="w-full rounded border p-2 dark:border-gray-600 dark:bg-gray-700" required />
          </div>
          <div className="xl:col-span-2">
            <label htmlFor="finance-offer" className="mb-1 block text-xs font-medium text-gray-500">Oferta / campanha</label>
            <input id="finance-offer" value={produto} onChange={event => setProduto(event.target.value)} placeholder="Ex.: Oferta principal — campanha conversão" className="w-full rounded border p-2 dark:border-gray-600 dark:bg-gray-700" required />
          </div>
          <div>
            <label htmlFor="finance-status" className="mb-1 block text-xs font-medium text-gray-500">Status da oferta</label>
            <select id="finance-status" value={statusOferta} onChange={event => setStatusOferta(event.target.value)} className="w-full rounded border p-2 dark:border-gray-600 dark:bg-gray-700">
              <option>Em teste</option><option>Ativa</option><option>Pausada</option><option>Encerrada</option>
            </select>
          </div>
          <div>
            <label htmlFor="finance-units" className="mb-1 block text-xs font-medium text-gray-500">Unidades vendidas</label>
            <input id="finance-units" type="number" min="0" step="1" value={quantidade} onChange={event => setQuantidade(event.target.value)} className="w-full rounded border p-2 dark:border-gray-600 dark:bg-gray-700" required />
          </div>
          <div>
            <label htmlFor="finance-price" className="mb-1 block text-xs font-medium text-gray-500">Preço por unidade (R$)</label>
            <input id="finance-price" type="number" min="0" step="0.01" value={valorVenda} onChange={event => setValorVenda(event.target.value)} placeholder="0,00" className="w-full rounded border p-2 dark:border-gray-600 dark:bg-gray-700" />
          </div>
          <div>
            <label htmlFor="finance-spend" className="mb-1 block text-xs font-medium text-gray-500">Investimento em Meta Ads (R$)</label>
            <input id="finance-spend" type="number" min="0" step="0.01" value={gastosAds} onChange={event => setGastosAds(event.target.value)} placeholder="0,00" className="w-full rounded border p-2 dark:border-gray-600 dark:bg-gray-700" />
          </div>
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
            <span className="block text-xs text-gray-500">Faturamento estimado</span>
            <strong className="text-lg text-green-600 dark:text-green-400">{formatCurrency(Number(valorVenda || 0) * Number(quantidade || 0))}</strong>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Se não houve venda, deixe as unidades em 0 e registre o gasto com anúncios.</p>
        {formError && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{formError}</p>}
        <button onClick={handleAdd} className="mt-4 w-full rounded-lg bg-green-600 px-6 py-2.5 font-bold text-white hover:bg-green-700 sm:w-auto">Salvar resultado</button>
      </section>

      {financas.length === 0 ? (
        <p className="rounded-xl border bg-white p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800">Nenhum resultado registrado ainda.</p>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {financas.map(entry => {
              const metrics = getEntryMetrics(entry);
              const status = entry.statusOferta || entry.statusProduto || 'Ativa';
              return (
                <article key={entry.id} className="rounded-xl border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">{format(parseFinancialDate(entry.data), 'dd/MM/yy')}</p>
                      <h3 className="mt-1 break-words font-bold">{entry.produto}</h3>
                    </div>
                    <button onClick={() => handleDelete(entry.id)} aria-label={`Excluir ${entry.produto}`} className="shrink-0 rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"><Trash2 size={16} /></button>
                  </div>
                  <span className={`mt-2 inline-flex rounded px-2 py-1 text-xs font-semibold ${statusClass(status)}`}>{status}</span>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <p className="text-gray-500">Unidades <strong className="block text-gray-900 dark:text-gray-100">{metrics.unidades}</strong></p>
                    <p className="text-gray-500">Faturamento <strong className="block text-green-600 dark:text-green-400">{formatCurrency(metrics.receita)}</strong></p>
                    <p className="text-gray-500">Meta Ads <strong className="block text-red-500">{formatCurrency(metrics.investimento)}</strong></p>
                    <p className="text-gray-500">Custo por venda <strong className="block text-gray-900 dark:text-gray-100">{metrics.custoPorVenda === null ? '—' : formatCurrency(metrics.custoPorVenda)}</strong></p>
                    <p className="text-gray-500">Resultado após Ads <strong className={`block ${metrics.resultado >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}`}>{formatCurrency(metrics.resultado)}</strong></p>
                    <p className="text-gray-500">ROAS <strong className="block text-gray-900 dark:text-gray-100">{metrics.roas === null ? '—' : `${metrics.roas.toFixed(2)}x`}</strong></p>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-hidden rounded-xl border bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="border-b bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                  <tr>
                    <th className="p-4 font-medium">Data</th>
                    <th className="p-4 font-medium">Oferta / campanha</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Unidades</th>
                    <th className="p-4 font-medium">Faturamento</th>
                    <th className="p-4 font-medium">Meta Ads</th>
                    <th className="p-4 font-medium">Custo / venda</th>
                    <th className="p-4 font-medium">Resultado</th>
                    <th className="p-4 font-medium">ROAS</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {financas.map(entry => {
                    const metrics = getEntryMetrics(entry);
                    const status = entry.statusOferta || entry.statusProduto || 'Ativa';
                    return (
                      <tr key={entry.id} className="border-b last:border-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-750">
                        <td className="whitespace-nowrap p-4 text-gray-500">{format(parseFinancialDate(entry.data), 'dd/MM/yy')}</td>
                        <td className="max-w-56 break-words p-4 font-semibold">{entry.produto}</td>
                        <td className="p-4"><span className={`whitespace-nowrap rounded px-2 py-1 text-xs font-semibold ${statusClass(status)}`}>{status}</span></td>
                        <td className="p-4">{metrics.unidades}</td>
                        <td className="whitespace-nowrap p-4 font-semibold text-green-600 dark:text-green-400">{formatCurrency(metrics.receita)}</td>
                        <td className="whitespace-nowrap p-4 font-semibold text-red-500">{formatCurrency(metrics.investimento)}</td>
                        <td className="whitespace-nowrap p-4">{metrics.custoPorVenda === null ? '—' : formatCurrency(metrics.custoPorVenda)}</td>
                        <td className={`whitespace-nowrap p-4 font-semibold ${metrics.resultado >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'}`}>{formatCurrency(metrics.resultado)}</td>
                        <td className="p-4">{metrics.roas === null ? '—' : `${metrics.roas.toFixed(2)}x`}</td>
                        <td className="p-4 text-right"><button onClick={() => handleDelete(entry.id)} aria-label={`Excluir ${entry.produto}`} className="rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"><Trash2 size={16} /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ======================= IDEIAS VIEW =======================
function IdeiasView({ ideias, createNotification }) {
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
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
          <input value={linkRef} onChange={e=>setLinkRef(e.target.value)} placeholder="Link de Referência/Inspiração (Concorrente)" className="min-w-0 flex-1 border dark:border-gray-600 p-2 rounded dark:bg-gray-700 text-sm" />
          <button onClick={handleAdd} className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 font-bold">Salvar Ideia</button>
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

// ======================= TRABALHO VIEW (KANBAN) =======================
function TrabalhoView({ tarefas, createNotification }) {
  const [titulo, setTitulo] = useState('');
  const [responsavel, setResponsavel] = useState('William');
  const [linkVideo, setLinkVideo] = useState('');
  const [linkDrive, setLinkDrive] = useState('');
  const [dicasIA, setDicasIA] = useState('');

  const handleSimulateAI = () => {
    if(!titulo) return;
    setDicasIA(`Analisando tarefa...
1. Estudar a copy da referência.
2. Montar 3 ganchos iniciais focados na dor.
3. Editar mantendo ritmo rápido (jump cuts).
4. Subir no Drive com nomenclatura padrão.`);
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
    await updateDoc(doc(db, 'tarefas', id), { status: novoStatus });
    createNotification('Tarefa Atualizada', `"${titulo}" foi para ${novoStatus}`);
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

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 items-start">
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
