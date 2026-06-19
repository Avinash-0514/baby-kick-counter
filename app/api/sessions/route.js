import { NextResponse } from 'next/server';
import { ensureSchema, getSql } from '@/lib/db';
import { neon } from "@neondatabase/serverless";


function validatePeriod(period) {
  return ['morning', 'afternoon', 'evening'].includes(period);
}

export async function GET(request) {
  try {
    await ensureSchema();
    const sql = getSql();
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
      return NextResponse.json({ error: 'deviceId is required' }, { status: 400 });
    }

    const rows = await sql`
      SELECT
        id,
        session_date,
        session_period,
        start_time,
        end_time,
        total_kicks,
        duration_seconds,
        feeling,
        note,
        created_at
      FROM kick_sessions
      WHERE device_id = ${deviceId}
      ORDER BY session_date DESC, created_at DESC
      LIMIT 50;
    `;

    return NextResponse.json({ sessions: rows });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await ensureSchema();
    const sql = getSql();
    const body = await request.json();

    const {
      deviceId,
      sessionPeriod,
      startTime,
      endTime,
      totalKicks,
      durationSeconds,
      feeling = 'normal',
      note = '',
      kickEvents = []
    } = body;

    if (!deviceId) {
      return NextResponse.json({ error: 'deviceId is required' }, { status: 400 });
    }

    if (!validatePeriod(sessionPeriod)) {
      return NextResponse.json({ error: 'sessionPeriod must be morning, afternoon, or evening' }, { status: 400 });
    }

    if (!startTime || !endTime || typeof totalKicks !== 'number' || typeof durationSeconds !== 'number') {
      return NextResponse.json({ error: 'startTime, endTime, totalKicks, and durationSeconds are required' }, { status: 400 });
    }

    const inserted = await sql`
      INSERT INTO kick_sessions (
        device_id,
        session_date,
        session_period,
        start_time,
        end_time,
        total_kicks,
        duration_seconds,
        feeling,
        note
      )
      VALUES (
        ${deviceId},
        ${new Date(startTime).toISOString().slice(0, 10)},
        ${sessionPeriod},
        ${startTime},
        ${endTime},
        ${totalKicks},
        ${durationSeconds},
        ${feeling},
        ${note}
      )
      RETURNING id;
    `;

    const sessionId = inserted[0].id;

    for (const event of kickEvents) {
      await sql`
        INSERT INTO kick_events (session_id, kick_number, kicked_at)
        VALUES (${sessionId}, ${event.kickNumber}, ${event.timestamp});
      `;
    }

    return NextResponse.json({ success: true, sessionId });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
