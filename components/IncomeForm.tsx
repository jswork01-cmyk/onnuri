
import React, { useState, useMemo } from 'react';
import { AppData, Transaction, TransactionType } from '../types';
import { formatGoogleDriveLink, uploadEvidenceFile } from '../services/sheetService';

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
  const [evidenceImages, setEvidenceImages] = useState<(string | null)[]>([null, null, null, null]);
  const [isSaving, setIsSaving] = useState(false);

  const incomeCategories = data.accountCategories?.income || [];
  const orgName = data.churchInfo?.name || '정심작업장';
  const approvalRoles = data.approvalLine || [];

  const lineItems = useMemo(() => [
    { role: approvalRoles[0]?.role || '담당', name: spender || approvalRoles[0]?.name || '', signUrl: approvalRoles[0]?.signUrl },
    { role: approvalRoles[1]?.role || '사무국장', name: approvalRoles[1]?.name || '', signUrl: approvalRoles[1]?.signUrl },
    { role: approvalRoles[2]?.role || '원장', name: approvalRoles[2]?.name || '', signUrl: approvalRoles[2]?.signUrl }
  ], [approvalRoles, spender]);

  const handlePrint = () => {
    const activeImages = evidenceImages.filter((img): img is string => img !== null);
    
    let imgContainerStyle = '';
    let imgItemStyle = '';
    const count = activeImages.length;

    if (count === 1) {
      imgItemStyle = 'width: 100%; height: 230mm; margin-bottom: 0;';
    } else if (count === 2) {
      imgItemStyle = 'width: 100%; height: 110mm; margin-bottom: 5mm;';
    } else {
      imgContainerStyle = 'display: flex; flex-wrap: wrap; gap: 4mm; justify-content: center;';
      imgItemStyle = 'width: 98mm; height: 110mm;';
    }

    const html = `
      <html>
        <head>
          <title>수입결의서(${date})</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap');
            body { font-family: 'Noto Sans KR', sans-serif; padding: 40px; margin: 0; background: #fff; }
            .page { width: 210mm; height: 296mm; padding: 15mm; box-sizing: border-box; margin: 0 auto; page-break-after: always; position: relative; border: 1px solid #eee; }
            h1 { text-align: center; text-decoration: underline; margin-bottom: 40px; font-size: 30px; letter-spacing: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
            th, td { border: 1px solid #000; padding: 15px; text-align: center; font-size: 14px; }
            .label { background: #f8f9fa; font-weight: bold; width: 140px; }
            .approval { width: auto; margin-left: auto; margin-bottom: 15px; }
            .approval td { width: 80px; height: 70px; }
            .amount-text { font-size: 20px; font-weight: bold; }
            .img-wrapper { border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; background: #fff; overflow: hidden; box-sizing: border-box; }
            .img-wrapper img { max-width: 98%; max-height: 98%; object-fit: contain; }
            @media print { .page { margin: 0; border: none; } }
          </style>
        </head>
        <body>
          <div class="page">
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
          </div>
          ${activeImages.length > 0 ? `
          <div class="page">
            <h1 style="font-size: 22px; text-decoration: none; border-bottom: 2px solid #000; padding-bottom: 10px;">증 빙 자 료 [수입]</h1>
            <div style="text-align: right; font-size: 11px; margin-bottom: 10px; color: #666;">수입처: ${vendor} | 금액: ₩ ${amount.toLocaleString()}</div>
            <div style="${imgContainerStyle}">
              ${activeImages.map(img => `<div class="img-wrapper" style="${imgItemStyle}"><img src="${formatGoogleDriveLink(img)}" /></div>`).join('')}
            </div>
          </div>
          ` : ''}
          <script>window.onload=function(){window.print(); window.onafterprint = function() { window.close(); }; setTimeout(() => window.close(), 2000);}</script>
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

  const handleFileChange = (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setEvidenceImages(prev => {
          const newImages = [...prev];
          newImages[index] = ev.target?.result as string;
          return newImages;
        });
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const removeImage = (index: number) => {
    setEvidenceImages(prev => {
      const newImages = [...prev];
      newImages[index] = null;
      return newImages;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) { alert('금액을 입력해주세요.'); return; }
    if (!category) { alert('계정과목을 선택해주세요.'); return; }

    setIsSaving(true);
    try {
      const validImages = evidenceImages.filter((img): img is string => img !== null);
      const uploadedUrls: string[] = [];

      if (validImages.length > 0) {
        for (let i = 0; i < validImages.length; i++) {
          const fileName = `income_evidence_${date}_${vendor}_${i + 1}.png`;
          const url = await uploadEvidenceFile(validImages[i], fileName);
          if (url) uploadedUrls.push(url);
        }
      }

      onSave({
        id: Date.now().toString(),
        date,
        type: TransactionType.INCOME,
        category,
        amount,
        vendor,
        description,
        spender,
        evidenceUrl: uploadedUrls.length > 0 ? JSON.stringify(uploadedUrls) : undefined,
        approvals: { pic: true, secGen: false, director: false }
      });

      alert('수입결의서와 증빙자료가 저장되었습니다.');
      setAmount(0);
      setVendor('');
      setDescription('');
      setEvidenceImages([null, null, null, null]);
    } catch (err) {
      console.error(err);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="bg-white p-4 md:p-8 rounded-2xl shadow-sm border border-gray-200">
        <h2 className="text-xl md:text-2xl font-bold mb-8 flex items-center gap-3 text-indigo-700">
          <span className="p-2 bg-indigo-50 rounded-lg">📥</span>
          온누리상품권 수입결의서 작성
        </h2>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <button 
                type="submit" 
                disabled={isSaving}
                className={`flex-1 text-white py-4 rounded-xl font-bold shadow-lg transition-all text-lg flex items-center justify-center gap-2 ${isSaving ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'}`}
              >
                {isSaving && <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                {isSaving ? '업로드 중...' : '결의서 저장'}
              </button>
              <button type="button" onClick={handlePrint} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white py-4 rounded-xl font-bold shadow-lg shadow-slate-100 transition-all text-lg">
                결의서 인쇄
              </button>
            </div>
          </div>

          {/* 사진 첨부 영역 (지출결의서 UI와 동일) */}
          <div className="bg-gray-50 p-4 md:p-6 rounded-2xl border border-gray-100">
            <h3 className="text-sm font-bold text-gray-500 mb-4 flex items-center gap-2">
               📸 증빙자료 첨부 (최대 4장)
               <span className="hidden sm:inline text-[10px] font-normal text-gray-400">터치하여 촬영하거나 갤러리에서 선택</span>
            </h3>
            <div className="grid grid-cols-2 gap-3 md:gap-4 h-auto md:h-[400px]">
              {evidenceImages.map((img, idx) => (
                <div key={idx} className="relative group border-2 border-dashed border-gray-200 rounded-xl bg-white overflow-hidden hover:border-indigo-300 transition-colors flex items-center justify-center aspect-square md:aspect-auto">
                  {img ? (
                    <>
                      <img src={img} className="w-full h-full object-cover" alt={`첨부 ${idx + 1}`} />
                      <button 
                        type="button" 
                        onClick={() => removeImage(idx)}
                        className="absolute top-2 right-2 bg-rose-500/90 text-white p-1.5 rounded-full shadow-md z-10"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      </button>
                    </>
                  ) : (
                    <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50 transition-colors p-4">
                      <div className="p-3 bg-gray-50 rounded-full mb-2 group-hover:bg-indigo-100 transition-colors">
                        <svg className="w-6 h-6 md:w-8 md:h-8 text-gray-300 group-hover:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                      </div>
                      <span className="text-xs md:text-sm text-gray-400 font-bold">사진 촬영/추가</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange(idx)} 
                        className="hidden" 
                      />
                    </label>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11px] text-gray-400 text-center">
              ※ 모바일에서 클릭 시 '카메라'를 선택하면 바로 촬영할 수 있습니다.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IncomeForm;
