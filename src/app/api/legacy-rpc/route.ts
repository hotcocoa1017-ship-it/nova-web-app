import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { func, args } = body;

    // TODO: Implement actual handlers for legacy functions here
    console.log('[Legacy RPC]', func, args);

    // Mock fallback response for unimplemented functions to prevent UI crash
    return NextResponse.json({ ok: true, result: { fallback: true } });

  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
