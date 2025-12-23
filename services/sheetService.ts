
import { AppData, Transaction, TransactionType, DonationRecord } from '../types';

const STORAGE_KEY = 'CHURCH_ACCOUNT_SCRIPT_URL';
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzS6RJuD7WAeBHZRL-E-YrSCHaL33X7joLjyNYiTx4IlxMR3-FJqUXRUGWXKwz74iVE/exec';

export const getScriptUrl = (): string => {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_SCRIPT_URL;
};

export const setScriptUrl = (url: string): void => {
  if (!url || url.trim() === '') {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, url.trim());
  }
};

/**
 * 구글 드라이브 링크를 직접 보기용(lh3) 링크로 변환합니다.
 * base64 데이터인 경우 변환을 건너뜁니다 (엑스박스 방지).
 */
export const formatGoogleDriveLink = (url: string | undefined): string => {
  if (!url) return '';
  if (url.startsWith('data:')) return url; // 이미 base64 데이터인 경우 그대로 반환
  if (url.includes('lh3.googleusercontent.com')) return url;
  if (!url.includes('google.com')) return url;
  
  let id = '';
  // /file/d/ID/view 형식 추출
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch && fileMatch[1]) {
    id = fileMatch[1];
  } else {
     // id=ID 형식 추출
     const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
     if (idMatch && idMatch[1]) {
       id = idMatch[1];
     }
  }

  if (id) {
    return `https://lh3.googleusercontent.com/d/${id}`;
  }
  return url;
};

/**
 * 이미지 파일을 구글 드라이브에 업로드하고 링크를 반환합니다.
 */
export const uploadEvidenceFile = async (base64Data: string, fileName: string): Promise<string | null> => {
  const scriptUrl = getScriptUrl();
  const FOLDER_ID = '1hsad5HGXK4qGu1Sf0FLvyp2R67MGHskc';
  
  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'uploadFile',
        data: JSON.stringify({
          base64: base64Data,
          fileName: fileName,
          folderId: FOLDER_ID
        })
      })
    });
    
    if (!response.ok) {
      console.error("Upload response not OK", response.status);
      return null;
    }

    const text = await response.text();
    try {
      const result = JSON.parse(text);
      if (result && result.result === 'success') {
        console.log("File uploaded successfully:", result.url);
        return result.url;
      }
      console.error("GAS returned error in JSON:", result);
    } catch (parseError) {
      console.error("Failed to parse GAS response text:", text);
    }
    return null;
  } catch (error) {
    console.error("File upload error during fetch:", error);
    return null;
  }
};

const sendGasRequest = async (action: string, dataPayload: any): Promise<boolean> => {
  const scriptUrl = getScriptUrl();
  try {
    const bodyPayload = {
      action: action,
      data: JSON.stringify(dataPayload)
    };

    await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors', 
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(bodyPayload)
    });
    return true;
  } catch (error) {
    console.error(`Error sending ${action} via GAS:`, error);
    return false;
  }
};

export const fetchInitialData = async (): Promise<AppData> => {
  const scriptUrl = getScriptUrl();
  const timestamp = new Date().getTime();
  const fetchUrl = `${scriptUrl}?action=getData&_t=${timestamp}`;

  try {
    const response = await fetch(fetchUrl);
    if (!response.ok) throw new Error('Network error');
    return await response.json();
  } catch (error) {
    return {
      churchInfo: { name: "정심작업장 (데모)", registrationNumber: "", address: "", representative: "" },
      transactions: [],
      accountCategories: { income: [], expense: [] },
      approvalLine: [],
      donations: [],
      members: [],
      saints: [],
      accountCodes: []
    };
  }
};

export const submitTransaction = async (transaction: Transaction): Promise<boolean> => {
  return await sendGasRequest('addTransaction', transaction);
};

export const updateTransactionStatus = async (transaction: Transaction): Promise<boolean> => {
  return await sendGasRequest('updateTransaction', transaction);
};

export const submitDonation = async (donation: DonationRecord): Promise<boolean> => {
  return await sendGasRequest('addDonation', donation);
};

export const sendDonationEmail = async (email: string, subject: string, htmlContent: string): Promise<boolean> => {
  const scriptUrl = getScriptUrl();
  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify({
        action: 'sendDonationEmail',
        data: JSON.stringify({
          to: email,
          subject: subject,
          body: htmlContent
        })
      })
    });
    
    const text = await response.text();
    const result = JSON.parse(text);
    return result.result === 'success';
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};
