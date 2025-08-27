import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChatMessage, User } from '../types';
import { useBroadcastChannel } from 'react-broadcast-sync';
import { faker } from '@faker-js/faker';

const PRESENCE_STALE_MS = 5000;
const HEARTBEAT_MS = 100;
const TYPING_DEBOUNCE_MS = 1000;
const EXPIRE_SWEEP_MS = 2000;

export type CollaborativeState = {
  me: User;
  users: User[];
  messages: ChatMessage[];
  counter: number;
  lastCounterBy?: User;
  lastCounterTs?: number;
  sendMessage(text: string, opts?: { expiresInMs?: number }): void;
  deleteMyMessage(messageId: string): void;
  updateCounter(delta: number): void;
  markTyping(isTyping: boolean): void;
};

export function useCollaborativeSession(): CollaborativeState {
  const { postMessage, messages: events, clearReceivedMessages } = useBroadcastChannel("fullstack-homework");
  const me: User = useMemo(() => ({
    id: faker.string.nanoid(),
    name: faker.person.fullName(),
    avatar: faker.image.avatar(),
    lastActivityTs: Date.now()
  }), []);
  const [usersMap, setUsersMap] = useState<Map<string, User>>(new Map());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [counter, setCounter] = useState(0);
  const lastActionRef = useRef<{ by?: User; ts?: number }>({});

  const upsertUser = (payload: {id: string} & Partial<User>) => {
    setUsersMap(prev => {
      const next = new Map(prev);
      const curr = next.get(payload.id) ?? { ...payload};
      next.set(payload.id, {
        ...curr,
        ...payload
      } as User);
      return next;
    });
  };

  const markLeft = (userId: string) => {
    setUsersMap(prev => {
      const next = new Map(prev);
      next.delete(userId);
      return next;
    });
  };

  const updateCounter = (value: number) => {
    const ts = Date.now();
    setCounter(value);
    lastActionRef.current = { by: me, ts };
    postMessage("counter:update", { value, by: me, ts });
  }

  const sendMessage = (text: string, opts?: { expiresInMs?: number }) => {
    if (!text.trim()) return;
    const now = Date.now();
    const msg: ChatMessage = {
      id: faker.string.nanoid(),
      text,
      by: me,
      ts: now,
      expiresAt: opts?.expiresInMs ? now + opts.expiresInMs : undefined,
    };
    setMessages(prev => [...prev, msg]);
    postMessage('chat:message', { msg });
  };

  const deleteMyMessage = (messageId: string) => {
    setMessages(prev => prev.map(m => m.id === messageId && m.by.id === me.id ? { ...m, isDeleted: true, deletedBy: me, deletedTs: Date.now() } : m));
    postMessage('chat:delete', { messageId, by: me, ts: Date.now() });
  };

  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markTyping = useCallback((isTyping: boolean) => {
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
      typingTimeout.current = null;
    }
    postMessage('typing', { userId: me.id, isTyping, ts: Date.now() });
    if (isTyping) {
      typingTimeout.current = setTimeout(() => {
        postMessage('typing', { userId: me.id, isTyping: false, ts: Date.now() });
      }, TYPING_DEBOUNCE_MS);
    }
  }, [me.id]);

  useEffect(() => {
    for (const event of events) {
      const payload = event.message;
      console.log("event:", event);
      switch (event.type) {
        case 'join':
          upsertUser(payload.user);
          break;
        case 'leave':
          markLeft(payload.userId);
          break;
        case 'heartbeat':
          upsertUser(payload.user);
          break;
        case 'typing':
          upsertUser({ id: payload.userId, lastActivityTs: payload.ts, isTyping: payload.isTyping });
          break;
        case 'counter:update':
          setCounter(payload.value);
          lastActionRef.current = { by: payload.by, ts: payload.ts };
          break;
        case 'chat:message':
          setMessages(prev => {
            if (prev.some(m => m.id === payload.msg.id)) return prev;
            return [...prev, payload.msg];
          });
          break;
        case 'chat:delete':
          setMessages(prev => prev.map(m => m.id === payload.messageId ? { ...m, isDeleted: true, deletedBy: payload.by, deletedTs: payload.ts } : m));
          break;
      }
      clearReceivedMessages({
        types: [event.type]
      })
    }
  }, [events]);

  useEffect(() => {
    upsertUser(me);
    postMessage('join', { user: me });
    const onUnload = () => {
      postMessage('leave', { userId: me.id });
    };
    window.addEventListener('beforeunload', onUnload);

    const hb = setInterval(() => {
      const ts = Date.now()
      me.lastActivityTs = ts;
      upsertUser(me);
      postMessage('heartbeat', { user: me });
    }, HEARTBEAT_MS);

    return () => {
      clearInterval(hb);
      window.removeEventListener('beforeunload', onUnload);
      postMessage('leave', { userId: me.id });
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setUsersMap(prev => {
        const next = new Map(prev);
        for (const [id, u] of next) {
          if (now - (u.lastActivityTs ?? 0) > PRESENCE_STALE_MS) {
            next.delete(id)
          };
        }
        return next;
      });
      setMessages(prev => prev.filter(m => !m.expiresAt || m.expiresAt > now));
    }, EXPIRE_SWEEP_MS);
    return () => clearInterval(timer);
  }, []);

  const users = useMemo(() => Array.from(usersMap.values()), [usersMap]);

  return {
    me,
    users,
    messages: messages.sort((a, b) => a.ts - b.ts),
    counter,
    lastCounterBy: lastActionRef.current.by,
    lastCounterTs: lastActionRef.current.ts,
    sendMessage,
    deleteMyMessage,
    updateCounter,
    markTyping,
  };
}
