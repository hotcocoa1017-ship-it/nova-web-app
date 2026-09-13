import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const site = searchParams.get('site');
    const startMonth = searchParams.get('startMonth'); // YYYY-MM
    
    if (!site || !startMonth) {
      return NextResponse.json({ ok: false, message: 'site와 startMonth 파라미터가 필요합니다.' }, { status: 400 });
    }

    const startDate = `${startMonth}-01`;
    // 해당 달의 마지막 날짜 구하기 (간단한 처리)
    const [year, month] = startMonth.split('-');
    const endDate = new Date(Number(year), Number(month), 0).toISOString().split('T')[0];

    const pool = getDbPool();
    if (!pool) {
      return NextResponse.json({ ok: false, message: 'DB 연결 오류' }, { status: 500 });
    }

    // QM 점검 이력(INSPECTION_COMPLETED, INSPECTION_REWORK) 가져오기
    const query = `
      SELECT 
        id, 
        room_no as "roomNo", 
        business_date as "businessDate", 
        action, 
        employee_no as "employeeNo", 
        detail->>'userName' as "userName",
        detail->'photos' as photos,
        created_at as "createdAt"
      FROM nova_room_events
      WHERE site = $1 
        AND business_date >= $2 
        AND business_date <= $3
        AND action IN ('INSPECTION_COMPLETED', 'INSPECTION_REWORK')
      ORDER BY business_date DESC, created_at DESC
    `;

    const { rows } = await pool.query(query, [site, startDate, endDate]);

    return NextResponse.json({ ok: true, data: rows });
  } catch (error: any) {
    console.error('Monthly history fetch error:', error);
    return NextResponse.json({ ok: false, message: '데이터를 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
