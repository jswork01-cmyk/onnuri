
import React, { useState, useEffect } from 'react';
import { getScriptUrl, setScriptUrl, fetchInitialData, formatGoogleDriveLink } from '../services/sheetService';
import { AppData } from '../types';

interface SettingsProps {
  data: AppData | null;
}

const Settings: React.FC<SettingsProps> = ({ data }) => {
  const [url, setUrl] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    setUrl(getScriptUrl());
    if (data?.churchInfo?.name && !data.churchInfo.name.includes('(데모)')) {
      setConnectionStatus('success');
      setStatusMessage('시스템 자동 동기화 완료 (info, members, approval, data)');
    }
  }, [data]);

  const handleTestConnection = async () => {
    setConnectionStatus('loading');
    setScriptUrl(url); 
    
    try {
      const result = await fetchInitialData();
      if (result && result.churchInfo && !result.churchInfo.name.includes('(데모)')) {
        setConnectionStatus('success');
        setStatusMessage('시스템 자동 동기화 완료 (info, members, approval, data)');
        if(window.confirm("연동에 성공했습니다. 데이터를 적용하기 위해 새로고침 하시겠습니까?")) {
            window.location.reload();
        }
      } else {
        setConnectionStatus('error');
        setStatusMessage('연동 실패: 올바른 데이터 형식이 아니거나 데모 데이터로 전환되었습니다.');
      }
    } catch (e) {
      setConnectionStatus('error');
      setStatusMessage('네트워크 오류 또는 잘못된 URL입니다.');
    }
  };

  const handleSync = () => {
    window.location.reload();
  };

  const approvalLine = data?.approvalLine || [];
  const orgInfo = data?.churchInfo;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <h2 className="text-2xl font-bold text-gray-800">시스템 설정</h2>

      {/* 1. Organization Info Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
           <h3 className="text-lg font-bold text-gray-800">기관 정보 (info 시트)</h3>
           <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
             구글 시트 [Info] 탭과 실시간 연동됩니다.
           </p>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">기관명(상호)</label>
              <input type="text" readOnly value={orgInfo?.name || ''} className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-3 text-gray-800 focus:outline-none font-medium" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">대표자</label>
              <input type="text" readOnly value={orgInfo?.representative || ''} className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-3 text-gray-800 focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">고유번호</label>
              <input type="text" readOnly value={orgInfo?.registrationNumber || ''} className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-3 text-gray-800 focus:outline-none font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">전화번호</label>
              <input type="text" readOnly value={orgInfo?.phoneNumber || ''} className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-3 text-gray-800 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">주소</label>
            <input type="text" readOnly value={orgInfo?.address || ''} className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-3 text-gray-800 focus:outline-none" />
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="text-sm font-bold text-blue-800 mb-2">💰 상품권 회계 기초 이월금 설정</h4>
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1 text-sm text-blue-800">
                구글 시트 <strong>Info</strong> 탭에 아래 값을 추가하면 시스템 시작 잔액으로 반영됩니다.
                <ul className="list-disc list-inside mt-1 ml-2 text-blue-700">
                  <li>A열: <strong>initialCarryover</strong></li>
                  <li>B열: <strong>금액 (숫자만 입력)</strong></li>
                </ul>
              </div>
              <div className="w-full md:w-1/3">
                <label className="block text-xs font-semibold text-blue-700 mb-1">현재 적용된 이월금</label>
                <div className="bg-white border border-blue-300 rounded px-3 py-2 text-right font-bold text-gray-800">
                  ₩ {orgInfo?.initialCarryover ? Number(orgInfo.initialCarryover).toLocaleString() : '0'}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
             <div>
               <label className="block text-sm font-medium text-gray-500 mb-2">기관 직인 (이미지 URL)</label>
               <input type="text" readOnly value={orgInfo?.sealUrl || ''} placeholder="시트 info탭에 sealUrl을 입력하세요" className="w-full bg-gray-50 border border-gray-200 rounded-md px-4 py-3 text-gray-800 focus:outline-none text-sm" />
               <p className="text-xs text-gray-400 mt-1">* 수입/지출결의서 및 보고서 출력 시 사용됩니다.</p>
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-500 mb-2">직인 미리보기</label>
               <div className="w-24 h-24 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden relative">
                 {orgInfo?.sealUrl ? (
                   <img src={formatGoogleDriveLink(orgInfo.sealUrl)} alt="직인" className="max-w-full max-h-full object-contain" />
                 ) : (
                   <span className="text-xs text-gray-400">이미지 없음</span>
                 )}
               </div>
             </div>
          </div>
        </div>
      </div>

      {/* 2. Google Script Connection Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-amber-50/50">
          <h3 className="text-lg font-bold text-amber-600 flex items-center gap-2">
            ⚡ 구글 앱스 스크립트 엔진 연동
          </h3>
        </div>
        
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
             구글 시트의 <strong>[확장 프로그램] &gt; [Apps Script]</strong>에 배포된 웹 앱 URL입니다.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <input 
              type="url" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/..." 
              className="flex-1 border border-gray-300 rounded-md px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <button 
              onClick={handleTestConnection}
              disabled={connectionStatus === 'loading'}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-2.5 rounded-md text-sm whitespace-nowrap flex items-center gap-2 justify-center disabled:opacity-70"
            >
              {connectionStatus === 'loading' ? '연결 중...' : '🔄 연결 및 동기화'}
            </button>
          </div>

          {connectionStatus === 'success' && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-md flex items-center gap-2 text-sm">
              <span className="bg-green-100 text-green-600 rounded-full p-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg></span>
              <span className="font-semibold">{statusMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Approval Line Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            결재라인 설정 (Approval 시트)
          </h3>
        </div>
        
        <div className="p-6">
           <div className="overflow-x-auto border border-gray-200 rounded-lg">
             <table className="w-full text-sm text-left text-gray-600">
               <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                 <tr>
                   <th className="px-6 py-3 font-bold">성명 (A열)</th>
                   <th className="px-6 py-3 font-bold">직책 (B열)</th>
                   <th className="px-6 py-3 font-bold text-center">서명 이미지</th>
                 </tr>
               </thead>
               <tbody>
                 {approvalLine.length > 0 ? (
                   approvalLine.map((item, index) => (
                     <tr key={index} className="bg-white border-b hover:bg-gray-50">
                       <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                       <td className="px-6 py-4 font-bold text-slate-800">{item.role}</td>
                       <td className="px-6 py-2 text-center">
                         {item.signUrl ? (
                           <img src={formatGoogleDriveLink(item.signUrl)} alt="서명" className="h-8 mx-auto object-contain" />
                         ) : (
                           <span className="text-xs text-gray-300">미등록</span>
                         )}
                       </td>
                     </tr>
                   ))
                 ) : (
                   <tr>
                     <td colSpan={3} className="px-6 py-8 text-center text-gray-400">
                       등록된 결재라인이 없습니다.
                     </td>
                   </tr>
                 )}
               </tbody>
             </table>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
