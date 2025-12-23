
import React, { useMemo, useState } from 'react';
import { AppData, TransactionType } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface DashboardProps {
  data: AppData;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedPerson] = useState('');

  const transactions = data.transactions || [];

  const summary = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    const incomeByCategory: Record<string, number> = {};
    const expenseByCategory: Record<string, number> = {};

    transactions.forEach(t => {
      const tDate = t.date.substring(0, 10);
      if (tDate < startDate || tDate > endDate) return;

      if (t.type === TransactionType.INCOME) {
        totalIncome += t.amount;
        incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.amount;
      } else {
        totalExpense += t.amount;
        expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
      }
    });

    const incomeChartData = Object.entries(incomeByCategory).map(([name, value]) => ({ name, value }));
    const expenseChartData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }));

    return { totalIncome, totalExpense, incomeChartData, expenseChartData };
  }, [transactions, startDate, endDate]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">온누리상품권 재정 현황판</h2>
        <div className="flex items-center gap-2 bg-white p-2 rounded shadow-sm border">
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-sm border-none focus:ring-0" />
          <span className="text-gray-400">~</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-sm border-none focus:ring-0" />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-indigo-100">
          <h3 className="text-xs font-bold text-gray-400 uppercase">총 수입 (상품권/기타)</h3>
          <p className="mt-2 text-2xl font-black text-indigo-600">₩ {summary.totalIncome.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-rose-100">
          <h3 className="text-xs font-bold text-gray-400 uppercase">총 지출</h3>
          <p className="mt-2 text-2xl font-black text-rose-600">₩ {summary.totalExpense.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-emerald-100">
          <h3 className="text-xs font-bold text-gray-400 uppercase">현재 잔액</h3>
          <p className="mt-2 text-2xl font-black text-emerald-600">₩ {(summary.totalIncome - summary.totalExpense).toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border h-80">
          <h3 className="text-sm font-bold mb-4">수입 구성 (항목별)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={summary.incomeChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label={({name}) => name}>
                {summary.incomeChartData.map((_, idx) => <Cell key={`c-${idx}`} fill={COLORS[idx % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => `₩${v.toLocaleString()}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border h-80">
          <h3 className="text-sm font-bold mb-4">지출 분석 (항목별)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summary.expenseChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12}} />
              <Tooltip formatter={(v: number) => `₩${v.toLocaleString()}`} />
              <Bar dataKey="value" fill="#f87171" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
