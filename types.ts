
export enum TransactionType {
  INCOME = '수입',
  EXPENSE = '지출',
}

export interface AccountCode {
  code: string;
  name: string;
  type: TransactionType;
}

export interface Member {
  id: string;
  name: string;
  position: string;
}

export interface Saint {
  id: string;
  name: string;
  juminNo?: string;
  position?: string;
  phone?: string;
  address?: string;
  email?: string;
  note?: string;
}

export interface DonationRecord {
  id: string;
  issueDate: string;
  targetYear: number;
  saintName: string;
  saintId: string;
  amount: number;
  issuer: string;
  serialNumber: string;
}

export interface ApprovalLineItem {
  role: string;
  name: string;
  signUrl?: string;
  id?: string;        // 시트 D열
  password?: string;  // 시트 E열
}

export interface User {
  id: string;
  name: string;
  role: string;
  signUrl?: string;
}

export interface ChurchInfo {
  name: string;
  registrationNumber: string;
  address: string;
  representative: string;
  phoneNumber?: string;
  sealUrl?: string;
  initialCarryover?: number;
}

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  category: string;
  amount: number;
  description: string;
  vendor?: string;
  spender?: string;
  evidenceUrl?: string;
  approvals: {
    pic: boolean;      // 담당
    secGen: boolean;   // 사무국장
    director: boolean; // 원장
  };
}

export interface AppData {
  transactions: Transaction[];
  accountCodes: AccountCode[];
  accountCategories: {
    income: string[];
    expense: string[];
  };
  members: Member[];
  saints: Saint[];
  donations: DonationRecord[];
  churchInfo: ChurchInfo;
  approvalLine: ApprovalLineItem[];
}
