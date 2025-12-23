
import React, { useState, useMemo } from 'react';
import { AppData, Transaction, TransactionType } from '../types';
import { formatGoogleDriveLink } from '../services/sheetService';

interface IncomeFormProps {
  data: AppData;
  onSave: (t: Transaction) => void;
}

const IncomeForm: React.FC<IncomeFormProps> = ({ data, onSave }) => {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState('');
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [spender, setSpender] = useState('');

  const incomeCategories = data.accountCategories?.income || [];
  const orgName = data.churchInfo?.name || '정심작업장';
  const approvalRoles = data.approvalLine || [];

  const lineItems = useMemo(() => [
    { role: approvalRoles[0]?.role || '담당', name: spender || approvalRoles[0]?.name || '', signUrl: approvalRoles[0]?.signUrl },
    { role: approvalRoles[1]?.role || '사무국장', name: approvalRoles[1]?.name || '', signUrl: approvalRoles[1]?.signUrl },
    { role: approvalRoles[2]?.role || '원장', name: approvalRoles[2]?.name || '', signUrl: approvalRoles[2]?.signUrl }
  ], [approvalRoles, spender]);

  const handlePrint = () => {
    const html = `
      <html>
        <head>
          <title>수입결의서(${date})</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap');
            body { font-family: 'Noto Sans KR', sans-serif; padding: 40px; }
            h1 { text-align: center; text-decoration: underline; margin-bottom: 40px; font-size: 30px; letter-spacing: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
            th, td { border: 1px solid #000; padding: 15px; text-align: center; font-size: 14px; }
            .label { background: #f8f9fa; font-weight: bold; width: 140px; }
            .approval { width: auto; margin-left: auto; margin-bottom: 15px; }
            .approval td { width: 80px; height: 70px; }
            .amount-text { font-size: 20px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>온누리상품권 수 입 결 의 서</h1>
          <div style="text-align:right; margin-bottom: 10px; font-weight: bold;">기관명: ${orgName}</div>
          <table class="approval">
            <tr><td class="label">${lineItems[0].role}</td><td class="label">${lineItems[1].role}</td><td class="label">${lineItems[2].role}</td></tr>
            <tr><td>${lineItems[0].name}</td><td>(미결)</td><td>(미결)</td></tr>
          </table>
          <table>
            <tr><td class="label">결의일자</td><td>${date}</td><td class="label">계정과목</td><td>${category}</td></tr>
            <tr><td class="label">수입금액</td><td colspan="3" class="amount-text">₩ ${amount.toLocaleString()} (원정)</td></tr>
            <tr><td class="label">수입처</td><td colspan="3">${vendor}</td></tr>
            <tr><td class="label">내 용</td><td colspan="3" style="height:150px; text-align:left; vertical-align:top; white-space: pre-wrap;">${description}</td></tr>
          </table>
          <div style="margin-top:100px; text-align:center; font-size:24px; font-weight: bold;">${orgName}</div>
          <script>window.onload=function(){window.print(); window.close();}</script>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    win?.document.write(html);
    win?.document.close();
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setAmount(value === '' ? 0 : Number(value));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) { alert('금액을 입력해주세요.'); return; }
    if (!category) { alert('계정과목을 선택해주세요.'); return; }

    onSave({
      id: Date.now().toString(),
      date,
      type: TransactionType.INCOME,
      category,
      amount,
      vendor,
      description,
      spender,
      approvals: { pic: true, secGen: false, director: false }
    });
    alert('수입결의서가 저장되었습니다.');
    setAmount(0);
    setVendor('');
    setDescription('');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold mb-8 flex items-center gap-3 text-indigo-700">
          <span className="p-2 bg-indigo-50 rounded-lg">📥</span>
          온누리상품권 수입결의서 작성
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">결의일자</label>
              <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full border border-gray-200 rounded-xl p-3 mt-1.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">계정과목</label>
              <select required value={category} onChange={e => setCategory(e.target.value)} className="w-full border border-gray-200 rounded-xl p-3 mt-1.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                <option value="">선택하세요</option>
                {incomeCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">수입금액</label>
            <div className="relative mt-1.5">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₩</span>
              <input 
                type="text" 
                required 
                value={amount > 0 ? amount.toLocaleString() : ''} 
                onChange={handleAmountChange}
                placeholder="0"
                className="w-full border border-gray-200 rounded-xl p-4 pl-10 text-2xl font-black text-indigo-600 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">수입처</label>
            <input 
              type="text" 
              required 
              value={vendor} 
              onChange={e => setVendor(e.target.value)} 
              className="w-full border border-gray-200 rounded-xl p-3 mt-1.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
              placeholder="기관명 또는 성명"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">작성 담당자</label>
            <select required value={spender} onChange={e => setSpender(e.target.value)} className="w-full border border-gray-200 rounded-xl p-3 mt-1.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
              <option value="">선택하세요</option>
              {approvalRoles.map((item, idx) => (
                <option key={idx} value={item.name}>{item.name} ({item.role})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">내용 (적요)</label>
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              className="w-full border border-gray-200 rounded-xl p-4 mt-1.5 h-32 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none" 
              placeholder="수입 상세 내용을 입력하세요"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all text-lg">
              결의서 저장
            </button>
            <button type="button" onClick={handlePrint} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white py-4 rounded-xl font-bold shadow-lg shadow-slate-100 transition-all text-lg">
              결의서 인쇄
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IncomeForm;
