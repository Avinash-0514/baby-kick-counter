import { NextResponse } from 'next/server';
import { ensureSchema, getSql } from '@/lib/db';

function secondsToMinutes(seconds) {
  return Math.round(Number(seconds || 0) / 60);
}

function makeMessage(todaySession, averageSeconds) {
  if (!todaySession) return 'No session recorded today.';
  if (!averageSeconds) return 'Saved. More sessions are needed to build a usual pattern.';

  const today = Number(todaySession.duration_seconds);
  const average = Number(averageSeconds);

  if (today > average * 1.5) {
    return 'Today took longer than your usual pattern. If movements feel reduced, weaker, stopped, or unusual, contact your midwife/doctor or maternity unit.';
  }

  if (today < average * 0.7) {
    return 'Today was quicker than your usual pattern.';
  }

  return 'Similar to your usual pattern.';
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

    const periods = ['morning', 'afternoon', 'evening'];
    const result = {};

    for (const period of periods) {
      const todayRows = await sql`
        SELECT *
        FROM kick_sessions
        WHERE device_id = ${deviceId}
          AND session_period = ${period}
          AND session_date = CURRENT_DATE
        ORDER BY created_at DESC
        LIMIT 1;
      `;

      const avgRows = await sql`
        SELECT AVG(duration_seconds) AS avg_duration_seconds,
               COUNT(*) AS total_sessions
        FROM (
          SELECT duration_seconds
          FROM kick_sessions
          WHERE device_id = ${deviceId}
            AND session_period = ${period}
          ORDER BY session_date DESC, created_at DESC
          LIMIT 7
        ) recent;
      `;

      const todaySession = todayRows[0] || null;
      const averageSeconds = avgRows[0]?.avg_duration_seconds || null;

      result[period] = {
        today: todaySession
          ? {
              totalKicks: todaySession.total_kicks,
              durationMinutes: secondsToMinutes(todaySession.duration_seconds),
              feeling: todaySession.feeling,
              note: todaySession.note
            }
          : null,
        averageMinutes: averageSeconds ? secondsToMinutes(averageSeconds) : null,
        totalRecentSessions: Number(avgRows[0]?.total_sessions || 0),
        message: makeMessage(todaySession, averageSeconds)
      };
    }

    return NextResponse.json({ analytics: result });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
