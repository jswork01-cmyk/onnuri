
import React, { useState, useEffect } from 'react';
import { AppData, Transaction, TransactionType, User } from '../types';
import { formatGoogleDriveLink, updateTransactionStatus } from '../services/sheetService';

interface TransactionHistoryProps {
  data: AppData;
  onRefresh: () => Promise<void>;
  onUpdateLocal: (updatedTx: Transaction) => void;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ data, onRefresh, onUpdateLocal }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('PIC_USER');
    if (saved) setCurrentUser(JSON.parse(saved));
  }, []);

  const transactions = data.transactions || [];
  const churchName = data.churchInfo?.name || '';
  const approvalRoles = data.approvalLine || [];

  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return '-';
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        return dateStr.substring(0, 10);
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const filteredTransactions = transactions.filter(t => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = !term || 
      (t.description && t.description.toLowerCase().includes(term)) || 
      (t.category && t.category.toLowerCase().includes(term)) ||
      (t.vendor && t.vendor.toLowerCase().includes(term)) ||
      (t.spender && t.spender.toLowerCase().includes(term));
    const matchesType = filterType === 'all' || t.type === filterType;
    const displayDate = formatDateForDisplay(t.date);
    let transactionYear = '';
    if (/^\d{4}/.test(displayDate)) {
       transactionYear = displayDate.substring(0, 4);
    }
    const matchesYear = yearFilter === 'all' || transactionYear === yearFilter;
    return matchesSearch && matchesType && matchesYear;
  }).sort((a, b) => {
    const dateStrA = formatDateForDisplay(a.date);
    const dateStrB = formatDateForDisplay(b.date);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStrA) && /^\d{4}-\d{2}-\d{2}$/.test(dateStrB)) {
        return dateStrB.localeCompare(dateStrA);
    }
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
  });

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  const handleToggleApproval = async (transaction: Transaction, step: 'pic' | 'secGen' | 'director') => {
    if (!currentUser) return;
    if (step === 'secGen' && currentUser.role !== '사무국장') { alert('사무국장 권한이 필요합니다.'); return; }
    if (step === 'director' && currentUser.role !== '원장') { alert('원장 권한이 필요합니다.'); return; }

    const updatedTransaction = {
      ...transaction,
      approvals: { ...transaction.approvals, [step]: !transaction.approvals[step] }
    };
    onUpdateLocal(updatedTransaction);
    updateTransactionStatus(updatedTransaction).catch(err => {
        console.error('결재 상태 반영 실패', err);
        onRefresh();
    });
  };

  const getFormattedDateStrings = (dateStr: string) => {
    const formatted = formatDateForDisplay(dateStr);
    if (/^\d{4}-\d{2}-\d{2}$/.test(formatted)) return { full: formatted, year: formatted.substring(0, 4) };
    return { full: dateStr, year: dateStr.substring(0, 4) };
  };

  const getApprovalLines = () => [
    { role: approvalRoles[0]?.role || '담당', name: approvalRoles[0]?.name || '', signUrl: approvalRoles[0]?.signUrl },
    { role: approvalRoles[1]?.role || '사무국장', name: approvalRoles[1]?.name || '', signUrl: approvalRoles[1]?.signUrl },
    { role: approvalRoles[2]?.role || '원장', name: approvalRoles[2]?.name || '', signUrl: approvalRoles[2]?.signUrl }
  ];

  const renderSignature = (name: string, isApproved: boolean, signUrl?: string, size: number = 45) => {
    if (isApproved && signUrl) return `<img src="${formatGoogleDriveLink(signUrl)}" style="max-height: ${size}px; max-width: ${size + 20}px; object-fit: contain; mix-blend-mode: multiply;" alt="${name}" />`;
    return isApproved ? name : `<span style="color: #ccc; font-size: 11px;">(미승인)</span>`;
  };

  const printIncome = (t: Transaction) => {
    const { full: dateFull, year: dateYear } = getFormattedDateStrings(t.date);
    const lineItems = getApprovalLines();
    let picName = t.spender || lineItems[0].name;
    let picSignUrl = approvalRoles.find(a => a.name === t.spender)?.signUrl || lineItems[0].signUrl;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <title>수입결의서(${dateFull})</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap');
          body { font-family: 'Noto Sans KR', sans-serif; padding: 40px; }
          .container { width: 210mm; margin: 0 auto; border: 1px solid #000; padding: 20px; box-sizing: border-box; }
          h1 { text-align: center; font-size: 32px; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; letter-spacing: 5px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; }
          th, td { border: 1px solid #000; padding: 10px; text-align: center; }
          .bg-gray { background-color: #f3f4f6; font-weight: bold; }
          .amount-row td { padding: 20px 10px; font-size: 16px; }
          .desc-box { height: 150px; vertical-align: top; text-align: left; white-space: pre-wrap; }
          .approval-table { width: auto; margin-left: auto; margin-bottom: 20px; }
          .approval-table td { width: 75px; height: 60px; vertical-align: middle; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>수 입 결 의 서</h1>
          <div style="text-align: right;">
            <div style="margin-bottom: 5px; font-size: 12px; font-weight: bold;">기관명: ${churchName}</div>
            <table class="approval-table">
              <tr><td class="bg-gray">${lineItems[0].role}</td><td class="bg-gray">${lineItems[1].role}</td><td class="bg-gray">${lineItems[2].role}</td></tr>
              <tr>
                <td>${renderSignature(picName, t.approvals.pic, picSignUrl)}</td>
                <td>${renderSignature(lineItems[1].name, t.approvals.secGen, lineItems[1].signUrl)}</td>
                <td>${renderSignature(lineItems[2].name, t.approvals.director, lineItems[2].signUrl)}</td>
              </tr>
            </table>
          </div>
          <table>
            <tr><td class="bg-gray" style="width: 15%">회계년도</td><td style="width: 35%">${dateYear}년도</td><td class="bg-gray" style="width: 15%">발 의</td><td style="width: 35%">${dateFull}</td></tr>
            <tr><td class="bg-gray">계정과목</td><td>${t.category}</td><td class="bg-gray">결 재</td><td>${dateFull}</td></tr>
            <tr><td class="bg-gray">수입처</td><td style="font-weight: bold;">${t.vendor || ''}</td><td class="bg-gray">등 기</td><td>${dateFull}</td></tr>
            <tr class="amount-row"><td class="bg-gray">수입금액</td><td colspan="3"><div style="display: flex; justify-content: space-between; padding: 0 20px;"><span>일금</span><span style="font-weight: bold; font-size: 1.2em;">₩ ${t.amount.toLocaleString()}</span><span>원정</span></div></td></tr>
            <tr><td class="bg-gray">내 용</td><td colspan="3" class="desc-box">${t.description || ''}</td></tr>
          </table>
          <div style="margin-top:50px; text-align:center; font-size:20px; font-weight: bold;">${churchName}</div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.onafterprint = function() { window.close(); };
              // 폴백: 2초 후에도 안닫히면 강제 종료 시도
              setTimeout(function() { if(!window.closed) window.close(); }, 2000);
            }, 300);
          };
        </script>
      </body>
      </html>
    `;
    openPrintWindow(htmlContent);
  };

  const printExpense = (t: Transaction) => {
    const { full: dateFull, year: dateYear } = getFormattedDateStrings(t.date);
    const lineItems = getApprovalLines();
    let picName = t.spender || lineItems[0].name;
    let picSignUrl = approvalRoles.find(a => a.name === t.spender)?.signUrl || lineItems[0].signUrl;

    let evidenceImages: string[] = [];
    if (t.evidenceUrl) {
      try {
        const parsed = JSON.parse(t.evidenceUrl);
        evidenceImages = Array.isArray(parsed) ? parsed : [t.evidenceUrl];
      } catch (e) {
        evidenceImages = [t.evidenceUrl];
      }
    }

    let imgContainerStyle = '';
    let imgItemStyle = '';
    const count = evidenceImages.length;
    if (count === 1) {
      imgItemStyle = 'width: 100%; height: 230mm; margin-bottom: 0;';
    } else if (count === 2) {
      imgItemStyle = 'width: 100%; height: 110mm; margin-bottom: 5mm;';
    } else {
      imgContainerStyle = 'display: flex; flex-wrap: wrap; gap: 4mm; justify-content: center;';
      imgItemStyle = 'width: 98mm; height: 110mm;';
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <title>지출결의서(${dateFull})</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
          body { font-family: 'Noto Sans KR', sans-serif; padding: 0; margin: 0; background: #fff; }
          .page { width: 210mm; height: 296mm; padding: 15mm; box-sizing: border-box; margin: 0 auto; page-break-after: always; position: relative; border: 1px solid #eee; }
          h1 { text-align: center; font-size: 30px; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; letter-spacing: 5px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th, td { border: 1px solid #000; padding: 8px; text-align: center; }
          .bg-gray { background-color: #f3f4f6; font-weight: bold; }
          .amount-box { display: flex; justify-content: space-between; align-items: center; padding: 0 10px; font-weight: bold; font-size: 16px; }
          .vertical-text { writing-mode: vertical-rl; text-orientation: upright; padding: 10px 2px; }
          .approval-section { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 10px; }
          .img-wrapper { border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; background: #fff; overflow: hidden; box-sizing: border-box; }
          .img-wrapper img { max-width: 98%; max-height: 98%; object-fit: contain; }
          .receipt-sign-box { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding-right: 20px; }
          .receipt-name { font-weight: bold; border-bottom: 1px solid #000; padding: 0 5px; min-width: 100px; text-align: center; }
          @media print { .page { margin: 0; border: none; } }
        </style>
      </head>
      <body>
        <div class="page">
          <h1>지 출 결 의 서</h1>
          <div class="approval-section">
            <div style="font-weight: bold; font-size: 15px;">기관명: ${churchName}</div>
            <table style="width: auto;">
              <tr><td class="bg-gray" style="width: 60px;">${lineItems[0].role}</td><td class="bg-gray" style="width: 60px;">${lineItems[1].role}</td><td class="bg-gray" style="width: 60px;">${lineItems[2].role}</td></tr>
              <tr>
                <td style="height: 50px; vertical-align: middle;">${renderSignature(picName, t.approvals.pic, picSignUrl)}</td>
                <td style="height: 50px; vertical-align: middle;">${renderSignature(lineItems[1].name, t.approvals.secGen, lineItems[1].signUrl)}</td>
                <td style="height: 50px; vertical-align: middle;">${renderSignature(lineItems[2].name, t.approvals.director, lineItems[2].signUrl)}</td>
              </tr>
            </table>
          </div>
          <table>
            <tr><td class="bg-gray" style="width: 15%">회계년도</td><td style="width: 35%">${dateYear}년도</td><td class="bg-gray" style="width: 15%">발 의</td><td style="width: 35%">${dateFull}</td></tr>
            <tr><td class="bg-gray">계정과목</td><td>${t.category}</td><td class="bg-gray">결 재</td><td>${dateFull}</td></tr>
            <tr><td class="bg-gray">지출항목</td><td>${t.description.split('\n')[0]}</td><td class="bg-gray">등 기</td><td>${dateFull}</td></tr>
            <tr><td class="bg-gray">지출금액</td><td colspan="3"><div class="amount-box"><span>일금</span><span>₩ ${t.amount.toLocaleString()}</span><span>원정</span></div></td></tr>
          </table>
          <table style="border-top: none; margin-bottom: 10px;">
            <tr><td rowspan="2" class="bg-gray vertical-text" style="width: 40px;">거래처</td><td class="bg-gray" style="width: 80px;">상호</td><td>${t.vendor || ''}</td></tr>
            <tr><td class="bg-gray">성명</td><td></td></tr>
          </table>
          <div style="border: 1px solid #000; padding: 10px; min-height: 120px; margin-bottom: 10px;">
             <div style="font-weight: bold; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 8px;">적요 (상세내용)</div>
             <div style="white-space: pre-wrap; font-size: 13px;">${t.description}</div>
          </div>
          <table style="margin-top: auto;">
             <tr><td class="bg-gray vertical-text" style="width: 40px;">영수</td>
               <td style="padding: 20px; text-align: center;">
                  <p style="margin-bottom: 15px; font-size: 15px;">위의 금액을 정히 영수함</p>
                  <p style="font-weight: bold; margin: 15px 0; font-size: 16px;">${dateFull}</p>
                  <div class="receipt-sign-box">
                    <span>영수인 :</span><span class="receipt-name">${t.vendor || '(거래처)'}</span>
                    <div style="width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; border: 1px dashed #999; border-radius: 50%; color: #ccc; font-size: 10px; position: relative;">
                      <span style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">(인)</span>
                    </div>
                  </div>
               </td>
             </tr>
          </table>
          <div style="margin-top: 20px; text-align: center; font-weight: bold; font-size: 20px;">${churchName}</div>
        </div>
        ${evidenceImages.length > 0 ? `
        <div class="page">
          <h1 style="font-size: 24px;">증 빙 자 료 [별지]</h1>
          <div style="text-align: right; font-size: 12px; margin-bottom: 10px; color: #666;">지출건: ${t.description.split('\n')[0]} | 금액: ₩ ${t.amount.toLocaleString()}</div>
          <div class="evidence-container" style="${imgContainerStyle}">
            ${evidenceImages.map(img => `<div class="img-wrapper" style="${imgItemStyle}"><img src="${formatGoogleDriveLink(img)}" /></div>`).join('')}
          </div>
        </div>
        ` : ''}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.onafterprint = function() { window.close(); };
              setTimeout(function() { if(!window.closed) window.close(); }, 2000);
            }, 500);
          };
        </script>
      </body>
      </html>
    `;
    openPrintWindow(htmlContent);
  };

  const openPrintWindow = (content: string) => {
    const printWindow = window.open('', '_blank', 'width=900,height=900');
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
    }
  };

  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 no-print">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
             <span className="p-2 bg-gray-100 rounded-lg">🔍</span>
             결의내역 및 전자결재
          </h2>
          <button 
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className={`flex items-center gap-1 px-3 py-1 rounded text-sm font-medium transition-colors ${isRefreshing ? 'bg-gray-200 text-gray-500' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
          >
            <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            {isRefreshing ? '데이터 수신 중...' : '최신 데이터 동기화'}
          </button>
        </div>
        
        <div className="w-full md:w-auto flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <select 
            value={yearFilter} 
            onChange={(e) => setYearFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
          >
             <option value="all">전체 연도</option>
             {[0, 1, 2, 3, 4].map(i => {
              const y = new Date().getFullYear() - i;
              return <option key={y} value={y.toString()}>{y}년</option>;
            })}
          </select>
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
          >
            <option value="all">전체 구분</option>
            <option value={TransactionType.INCOME}>수입</option>
            <option value={TransactionType.EXPENSE}>지출</option>
          </select>
          <input 
            type="text" 
            placeholder="적요, 계정, 담당자 검색" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 flex-1 md:w-52 text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] text-gray-400 uppercase bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-bold w-28 whitespace-nowrap">날짜</th>
                <th className="px-6 py-4 font-bold w-20 text-center whitespace-nowrap">구분</th>
                <th className="px-6 py-4 font-bold w-32 whitespace-nowrap">계정과목</th>
                <th className="px-6 py-4 font-bold w-32 text-right whitespace-nowrap">금액</th>
                <th className="px-6 py-4 font-bold w-52 text-center whitespace-nowrap">전자결재 현황</th>
                <th className="px-6 py-4 font-bold w-24 text-center whitespace-nowrap">담당자</th>
                <th className="px-6 py-4 font-bold w-20 text-center whitespace-nowrap">기능</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/50 bg-white transition-colors group">
                    <td className="px-6 py-4 text-gray-500 font-mono whitespace-nowrap">{formatDateForDisplay(t.date)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
                        t.type === TransactionType.INCOME ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                      }`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700 whitespace-nowrap">{t.category}</td>
                    <td className={`px-6 py-4 text-right font-black whitespace-nowrap ${t.type === TransactionType.INCOME ? 'text-indigo-600' : 'text-rose-600'}`}>
                      {t.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500 border-2 border-emerald-500 text-white flex flex-col items-center justify-center text-[9px] font-black shadow-lg shadow-emerald-100/50 select-none">
                          <span className="opacity-80">담당</span>
                          <span className="text-[10px]">승인</span>
                        </div>
                        <div className="w-2 h-[1px] bg-slate-200"></div>
                        <button 
                          onClick={() => handleToggleApproval(t, 'secGen')}
                          disabled={currentUser?.role !== '사무국장'}
                          className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center text-[9px] font-black border-2 transition-all active:scale-95 ${
                            t.approvals.secGen 
                              ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-100/50' 
                              : (currentUser?.role === '사무국장' ? 'bg-white border-blue-200 text-blue-300 hover:border-blue-500 hover:text-blue-500' : 'bg-slate-50 border-slate-100 text-slate-200 cursor-not-allowed')
                          }`}
                        >
                          <span className="opacity-80">국장</span>
                          <span className="text-[10px]">{t.approvals.secGen ? '승인' : '미결'}</span>
                        </button>
                        <div className="w-2 h-[1px] bg-slate-200"></div>
                        <button 
                          onClick={() => handleToggleApproval(t, 'director')}
                          disabled={currentUser?.role !== '원장'}
                          className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center text-[9px] font-black border-2 transition-all active:scale-95 ${
                            t.approvals.director 
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100/50' 
                              : (currentUser?.role === '원장' ? 'bg-white border-indigo-200 text-indigo-300 hover:border-indigo-500 hover:text-indigo-500' : 'bg-slate-50 border-slate-100 text-slate-200 cursor-not-allowed')
                          }`}
                        >
                          <span className="opacity-80">원장</span>
                          <span className="text-[10px]">{t.approvals.director ? '승인' : '미결'}</span>
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-500 text-[11px] whitespace-nowrap">{t.spender}</td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => t.type === TransactionType.INCOME ? printIncome(t) : printExpense(t)}
                        className="bg-slate-800 hover:bg-black text-white rounded-lg px-3 py-1.5 text-[11px] flex items-center justify-center gap-1 mx-auto transition-all shadow-sm active:scale-95"
                      >
                        출력
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={7} className="px-6 py-20 text-center text-slate-400 italic">검색 결과가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TransactionHistory;
