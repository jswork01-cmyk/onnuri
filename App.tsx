
import React, { useState, useEffect, useCallback } from 'react';
import { fetchInitialData, submitTransaction, updateTransactionStatus } from './services/sheetService';
import { AppData, Transaction, User } from './types';
import Dashboard from './components/Dashboard';
import IncomeForm from './components/IncomeForm';
import ExpenseForm from './components/ExpenseForm';
import CashJournal from './components/CashJournal';
import AccountingReport from './components/AccountingReport';
import Settings from './components/Settings';
import TransactionHistory from './components/TransactionHistory';

enum View {
  DASHBOARD = 'dashboard',
  INCOME = 'income',
  EXPENSE = 'expense',
  HISTORY = 'history',
  JOURNAL = 'journal',
  REPORT = 'report',
  SETTINGS = 'settings'
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // 로그인 폼 상태
  const [loginId, setLoginId] = useState('');
  const [loginPw, setLoginPw] = useState('');
  const [loginError, setLoginError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const initialData = await fetchInitialData();
      setData(initialData);
      setIsConnected(!(initialData?.churchInfo?.name || '').includes('(데모)'));
      
      const savedUser = localStorage.getItem('PIC_USER');
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.error("Data load error", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleUpdateTransactionLocal = (updatedTx: Transaction) => {
    if (!data) return;
    setData({
      ...data,
      transactions: data.transactions.map(t => t.id === updatedTx.id ? updatedTx : t)
    });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;

    const inputId = loginId.trim();
    const inputPw = loginPw.trim();

    const userMatch = data.approvalLine.find(u => {
      const sheetId = (u.id || '').toString().trim();
      const sheetPw = (u.password || '').toString().trim();
      return sheetId === inputId && sheetPw === inputPw;
    });

    if (userMatch) {
      const userData: User = {
        id: (userMatch.id || '').toString().trim(),
        name: userMatch.name,
        role: userMatch.role,
        signUrl: userMatch.signUrl
      };
      setCurrentUser(userData);
      localStorage.setItem('PIC_USER', JSON.stringify(userData));
      setLoginError('');
    } else {
      setLoginError('아이디 또는 비밀번호가 일치하지 않습니다.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('PIC_USER');
    setCurrentView(View.DASHBOARD);
    setIsMobileMenuOpen(false);
  };

  const handleTransactionSave = async (transaction: Transaction) => {
    if (!data) return;
    setData({ ...data, transactions: [...data.transactions, transaction] });
    await submitTransaction(transaction);
  };

  const navigateTo = (view: View) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">시스템 연동 중...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">정심작업장 온누리상품권 관리시스템</h1>
            <p className="text-sm text-slate-500 mt-2 font-medium">실시간 통합 회계 관리 솔루션</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">아이디</label>
              <input 
                type="text" 
                value={loginId}
                onChange={e => setLoginId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium" 
                placeholder="ID를 입력하세요"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">비밀번호</label>
              <input 
                type="password" 
                value={loginPw}
                onChange={e => setLoginPw(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium" 
                placeholder="Password"
                required
              />
            </div>
            {loginError && (
              <div className="bg-rose-50 border border-rose-100 rounded-lg p-3">
                <p className="text-xs text-rose-500 font-bold text-center">{loginError}</p>
              </div>
            )}
            <button 
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl shadow-lg shadow-indigo-100 transition-all text-lg mt-6"
            >
              시스템 로그인
            </button>
          </form>
          <div className="mt-8 text-center text-[10px] text-slate-400">
            {isConnected ? '● 서버 상태 정상' : '○ 서버 오프라인 (데모 모드)'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      {/* 모바일 상단 헤더 */}
      <header className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-40 shadow-md no-print">
        <h1 className="font-bold truncate max-w-[200px]">{data?.churchInfo?.name || '정심작업장'}</h1>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
        >
          {isMobileMenuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          )}
        </button>
      </header>

      {/* 모바일 사이드바 배경 오버레이 */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden no-print"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* 사이드바 네비게이션 */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col no-print
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold text-center leading-tight">정심작업장<br/><span className="text-sm font-normal text-slate-400">온누리상품권 관리시스템</span></h1>
          <div className="mt-4 p-3 bg-slate-800 rounded-lg border border-slate-700">
            <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">현재 접속자</div>
            <div className="text-sm font-bold flex items-center justify-between">
              <span className="truncate mr-2">{currentUser.name} <span className="text-indigo-400 text-[10px]">{currentUser.role}</span></span>
              <button onClick={handleLogout} className="text-[10px] text-rose-400 hover:text-rose-300 flex-shrink-0">로그아웃</button>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <button onClick={() => navigateTo(View.DASHBOARD)} className={`w-full text-left px-4 py-3 rounded ${currentView === View.DASHBOARD ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}>📊 대시보드</button>
          <div className="pt-4 pb-2 text-xs font-semibold text-slate-500 uppercase px-4">결의서 관리</div>
          <button onClick={() => navigateTo(View.INCOME)} className={`w-full text-left px-4 py-3 rounded ${currentView === View.INCOME ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}>📥 수입결의서 작성</button>
          <button onClick={() => navigateTo(View.EXPENSE)} className={`w-full text-left px-4 py-3 rounded ${currentView === View.EXPENSE ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}>📤 지출결의서 작성</button>
          <button onClick={() => navigateTo(View.HISTORY)} className={`w-full text-left px-4 py-3 rounded ${currentView === View.HISTORY ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}>📜 결의내역 및 전자결재</button>
          <div className="pt-4 pb-2 text-xs font-semibold text-slate-500 uppercase px-4">재정 보고</div>
          <button onClick={() => navigateTo(View.JOURNAL)} className={`w-full text-left px-4 py-3 rounded ${currentView === View.JOURNAL ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}>📒 금전출납부</button>
          <button onClick={() => navigateTo(View.REPORT)} className={`w-full text-left px-4 py-3 rounded ${currentView === View.REPORT ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}>📑 연간 결산보고</button>
          <div className="pt-4 pb-2 text-xs font-semibold text-slate-500 uppercase px-4">시스템</div>
          <button onClick={() => navigateTo(View.SETTINGS)} className={`w-full text-left px-4 py-3 rounded ${currentView === View.SETTINGS ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}>⚙️ 시스템 설정</button>
        </nav>
        <div className="p-4 border-t border-slate-700 text-[10px] text-slate-500 text-center">
          {isConnected ? '● 서버 연동 활성화' : '○ 로컬 테스트 모드'}
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {currentView === View.DASHBOARD && <Dashboard data={data} />}
        {currentView === View.INCOME && <IncomeForm data={data} onSave={handleTransactionSave} />}
        {currentView === View.EXPENSE && <ExpenseForm data={data} onSave={handleTransactionSave} />}
        {currentView === View.HISTORY && <TransactionHistory data={data} onRefresh={loadData} onUpdateLocal={handleUpdateTransactionLocal} />}
        {currentView === View.JOURNAL && <CashJournal data={data} />}
        {currentView === View.REPORT && <AccountingReport data={data} />}
        {currentView === View.SETTINGS && <Settings data={data} />}
      </main>
    </div>
  );
};

export default App;
