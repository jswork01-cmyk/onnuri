
/**
 * 정심작업장 온누리상품권 관리시스템 전용 Google Apps Script v2.6
 * [파일 업로드 후 공유 권한 설정 보강]
 */

function doGet(e) {
  const action = e.parameter.action;
  if (action === 'getData') return getData();
  return ContentService.createTextOutput("Invalid Action");
}

function doPost(e) {
  let action = e.parameter.action;
  let dataStr = e.parameter.data;
  
  if (!action && e.postData && e.postData.contents) {
    try {
      const body = JSON.parse(e.postData.contents);
      action = body.action;
      dataStr = body.data;
    } catch (err) {}
  }

  if (action === 'addTransaction') return addTransaction(dataStr);
  if (action === 'updateTransaction') return updateTransaction(dataStr);
  if (action === 'uploadFile') return uploadFile(dataStr);
  return ContentService.createTextOutput("Invalid Action");
}

/**
 * Base64 이미지 데이터를 구글 드라이브에 저장하고 링크를 반환합니다.
 */
function uploadFile(dataStr) {
  try {
    const payload = JSON.parse(dataStr); 
    const folderId = payload.folderId || '1hsad5HGXK4qGu1Sf0FLvyp2R67MGHskc';
    const folder = DriveApp.getFolderById(folderId);
    
    // Base64 데이터 파싱
    const splitData = payload.base64.split(',');
    const contentType = splitData[0].split(':')[1].split(';')[0];
    const bytes = Utilities.base64Decode(splitData[1]);
    const blob = Utilities.newBlob(bytes, contentType, payload.fileName);
    
    // 파일 생성
    const file = folder.createFile(blob);
    
    // 외부 링크 공유 설정 (반드시 필요)
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {
      // 일부 환경에서 권한 설정 에러가 날 수 있으나 파일은 생성됨
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      result: "success",
      id: file.getId(),
      url: file.getUrl() // https://drive.google.com/file/d/ID/view... 형태
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      result: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const result = {};

  // Info 시트
  const infoSheet = ss.getSheetByName('Info');
  result.churchInfo = {};
  if (infoSheet) {
    infoSheet.getDataRange().getValues().forEach(r => {
      if (r[0]) result.churchInfo[r[0]] = r[1];
    });
  }

  // Approval 시트
  const approvalSheet = ss.getSheetByName('Approval');
  result.approvalLine = [];
  if (approvalSheet) {
    const rows = approvalSheet.getDataRange().getValues();
    rows.shift();
    rows.forEach(r => {
      if (r[0] || r[1]) {
        result.approvalLine.push({ 
          name: r[0] ? r[0].toString().trim() : '', 
          role: r[1] ? r[1].toString().trim() : '', 
          signUrl: r[2] ? r[2].toString().trim() : '',
          id: r[3] ? r[3].toString().trim() : '',
          password: r[4] ? r[4].toString().trim() : ''
        });
      }
    });
  }

  // Account 시트
  const accountSheet = ss.getSheetByName('Account');
  const incomeCat = [], expenseCat = [];
  if (accountSheet) {
    const rows = accountSheet.getDataRange().getValues();
    rows.shift();
    rows.forEach(r => {
      if (r[0]) incomeCat.push(r[0].toString().trim());
      if (r[1]) expenseCat.push(r[1].toString().trim());
    });
  }
  result.accountCategories = { income: incomeCat, expense: expenseCat };

  // Transactions 시트
  const transSheet = ss.getSheetByName('Transactions');
  result.transactions = [];
  if (transSheet) {
    const rows = transSheet.getDataRange().getValues();
    rows.shift();
    rows.forEach((r, i) => {
      if (r[1] && r[4]) {
        let approvals = { pic: false, secGen: false, director: false };
        try { if(r[9]) approvals = JSON.parse(r[9]); } catch(e) {}
        result.transactions.push({
          id: r[0] ? r[0].toString() : 't_' + i,
          date: formatDate(r[1]),
          type: r[2],
          category: r[3],
          amount: Number(r[4]),
          description: r[5],
          vendor: r[6],
          spender: r[7],
          evidenceUrl: r[8],
          approvals: approvals
        });
      }
    });
  }

  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function addTransaction(dataStr) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Transactions');
  const data = JSON.parse(dataStr);
  sheet.appendRow([
    data.id, 
    data.date, 
    data.type, 
    data.category, 
    data.amount, 
    data.description, 
    data.vendor, 
    data.spender, 
    data.evidenceUrl || '', 
    JSON.stringify(data.approvals)
  ]);
  return ContentService.createTextOutput(JSON.stringify({result: "success"})).setMimeType(ContentService.MimeType.JSON);
}

function updateTransaction(dataStr) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Transactions');
  const data = JSON.parse(dataStr);
  const rows = sheet.getDataRange().getValues();
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0].toString() === data.id.toString()) {
      sheet.getRange(i + 1, 10).setValue(JSON.stringify(data.approvals));
      break;
    }
  }
  return ContentService.createTextOutput(JSON.stringify({result: "success"})).setMimeType(ContentService.MimeType.JSON);
}

function formatDate(date) {
  if (!date) return '';
  try {
    if (Object.prototype.toString.call(date) === '[object Date]') return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd");
    return String(date).substring(0, 10);
  } catch (e) { return String(date); }
}
