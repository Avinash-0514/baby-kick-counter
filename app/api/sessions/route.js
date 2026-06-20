import { NextResponse } from 'next/server';
import { ensureSchema, getSql } from '@/lib/db';

function validatePeriod(period) {
  return ['morning', 'afternoon', 'evening'].includes(period);
}

function getDateInTimeZone(dateValue, timeZone = 'Pacific/Auckland') {
  const date = new Date(dateValue);

  const parts = new Intl.DateTimeFormat('en-NZ', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

export async function GET(request) {
  try {
    await ensureSchema();
    const sql = getSql();

    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
      return NextResponse.json(
        { error: 'deviceId is required' },
        { status: 400 }
      );
    }

    const rows = await sql`
      SELECT
        id,
        device_id,
        session_date,
        session_period,
        start_time,
        end_time,
        total_kicks,
        duration_seconds,
        feeling,
        note,
        time_zone,
        created_at
      FROM kick_sessions
      WHERE device_id = ${deviceId}
      ORDER BY session_date DESC, created_at DESC
      LIMIT 50;
    `;

    return NextResponse.json({ sessions: rows });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
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
      kickEvents = [],
      timeZone = 'Pacific/Auckland',
    } = body;

    if (!deviceId) {
      return NextResponse.json(
        { error: 'deviceId is required' },
        { status: 400 }
      );
    }

    if (!validatePeriod(sessionPeriod)) {
      return NextResponse.json(
        { error: 'sessionPeriod must be morning, afternoon, or evening' },
        { status: 400 }
      );
    }

    if (
      !startTime ||
      !endTime ||
      typeof totalKicks !== 'number' ||
      typeof durationSeconds !== 'number'
    ) {
      return NextResponse.json(
        {
          error:
            'startTime, endTime, totalKicks, and durationSeconds are required',
        },
        { status: 400 }
      );
    }

    const sessionDate = getDateInTimeZone(startTime, timeZone);

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
        note,
        time_zone
      )
      VALUES (
        ${deviceId},
        ${sessionDate},
        ${sessionPeriod},
        ${startTime},
        ${endTime},
        ${totalKicks},
        ${durationSeconds},
        ${feeling},
        ${note},
        ${timeZone}
      )
      RETURNING id;
    `;

    const sessionId = inserted[0].id;

    for (const event of kickEvents) {
      await sql`
        INSERT INTO kick_events (
          session_id,
          kick_number,
          kicked_at
        )
        VALUES (
          ${sessionId},
          ${event.kickNumber},
          ${event.timestamp}
        );
      `;
    }

    return NextResponse.json({
      success: true,
      sessionId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}