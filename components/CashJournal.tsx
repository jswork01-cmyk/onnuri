
import React, { useMemo } from 'react';
import { AppData, TransactionType } from '../types';

interface CashJournalProps {
  data: AppData;
}

const CashJournal: React.FC<CashJournalProps> = ({ data }) => {
  const transactions = data.transactions || [];
  const churchName = data.churchInfo?.name || '성문침례교회';
  const initialCarryover = Number(data.churchInfo?.initialCarryover) || 0;

  const journalRows = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => {
      const dateDiff = a.date.localeCompare(b.date);
      if (dateDiff !== 0) return dateDiff;
      return a.id.localeCompare(b.id);
    });
    
    let runningBalance = initialCarryover;

    return sorted.map(t => {
      const income = t.type === TransactionType.INCOME ? t.amount : 0;
      const expense = t.type === TransactionType.EXPENSE ? t.amount : 0;
      runningBalance += (income - expense);
      return {
        ...t,
        income,
        expense,
        currentBalance: runningBalance
      };
    });
  }, [transactions, initialCarryover]);

  const handlePrint = () => {
    const rowsHtml = journalRows.map(t => `
      <tr>
        <td style="text-align: center;">${t.date.substring(5, 10)}</td>
        <td style="text-align: center;">${t.category}</td>
        <td style="text-align: left; padding: 5px; font-size: 11px;">${t.description}</td>
        <td style="color: #2563eb; text-align: right;">${t.income ? t.income.toLocaleString() : ''}</td>
        <td style="color: #dc2626; text-align: right;">${t.expense ? t.expense.toLocaleString() : ''}</td>
        <td style="background-color: #f9fafb; font-weight: bold; text-align: right;">${t.currentBalance.toLocaleString()}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <title>온누리상품권 금전출납부</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&display=swap');
          body { font-family: 'Noto Sans KR', sans-serif; padding: 15mm; margin: 0; color: #000; }
          .header { text-align: center; margin-bottom: 30px; }
          h1 { font-size: 32px; font-weight: 900; margin-bottom: 5px; letter-spacing: 12px; border: none; text-decoration: none; }
          .info { font-size: 12px; font-weight: bold; margin-bottom: 10px; text-align: left; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; border: 1.5px solid #000; }
          th, td { border: 1px solid #000; padding: 8px 6px; font-size: 11.5px; word-break: break-all; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .footer { margin-top: 20px; font-size: 12px; text-align: right; font-weight: bold; }
          .system-info { margin-top: 10px; font-size: 10px; text-align: center; color: #666; }
          @media print {
            @page { size: A4 portrait; margin: 10mm; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>금 전 출 납 부</h1>
        </div>
        <div class="info">
          기관명: ${churchName}
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 12%;">월일</th>
              <th style="width: 16%;">항목</th>
              <th style="width: 32%;">적요(내용)</th>
              <th style="width: 13%;">수입(₩)</th>
              <th style="width: 13%;">지출(₩)</th>
              <th style="width: 14%;">잔액(₩)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align: center; color: #888;">-</td>
              <td style="text-align: center; font-weight: bold;">[이월]</td>
              <td style="text-align: left; padding-left: 5px; color: #666;">전기이월금</td>
              <td></td>
              <td></td>
              <td style="text-align: right; font-weight: bold;">${initialCarryover.toLocaleString()}</td>
            </tr>
            ${rowsHtml}
          </tbody>
        </table>
        <div class="footer">
          출력일시: ${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}.
        </div>
        <div class="system-info">
          본 장부는 시스템에 의해 자동 생성되었습니다. | ${churchName} 회계관리
        </div>
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

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }
  };

  return (
    <div className="p-4 md:p-6 h-full flex flex-col space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span className="p-2 bg-slate-100 rounded-lg">📒</span>
            온누리상품권 금전출납부
          </h2>
          <p className="text-xs text-slate-500 mt-1">기초 이월금 포함 모든 거래 내역과 실시간 잔액을 표시합니다.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={handlePrint} 
            className="flex-1 sm:flex-none bg-slate-800 hover:bg-black text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-slate-200 transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
            장부 인쇄 (A4세로)
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1">
        <div className="overflow-x-auto h-full">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 font-bold border-b border-slate-100">일자</th>
                <th className="px-6 py-4 font-bold border-b border-slate-100">항목</th>
                <th className="px-6 py-4 font-bold border-b border-slate-100">내용 (적요)</th>
                <th className="px-6 py-4 font-bold text-right border-b border-slate-100">수입</th>
                <th className="px-6 py-4 font-bold text-right border-b border-slate-100">지출</th>
                <th className="px-6 py-4 font-bold text-right border-b border-slate-100 bg-slate-100/50">누적 잔액</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <tr className="bg-slate-50/30">
                <td className="px-6 py-4 text-slate-400 font-mono">-</td>
                <td className="px-6 py-4 font-bold text-slate-400">[이월]</td>
                <td className="px-6 py-4 text-slate-500 italic">기초 전기이월금 (Settings에서 설정)</td>
                <td className="px-6 py-4 text-right">-</td>
                <td className="px-6 py-4 text-right">-</td>
                <td className="px-6 py-4 text-right font-black text-slate-700 bg-slate-100/30">
                  {initialCarryover.toLocaleString()}
                </td>
              </tr>
              
              {journalRows.length > 0 ? (
                journalRows.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 text-slate-500 font-mono whitespace-nowrap">{t.date.substring(0, 10)}</td>
                    <td className="px-6 py-4 font-semibold text-slate-700 whitespace-nowrap">{t.category}</td>
                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={t.description}>{t.description}</td>
                    <td className="px-6 py-4 text-right font-bold text-blue-600">
                      {t.income ? `+ ${t.income.toLocaleString()}` : ''}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-rose-500">
                      {t.expense ? `- ${t.expense.toLocaleString()}` : ''}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-900 bg-slate-50 group-hover:bg-slate-100 transition-colors">
                      {t.currentBalance.toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-400 italic">
                    기록된 거래 내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CashJournal;
