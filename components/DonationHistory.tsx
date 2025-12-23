import React, { useState } from 'react';
import { AppData, DonationRecord } from '../types';
import { formatGoogleDriveLink } from '../services/sheetService';

interface DonationHistoryProps {
  data: AppData;
  onRefresh: () => Promise<void>;
}

const DonationHistory: React.FC<DonationHistoryProps> = ({ data, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const donations = data.donations || [];
  const saints = data.saints || [];
  const churchInfo = data.churchInfo || {
    name: '',
    registrationNumber: '',
    address: '',
    representative: '',
    sealUrl: ''
  };

  // Helper to format date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.substring(0, 10);
    return dateStr;
  };

  const filteredDonations = donations.filter(d => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = !term || 
      (d.saintName && d.saintName.toLowerCase().includes(term)) ||
      (d.issuer && d.issuer.toLowerCase().includes(term));
    
    const matchesYear = yearFilter === 'all' || String(d.targetYear) === yearFilter;

    return matchesSearch && matchesYear;
  }).sort((a, b) => {
    // Sort by issue date desc
    const dateA = new Date(a.issueDate).getTime();
    const dateB = new Date(b.issueDate).getTime();
    return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
  });

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  const handlePrint = (record: DonationRecord) => {
    // Find Saint Info (Current Data)
    const saint = saints.find(s => s.id === record.saintId) || 
                  saints.find(s => s.name === record.saintName) || 
                  { name: record.saintName, juminNo: '', address: '' };

    const sealUrl = formatGoogleDriveLink(churchInfo.sealUrl);
    
    // Parse Issue Date
    let iYear = new Date().getFullYear();
    let iMonth = new Date().getMonth() + 1;
    let iDay = new Date().getDate();

    if (record.issueDate) {
        const d = new Date(record.issueDate);
        if(!isNaN(d.getTime())) {
            iYear = d.getFullYear();
            iMonth = d.getMonth() + 1;
            iDay = d.getDate();
        }
    }

    const htmlContent = `
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
          
          /* 직인 이미지 스타일 - 실제 크기(약 2.4cm)에 맞게 조정 */
          .seal-img { 
            position: absolute; 
            top: 50%; 
            left: 50%; 
            transform: translate(-50%, -50%); 
            width: 90px; 
            height: 90px; 
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
          
          <div class="serial-box">일련번호 ${record.serialNumber || ''}</div>
          
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
              <td>${saint.name}</td>
              <td class="label-cell">주민등록번호<br>(사업자등록번호)</td>
              <td>${saint.juminNo || ''}</td>
            </tr>
            <tr>
              <td class="label-cell">주소(소재지)</td>
              <td colspan="3">${saint.address || ''}</td>
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
                <td class="center">${record.targetYear}.1.1~12.31</td>
                <td class="center">헌금 등</td>
                <td class="center"></td>
                <td class="center"></td>
                <td class="right">${record.amount.toLocaleString()}</td>
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

          <div class="date-row">${iYear}년 ${iMonth}월 ${iDay}일</div>
          
          <div class="sign-row">
            <span class="sign-label">신청인</span>
            <span class="sign-name">${saint.name}</span>
            <span>(서명 또는 인)</span>
          </div>
          
          <div style="border-bottom: 1px dashed #000; margin: 10px 0;"></div>

          <div class="declaration">
            위와 같이 기부금을 기부받았음을 증명합니다.
          </div>

          <div class="date-row">${iYear}년 ${iMonth}월 ${iDay}일</div>

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

    const printWindow = window.open('', '_blank', 'width=900,height=900');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.write('<script>window.onload = function() { window.print(); window.close(); }</script>');
      printWindow.document.close();
    }
  };

  const totalAmount = filteredDonations.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="w-full md:w-auto">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
            <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            기부금 발급내역
          </h2>
          <p className="text-sm text-gray-500 mt-1">총 <span className="font-bold text-teal-600">{filteredDonations.length}</span>건 / 합계: <span className="font-bold text-teal-600">₩ {totalAmount.toLocaleString()}</span></p>
        </div>
        
        <div className="w-full md:w-auto flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <select 
            value={yearFilter} 
            onChange={(e) => setYearFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm"
          >
             <option value="all">전체 귀속년도</option>
             {[...Array(5)].map((_, i) => {
              const y = new Date().getFullYear() - i;
              return <option key={y} value={y.toString()}>{y}년</option>;
            })}
          </select>

          <input 
            type="text" 
            placeholder="성명 검색" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 flex-1 md:w-48 text-sm"
          />

          <button 
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className={`flex items-center justify-center gap-1 px-3 py-2 rounded text-sm font-medium transition-colors ${isRefreshing ? 'bg-gray-200 text-gray-500' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden flex-1">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 font-bold w-32 whitespace-nowrap">발급일자</th>
                <th className="px-6 py-3 font-bold w-28 text-center whitespace-nowrap">일련번호</th>
                <th className="px-6 py-3 font-bold w-24 text-center whitespace-nowrap">귀속년도</th>
                <th className="px-6 py-3 font-bold w-32 whitespace-nowrap">성명</th>
                <th className="px-6 py-3 font-bold whitespace-nowrap">발급금액</th>
                <th className="px-6 py-3 font-bold text-right whitespace-nowrap">발급기관</th>
                <th className="px-6 py-3 font-bold w-28 text-center whitespace-nowrap">영수증 인쇄</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDonations.length > 0 ? (
                filteredDonations.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 bg-white">
                    <td className="px-6 py-4 text-gray-600 font-mono whitespace-nowrap">{formatDate(d.issueDate)}</td>
                    <td className="px-6 py-4 text-center text-indigo-600 font-mono font-medium whitespace-nowrap">
                       {d.serialNumber || '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-gray-100 text-gray-800 text-xs font-semibold px-2 py-1 rounded">
                        {d.targetYear}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900 whitespace-nowrap">{d.saintName}</td>
                    <td className="px-6 py-4 text-teal-700 font-bold whitespace-nowrap">
                      ₩ {d.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-500 text-xs whitespace-nowrap">
                      {d.issuer}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => handlePrint(d)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded px-3 py-1 text-xs flex items-center justify-center gap-1 mx-auto transition-colors whitespace-nowrap"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                        인쇄
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <p>발급 내역이 없습니다.</p>
                    <p className="text-xs text-gray-400 mt-1">영수증을 인쇄하면 이곳에 기록됩니다.</p>
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

export default DonationHistory;