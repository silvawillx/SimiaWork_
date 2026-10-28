import React, { useState, useEffect, Suspense, lazy } from 'react';
import { app, db, auth } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, setDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { 
  LayoutDashboard, Lightbulb, CircleDollarSign, KanbanSquare, 
  Bell, LogOut, Lock, Sun, Moon, Download, Trash2, BellRing
} from 'lucide-react';

// Importação assíncrona dos módulos (Lazy Loading - Code Splitting)
const DashboardView = lazy(() => import('./views/DashboardView'));
const TrabalhoView = lazy(() => import('./views/TrabalhoView'));
const IdeiasView = lazy(() => import('./views/IdeiasView'));
const FinanceiroView = lazy(() => import('./views/FinanceiroView'));

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installHelpVisible, setInstallHelpVisible] = useState(false);
  const [appInstalled, setAppInstalled] = useState(
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  );
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
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushChoice, setPushChoice] = useState('undecided');
  const [pushLoading, setPushLoading] = useState(false);
  const [notificationError, setNotificationError] = useState('');

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };
    const handleAppInstalled = () => {
      setAppInstalled(true);
      setDeferredPrompt(null);
      setInstallHelpVisible(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setPushEnabled(false);
      if (currentUser) {
        const savedChoice = localStorage.getItem(`simiawork-push-consent-${currentUser.uid}`);
        setPushChoice(savedChoice || (typeof Notification !== 'undefined' && Notification.permission === 'granted' ? 'accepted' : 'undecided'));
      } else {
        setPushChoice('undecided');
      }
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

  useEffect(() => {
    if (!user || pushChoice !== 'accepted' || typeof Notification === 'undefined' || Notification.permission !== 'granted' || !import.meta.env.VITE_FIREBASE_VAPID_KEY) return;

    let active = true;
    let unsubscribeMessage;

    const setupPushListener = async () => {
      try {
        const { getMessaging, getToken, isSupported, onMessage } = await import('firebase/messaging');
        if (!(await isSupported())) return;

        const registration = await navigator.serviceWorker.ready;
        const messaging = getMessaging(app);
        const token = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: registration
        });

        if (!token || !active) return;

        await setDoc(doc(db, 'pushTokens', user.uid, 'devices', encodeURIComponent(token)), {
          token,
          uid: user.uid,
          updatedAt: serverTimestamp()
        }, { merge: true });

        if (!active) return;
        setPushEnabled(true);
        unsubscribeMessage = onMessage(messaging, payload => {
          const title = payload.data?.title;
          if (title && document.visibilityState === 'visible') {
            registration.showNotification(`SimiaWork: ${title}`, {
              body: payload.data?.body || '',
              icon: '/simiawork-192.png'
            });
          }
        });
      } catch (error) {
        console.error('Não foi possível configurar as notificações push:', error);
        if (active) setNotificationError('Não foi possível ativar as notificações neste dispositivo.');
      }
    };

    setupPushListener();
    return () => {
      active = false;
      unsubscribeMessage?.();
    };
  }, [user, pushChoice]);

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
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      setInstallHelpVisible(true);
      return;
    }

    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Não foi possível abrir o prompt de instalação:', error);
      setInstallHelpVisible(true);
    }
  };

  const markNotifRead = async (id) => await updateDoc(doc(db, 'notificacoes', id), { read: true });

  const handleSignOut = async () => {
    let pushCleanupFailed = false;
    setAuthError('');
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && import.meta.env.VITE_FIREBASE_VAPID_KEY) {
        const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
        if (await isSupported()) {
          const registration = await navigator.serviceWorker.ready;
          const token = await getToken(getMessaging(app), {
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: registration
          });
          if (token) await deleteDoc(doc(db, 'pushTokens', user.uid, 'devices', encodeURIComponent(token)));
        }
      }
    } catch (error) {
      console.error('Não foi possível remover este dispositivo das notificações push:', error);
      pushCleanupFailed = true;
    }

    try {
      await signOut(auth);
      if (pushCleanupFailed) setAuthError('Sessão encerrada, mas não foi possível remover este dispositivo das notificações push.');
    } catch (error) {
      console.error('Não foi possível encerrar a sessão:', error);
      setAuthError('Não foi possível encerrar a sessão. Tente novamente.');
    }
  };

  const handleAcceptNotifications = async () => {
    setNotificationError('');
    if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) {
      setNotificationError('Este navegador não oferece suporte a notificações push.');
      return;
    }
    if (!import.meta.env.VITE_FIREBASE_VAPID_KEY) {
      setNotificationError('A chave VAPID do Firebase não está configurada neste ambiente.');
      return;
    }

    if (Notification.permission === 'denied') {
      setNotificationError('As notificações estão bloqueadas pelo navegador. Permita-as nas configurações do site e tente novamente.');
      return;
    }

    setPushLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushChoice('declined');
        localStorage.setItem(`simiawork-push-consent-${user.uid}`, 'declined');
        setNotificationError('Você recusou a permissão. Se mudar de ideia, escolha Aceitar; se o navegador bloqueou o pedido, habilite as notificações nas configurações do site.');
        return;
      }

      const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
      if (!(await isSupported())) {
        setNotificationError('Este navegador não oferece suporte ao Firebase Cloud Messaging.');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const token = await getToken(getMessaging(app), {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration
      });
      if (!token) throw new Error('O Firebase não retornou um token para este dispositivo.');

      await setDoc(doc(db, 'pushTokens', user.uid, 'devices', encodeURIComponent(token)), {
        token,
        uid: user.uid,
        updatedAt: serverTimestamp()
      }, { merge: true });
      localStorage.setItem(`simiawork-push-consent-${user.uid}`, 'accepted');
      setPushChoice('accepted');
      setPushEnabled(true);
    } catch (error) {
      console.error('Erro ao ativar notificações push:', error);
      setNotificationError('Falha ao ativar notificações. Verifique a configuração do Firebase e tente novamente.');
    } finally {
      setPushLoading(false);
    }
  };

  const handleDeclineNotifications = async () => {
    setNotificationError('');
    setPushChoice('declined');
    setPushEnabled(false);
    localStorage.setItem(`simiawork-push-consent-${user.uid}`, 'declined');

    if (typeof Notification === 'undefined' || Notification.permission !== 'granted' || !import.meta.env.VITE_FIREBASE_VAPID_KEY) return;

    setPushLoading(true);
    try {
      const { deleteToken, getMessaging, getToken, isSupported } = await import('firebase/messaging');
      if (!(await isSupported())) return;

      const messaging = getMessaging(app);
      const registration = await navigator.serviceWorker.ready;
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration
      });

      if (token) {
        await deleteDoc(doc(db, 'pushTokens', user.uid, 'devices', encodeURIComponent(token)));
        await deleteToken(messaging);
      }
    } catch (error) {
      console.error('Erro ao recusar notificações push:', error);
      setNotificationError('A preferência foi salva, mas não foi possível remover este dispositivo do Firebase.');
    } finally {
      setPushLoading(false);
    }
  };

  const deleteNotification = async (id) => {
    setNotificationError('');
    try {
      await deleteDoc(doc(db, 'notificacoes', id));
    } catch (error) {
      console.error('Erro ao excluir notificação:', error);
      setNotificationError('Não foi possível excluir a notificação. Verifique as permissões do Firebase.');
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center dark:bg-gray-900 dark:text-white">Carregando SimiaWork...</div>;

  // TELA DE LOGIN PROTEGIDA
  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-md border dark:border-gray-700">
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

  // APLICATIVO PRINCIPAL
  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors">
      <aside className="w-64 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col z-10">
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
          {!appInstalled && (
            <button onClick={handleInstallClick} className="flex items-center gap-3 w-full p-3 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              <Download size={20} /> <span>Instalar App (PWA)</span>
            </button>
          )}
          <button onClick={() => setDarkMode(!darkMode)} className="flex items-center gap-3 w-full p-3 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            {darkMode ? <Sun size={20} /> : <Moon size={20} />} <span>{darkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
          </button>
          <button onClick={handleSignOut} className="flex items-center gap-3 w-full p-3 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
            <LogOut size={20} /> <span>Sair</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-950/50 backdrop-blur flex items-center justify-between px-8 z-10">
          <h2 className="text-xl font-semibold capitalize">{activeTab}</h2>
          <div className="flex items-center gap-4 relative">
            <button onClick={() => { setShowNotifications(!showNotifications); setNotificationError(''); }} aria-label="Abrir notificações" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 relative">
              <Bell size={20} />
              {notificacoes.filter(n => !n.read).length > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900"></span>}
            </button>
            {showNotifications && (
              <div className="absolute top-12 right-0 sm:right-12 w-[min(22rem,calc(100vw-2rem))] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 p-4 max-h-[min(32rem,80vh)] overflow-y-auto">
                <div className="flex items-center justify-between gap-2 border-b pb-2 dark:border-gray-700">
                  <h3 className="font-bold">Notificações</h3>
                  {pushEnabled ? (
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">Avisos ativos</span>
                  ) : (
                    <span className="text-xs text-gray-500">{pushChoice === 'declined' ? 'Você recusou' : 'Escolha uma opção'}</span>
                  )}
                </div>
                {notificationError && <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">{notificationError}</p>}
                <div className="mt-3 flex gap-2">
                  <button onClick={handleAcceptNotifications} disabled={pushLoading || pushEnabled} className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                    <BellRing size={14} className="mr-1 inline" />Aceitar
                  </button>
                  <button onClick={handleDeclineNotifications} disabled={pushLoading || pushChoice === 'declined'} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
                    Recusar
                  </button>
                </div>
                {pushLoading && <p className="mt-2 text-xs text-gray-500">Atualizando sua preferência...</p>}
                {notificacoes.length === 0 && <p className="py-4 text-sm text-gray-500">Nenhuma notificação.</p>}
                {notificacoes.map(n => (
                  <div key={n.id} className={`group flex items-start gap-2 p-2 mb-2 rounded border-l-2 ${n.read ? 'border-transparent opacity-60' : 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'}`}>
                    <button onClick={() => markNotifRead(n.id)} className="min-w-0 flex-1 text-left">
                      <p className="text-sm font-semibold">{n.title}</p>
                      <p className="text-xs text-gray-500">{n.message} (Por: {n.autor})</p>
                    </button>
                    <button onClick={() => deleteNotification(n.id)} aria-label={`Excluir notificação: ${n.title}`} title="Excluir notificação" className="shrink-0 rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-gray-50 dark:bg-gray-900">
          <Suspense fallback={
            <div className="h-full flex items-center justify-center flex-col gap-4 text-gray-500 dark:text-gray-400">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p>Carregando módulo...</p>
            </div>
          }>
            {activeTab === 'dashboard' && <DashboardView financas={financas} tarefas={tarefas} />}
            {activeTab === 'trabalho' && <TrabalhoView tarefas={tarefas} createNotification={createNotification} />}
            {activeTab === 'ideias' && <IdeiasView ideias={ideias} createNotification={createNotification} />}
            {activeTab === 'financeiro' && <FinanceiroView financas={financas} createNotification={createNotification} />}
          </Suspense>
        </div>
      </main>
      {installHelpVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setInstallHelpVisible(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="install-help-title" className="w-full max-w-sm rounded-xl bg-white p-5 text-gray-900 shadow-xl dark:bg-gray-800 dark:text-gray-100" onClick={event => event.stopPropagation()}>
            <h2 id="install-help-title" className="mb-2 text-lg font-bold">Instalar SimiaWork</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">A instalação direta não está disponível neste navegador agora. No Chrome/Edge, abra o menu e escolha <strong>Instalar SimiaWork</strong> ou <strong>Adicionar à tela inicial</strong>. No Safari do iPhone, toque em <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>.</p>
            <button onClick={() => setInstallHelpVisible(false)} className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700">Entendi</button>
          </section>
        </div>
      )}
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