import React, { useState, useMemo } from 'react';
import { AppData, ChurchInfo, TransactionType, DonationRecord } from '../types';
import { formatGoogleDriveLink, submitDonation, sendDonationEmail } from '../services/sheetService';

interface DonationReceiptProps {
  data: AppData;
}

const DonationReceipt: React.FC<DonationReceiptProps> = ({ data }) => {
  const [selectedSaintId, setSelectedSaintId] = useState('');
  const [targetYear, setTargetYear] = useState(new Date().getFullYear());
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  // Use saints list (Saints Sheet) instead of members
  const saints = data.saints || [];
  const transactions = data.transactions || [];
  const donations = data.donations || [];
  
  // Sort saints by name for easier searching
  const sortedSaints = useMemo(() => {
    return [...saints].sort((a, b) => a.name.localeCompare(b.name));
  }, [saints]);

  const selectedSaint = saints.find(s => s.id === selectedSaintId);
  
  const churchInfo: ChurchInfo = data.churchInfo || { 
    name: '', 
    registrationNumber: '', 
    address: '', 
    representative: '' 
  };
  
  // Calculate total donation for the selected saint and year
  const totalDonation = useMemo(() => {
    if (!selectedSaint) return 0;
    
    // Filter transactions:
    // 1. Must be INCOME
    // 2. Date must match targetYear
    // 3. Vendor (Payer) must match Saint's Name
    return transactions.reduce((sum, t) => {
      if (t.type !== TransactionType.INCOME) return sum;
      
      // Check Year (Robust check for YYYY-MM-DD or simple string match)
      const tYear = t.date.substring(0, 4);
      if (String(tYear) !== String(targetYear)) return sum;
      
      // Check Name (Assuming 'vendor' field holds the donor's name in Income transactions)
      // Trim spaces for better matching
      const donorName = (t.vendor || '').trim();
      const saintName = (selectedSaint.name || '').trim();
      
      if (donorName !== saintName) return sum;
      
      return sum + t.amount;
    }, 0);
  }, [transactions, selectedSaint, targetYear]);

  // Determine Next Serial Number
  const nextSerialNumber = useMemo(() => {
    // Filter existing donations for the target year
    const currentYearDonations = donations.filter(d => Number(d.targetYear) === Number(targetYear));
    
    // Find max serial number sequence
    let maxSeq = 0;
    
    currentYearDonations.forEach(d => {
      // Assuming format YYYY-XXX
      if (d.serialNumber && d.serialNumber.includes('-')) {
        const parts = d.serialNumber.split('-');
        if (parts.length === 2) {
          const seq = parseInt(parts[1], 10);
          if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
          }
        }
      }
    });

    const nextSeq = maxSeq + 1;
    return `${targetYear}-${String(nextSeq).padStart(3, '0')}`;
  }, [donations, targetYear]);

  const generateReceiptHtml = () => {
    if (!selectedSaint) return '';

    const sealUrl = formatGoogleDriveLink(churchInfo.sealUrl);
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    return `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <title>기부금영수증</title>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Noto Sans KR', sans-serif; padding: 20px; font-size: 13px; line-height: 1.3; color: #000; background: #eee; }
          .container { max-width: 210mm; margin: 0 auto 20px auto; border: 1px solid #ddd; padding: 20px; background: #fff; box-sizing: border-box; min-height: 297mm; position: relative; }
          .header-top { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 5px; font-size: 11px; }
          .serial-box { border: 1px solid #000; padding: 3px 10px; font-size: 12px; display: inline-block; margin-bottom: 10px; }
          h1 { font-size: 28px; font-weight: bold; text-align: center; letter-spacing: 0.5em; margin: 15px 0; }
          .notice { font-size: 11px; margin-bottom: 5px; }
          
          .section-title { font-weight: bold; margin-top: 10px; margin-bottom: 2px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 5px; font-size: 11px; }
          td, th { border: 1px solid #000; padding: 4px; vertical-align: middle; }
          .label-cell { background-color: #f5f5f5; text-align: center; font-weight: 500; }
          .center { text-align: center; }
          .right { text-align: right; }
          
          .declaration { margin-top: 15px; text-align: center; line-height: 1.6; }
          .date-row { text-align: center; margin: 10px 0; font-size: 14px; }
          .sign-row { display: flex; justify-content: flex-end; align-items: center; margin-bottom: 15px; padding-right: 20px; }
          .sign-label { margin-right: 15px; }
          .sign-name { margin-right: 15px; font-weight: bold; font-size: 14px; }
          
          /* 직인 이미지 스타일 - 수정됨: 60px로 축소 */
          .seal-img { 
            position: absolute; 
            top: 50%; 
            left: 50%; 
            transform: translate(-50%, -50%); 
            width: 60px; 
            height: 60px; 
            object-fit: contain; 
            opacity: 0.8; 
            mix-blend-mode: multiply; 
          }
          
          .instructions { border: 1px solid #000; background-color: #f9f9f9; padding: 20px; font-size: 11px; line-height: 1.5; height: 100%; box-sizing: border-box; }
          .instructions h3 { text-align: center; margin: 0 0 15px 0; font-size: 14px; background-color: #e0e0e0; padding: 5px; display: block; border: 1px solid #000; }
          .code-table td { font-size: 10px; padding: 4px; text-align: center; }
          .code-table .left-align { text-align: left; padding-left: 5px; }

          @media print {
            body { padding: 0; margin: 0; background: #fff; }
            .container { border: none; width: 100%; padding: 20px; margin: 0; box-shadow: none; min-height: auto; }
            .page-break { page-break-before: always; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <!-- Page 1: Receipt -->
        <div class="container">
          <div class="header-top">
            <div>■ 소득세법 시행규칙 [별지 제45호의2서식] &lt;개정 2023. 3. 20.&gt;</div>
            <div style="font-size: 10px;">(앞 쪽)</div>
          </div>
          
          <div class="serial-box">일련번호 ${nextSerialNumber}</div>
          
          <h1>기 부 금 영 수 증</h1>
          
          <div class="notice">※ 아래의 작성방법을 읽고 작성하여 주시기 바랍니다.</div>
          <div style="border-bottom: 2px solid #000; margin-bottom: 5px;"></div>

          <!-- 1. 기부자 -->
          <div class="section-title">① 기부자</div>
          <table>
            <colgroup>
              <col style="width: 15%">
              <col style="width: 35%">
              <col style="width: 15%">
              <col style="width: 35%">
            </colgroup>
            <tr>
              <td class="label-cell">성명(법인명)</td>
              <td>${selectedSaint.name}</td>
              <td class="label-cell">주민등록번호<br>(사업자등록번호)</td>
              <td>${selectedSaint.juminNo || ''}</td>
            </tr>
            <tr>
              <td class="label-cell">주소(소재지)</td>
              <td colspan="3">${selectedSaint.address || ''}</td>
            </tr>
          </table>

          <!-- 2. 기부금 단체 -->
          <div class="section-title">② 기부금 단체</div>
          <table>
            <colgroup>
              <col style="width: 15%">
              <col style="width: 35%">
              <col style="width: 15%">
              <col style="width: 35%">
            </colgroup>
            <tr>
              <td class="label-cell">단 체 명</td>
              <td>${churchInfo.name}</td>
              <td class="label-cell">사업자등록번호<br>(고유번호)</td>
              <td>${churchInfo.registrationNumber}</td>
            </tr>
            <tr>
              <td class="label-cell">소 재 지</td>
              <td colspan="3">${churchInfo.address}</td>
            </tr>
            <tr>
              <td class="label-cell">기부금공제대상<br>기부금단체 근거법령</td>
              <td colspan="3">「소득세법 시행령」 제80조제1항제5호</td>
            </tr>
          </table>

          <!-- 3. 기부금 모집처 -->
          <div class="section-title">③ 기부금 모집처(언론기관 등)</div>
          <table>
             <colgroup>
              <col style="width: 15%">
              <col style="width: 35%">
              <col style="width: 15%">
              <col style="width: 35%">
            </colgroup>
            <tr>
              <td class="label-cell">단 체 명</td>
              <td></td>
              <td class="label-cell">사업자등록번호</td>
              <td></td>
            </tr>
            <tr>
              <td class="label-cell">소 재 지</td>
              <td colspan="3"></td>
            </tr>
          </table>

          <!-- 4. 기부내용 -->
          <div class="section-title">④ 기부내용</div>
          <table>
            <thead>
              <tr>
                <td rowspan="2" class="label-cell" style="width: 8%">코드</td>
                <td rowspan="2" class="label-cell" style="width: 12%">구 분<br>(금전 또는 현물)</td>
                <td rowspan="2" class="label-cell" style="width: 18%">연월일</td>
                <td colspan="4" class="label-cell">내 용</td>
              </tr>
              <tr>
                <td class="label-cell" style="width: 25%">품 명</td>
                <td class="label-cell" style="width: 8%">수 량</td>
                <td class="label-cell" style="width: 12%">단 가</td>
                <td class="label-cell" style="width: 17%">금 액</td>
              </tr>
            </thead>
            <tbody>
              <tr style="height: 30px;">
                <td class="center">41</td>
                <td class="center">금전</td>
                <td class="center">${targetYear}.1.1~12.31</td>
                <td class="center">헌금 등</td>
                <td class="center"></td>
                <td class="center"></td>
                <td class="right">${totalDonation.toLocaleString()}</td>
              </tr>
              <tr style="height: 30px;"><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
              <tr style="height: 30px;"><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
            </tbody>
          </table>

          <!-- Declarations -->
          <div class="declaration">
            「소득세법」 제34조, 「조세특례제한법」 제58조ㆍ제76조ㆍ제88조의4 및 「법인세법」 제24조에 따른<br>
            기부금을 위와 같이 기부하였음을 증명하여 주시기 바랍니다.
          </div>

          <div class="date-row">${year}년 ${month}월 ${day}일</div>
          
          <div class="sign-row">
            <span class="sign-label">신청인</span>
            <span class="sign-name">${selectedSaint.name}</span>
            <span>(서명 또는 인)</span>
          </div>
          
          <div style="border-bottom: 1px dashed #000; margin: 10px 0;"></div>

          <div class="declaration">
            위와 같이 기부금을 기부받았음을 증명합니다.
          </div>

          <div class="date-row">${year}년 ${month}월 ${day}일</div>

          <div class="sign-row">
            <span class="sign-label">기부금 수령인</span>
            <span class="sign-name">${churchInfo.name}</span>
            <div style="position: relative; display: inline-block;">
               <span>(서명 또는 인)</span>
               ${sealUrl ? `<img src="${sealUrl}" class="seal-img" />` : ''}
            </div>
          </div>
          
          <div style="border-bottom: 2px solid #000; margin-bottom: 5px;"></div>
           <div style="text-align: right; font-size: 10px;">210mm×297mm[백상지 80g/㎡ 또는 중질지 80g/㎡]</div>
        </div>

        <!-- Page 2: Instructions -->
        <div class="page-break"></div>

        <div class="container">
          <div class="header-top">
             <div style="font-size: 10px; visibility: hidden;">placeholder</div>
             <div style="font-size: 10px;">(뒤 쪽)</div>
          </div>
          <div class="instructions">
            <h3>작 성 방 법</h3>
            <div style="margin-bottom: 8px;">1. 기부금 단체는 해당 단체를 기부금공제대상 기부금단체로 규정하고 있는 「소득세법」 또는 「법인세법」 등 관련 법령을 적어 기부금영수증을 발행해야 합니다.</div>
            <div style="margin-bottom: 8px;">2. 기부금 모집처(언론기관 등)는 방송사, 신문사, 통신회사 등 기부금을 대신 접수하여 기부금 단체에 전달하는 기관을 말하며, 기부금단체에 직접 기부한 경우에는 적지 않습니다.</div>
            <div style="margin-bottom: 8px;">3. 기부내용의 코드는 다음 구분에 따라 적습니다.</div>
            
            <table class="code-table" style="width: 100%; border: 1px solid #000; margin: 10px 0;">
              <tr style="background: #eee;">
                <td style="width: 85%; font-weight: bold;">기부금 구분</td>
                <td style="width: 15%; font-weight: bold;">코드</td>
              </tr>
              <tr>
                <td class="left-align">「소득세법」 제34조제2항제1호, 「법인세법」 제24조제2항제1호에 따른 특례기부금</td>
                <td>10</td>
              </tr>
              <tr>
                <td class="left-align">「조세특례제한법」 제76조에 따른 기부금</td>
                <td>20</td>
              </tr>
              <tr>
                <td class="left-align">「소득세법」 제34조제3항제1호(종교단체기부금 제외), 「법인세법」 제24조제3항제1호에 따른 일반기부금</td>
                <td>40</td>
              </tr>
              <tr>
                <td class="left-align">「소득세법」 제34조제3항제1호에 따른 일반기부금 중 종교단체기부금</td>
                <td>41</td>
              </tr>
               <tr>
                <td class="left-align">「조세특례제한법」 제88조의4에 따른 기부금</td>
                <td>42</td>
              </tr>
               <tr>
                <td class="left-align">「조세특례제한법」 제58조에 따른 기부금</td>
                <td>43</td>
              </tr>
               <tr>
                <td class="left-align">필요경비(손금) 및 소득공제금액대상에 해당되지 않는 기부금</td>
                <td>50</td>
              </tr>
            </table>

            <div style="margin-top: 10px;">4. 기부내용의 구분란에는 "금전기부"의 경우에는 "금전", "현물기부"의 경우에는 "현물"로 적고, 내용란은 현물기부의 경우에만 적습니다. "현물기부" 시 "단가"란은 아래 표와 같이 기부자, 특수관계여부 등에 따라 장부가액 또는 시가를 적습니다.</div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const saveRecord = () => {
    if (!selectedSaint) return;
    
    // Submit Record to Google Sheet
    const newRecord: DonationRecord = {
      id: Date.now().toString(),
      issueDate: new Date().toISOString().slice(0, 10),
      targetYear: targetYear,
      saintName: selectedSaint.name,
      saintId: selectedSaint.id,
      amount: totalDonation,
      issuer: churchInfo.name,
      serialNumber: nextSerialNumber
    };

    // Send to background
    submitDonation(newRecord).then(success => {
      if(success) {
        console.log("Donation record saved with serial: " + nextSerialNumber);
      }
    });
  };

  const handlePrint = async () => {
    if (!selectedSaint) return;

    saveRecord(); // Save record on print

    const htmlContent = generateReceiptHtml();
    
    const printWindow = window.open('', '_blank', 'width=900,height=900');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      // Inject script to auto print
      printWindow.document.write('<script>window.onload = function() { window.print(); window.close(); }</script>');
      printWindow.document.close();
    }
  };

  const handleEmailSend = async () => {
    if (!selectedSaint || !selectedSaint.email) {
      alert("이메일 주소가 없는 교인입니다.");
      return;
    }

    if (!confirm(`${selectedSaint.name} (${selectedSaint.email}) 님에게 기부금 영수증을 이메일로 발송하시겠습니까?`)) {
      return;
    }

    setIsSendingEmail(true);
    
    // Save record first (same as print)
    saveRecord();

    const htmlContent = generateReceiptHtml();
    const subject = `[${churchInfo.name}] ${targetYear}년 기부금 영수증`;

    try {
      const success = await sendDonationEmail(selectedSaint.email, subject, htmlContent);
      if (success) {
        alert("이메일 전송 요청이 성공했습니다.\n\n[중요] 수신자가 스팸 메일함을 꼭 확인하도록 안내해주세요.\n(구글 정책상 자동 발송 메일은 스팸으로 분류될 수 있습니다)");
      } else {
        alert("이메일 발송에 실패했습니다. (Google Script 설정을 확인해주세요)");
      }
    } catch (error) {
      console.error("Email send error", error);
      alert("이메일 발송 중 오류가 발생했습니다.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 h-full">
      <div className="w-full lg:w-1/4 bg-white p-6 rounded-lg shadow-sm border border-gray-200 no-print">
        <h2 className="text-xl font-bold mb-4">기부금 영수증 발급</h2>
        <div className="space-y-4">
           <div>
            <label className="block text-sm font-medium text-gray-700">귀속년도</label>
            <input type="number" value={targetYear} onChange={e => setTargetYear(Number(e.target.value))} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">교인 선택 (Saints 명부)</label>
            <select value={selectedSaintId} onChange={e => setSelectedSaintId(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md p-2">
              <option value="">선택하세요</option>
              {sortedSaints.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.position ? `(${s.position})` : ''}
                </option>
              ))}
            </select>
            {/* Donation Total Display */}
            {selectedSaint && (
              <div className="mt-3 space-y-2">
                <div className="p-3 bg-blue-50 border border-blue-100 rounded text-right">
                  <span className="text-xs text-blue-600 font-medium block">
                    {targetYear}년 기부금 합계
                  </span>
                  <span className="text-lg font-bold text-blue-800">
                    ₩ {totalDonation.toLocaleString()}
                  </span>
                </div>
                <div className="text-right text-xs text-gray-500">
                   발급 예정 일련번호: <span className="font-bold text-gray-700">{nextSerialNumber}</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="pt-2 border-t border-gray-100 mt-4">
            <button onClick={handlePrint} disabled={!selectedSaint} className="w-full bg-green-700 text-white py-2 rounded mb-2 disabled:opacity-50 hover:bg-green-800 flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
              영수증 인쇄
            </button>
            
            <button 
              onClick={handleEmailSend} 
              disabled={!selectedSaint || !selectedSaint.email || isSendingEmail} 
              className={`w-full py-2 rounded text-white flex items-center justify-center gap-2 ${!selectedSaint || !selectedSaint.email ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {isSendingEmail ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  전송 중...
                </>
              ) : (
                <>
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                   이메일 전송
                </>
              )}
            </button>
            {selectedSaint && !selectedSaint.email && (
              <p className="text-xs text-red-400 mt-1 text-center">이메일 주소가 등록되지 않은 교인입니다.</p>
            )}
             <p className="text-xs text-gray-400 mt-2">* 인쇄 또는 이메일 전송 시 '기부금 발급내역'에 자동 저장됩니다.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-gray-200 p-8 overflow-auto flex justify-center">
        {selectedSaint ? (
          <div className="flex flex-col gap-4 origin-top transform scale-75">
            {/* Page 1 Preview */}
            <div className="bg-white w-[210mm] min-h-[297mm] p-[10mm] text-xs leading-tight shadow-lg text-black relative">
               <div className="flex justify-between items-end mb-2 text-[10px]">
                 <div>■ 소득세법 시행규칙 [별지 제45호의2서식] &lt;개정 2023. 3. 20.&gt;</div>
                 <div>(앞 쪽)</div>
               </div>
               
               <div className="border border-black inline-block px-2 py-1 text-[11px] mb-4">일련번호: {nextSerialNumber}</div>
               
               <h1 className="text-2xl font-bold tracking-[0.5em] text-center mb-6">기 부 금 영 수 증</h1>

               <div className="text-[10px] mb-1">※ 아래의 작성방법을 읽고 작성하여 주시기 바랍니다.</div>
               <div className="border-b-2 border-black mb-2"></div>

               <div className="mb-1 font-bold text-[11px]">① 기부자</div>
               <table className="w-full border-collapse border border-black mb-3 text-[10px]">
                 <tbody>
                   <tr>
                     <td className="border border-black p-1 bg-gray-100 w-24 text-center">성명(법인명)</td>
                     <td className="border border-black p-1">{selectedSaint.name}</td>
                     <td className="border border-black p-1 bg-gray-100 w-28 text-center">주민등록번호<br/>(사업자등록번호)</td>
                     <td className="border border-black p-1">{selectedSaint.juminNo || ''}</td>
                   </tr>
                   <tr>
                     <td className="border border-black p-1 bg-gray-100 text-center">주소(소재지)</td>
                     <td colSpan={3} className="border border-black p-1">{selectedSaint.address || ''}</td>
                   </tr>
                 </tbody>
               </table>

               <div className="mb-1 font-bold text-[11px]">② 기부금 단체</div>
               <table className="w-full border-collapse border border-black mb-3 text-[10px]">
                 <tbody>
                   <tr>
                     <td className="border border-black p-1 bg-gray-100 w-24 text-center">단 체 명</td>
                     <td className="border border-black p-1">{churchInfo.name}</td>
                     <td className="border border-black p-1 bg-gray-100 w-28 text-center">사업자등록번호<br/>(고유번호)</td>
                     <td className="border border-black p-1">{churchInfo.registrationNumber}</td>
                   </tr>
                   <tr>
                     <td className="border border-black p-1 bg-gray-100 text-center">소 재 지</td>
                     <td colSpan={3} className="border border-black p-1">{churchInfo.address}</td>
                   </tr>
                   <tr>
                     <td className="border border-black p-1 bg-gray-100 text-center">기부금공제대상<br/>기부금단체 근거법령</td>
                     <td colSpan={3} className="border border-black p-1">「소득세법 시행령」 제80조제1항제5호</td>
                   </tr>
                 </tbody>
               </table>

               <div className="mb-1 font-bold text-[11px]">④ 기부내용</div>
               <table className="w-full border-collapse border border-black mb-6 text-[10px]">
                 <thead>
                  <tr className="bg-gray-100 text-center">
                    <td rowSpan={2} className="border border-black p-1 w-10">코드</td>
                    <td rowSpan={2} className="border border-black p-1 w-16">구분<br/>(금전.현물)</td>
                    <td rowSpan={2} className="border border-black p-1 w-20">연월일</td>
                    <td colSpan={4} className="border border-black p-1">내 용</td>
                  </tr>
                  <tr className="bg-gray-100 text-center">
                     <td className="border border-black p-1">품 명</td>
                     <td className="border border-black p-1 w-10">수 량</td>
                     <td className="border border-black p-1 w-16">단 가</td>
                     <td className="border border-black p-1 w-20">금 액</td>
                  </tr>
                 </thead>
                 <tbody>
                   <tr className="text-center h-8">
                     <td className="border border-black">41</td>
                     <td className="border border-black">금전</td>
                     <td className="border border-black">{targetYear}.1.1~12.31</td>
                     <td className="border border-black">헌금 등</td>
                     <td className="border border-black"></td>
                     <td className="border border-black"></td>
                     <td className="border border-black text-right px-2">{totalDonation.toLocaleString()}</td>
                   </tr>
                   <tr className="h-8"><td colSpan={7} className="border border-black"></td></tr>
                 </tbody>
               </table>

               <div className="text-center text-[11px] leading-relaxed mb-6">
                  「소득세법」 제34조, 「조세특례제한법」 제58조ㆍ제76조ㆍ제88조의4 및 「법인세법」 제24조에 따른<br/>
                  기부금을 위와 같이 기부하였음을 증명하여 주시기 바랍니다.
               </div>

               <div className="text-center text-[12px] mb-8">
                  {new Date().getFullYear()}년 {new Date().getMonth() + 1}월 {new Date().getDate()}일
               </div>

               <div className="flex justify-end items-center pr-10 mb-8 text-[12px]">
                 <span className="mr-4">신청인</span>
                 <span className="font-bold mr-4">{selectedSaint.name}</span>
                 <span>(서명 또는 인)</span>
               </div>

               <div className="border-t border-dashed border-black mb-6"></div>

               <div className="text-center text-[11px] mb-6">위와 같이 기부금을 기부받았음을 증명합니다.</div>

               <div className="text-center text-[12px] mb-8">
                  {new Date().getFullYear()}년 {new Date().getMonth() + 1}월 {new Date().getDate()}일
               </div>

               <div className="flex justify-end items-center pr-10 mb-8 text-[12px]">
                 <span className="mr-4">기부금 수령인</span>
                 <span className="font-bold mr-4">{churchInfo.name}</span>
                 <div className="relative">
                   <span>(서명 또는 인)</span>
                   {churchInfo.sealUrl && <img src={formatGoogleDriveLink(churchInfo.sealUrl)} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[60px] h-[60px] object-contain opacity-80 mix-blend-multiply" alt="직인" />}
                 </div>
               </div>
               
               <div className="border-b-2 border-black mb-2"></div>
               <div className="text-right text-[10px]">210mm×297mm[백상지 80g/㎡ 또는 중질지 80g/㎡]</div>

               <div className="text-center text-gray-500 mt-4 text-[10px] absolute bottom-2 left-0 right-0">
                 (1페이지: 영수증)
               </div>
            </div>

            {/* Page 2 Preview: Instructions */}
            <div className="bg-white w-[210mm] min-h-[297mm] p-[10mm] text-xs leading-tight shadow-lg text-black relative">
               <div className="text-right mb-2 text-[10px]">(뒤 쪽)</div>
               <div className="border border-black bg-gray-50 p-6 h-full text-[11px] leading-relaxed">
                  <div className="text-center font-bold mb-6 border border-black bg-gray-200 p-2">작 성 방 법</div>
                  <div className="mb-4">1. 기부금 단체는 해당 단체를 기부금공제대상 기부금단체로 규정하고 있는 「소득세법」 또는 「법인세법」 등 관련 법령을 적어 기부금영수증을 발행해야 합니다.</div>
                  <div className="mb-4">2. 기부금 모집처(언론기관 등)는 방송사, 신문사, 통신회사 등 기부금을 대신 접수하여 기부금 단체에 전달하는 기관을 말하며, 기부금단체에 직접 기부한 경우에는 적지 않습니다.</div>
                  <div className="mb-4">3. 기부내용의 코드는 다음 구분에 따라 적습니다.</div>
                  
                  <table className="w-full border-collapse border border-black mb-4 text-[10px]">
                    <tbody>
                      <tr className="bg-gray-100 text-center font-bold">
                        <td className="border border-black p-2 w-[85%]">기부금 구분</td>
                        <td className="border border-black p-2 w-[15%]">코드</td>
                      </tr>
                      <tr>
                        <td className="border border-black p-2">「소득세법」 제34조제2항제1호, 「법인세법」 제24조제2항제1호에 따른 특례기부금</td>
                        <td className="border border-black p-2 text-center">10</td>
                      </tr>
                      <tr>
                        <td className="border border-black p-2">「조세특례제한법」 제76조에 따른 기부금</td>
                        <td className="border border-black p-2 text-center">20</td>
                      </tr>
                      <tr>
                        <td className="border border-black p-2">「소득세법」 제34조제3항제1호(종교단체기부금 제외), 「법인세법」 제24조제3항제1호에 따른 일반기부금</td>
                        <td className="border border-black p-2 text-center">40</td>
                      </tr>
                      <tr>
                        <td className="border border-black p-2">「소득세법」 제34조제3항제1호에 따른 일반기부금 중 종교단체기부금</td>
                        <td className="border border-black p-2 text-center">41</td>
                      </tr>
                      <tr>
                        <td className="border border-black p-2">「조세특례제한법」 제88조의4에 따른 기부금</td>
                        <td className="border border-black p-2 text-center">42</td>
                      </tr>
                      <tr>
                        <td className="border border-black p-2">「조세특례제한법」 제58조에 따른 기부금</td>
                        <td className="border border-black p-2 text-center">43</td>
                      </tr>
                      <tr>
                        <td className="border border-black p-2">필요경비(손금) 및 소득공제금액대상에 해당되지 않는 기부금</td>
                        <td className="border border-black p-2 text-center">50</td>
                      </tr>
                    </tbody>
                  </table>

                  <div>4. 기부내용의 구분란에는 "금전기부"의 경우에는 "금전", "현물기부"의 경우에는 "현물"로 적고, 내용란은 현물기부의 경우에만 적습니다. "현물기부" 시 "단가"란은 아래 표와 같이 기부자, 특수관계여부 등에 따라 장부가액 또는 시가를 적습니다.</div>
               </div>
               <div className="text-center text-gray-500 mt-4 text-[10px] absolute bottom-2 left-0 right-0">
                 (2페이지: 작성방법)
               </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
             왼쪽에서 교인을 선택해주세요.
          </div>
        )}
      </div>
    </div>
  );
};

export default DonationReceipt;