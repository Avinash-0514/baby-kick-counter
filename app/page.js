'use client';

import { useEffect, useMemo, useState } from 'react';

const PERIODS = [
  { key: 'morning', label: 'Morning', time: '6:00 AM - 11:59 AM' },
  { key: 'afternoon', label: 'Afternoon', time: '12:00 PM - 5:59 PM' },
  { key: 'evening', label: 'Evening', time: '6:00 PM - 11:59 PM' }
];

function getDeviceId() {
  if (typeof window === 'undefined') return '';

  const existing = localStorage.getItem('babyKickDeviceId');
  if (existing) return existing;

  const id = crypto.randomUUID();
  localStorage.setItem('babyKickDeviceId', id);
  return id;
}

function formatTimer(seconds) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
}

function formatDuration(seconds) {
  const mins = Math.round(Number(seconds || 0) / 60);
  return `${mins} min`;
}

export default function Home() {
  const [deviceId, setDeviceId] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('morning');
  const [isCounting, setIsCounting] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [kickEvents, setKickEvents] = useState([]);
  const [feeling, setFeeling] = useState('normal');
  const [note, setNote] = useState('');
  const [sessions, setSessions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const totalKicks = kickEvents.length;
  const selectedPeriodInfo = useMemo(
    () => PERIODS.find((period) => period.key === selectedPeriod),
    [selectedPeriod]
  );

  useEffect(() => {
    const id = getDeviceId();
    setDeviceId(id);
  }, []);

  useEffect(() => {
    if (!deviceId) return;
    loadData(deviceId);
  }, [deviceId]);

  useEffect(() => {
    if (!isCounting || !startTime) return;

    const timer = setInterval(() => {
      const seconds = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
      setElapsedSeconds(seconds);
    }, 1000);

    return () => clearInterval(timer);
  }, [isCounting, startTime]);

  async function loadData(id = deviceId) {
    try {
      const [sessionsRes, analyticsRes] = await Promise.all([
        fetch(`/api/sessions?deviceId=${id}`),
        fetch(`/api/analytics?deviceId=${id}`)
      ]);

      const sessionsData = await sessionsRes.json();
      const analyticsData = await analyticsRes.json();

      if (sessionsData.error) throw new Error(sessionsData.error);
      if (analyticsData.error) throw new Error(analyticsData.error);

      setSessions(sessionsData.sessions || []);
      setAnalytics(analyticsData.analytics || null);
    } catch (error) {
      setStatus(error.message);
    }
  }

  function startCounting(period) {
    setSelectedPeriod(period);
    setIsCounting(true);
    setStartTime(new Date().toISOString());
    setElapsedSeconds(0);
    setKickEvents([]);
    setFeeling('normal');
    setNote('');
    setStatus('Counting started. Tap + Kick whenever you feel movement.');
  }

  function addKick() {
    if (!isCounting) return;

    setKickEvents((current) => [
      ...current,
      {
        kickNumber: current.length + 1,
        timestamp: new Date().toISOString()
      }
    ]);
  }

  function undoKick() {
    setKickEvents((current) => current.slice(0, -1));
  }

  function resetSession() {
    setIsCounting(false);
    setStartTime(null);
    setElapsedSeconds(0);
    setKickEvents([]);
    setFeeling('normal');
    setNote('');
    setStatus('Session cleared.');
  }

  async function saveSession() {
    if (!deviceId || !startTime || kickEvents.length === 0) {
      setStatus('Record at least one kick before saving.');
      return;
    }

    try {
      setIsSaving(true);
      const endTime = new Date().toISOString();
      const durationSeconds = Math.max(
        1,
        Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000)
      );

      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          sessionPeriod: selectedPeriod,
          startTime,
          endTime,
          totalKicks: kickEvents.length,
          durationSeconds,
          feeling,
          note,
          kickEvents
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save session');

      setStatus('Session saved successfully.');
      resetSession();
      await loadData();
    } catch (error) {
      setStatus(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Simple fetal movement tracker</p>
          <h1>Baby Kick Counter</h1>
          <p className="hero-text">
            Count kicks in the morning, afternoon, and evening. Compare today with your usual pattern.
          </p>
        </div>
        <div className="safety-box">
          This app only tracks movement. It does not diagnose health. If movement feels reduced,
          weaker, stopped, or unusual, contact your midwife/doctor or maternity unit immediately.
        </div>
      </section>

      <section className="grid three-cards">
        {PERIODS.map((period) => {
          const periodAnalytics = analytics?.[period.key];
          return (
            <article className="period-card" key={period.key}>
              <div>
                <h2>{period.label}</h2>
                <p>{period.time}</p>
              </div>
              <div className="mini-stats">
                <span>Today</span>
                <strong>
                  {periodAnalytics?.today
                    ? `${periodAnalytics.today.totalKicks} kicks / ${periodAnalytics.today.durationMinutes} min`
                    : 'No record'}
                </strong>
              </div>
              <div className="mini-stats">
                <span>7-session avg</span>
                <strong>
                  {periodAnalytics?.averageMinutes ? `${periodAnalytics.averageMinutes} min` : 'Need data'}
                </strong>
              </div>
              <p className="message">{periodAnalytics?.message || 'No data yet.'}</p>
              <button className="secondary-button" onClick={() => startCounting(period.key)}>
                Start {period.label} Count
              </button>
            </article>
          );
        })}
      </section>

      <section className="counter-card">
        <div className="counter-header">
          <div>
            <p className="eyebrow">Current session</p>
            <h2>{selectedPeriodInfo?.label} Kick Count</h2>
          </div>
          <div className="timer">{formatTimer(elapsedSeconds)}</div>
        </div>

        <div className="kick-circle">
          <span>{totalKicks}</span>
          <p>kicks recorded</p>
        </div>

        <div className="button-row">
          <button className="primary-button" onClick={addKick} disabled={!isCounting}>
            + Kick
          </button>
          <button className="plain-button" onClick={undoKick} disabled={!isCounting || totalKicks === 0}>
            Undo
          </button>
          <button className="plain-button" onClick={resetSession} disabled={!isCounting}>
            Clear
          </button>
        </div>

        <div className="form-grid">
          <label>
            Feeling
            <select value={feeling} onChange={(event) => setFeeling(event.target.value)}>
              <option value="normal">Normal</option>
              <option value="active">Very active</option>
              <option value="less_than_usual">Less than usual</option>
              <option value="worried">I am worried</option>
            </select>
          </label>
          <label>
            Note
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Example: after dinner, lying left side"
            />
          </label>
        </div>

        {(feeling === 'less_than_usual' || feeling === 'worried') && (
          <div className="urgent-box">
            Movement concern selected. Please contact your midwife/doctor or maternity unit immediately.
          </div>
        )}

        <button className="save-button" onClick={saveSession} disabled={!isCounting || totalKicks === 0 || isSaving}>
          {isSaving ? 'Saving...' : 'Save Session'}
        </button>
        {status && <p className="status-text">{status}</p>}
      </section>

      <section className="analysis-card">
        <div>
          <p className="eyebrow">Simple analysis</p>
          <h2>Average time to record kicks</h2>
        </div>

        <div className="bar-list">
          {PERIODS.map((period) => {
            const avg = analytics?.[period.key]?.averageMinutes || 0;
            const max = Math.max(
              1,
              ...PERIODS.map((item) => analytics?.[item.key]?.averageMinutes || 0)
            );
            return (
              <div className="bar-item" key={period.key}>
                <div className="bar-label">
                  <span>{period.label}</span>
                  <strong>{avg ? `${avg} min` : 'No data'}</strong>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${avg ? (avg / max) * 100 : 4}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="history-card">
        <div>
          <p className="eyebrow">History</p>
          <h2>Recent sessions</h2>
        </div>

        {sessions.length === 0 ? (
          <p className="empty-text">No sessions saved yet.</p>
        ) : (
          <div className="history-list">
            {sessions.map((session) => (
              <article className="history-item" key={session.id}>
                <div>
                  <strong>{formatDate(session.session_date)}</strong>
                  <span>{session.session_period}</span>
                </div>
                <div>
                  <strong>{session.total_kicks} kicks</strong>
                  <span>{formatDuration(session.duration_seconds)}</span>
                </div>
                <p>{session.note || session.feeling || 'No note'}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
