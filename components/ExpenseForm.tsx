
import React, { useState, useMemo } from 'react';
import { AppData, Transaction, TransactionType } from '../types';
import { formatGoogleDriveLink, uploadEvidenceFile } from '../services/sheetService';

interface ExpenseFormProps {
  data: AppData;
  onSave: (t: Transaction) => void;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ data, onSave }) => {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState('');
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [vendor, setVendor] = useState('');
  const [description, setDescription] = useState('');
  const [spender, setSpender] = useState('');
  const [evidenceImages, setEvidenceImages] = useState<(string | null)[]>([null, null, null, null]);
  const [isSaving, setIsSaving] = useState(false);

  const expenseCategories = data.accountCategories?.expense || [];
  const churchName = data.churchInfo?.name || '정심작업장';
  const approvalRoles = data.approvalLine || [];

  const { lineItems } = useMemo(() => {
    const pic = approvalRoles[0];
    const foundManager = approvalRoles.find(a => a.name === spender);
    const mName = foundManager ? foundManager.name : (spender || (pic?.name || ''));
    const mSignUrl = foundManager ? foundManager.signUrl : (pic?.signUrl || '');
    const secGen = approvalRoles[1];
    const director = approvalRoles[2];

    return {
        lineItems: [
            { role: pic?.role || '담당', name: mName, signUrl: mSignUrl },
            { role: secGen?.role || '사무국장', name: secGen?.name || '', signUrl: secGen?.signUrl },
            { role: director?.role || '원장', name: director?.name || '', signUrl: director?.signUrl }
        ]
    };
  }, [approvalRoles, spender]);

  const handlePrint = () => {
    const renderSignature = (name: string, signUrl?: string, size: number = 45) => {
        if (signUrl) {
            return `<img src="${formatGoogleDriveLink(signUrl)}" style="max-height: ${size}px; max-width: ${size + 20}px; object-fit: contain; mix-blend-mode: multiply;" alt="${name}" />`;
        }
        return name;
    };

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

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <title>지출결의서(${date})</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
          body { font-family: 'Noto Sans KR', sans-serif; padding: 0; margin: 0; background: #fff; color: #000; }
          .page { width: 210mm; height: 296mm; padding: 15mm; box-sizing: border-box; margin: 0 auto; page-break-after: always; position: relative; border: 1px solid #eee; }
          h1 { text-align: center; font-size: 28px; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; letter-spacing: 5px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th, td { border: 1px solid #000; padding: 8px; text-align: center; }
          .bg-gray { background-color: #f3f4f6; font-weight: bold; }
          .amount-box { display: flex; justify-content: space-between; align-items: center; padding: 0 10px; font-weight: bold; font-size: 16px; }
          .vertical-text { writing-mode: vertical-rl; text-orientation: upright; padding: 10px 2px; }
          .approval-section { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px; }
          .evidence-container { width: 100%; height: auto; margin-top: 5px; }
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
            <div style="font-weight: bold; font-size: 14px;">기관명: ${churchName}</div>
            <table style="width: auto;">
              <tr><td class="bg-gray" style="width: 55px;">${lineItems[0].role}</td><td class="bg-gray" style="width: 55px;">${lineItems[1].role}</td><td class="bg-gray" style="width: 55px;">${lineItems[2].role}</td></tr>
              <tr>
                <td style="height: 50px; vertical-align: middle;">${renderSignature(lineItems[0].name, lineItems[0].signUrl)}</td>
                <td style="height: 50px; vertical-align: middle; color:#ccc;">(미결)</td>
                <td style="height: 50px; vertical-align: middle; color:#ccc;">(미결)</td>
              </tr>
            </table>
          </div>
          <table>
            <tr><td class="bg-gray" style="width: 15%">회계년도</td><td>${date.substring(0,4)}년도</td><td class="bg-gray" style="width: 15%">발 의</td><td>${date}</td></tr>
            <tr><td class="bg-gray">계정과목</td><td>${category}</td><td class="bg-gray">결 재</td><td>${date}</td></tr>
            <tr><td class="bg-gray">지출항목</td><td>${item}</td><td class="bg-gray">등 기</td><td>${date}</td></tr>
            <tr><td class="bg-gray">지출금액</td><td colspan="3"><div class="amount-box"><span>일금</span><span>₩ ${amount.toLocaleString()}</span><span>원정</span></div></td></tr>
          </table>
          <table style="border-top: none; margin-bottom: 8px;">
            <tr><td rowspan="2" class="bg-gray vertical-text" style="width: 35px;">거래처</td><td class="bg-gray" style="width: 70px;">상호</td><td>${vendor}</td></tr>
            <tr><td class="bg-gray">성명</td><td></td></tr>
          </table>
          <div style="border: 1px solid #000; padding: 8px; min-height: 100px; margin-bottom: 8px;">
             <div style="font-weight: bold; border-bottom: 1px solid #eee; padding-bottom: 3px; margin-bottom: 5px; font-size: 12px;">적요 (상세내용)</div>
             <div style="white-space: pre-wrap; font-size: 13px;">${description}</div>
          </div>
          <table style="margin-top: auto;">
             <tr><td class="bg-gray vertical-text" style="width: 35px;">영수</td>
               <td style="padding: 15px; text-align: center;">
                  <p style="margin-bottom: 10px; font-size: 14px;">위의 금액을 정히 영수함</p>
                  <p style="font-weight: bold; margin: 10px 0; font-size: 15px;">${date}</p>
                  <div class="receipt-sign-box">
                    <span>영수인 :</span><span class="receipt-name">${vendor || '(거래처)'}</span>
                    <div style="width: 45px; height: 45px; display: flex; align-items: center; justify-content: center; border: 1px dashed #999; border-radius: 50%; color: #ccc; font-size: 10px; position: relative;">
                      <span style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">(인)</span>
                    </div>
                  </div>
               </td>
             </tr>
          </table>
          <div style="margin-top: 15px; text-align: center; font-weight: bold; font-size: 18px;">${churchName}</div>
        </div>
        ${activeImages.length > 0 ? `
        <div class="page">
          <h1 style="font-size: 22px;">증 빙 자 료 [별지]</h1>
          <div style="text-align: right; font-size: 11px; margin-bottom: 10px; color: #666;">지출건: ${item} | 금액: ₩ ${amount.toLocaleString()}</div>
          <div class="evidence-container" style="${imgContainerStyle}">
            ${activeImages.map(img => `<div class="img-wrapper" style="${imgItemStyle}"><img src="${formatGoogleDriveLink(img)}" /></div>`).join('')}
          </div>
        </div>
        ` : ''}
        <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); }</script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }
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
          const fileName = `evidence_${date}_${item}_${i + 1}.png`;
          const url = await uploadEvidenceFile(validImages[i], fileName);
          if (url) uploadedUrls.push(url);
        }
      }

      onSave({
        id: Date.now().toString(),
        date,
        type: TransactionType.EXPENSE,
        category,
        amount,
        vendor,
        description: item + (description ? `\n${description}` : ''),
        spender,
        evidenceUrl: uploadedUrls.length > 0 ? JSON.stringify(uploadedUrls) : undefined,
        approvals: { pic: true, secGen: false, director: false }
      });

      alert('지출결의서와 증빙자료가 구글 드라이브에 저장되었습니다.');
      setItem('');
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
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-rose-600">
          <span className="p-2 bg-rose-50 rounded-lg">📤</span>
          온누리상품권 지출결의서 작성
        </h2>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">결의일자</label>
                <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full border rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-rose-500 outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">계정과목</label>
                <select required value={category} onChange={e => setCategory(e.target.value)} className="w-full border rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-rose-500 outline-none">
                  <option value="">선택하세요</option>
                  {expenseCategories.map((name, idx) => <option key={idx} value={name}>{name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">지출항목 (품명)</label>
                <input type="text" required value={item} onChange={e => setItem(e.target.value)} className="w-full border rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-rose-500 outline-none" placeholder="예: 비품 구입, 식대 등" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">지출금액</label>
                <input 
                  type="text" 
                  required 
                  value={amount > 0 ? amount.toLocaleString() : ''} 
                  onChange={e => setAmount(Number(e.target.value.replace(/[^0-9]/g, '')))}
                  className="w-full border rounded-lg p-2.5 mt-1 font-bold text-rose-600 focus:ring-2 focus:ring-rose-500 outline-none text-right pr-4" 
                  placeholder="0" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">거래처</label>
                <input type="text" value={vendor} onChange={e => setVendor(e.target.value)} className="w-full border rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-rose-500 outline-none" placeholder="상호명 또는 대표자명" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">작성 담당자</label>
                <select required value={spender} onChange={e => setSpender(e.target.value)} className="w-full border rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-rose-500 outline-none">
                  <option value="">선택하세요</option>
                  {approvalRoles.map((item, idx) => (
                    <option key={idx} value={item.name}>{item.name} ({item.role})</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase">적요 (상세내용)</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border rounded-lg p-2.5 mt-1 h-32 focus:ring-2 focus:ring-rose-500 outline-none" placeholder="지출 상세 내용을 입력하세요" />
            </div>

            <div className="flex gap-3 pt-4">
              <button 
                type="submit" 
                disabled={isSaving}
                className={`flex-1 text-white py-4 rounded-xl font-bold shadow-lg transition-all text-lg flex items-center justify-center gap-2 ${isSaving ? 'bg-gray-400' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-100'}`}
              >
                {isSaving && <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                {isSaving ? '업로드 및 저장 중...' : '결의서 저장'}
              </button>
              <button type="button" onClick={handlePrint} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white py-4 rounded-xl font-bold shadow-lg shadow-slate-100 transition-all text-lg">
                결의서 인쇄
              </button>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
            <h3 className="text-sm font-bold text-gray-500 mb-4 flex items-center gap-2">
               📸 증빙자료 첨부 (최대 4장)
               <span className="text-[10px] font-normal text-gray-400">구글 드라이브에 자동 업로드됩니다.</span>
            </h3>
            <div className="grid grid-cols-2 gap-4 h-[400px]">
              {evidenceImages.map((img, idx) => (
                <div key={idx} className="relative group border-2 border-dashed border-gray-200 rounded-xl bg-white overflow-hidden hover:border-rose-300 transition-colors flex items-center justify-center">
                  {img ? (
                    <>
                      <img src={img} className="w-full h-full object-cover" alt={`첨부 ${idx + 1}`} />
                      <button 
                        type="button" 
                        onClick={() => removeImage(idx)}
                        className="absolute top-2 right-2 bg-rose-500 text-white p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      </button>
                    </>
                  ) : (
                    <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-rose-50 transition-colors">
                      <svg className="w-8 h-8 text-gray-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                      <span className="text-[10px] text-gray-400 font-bold">사진 추가</span>
                      <input type="file" accept="image/*" onChange={handleFileChange(idx)} className="hidden" />
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseForm;
