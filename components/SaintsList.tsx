
import React, { useState } from 'react';
import { AppData } from '../types';

interface SaintsListProps {
  data: AppData;
}

const SaintsList: React.FC<SaintsListProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const saints = data.saints || [];
  
  const filteredSaints = saints.filter(s => 
    (s.name && s.name.includes(searchTerm)) || 
    (s.position && s.position.includes(searchTerm)) ||
    (s.phone && s.phone.includes(searchTerm))
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 no-print">
        <div>
           <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
             대상자(이용자) 명단
           </h2>
           <p className="text-sm text-gray-500 mt-1">총 인원: <span className="font-bold text-indigo-600">{filteredSaints.length}</span>명</p>
        </div>
        
        <div className="w-full md:w-auto flex gap-2">
          <div className="relative flex-1 md:w-64">
            <input 
              type="text" 
              placeholder="이름, 직책, 연락처 검색" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-md py-2 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          <button 
            onClick={handlePrint}
            className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md flex items-center gap-2 whitespace-nowrap text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
            명단 출력
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden flex-1 print:shadow-none print:border-none">
        <div className="hidden print:block text-center mb-6 pt-4">
           <h1 className="text-2xl font-bold mb-2">{data.churchInfo?.name} 대상자 명단</h1>
           <p className="text-sm text-gray-500">출력일: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-600 print:text-black">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b print:bg-gray-100">
              <tr>
                <th className="px-4 py-3 font-bold w-12 text-center whitespace-nowrap">No</th>
                <th className="px-4 py-3 font-bold w-20 whitespace-nowrap">성명</th>
                <th className="px-4 py-3 font-bold w-32 whitespace-nowrap">고유/주민번호</th>
                <th className="px-4 py-3 font-bold w-24 whitespace-nowrap">직책/구분</th>
                <th className="px-4 py-3 font-bold w-32 whitespace-nowrap">연락처</th>
                <th className="px-4 py-3 font-bold min-w-[150px]">주소</th>
                <th className="px-4 py-3 font-bold w-24 whitespace-nowrap">비고</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSaints.length > 0 ? (
                filteredSaints.map((saint, index) => (
                  <tr key={saint.id || index} className="hover:bg-gray-50 bg-white">
                    <td className="px-4 py-4 text-center text-gray-400 whitespace-nowrap">{index + 1}</td>
                    <td className="px-4 py-4 font-bold text-gray-900 whitespace-nowrap">{saint.name}</td>
                    <td className="px-4 py-4 font-mono text-xs text-gray-500 whitespace-nowrap">{saint.juminNo}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                        {saint.position || '일반'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-600 whitespace-nowrap">{saint.phone}</td>
                    <td className="px-4 py-4 text-xs">{saint.address}</td>
                    <td className="px-4 py-4 text-xs text-gray-400">{saint.note}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    명단 데이터가 없습니다. 구글 시트 'Saints' 탭을 확인하세요.
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

export default SaintsList;
