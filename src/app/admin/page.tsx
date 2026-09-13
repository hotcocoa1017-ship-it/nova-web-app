'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 현재 월 설정 (YYYY-MM)
  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('nova_user');
    if (!stored) {
      router.push('/');
      return;
    }
    const parsedUser = JSON.parse(stored);
    setUser(parsedUser);
    fetchHistory(parsedUser, selectedMonth);
  }, [router, selectedMonth]);

  const fetchHistory = async (currentUser: any, month: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/history/monthly?site=${currentUser.site}&startMonth=${month}`);
      const data = await res.json();
      if (data.ok) {
        setHistory(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-800 text-white p-4 sticky top-0 z-10 shadow-md">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <div>
            <h1 className="font-bold text-xl">NOVA 관리자 대시보드</h1>
            <p className="text-slate-300 text-sm">{user.site} · {user.name} 님 (월별조회)</p>
          </div>
          <button onClick={() => { localStorage.removeItem('nova_user'); router.push('/'); }} className="text-sm bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded font-bold transition-colors">
            로그아웃
          </button>
        </div>
      </header>

      <main className="p-4 max-w-6xl mx-auto mt-4 space-y-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
          <h2 className="font-bold text-lg text-slate-800">QM 점검 이력 (월별)</h2>
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-slate-300 rounded px-3 py-2 font-bold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-slate-500 outline-none"
          />
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500 font-bold text-lg animate-pulse">데이터를 빛의 속도로 불러오는 중... ⚡</div>
        ) : history.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-500 font-bold">
            해당 월에 기록된 점검 데이터가 없습니다.
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-sm uppercase tracking-wider">
                    <th className="p-4 font-bold border-b border-slate-200">영업일자</th>
                    <th className="p-4 font-bold border-b border-slate-200">객실번호</th>
                    <th className="p-4 font-bold border-b border-slate-200">점검자(QM)</th>
                    <th className="p-4 font-bold border-b border-slate-200">점검결과</th>
                    <th className="p-4 font-bold border-b border-slate-200 text-center">불량 사진</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {history.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-slate-700">{row.businessDate}</td>
                      <td className="p-4 font-bold text-slate-900 text-lg">{row.roomNo}</td>
                      <td className="p-4 text-slate-700">{row.userName} <span className="text-xs text-slate-400">({row.employeeNo})</span></td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${row.action === 'INSPECTION_COMPLETED' ? 'bg-teal-100 text-teal-700' : 'bg-red-100 text-red-700'}`}>
                          {row.action === 'INSPECTION_COMPLETED' ? '양호 (PASS)' : '불량 (REWORK)'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {row.photos && row.photos.length > 0 ? (
                          <button 
                            onClick={() => setSelectedPhoto(row.photos[0])}
                            className="bg-purple-100 hover:bg-purple-200 text-purple-700 font-bold py-1 px-3 rounded shadow-sm transition-colors text-sm"
                          >
                            📸 사진 보기
                          </button>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* 사진 모달 */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedPhoto(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold text-xl">불량 증빙 사진</h3>
              <button onClick={() => setSelectedPhoto(null)} className="text-white hover:text-slate-300 text-3xl">&times;</button>
            </div>
            <div className="flex-1 overflow-hidden rounded-xl bg-slate-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedPhoto} alt="QM 불량 사진" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
