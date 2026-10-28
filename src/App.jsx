import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { app, db, auth } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, setDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { 
  LayoutDashboard, Lightbulb, CircleDollarSign, KanbanSquare, 
  Bell, LogOut, Lock, Sun, Moon, Download, Trash2, BellRing, Menu, X
} from 'lucide-react';

// Importação assíncrona dos módulos (Lazy Loading - Code Splitting)
const DashboardView = lazy(() => import('./views/DashboardView'));
const TrabalhoView = lazy(() => import('./views/TrabalhoView'));
const IdeiasView = lazy(() => import('./views/IdeiasView'));
const FinanceiroView = lazy(() => import('./views/FinanceiroView'));

const firebaseVapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY?.trim().replace(/^['"]|['"]$/g, '');

const validateVapidKey = () => {
  if (!firebaseVapidKey || firebaseVapidKey.includes('CHAVE_PUBLICA_WEB_PUSH')) {
    const error = new Error('VITE_FIREBASE_VAPID_KEY is not available in this deployment.');
    error.code = 'push/vapid-key-missing';
    throw error;
  }

  try {
    const base64 = firebaseVapidKey.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
    if (!/^[A-Za-z0-9+/]+$/.test(base64) || base64.length % 4 === 1) throw new Error('Invalid base64url');
    const decoded = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    if (decoded.length !== 65 || decoded.charCodeAt(0) !== 4) throw new Error('Invalid P-256 point');
  } catch {
    const error = new Error('VITE_FIREBASE_VAPID_KEY is not a valid uncompressed P-256 public key.');
    error.code = 'push/vapid-key-invalid';
    throw error;
  }
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
  const [pushRegistrationError, setPushRegistrationError] = useState(false);
  const [notificationError, setNotificationError] = useState('');
  const pushRegistrationRef = useRef(null);
  const browserNotificationPermission = typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
  const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandaloneApp = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  const registerPushDevice = (currentUser) => {
    if (pushRegistrationRef.current) return pushRegistrationRef.current;

    const registrationPromise = (async () => {
      validateVapidKey();

      const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
      if (!(await isSupported())) {
        const error = new Error('Firebase Cloud Messaging is not supported by this browser.');
        error.code = 'messaging/unsupported-browser';
        throw error;
      }

      const registration = await navigator.serviceWorker.ready;
      const messaging = getMessaging(app);
      const token = await getToken(messaging, {
        vapidKey: firebaseVapidKey,
        serviceWorkerRegistration: registration
      });

      if (!token) {
        const error = new Error('Firebase did not return a registration token.');
        error.code = 'messaging/token-subscribe-failed';
        throw error;
      }

      await setDoc(doc(db, 'pushTokens', currentUser.uid, 'devices', encodeURIComponent(token)), {
        token,
        uid: currentUser.uid,
        updatedAt: serverTimestamp()
      }, { merge: true });

      return { messaging, registration };
    })();

    const trackedPromise = registrationPromise.finally(() => {
      if (pushRegistrationRef.current === trackedPromise) pushRegistrationRef.current = null;
    });
    pushRegistrationRef.current = trackedPromise;
    return trackedPromise;
  };

  const getPushErrorMessage = (error) => {
    if (error?.name === 'InvalidAccessError' || error?.message?.includes('applicationServerKey is not valid')) {
      return 'O navegador rejeitou a chave VAPID: a VITE_FIREBASE_VAPID_KEY deste deploy não é uma chave pública Web Push válida. Copie a chave pública em Firebase Console > Configurações do projeto > Cloud Messaging > Certificados Web Push. Não use a API key nem uma chave privada. Salve a variável na Vercel sem aspas/espaços e faça um novo deploy.';
    }

    switch (error?.code) {
      case 'push/vapid-key-missing':
        return 'A permissão do navegador foi concedida, mas a variável VITE_FIREBASE_VAPID_KEY não chegou a este deploy. Confira as variáveis da Vercel e gere um novo deploy.';
      case 'messaging/unsupported-browser':
        return 'A permissão foi concedida, mas este navegador não oferece suporte ao Firebase Cloud Messaging.';
      case 'messaging/token-subscribe-failed':
        return 'A permissão foi concedida, mas o Firebase não conseguiu registrar este dispositivo. Confira a chave VAPID e a configuração do app Web no Firebase.';
      case 'push/vapid-key-invalid':
        return 'A VITE_FIREBASE_VAPID_KEY recebida por este app não tem o formato de chave pública Web Push VAPID. Copie a chave pública dos certificados Web Push do Firebase, salve na Vercel sem aspas/espaços e faça um novo deploy.';
      case 'permission-denied':
        return 'A permissão do navegador foi concedida, mas o Firestore recusou o registro do dispositivo. Confira as regras de acesso à coleção pushTokens.';
      default: {
        const errorCode = typeof error?.code === 'string' ? ` (${error.code})` : '';
        return `A permissão do navegador foi concedida, mas houve um erro ao registrar o dispositivo${errorCode}. Tente novamente.`;
      }
    }
  };

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
    if (!mobileMenuOpen) return;

    const handleKeyDown = event => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };
    const desktopMedia = window.matchMedia('(min-width: 768px)');
    const closeOnDesktop = event => {
      if (event.matches) setMobileMenuOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    desktopMedia.addEventListener('change', closeOnDesktop);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      desktopMedia.removeEventListener('change', closeOnDesktop);
    };
  }, [mobileMenuOpen]);

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
    if (!user || pushChoice !== 'accepted' || typeof Notification === 'undefined' || Notification.permission !== 'granted' || !firebaseVapidKey) return;

    let active = true;
    let unsubscribeMessage;

    const setupPushListener = async () => {
      try {
        const { onMessage } = await import('firebase/messaging');
        const { messaging, registration } = await registerPushDevice(user);
        if (!active) return;

        setPushEnabled(true);
        setPushRegistrationError(false);
        unsubscribeMessage = onMessage(messaging, payload => {
          const title = payload.notification?.title || (payload.data?.title && `SimiaWork: ${payload.data.title}`);
          if (title && document.visibilityState === 'visible') {
            registration.showNotification(title, {
              body: payload.notification?.body || payload.data?.body || '',
              icon: payload.notification?.icon || '/simiawork-192.png',
              badge: '/simiawork-192.png',
              tag: `simiawork-${payload.messageId || title}`,
              data: { url: '/' }
            }).catch(error => {
              console.error('Não foi possível exibir a notificação neste navegador:', error);
              setNotificationError('Push ativo, mas o navegador não conseguiu exibir o aviso. Confira a permissão de notificações do sistema.');
            });
          }
        });
      } catch (error) {
        console.error('Não foi possível configurar as notificações push:', error);
        if (active) {
          setPushRegistrationError(true);
          setNotificationError(getPushErrorMessage(error));
        }
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
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && firebaseVapidKey) {
        const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
        if (await isSupported()) {
          const registration = await navigator.serviceWorker.ready;
          const token = await getToken(getMessaging(app), {
            vapidKey: firebaseVapidKey,
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
    setPushRegistrationError(false);
    if (isIOSDevice && !isStandaloneApp) {
      setNotificationError('No iPhone, o Safari só permite notificações push depois que o site é adicionado à Tela de Início e aberto como app.');
      return;
    }
    if (!window.isSecureContext) {
      setNotificationError('Notificações push exigem conexão segura (HTTPS). Abra o site publicado em HTTPS.');
      return;
    }
    if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) {
      setNotificationError('Este navegador não oferece suporte a notificações push.');
      return;
    }
    if (Notification.permission === 'denied') {
      setNotificationError('As notificações estão bloqueadas pelo navegador. Permita-as nas configurações do site e tente novamente.');
      return;
    }

    setPushLoading(true);
    try {
      const permission = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();
      if (permission !== 'granted') {
        if (permission === 'denied') {
          setPushChoice('declined');
          localStorage.setItem(`simiawork-push-consent-${user.uid}`, 'declined');
          setNotificationError('O navegador recusou a permissão. Habilite as notificações nas configurações do site e depois escolha Aceitar novamente.');
        } else {
          setNotificationError('A janela de permissão foi fechada sem uma escolha. Clique em Aceitar para tentar novamente.');
        }
        return;
      }

      localStorage.setItem(`simiawork-push-consent-${user.uid}`, 'accepted');
      setPushChoice('accepted');
      await registerPushDevice(user);
      setPushEnabled(true);
      setPushRegistrationError(false);
    } catch (error) {
      console.error('Erro ao ativar notificações push:', error);
      if (Notification.permission === 'granted') {
        localStorage.setItem(`simiawork-push-consent-${user.uid}`, 'accepted');
        setPushChoice('accepted');
      }
      setPushRegistrationError(true);
      setNotificationError(getPushErrorMessage(error));
    } finally {
      setPushLoading(false);
    }
  };

  const handleDeclineNotifications = async () => {
    setNotificationError('');
    setPushChoice('declined');
    setPushEnabled(false);
    setPushRegistrationError(false);
    localStorage.setItem(`simiawork-push-consent-${user.uid}`, 'declined');

    if (typeof Notification === 'undefined' || Notification.permission !== 'granted' || !firebaseVapidKey) return;

    setPushLoading(true);
    try {
      const { deleteToken, getMessaging, getToken, isSupported } = await import('firebase/messaging');
      if (!(await isSupported())) return;

      const messaging = getMessaging(app);
      const registration = await navigator.serviceWorker.ready;
      const token = await getToken(messaging, {
        vapidKey: firebaseVapidKey,
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
    <div className="min-h-screen flex min-w-0 bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors">
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Fechar menu lateral"
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <aside id="app-sidebar" className={`${mobileMenuOpen ? 'fixed inset-y-0 left-0 z-40 flex w-[min(18rem,85vw)] shadow-2xl' : 'hidden'} md:relative md:inset-auto md:z-10 md:flex md:w-64 md:shadow-none shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950`}>
        <div className="flex items-center justify-between p-5 sm:p-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">SimiaWork</h1>
          <button type="button" aria-label="Fechar menu lateral" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 md:hidden" onClick={() => setMobileMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <nav aria-label="Navegação principal" className="flex-1 space-y-2 overflow-y-auto px-3 sm:px-4">
          <SidebarItem icon={<LayoutDashboard size={20}/>} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }} />
          <SidebarItem icon={<Lightbulb size={20}/>} label="Ideias & Base" active={activeTab === 'ideias'} onClick={() => { setActiveTab('ideias'); setMobileMenuOpen(false); }} />
          <SidebarItem icon={<CircleDollarSign size={20}/>} label="Financeiro" active={activeTab === 'financeiro'} onClick={() => { setActiveTab('financeiro'); setMobileMenuOpen(false); }} />
          <SidebarItem icon={<KanbanSquare size={20}/>} label="Trabalho" active={activeTab === 'trabalho'} onClick={() => { setActiveTab('trabalho'); setMobileMenuOpen(false); }} />
        </nav>
        <div className="space-y-2 border-t border-gray-200 p-3 dark:border-gray-800 sm:p-4">
          {!appInstalled && (
            <button onClick={() => { handleInstallClick(); setMobileMenuOpen(false); }} className="flex w-full items-center gap-3 rounded-lg p-3 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
              <Download size={20} /> <span>Instalar App (PWA)</span>
            </button>
          )}
          <button onClick={() => { setDarkMode(!darkMode); setMobileMenuOpen(false); }} className="flex w-full items-center gap-3 rounded-lg p-3 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
            {darkMode ? <Sun size={20} /> : <Moon size={20} />} <span>{darkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
          </button>
          <button onClick={() => { setMobileMenuOpen(false); handleSignOut(); }} className="flex w-full items-center gap-3 rounded-lg p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
            <LogOut size={20} /> <span>Sair</span>
          </button>
        </div>
      </aside>

      <main className="relative flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-20 flex min-h-16 items-center justify-between border-b border-gray-200 bg-white/90 px-3 py-2 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              aria-label={mobileMenuOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'}
              aria-expanded={mobileMenuOpen}
              aria-controls="app-sidebar"
              className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800 md:hidden"
              onClick={() => setMobileMenuOpen(open => !open)}
            >
              {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
            <h2 className="truncate text-lg font-semibold capitalize sm:text-xl">{activeTab}</h2>
          </div>
          <div className="relative flex shrink-0 items-center gap-1 sm:gap-3">
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
                  ) : pushChoice === 'accepted' && browserNotificationPermission === 'granted' ? (
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Permissão concedida</span>
                  ) : (
                    <span className="text-xs text-gray-500">{pushChoice === 'declined' ? 'Você recusou' : 'Escolha uma opção'}</span>
                  )}
                </div>
                  {isIOSDevice && !isStandaloneApp && <p className="mt-2 text-xs text-gray-500">No iPhone/iPad, notificações push exigem iOS/iPadOS 16.4 ou posterior e o SimiaWork instalado na Tela de Início. Abra o site no Safari e use “Instalar App (PWA)”.</p>}
                  {notificationError && <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">{notificationError}</p>}
                <div className="mt-3 flex gap-2">
                  <button onClick={handleAcceptNotifications} disabled={pushLoading || pushEnabled} className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                    <BellRing size={14} className="mr-1 inline" />{pushRegistrationError ? 'Tentar novamente' : 'Aceitar'}
                  </button>
                  <button onClick={handleDeclineNotifications} disabled={pushLoading || pushChoice === 'declined'} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
                    Recusar
                  </button>
                </div>
                {pushLoading && <p className="mt-2 text-xs text-gray-500">{browserNotificationPermission === 'granted' ? 'Permissão concedida. Registrando este dispositivo...' : 'Aguardando sua escolha no navegador...'}</p>}
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

        <div className="min-w-0 flex-1 overflow-y-auto bg-gray-50 p-4 dark:bg-gray-900 sm:p-6 lg:p-8">
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
            {isIOSDevice ? (
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <p>Para instalar no iPhone/iPad:</p>
                <ol className="list-decimal space-y-1 pl-5">
                  <li>Abra este site no <strong>Safari</strong>.</li>
                  <li>Toque em <strong>Compartilhar</strong> na barra do Safari.</li>
                  <li>Escolha <strong>Adicionar à Tela de Início</strong> e confirme em <strong>Adicionar</strong>.</li>
                  <li>Abra o SimiaWork pelo novo ícone na tela inicial.</li>
                </ol>
                <p>O iOS não permite que um site execute essa instalação diretamente por um botão. Depois de adicionar à Tela de Início, você poderá aceitar as notificações push no app.</p>
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-300">No Chrome/Edge, a instalação direta aparece quando o navegador considera o site instalável. Se o prompt não abrir, use o menu do navegador e escolha <strong>Instalar SimiaWork</strong> ou <strong>Adicionar à tela inicial</strong>.</p>
            )}
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