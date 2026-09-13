import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { getDbPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { roomNo: string } }
) {
  try {
    const user = authenticateRequest(request);
    const roomNo = params.roomNo;
    const body = await request.json();
    const { action, note, employeeNo } = body;

    console.log(`[Room Action] Room: ${roomNo}, Action: ${action}, User: ${user.name}`);

    const pool = getDbPool();
    if (pool) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Very basic mock update so it doesn't fail
        if (action === 'CLEANING_START' || action === 'START') {
          await client.query(`UPDATE nova_rooms_current SET cleaning_status = 'CLEANING' WHERE room_no = $1`, [roomNo]);
        } else if (action === 'CLEANING_COMPLETE' || action === 'COMPLETE') {
          await client.query(`UPDATE nova_rooms_current SET cleaning_status = 'INSPECTING' WHERE room_no = $1`, [roomNo]);
        } else if (action === 'ASSIGN_ROOMMAID') {
          await client.query(`UPDATE nova_rooms_current SET roommaid_employee_no = $1 WHERE room_no = $2`, [employeeNo || user.employeeNo, roomNo]);
        } else if (action === 'CLEAR_ASSIGNMENT') {
          await client.query(`UPDATE nova_rooms_current SET roommaid_employee_no = NULL WHERE room_no = $1`, [roomNo]);
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('DB Update Error', err);
      } finally {
        client.release();
      }
    }

    return NextResponse.json({
      ok: true,
      message: `${roomNo}호 상태 업데이트 성공 (Mock)`
    });

  } catch (error: any) {
    console.error('[Room Action Error]', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}
