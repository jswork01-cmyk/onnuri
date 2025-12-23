
import React, { useMemo, useState } from 'react';
import { AppData, TransactionType } from '../types';
import { GoogleGenAI } from "@google/genai";

interface AccountingReportProps {
  data: AppData;
}

const AccountingReport: React.FC<AccountingReportProps> = ({ data }) => {
  const [targetYear, setTargetYear] = useState(new Date().getFullYear());
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const orgName = data.churchInfo?.name || '정심작업장';
  const transactions = data.transactions || [];
  const initialCarryover = Number(data.churchInfo?.initialCarryover) || 0;

  // 보고서 데이터 계산 (전기이월금 자동 산출 포함)
  const reportData = useMemo(() => {
    // 1. 전기 이월금 계산: targetYear 시작일(01-01) 이전의 모든 내역 합산
    const targetYearStart = `${targetYear}-01-01`;
    
    let computedPrevCarryover = initialCarryover;
    
    // targetYear 이전 내역들 합산
    transactions.forEach(t => {
      const tDate = t.date.substring(0, 10);
      if (tDate < targetYearStart) {
        if (t.type === TransactionType.INCOME) {
          computedPrevCarryover += t.amount;
        } else {
          computedPrevCarryover -= t.amount;
        }
      }
    });

    // 2. 당기(targetYear) 내역 필터링 및 합산
    const filtered = transactions.filter(t => t.date.startsWith(String(targetYear)));
    const incomeMap = new Map<string, number>();
    const expenseMap = new Map<string, number>();
    let totalIncome = 0;
    let totalExpense = 0;

    filtered.forEach(t => {
      if (t.type === TransactionType.INCOME) {
        incomeMap.set(t.category, (incomeMap.get(t.category) || 0) + t.amount);
        totalIncome += t.amount;
      } else {
        expenseMap.set(t.category, (expenseMap.get(t.category) || 0) + t.amount);
        totalExpense += t.amount;
      }
    });

    const incomeList = Array.from(incomeMap.entries()).map(([name, amount]) => ({ name, amount }));
    const expenseList = Array.from(expenseMap.entries()).map(([name, amount]) => ({ name, amount }));
    
    // 3. 차기 이월금 (최종 잔액) = 전기이월 + 당기수입 - 당기지출
    const balance = computedPrevCarryover + totalIncome - totalExpense;

    return { 
      incomeList, 
      expenseList, 
      totalIncome, 
      totalExpense, 
      prevCarryover: computedPrevCarryover,
      balance 
    };
  }, [transactions, targetYear, initialCarryover]);

  const handleGenerateSummary = async () => {
    if (!process.env.API_KEY) { alert("AI 기능을 위해 API Key 설정이 필요합니다."); return; }
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        당신은 ${orgName}의 온누리상품권 회계 담당자입니다. ${targetYear}년도 온누리상품권 결산 보고서를 위한 '결산 총평'을 작성해주세요.
        
        [재정 데이터 요약]
        - 전기 이월금(이전 연도 누적): ${reportData.prevCarryover.toLocaleString()}원
        - 금기 총 수입: ${reportData.totalIncome.toLocaleString()}원
        - 금기 총 지출: ${reportData.totalExpense.toLocaleString()}원
        - 차기 이월금(현재 잔액): ${reportData.balance.toLocaleString()}원
        
        보고받는 원장님께 정중하고 공식적인 '하십시오'체로 300자 이내로 작성하세요. 
        온누리상품권이 투명하게 관리되고 있으며, 예산 집행이 계획대로 이루어졌음을 강조해주세요.
      `;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      setAiSummary(response.text || '');
    } catch (error) {
      console.error(error);
      alert("AI 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    const htmlContent = `
      <html>
        <head>
          <title>온누리상품권 결산보고서 - ${targetYear}년</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap');
            body { font-family: 'Noto Sans KR', sans-serif; padding: 40px; color: #333; }
            h1 { text-align: center; font-size: 28px; text-decoration: underline; margin-bottom: 30px; }
            .info-header { text-align: right; margin-bottom: 10px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #000; padding: 12px; text-align: right; }
            th { background: #f8f9fa; text-align: center; font-weight: bold; }
            .text-center { text-align: center; }
            .summary-box { border: 2px solid #000; padding: 20px; margin-top: 30px; white-space: pre-wrap; line-height: 1.6; }
            .footer-sign { margin-top: 60px; text-align: center; }
            .date { margin-top: 20px; font-weight: bold; }
            .org-name { margin-top: 15px; font-size: 22px; font-weight: black; }
          </style>
        </head>
        <body>
          <h1>${targetYear}년도 온누리상품권 결산 보고서</h1>
          <div class="info-header">기관명: ${orgName}</div>
          
          <table>
            <thead>
              <tr><th colspan="2">재정 통합 요약 (단위: 원)</th></tr>
            </thead>
            <tbody>
              <tr><td class="text-center" style="width: 50%">전기 이월금 (이전 연도 이월)</td><td>${reportData.prevCarryover.toLocaleString()}</td></tr>
              <tr><td class="text-center">금기 총 수입</td><td>${reportData.totalIncome.toLocaleString()}</td></tr>
              <tr><td class="text-center">금기 총 지출</td><td>${reportData.totalExpense.toLocaleString()}</td></tr>
              <tr style="background: #f0fdf4;"><th class="text-center">차기 이월금 (현재 잔액)</th><th>${reportData.balance.toLocaleString()}</th></tr>
            </tbody>
          </table>

          <div class="summary-box">
            <div style="font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 10px;">[결산 총평 및 분석]</div>
            ${aiSummary || '기록된 총평이 없습니다. (시스템에서 생성 버튼을 눌러주세요)'}
          </div>

          <div class="footer-sign">
            <div style="font-size: 16px;">위와 같이 ${targetYear}년도 온누리상품권 재정 결산을 보고합니다.</div>
            <div class="date">${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div class="org-name">${orgName} 원장 (인)</div>
          </div>
          <script>window.onload=function(){window.print();window.close();}</script>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    win?.document.write(htmlContent);
    win?.document.close();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
           <span className="p-2 bg-indigo-50 rounded-lg">📑</span>
           온누리상품권 결산보고서
        </h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <select 
            value={targetYear} 
            onChange={e => setTargetYear(Number(e.target.value))} 
            className="border rounded-lg p-2 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            {[0, 1, 2, 3, 4].map(i => {
              const y = new Date().getFullYear() - i;
              return <option key={y} value={y}>{y}년도 결산</option>;
            })}
          </select>
          <button onClick={handlePrint} className="flex-1 sm:flex-none bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
            보고서 인쇄
          </button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 space-y-8">
        <div className="text-center border-b border-gray-100 pb-6">
          <h3 className="text-3xl font-black text-gray-900">{targetYear}년 온누리상품권 결산</h3>
          <p className="text-gray-400 mt-2 font-medium">{orgName} 회계팀 (전기이월금 자동산출 적용)</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-gray-50 rounded-xl border border-gray-100">
            <div className="text-xs font-bold text-gray-400 uppercase mb-1">전기이월 (자동)</div>
            <div className="text-xl font-bold text-gray-700">₩ {reportData.prevCarryover.toLocaleString()}</div>
            <div className="text-[10px] text-gray-400 mt-1">* {targetYear}년 1월 1일 이전 누적분</div>
          </div>
          <div className="p-5 bg-blue-50 rounded-xl border border-blue-100">
            <div className="text-xs font-bold text-blue-400 uppercase mb-1">당기 총 수입</div>
            <div className="text-xl font-bold text-blue-600">₩ {reportData.totalIncome.toLocaleString()}</div>
          </div>
          <div className="p-5 bg-rose-50 rounded-xl border border-rose-100">
            <div className="text-xs font-bold text-rose-400 uppercase mb-1">당기 총 지출</div>
            <div className="text-xl font-bold text-rose-600">₩ {reportData.totalExpense.toLocaleString()}</div>
          </div>
          <div className="p-5 bg-emerald-50 rounded-xl border border-emerald-100">
            <div className="text-xs font-bold text-emerald-400 uppercase mb-1">차기이월 (잔액)</div>
            <div className="text-xl font-bold text-emerald-600">₩ {reportData.balance.toLocaleString()}</div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-gray-800 flex items-center gap-2">
              <span className="text-indigo-500">✨</span> AI 온누리상품권 결산 총평
            </h4>
            <button 
              onClick={handleGenerateSummary} 
              disabled={isGenerating} 
              className={`text-xs px-4 py-1.5 rounded-full font-bold transition-all ${
                isGenerating ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
              }`}
            >
              {isGenerating ? 'AI가 분석 중...' : '총평 자동 생성'}
            </button>
          </div>
          <div className="relative">
            <textarea 
              value={aiSummary} 
              onChange={e => setAiSummary(e.target.value)} 
              className="w-full h-40 border border-gray-200 rounded-xl p-5 text-sm leading-relaxed focus:ring-2 focus:ring-indigo-500 outline-none shadow-inner bg-gray-50/30" 
              placeholder="총평 자동 생성 버튼을 누르면 AI가 재정 데이터를 분석하여 결산 총평을 작성합니다." 
            />
            {!aiSummary && !isGenerating && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                <span className="text-4xl">🤖</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3">
        <span className="text-xl">💡</span>
        <div className="text-sm text-amber-800">
          <strong>전기이월금 안내:</strong> 현재 보고서의 전기이월금은 
          <ol className="list-decimal list-inside mt-1 space-y-1">
            <li>[설정]에 입력된 기초 이월금</li>
            <li>{targetYear}년 이전까지 기록된 모든 수입/지출 내역</li>
          </ol>
          을 합산하여 자동으로 계산됩니다. 데이터가 정확하지 않다면 과거 거래 내역을 확인해 주세요.
        </div>
      </div>
    </div>
  );
};

export default AccountingReport;
