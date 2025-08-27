import { useEffect, useState } from 'react';
import { useCollaborativeSession } from './hooks/useCollaborativeSession';
import { ChatMessage } from './types';

export default function App() {
  const {
    me, users, messages, counter, lastCounterBy, lastCounterTs,
    sendMessage, deleteMyMessage, updateCounter, markTyping,
  } = useCollaborativeSession();

  const [draft, setDraft] = useState('');
  const [expiresIn, setExpiresIn] = useState<number | ''>('');

  useEffect(() => {
    return () => markTyping(false);
  }, [markTyping]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, padding: 16 }}>
      <aside style={{ borderRight: '1px solid #eee', paddingRight: 16 }}>
        <h3>Users</h3>
        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>You: <b>{me.name}</b></div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {users.map(u => (
            <li key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: (Date.now()-u.lastActivityTs) < 3000 ? '#4ade80' : '#f59e0b' }} />
              <img src={u.avatar} width={36} alt='' />
              <div>
                <div style={{ fontWeight: 600 }}>{u.name} {u.isTyping ? <em style={{ fontWeight: 400, fontSize: 12, color: '#6b7280' }}>typing…</em> : null}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Last activity: {new Date(u.lastActivityTs).toLocaleTimeString()}</div>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      <main style={{ display: 'grid', gap: 16 }}>
        <section style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
          <h3>Shared Counter</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => updateCounter(counter - 1)}>-</button>
            <div style={{ fontSize: 32, minWidth: 80, textAlign: 'center' }}>{counter}</div>
            <button onClick={() => updateCounter(counter + 1)}>+</button>
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
            {lastCounterBy ? <>Last change by <b>{lastCounterBy.name}</b> at {lastCounterTs && new Date(lastCounterTs).toLocaleTimeString()}</> : '—'}
          </div>
        </section>

        <section style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
          <h3>Chat</h3>
          <div style={{ display: 'grid', gap: 8, marginBottom: 8, maxHeight: 280, overflow: 'auto', paddingRight: 6 }}>
            {messages.map((m: ChatMessage) => (
              <div key={m.id} style={{ opacity: m.isDeleted ? 0.6 : 1, borderBottom: '1px dashed #eee', paddingBottom: 6 }}>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  <b>{m.by.name}</b> — {new Date(m.ts).toLocaleTimeString()}
                  {m.expiresAt ? <span style={{ marginLeft: 8, fontStyle: 'italic' }}>(expires {new Date(m.expiresAt).toLocaleTimeString()})</span> : null}
                </div>
                <div>{m.isDeleted ? <i>message deleted by {m.deletedBy?.name}</i> : m.text}</div>
                {!m.isDeleted && m.by.id === me.id ? (
                  <button onClick={() => deleteMyMessage(m.id)} style={{ marginTop: 4, fontSize: 12 }}>Delete</button>
                ) : null}
              </div>
            ))}
          </div>

          <form onSubmit={e => { e.preventDefault(); sendMessage(draft, typeof expiresIn === 'number' ? { expiresInMs: expiresIn } : undefined); setDraft(''); markTyping(false); }}>
            <textarea
              rows={3}
              value={draft}
              onChange={e => { setDraft(e.target.value); markTyping(true); }}
              onBlur={() => markTyping(false)}
              placeholder="Type a message…"
              style={{ width: '100%', marginBottom: 6 }}
            />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button type="submit" disabled={!draft.trim()}>Send</button>
              <label style={{ fontSize: 12 }}>
                Expire in (ms):
                <input
                  type="number"
                  placeholder="e.g. 10000"
                  value={expiresIn}
                  onChange={e => setExpiresIn(e.target.value ? Number(e.target.value) : '')}
                  style={{ width: 100, marginLeft: 6 }}
                />
              </label>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}