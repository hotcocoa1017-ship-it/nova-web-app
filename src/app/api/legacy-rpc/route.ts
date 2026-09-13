import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';
import { createNovaSessionToken, RBAC_PERMISSIONS_TABLE, authenticateRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      acc[camelKey] = toCamelCase(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { func, args } = body;
    console.log('[Legacy RPC Request]', func);

    if (func === 'loginNovaBootstrap') {
      const [name, employeeNo, clientType, site, isMobile] = args;
      const empUpper = String(employeeNo).toUpperCase();
      let role = 'ROOM_MAID';
      if (empUpper.startsWith('QM') || name === 'QM') role = 'QM';
      else if (empUpper.startsWith('ADMIN') || name.includes('관리자')) role = 'ADMIN';
      else if (empUpper.startsWith('ORDER') || name.includes('오더')) role = 'ORDER';
      else if (empUpper.startsWith('MGR') || name.includes('지배인')) role = 'MANAGER';
      
      const pool = getDbPool();
      if (pool) {
        const client = await pool.connect();
        try {
          const { rows } = await client.query(`SELECT role FROM public.nova_users WHERE employee_no = $1`, [employeeNo]);
          if (rows[0] && rows[0].role) {
            role = rows[0].role;
            if (role === 'SUPER_ADMIN') role = 'ADMIN';
          }
        } catch (e) {} finally { client.release(); }
      }

      const user = {
        employeeNo: String(employeeNo),
        name: String(name),
        role: role as any,
        enabled: true,
        defaultSite: 'SORA',
        allowedSites: ['SORA']
      };
      const token = createNovaSessionToken(user);

      const commonMenu = [{ id: 'home', label: '홈' }];
      const roleMenus: any = {
        ADMIN: [
          { id: 'indicator', label: '통합 인디케이터' },
          { id: 'departure', label: '퇴실지연' },
          { id: 'monthly', label: '월별조회' },
          { id: 'roommaidStats', label: '룸메이드 실적' },
          { id: 'roommaidClose', label: '룸메이드 마감일지' },
          { id: 'adminMetrics', label: '운영 성과지표' },
          { id: 'shifts', label: '근무조 관리' },
          { id: 'qmChecklist', label: 'QM 체크리스트' },
          { id: 'settings', label: '설정' }
        ],
        ORDER: [
          { id: 'indicator', label: '통합 인디케이터' },
          { id: 'departure', label: '퇴실지연' },
          { id: 'monthly', label: '월별조회' },
          { id: 'roommaidStats', label: '룸메이드 실적' },
          { id: 'roommaidClose', label: '룸메이드 마감일지' },
          { id: 'shifts', label: '근무조 관리' },
          { id: 'qmChecklist', label: 'QM 체크리스트' },
          { id: 'settings', label: '설정' }
        ],
        MANAGER: [
          { id: 'indicator', label: '통합 인디케이터' },
          { id: 'settings', label: '설정' }
        ],
        QM: [{ id: 'qm', label: 'QM 점검' }, { id: 'settings', label: '설정' }],
        ROOM_MAID: [{ id: 'cleaning', label: '오늘의 정비' }, { id: 'roommaidStats', label: '내 정비실적' }, { id: 'settings', label: '설정' }]
      };
      
      const menu = commonMenu.concat(roleMenus[role] || roleMenus['ROOM_MAID']);
      const defaultMenu = role === 'ADMIN' || role === 'ORDER' || role === 'MANAGER' ? 'indicator' : (role === 'QM' ? 'qm' : 'home');
      
      return NextResponse.json({
        ok: true,
        result: {
          ok: true,
          token,
          bootstrap: {
            ok: true,
            app: { version: '2.0.0 (Cloud Run)', businessDate: new Date().toISOString().split('T')[0] },
            user: { role: user.role, sessionSite: site || 'SORA', name: user.name, job: user.role },
            realtimeConfig: {
              ok: true,
              enabled: true,
              apiBase: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'https://nova-web-app' : 'https://nova-web-app',
              qmDraftDbFirstEnabled: true
            },
            menu,
            defaultMenu
          }
        }
      });
    }

    if (func === 'getMobileSnapshot' || func === 'getIndicatorSnapshot') {
      const pool = getDbPool();
      let rooms = [];
      if (pool) {
        const client = await pool.connect();
        try {
          const result = await client.query(`SELECT * FROM nova_rooms_current WHERE site = 'SORA' LIMIT 100`);
          rooms = toCamelCase(result.rows).map((r: any) => ({
            ...r,
            roomStatus: r.roomStatus || 'STOCK',
            cleaningStatus: r.cleaningStatus || 'WAITING',
            roommaidEmployeeNo: r.roommaidEmployeeNo || null
          }));
        } catch (e) {
          console.error('DB Error', e);
        } finally {
          client.release();
        }
      }
      return NextResponse.json({
        ok: true,
        result: {
          ok: true,
          version: Date.now(),
          selection: { businessDate: new Date().toISOString().split('T')[0], site: 'SORA' },
          rooms,
          orders: [],
          performance: { elapsedMs: 10 }
        }
      });
    }

    if (func === 'startQmInspection') {
      return NextResponse.json({
        ok: true,
        result: {
          ok: true,
          checklist: {
            revision: '1.0',
            places: [
              { code: 'ENTRANCE', label: '현관', order: 1 },
              { code: 'BATH', label: '욕실', order: 2 },
              { code: 'BED', label: '침실', order: 3 }
            ],
            items: [
              { id: 'CHK-01', placeCode: 'ENTRANCE', label: '바닥 청소 상태', type: 'PASS_FAIL' },
              { id: 'CHK-02', placeCode: 'BATH', label: '수건 비치 상태', type: 'PASS_FAIL' },
              { id: 'CHK-03', placeCode: 'BED', label: '침구류 오염 여부', type: 'PASS_FAIL' }
            ]
          },
          draft: {
            draftId: `DRAFT-${Date.now()}`,
            answers: [],
            defects: [],
            dbVersion: 1
          }
        }
      });
    }

    // Default mock
    return NextResponse.json({ 
      ok: true, 
      result: { ok: true, message: `Mocked ${func}` } 
    });

  } catch (error: any) {
    console.error('[Legacy RPC Error]', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
