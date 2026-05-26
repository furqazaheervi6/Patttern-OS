import React, { useState, useEffect, useRef, useCallback } from 'react';

const MODELS = [
  { id: 'haiku',  label: 'Haiku',  tag: '⚡', desc: 'Fast'    },
  { id: 'sonnet', label: 'Sonnet', tag: '✦', desc: 'Smarter' },
];

const STARTERS = [
  "What patterns do you see in my data?",
  "Which pillar needs the most attention?",
  "How has my week been so far?",
  "What should I focus on today?",
  "Am I on track with my goals?",
];

const ACCEPT_TYPES = 'image/jpeg,image/png,image/gif,image/webp,application/pdf,.pdf,.txt,.md';

// ─── Attachment thumbnail ────────────────────────────────
function AttachmentChip({ att, onRemove }) {
  return (
    <div className="relative flex-shrink-0 group">
      {att.type === 'image' ? (
        <img
          src={att.dataUrl}
          alt={att.name}
          className="h-14 w-14 object-cover rounded-lg border border-border"
        />
      ) : (
        <div className="h-14 w-14 flex flex-col items-center justify-center rounded-lg border border-border bg-surface text-center px-1">
          <span className="text-lg">📄</span>
          <span className="text-text-muted font-mono truncate w-full text-center" style={{ fontSize: '9px' }}>
            {att.name.slice(0, 10)}
          </span>
        </div>
      )}
      <button
        onClick={onRemove}
        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ fontSize: '10px' }}
      >
        ×
      </button>
    </div>
  );
}

// ─── Single message bubble ───────────────────────────────
function Message({ msg }) {
  const isUser = msg.role === 'user';
  const textContent = typeof msg.content === 'string'
    ? msg.content
    : msg.content?.find(b => b.type === 'text')?.text || '';
  const imageBlocks = typeof msg.content === 'string'
    ? []
    : msg.content?.filter(b => b.type === 'image') || [];
  const docBlocks = typeof msg.content === 'string'
    ? []
    : msg.content?.filter(b => b.type === 'document') || [];

  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-3`}>
      <div
        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
        style={isUser
          ? { background: 'rgba(139,0,0,0.15)', color: '#B22222', border: '1px solid rgba(139,0,0,0.25)' }
          : { background: 'rgba(139,0,0,0.08)', color: '#8B0000', border: '1px solid rgba(139,0,0,0.2)' }
        }
      >
        {isUser ? 'U' : '◎'}
      </div>

      <div className={`max-w-[86%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Image previews */}
        {imageBlocks.map((b, i) => (
          <img
            key={i}
            src={`data:${b.mediaType};base64,${b.data}`}
            alt="attachment"
            className="max-w-[200px] rounded-xl"
            style={{ border: '1px solid #252540' }}
          />
        ))}
        {/* Doc previews */}
        {docBlocks.map((b, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono"
            style={{ border: '1px solid #252540', background: 'rgba(24,24,40,0.92)', color: '#5A5A72' }}
          >
            <span>📄</span> {b.name || 'document'}
          </div>
        ))}
        {/* Text bubble */}
        {(textContent || msg.streaming) && (
          <div
            className="px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap"
            style={isUser
              ? {
                  background: 'rgba(139,0,0,0.1)',
                  border: '1px solid rgba(139,0,0,0.2)',
                  color: '#C9C9C9',
                  borderTopRightRadius: '4px',
                }
              : {
                  background: 'rgba(24,24,40,0.92)',
                  border: '1px solid #252540',
                  color: '#C9C9C9',
                  borderTopLeftRadius: '4px',
                }
            }
          >
            {textContent}
            {msg.streaming && (
              <span
                className="inline-block w-1.5 h-3.5 ml-0.5 animate-pulse rounded-sm align-middle"
                style={{ background: '#8B0000' }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ChatBot sidebar ────────────────────────────────
export default function ChatBot({ open, onToggle }) {
  const [model, setModel] = useState('haiku');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hey — I'm your PatternOS Intelligence.\n\nI have full access to your scores, journal, goals, and calendar. You can also send me images, files, or use your voice.\n\nWhat's on your mind?",
    },
  ]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingError, setRecordingError] = useState('');
  const [calendarNotif, setCalendarNotif] = useState(null);

  const bottomRef   = useRef(null);
  const inputRef    = useRef(null);
  const fileRef     = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  // ── File upload ──────────────────────────────────────
  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        const dataUrl = ev.target.result;
        const base64  = dataUrl.split(',')[1];
        setAttachments(prev => [...prev, {
          type:      file.type.startsWith('image/') ? 'image' : 'document',
          name:      file.name,
          mediaType: file.type || 'application/octet-stream',
          dataUrl,
          base64,
        }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  // ── Voice recording ──────────────────────────────────
  const toggleRecording = () => {
    setRecordingError('');
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setRecordingError('Speech recognition not supported in this browser. Try Chrome or Safari.');
      return;
    }

    const rec = new SR();
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.lang            = 'en-US';

    let finalTranscript = '';
    rec.onresult = e => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript + ' ';
        else interim += e.results[i][0].transcript;
      }
      setInput(finalTranscript + interim);
    };

    rec.onerror = err => {
      setRecordingError(`Mic error: ${err.error}`);
      setRecording(false);
    };

    rec.onend = () => setRecording(false);

    rec.start();
    recognitionRef.current = rec;
    setRecording(true);
  };

  // ── Send message ─────────────────────────────────────
  const send = useCallback(async (text) => {
    const userText = (text || input).trim();
    if ((!userText && attachments.length === 0) || loading) return;
    // Snapshot current calendar plan from localStorage for context
    let calendarPlan = null;
    try { calendarPlan = JSON.parse(localStorage.getItem('patternos_dayplan') || 'null'); } catch {}

    // Stop recording if active
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
    }

    setInput('');
    const currentAttachments = [...attachments];
    setAttachments([]);

    // Build content: string if text-only, array if multimodal
    let content;
    if (currentAttachments.length === 0) {
      content = userText;
    } else {
      content = [];
      if (userText) content.push({ type: 'text', text: userText });
      currentAttachments.forEach(att => {
        content.push({
          type:      att.type,
          mediaType: att.mediaType,
          data:      att.base64,
          name:      att.name,
        });
      });
    }

    const userMsg = { role: 'user', content };
    const history = [...messages, userMsg];
    setMessages([...history, { role: 'assistant', content: '', streaming: true }]);
    setLoading(true);

    const apiMessages = history.map(m => ({ role: m.role, content: m.content }));

    try {
      const authToken = localStorage.getItem('patternos_token');
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
        },
        body:    JSON.stringify({
          messages: apiMessages,
          model,
          calendarPlan,
          currentDate: new Date().toISOString().split('T')[0],
        }),
      });

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value, { stream: true }).split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') break;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.text) {
              accumulated += parsed.text;
              setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { role: 'assistant', content: accumulated, streaming: true };
                return next;
              });
            }
          } catch {}
        }
      }

      // Parse and apply CALENDAR_ACTIONS if present
      const actionMatch = accumulated.match(/<CALENDAR_ACTIONS>([\s\S]*?)<\/CALENDAR_ACTIONS>/);
      let displayText = accumulated;
      if (actionMatch) {
        displayText = accumulated.replace(/<CALENDAR_ACTIONS>[\s\S]*?<\/CALENDAR_ACTIONS>/, '').trim();
        try {
          const actions = JSON.parse(actionMatch[1]);
          window.dispatchEvent(new CustomEvent('patternos:planactions', { detail: { actions } }));
          const added = actions.filter(a => a.action === 'add').length;
          const removed = actions.filter(a => a.action === 'remove').length;
          const updated = actions.filter(a => a.action === 'update').length;
          const parts = [];
          if (added) parts.push(`+${added} added`);
          if (removed) parts.push(`−${removed} removed`);
          if (updated) parts.push(`${updated} updated`);
          setCalendarNotif(parts.join(' · ') || `${actions.length} changes`);
          setTimeout(() => setCalendarNotif(null), 4000);
        } catch {}
      }

      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: 'assistant', content: displayText, streaming: false };
        return next;
      });
    } catch {
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: 'assistant', content: 'Something went wrong. Try again.', streaming: false };
        return next;
      });
    } finally {
      setLoading(false);
    }
  }, [input, attachments, messages, loading, model, recording]);

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: "Hey — I'm your PatternOS Intelligence.\n\nI have full access to your scores, journal, goals, and calendar. You can also send me images, files, or use your voice.\n\nWhat's on your mind?",
    }]);
    setAttachments([]);
    setInput('');
  };

  const canSend = (input.trim() || attachments.length > 0) && !loading;

  return (
    <>
      {/* Collapsed tab */}
      {!open && (
        <button
          onClick={onToggle}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center justify-center gap-1 py-4 px-2 rounded-l-xl transition-all"
          style={{
            background: 'rgba(20,20,36,0.97)',
            border: '1px solid #252540',
            borderRight: 'none',
            writingMode: 'vertical-rl',
            backdropFilter: 'blur(8px)',
          }}
          title="Open Intelligence"
        >
          <span style={{ color: '#8B0000', fontSize: '1rem' }}>◎</span>
          <span style={{ fontSize: '8px', letterSpacing: '0.2em', color: '#5A5A72', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace' }}>
            INTELLIGENCE
          </span>
        </button>
      )}

      {/* Sidebar */}
      <div
        className="flex flex-col border-l flex-shrink-0 overflow-hidden"
        style={{
          width: open ? '340px' : '0px',
          background: 'rgba(6,6,12,0.97)',
          borderColor: '#252540',
          minHeight: '100vh',
          transition: 'width 0.25s ease',
          backdropFilter: 'blur(16px)',
        }}
      >
        {open && (
          <>
            {/* Header */}
            <div
              className="px-4 py-3 flex-shrink-0"
              style={{
                background: 'rgba(139,0,0,0.05)',
                borderBottom: '1px solid #252540',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span style={{ color: '#8B0000', fontSize: '1.1rem' }}>◎</span>
                  <div>
                    <p
                      style={{
                        fontFamily: 'Cinzel, Georgia, serif',
                        fontSize: '0.7rem',
                        color: '#C9C9C9',
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase',
                        lineHeight: 1.2,
                      }}
                    >
                      Intelligence
                    </p>
                    <p style={{ fontSize: '0.55rem', color: '#3A3A50', letterSpacing: '0.15em', fontFamily: 'DM Mono, monospace' }}>
                      AI-NATIVE · SELF-INTELLIGENCE
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#22C55E' }} />
                  <button
                    onClick={clearChat}
                    className="text-xs px-1.5 py-1 rounded transition-colors"
                    style={{ color: '#5A5A72', fontFamily: 'DM Mono, monospace' }}
                    title="Clear"
                  >
                    ↺
                  </button>
                  <button
                    onClick={onToggle}
                    className="w-6 h-6 flex items-center justify-center rounded transition-colors"
                    style={{ color: '#5A5A72' }}
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Model toggle */}
              <div
                className="flex gap-1 mt-3 p-0.5 rounded-lg"
                style={{ background: 'rgba(20,20,36,0.8)', border: '1px solid #252540' }}
              >
                {MODELS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setModel(m.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs transition-all"
                    style={
                      model === m.id
                        ? {
                            background: 'rgba(139,0,0,0.2)',
                            border: '1px solid rgba(139,0,0,0.35)',
                            color: '#C9C9C9',
                            fontFamily: 'DM Mono, monospace',
                          }
                        : {
                            color: '#5A5A72',
                            fontFamily: 'DM Mono, monospace',
                          }
                    }
                  >
                    <span>{m.tag}</span>
                    <span>{m.label}</span>
                    <span style={{ opacity: 0.4, fontSize: '8px' }}>{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Calendar action notification */}
            {calendarNotif && (
              <div
                className="mx-3 mt-2 px-3 py-2 rounded-lg text-xs flex items-center gap-2 fade-in"
                style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#22C55E' }}
              >
                <span>📅</span>
                <span>Calendar updated — {calendarNotif}</span>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-4">
              {messages.map((msg, i) => <Message key={i} msg={msg} />)}

              {messages.length === 1 && (
                <div className="mt-3 space-y-2">
                  <p
                    style={{
                      fontSize: '0.6rem',
                      color: '#3A3A50',
                      letterSpacing: '0.2em',
                      fontFamily: 'DM Mono, monospace',
                      textTransform: 'uppercase',
                      paddingLeft: '4px',
                      marginBottom: '8px',
                    }}
                  >
                    Suggested
                  </p>
                  {STARTERS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => send(s)}
                      className="w-full text-left text-xs px-3 py-2.5 rounded-lg transition-all"
                      style={{
                        border: '1px solid #252540',
                        color: '#5A5A72',
                        background: 'transparent',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'rgba(139,0,0,0.3)';
                        e.currentTarget.style.color = '#C9C9C9';
                        e.currentTarget.style.background = 'rgba(139,0,0,0.04)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = '#252540';
                        e.currentTarget.style.color = '#5A5A72';
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input area */}
            <div className="px-3 pb-4 pt-2 border-t border-border flex-shrink-0">
              {/* Attachment previews */}
              {attachments.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-2">
                  {attachments.map((att, i) => (
                    <AttachmentChip
                      key={i}
                      att={att}
                      onRemove={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                    />
                  ))}
                </div>
              )}

              {/* Recording error */}
              {recordingError && (
                <p className="text-xs text-red-400 font-mono mb-1.5 px-1">{recordingError}</p>
              )}

              {/* Text input row */}
              <div className="flex gap-1.5 items-end">
                {/* File attach */}
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg transition-colors"
                  style={{ border: '1px solid #252540', color: '#5A5A72' }}
                  title="Attach image or file"
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(139,0,0,0.35)'; e.currentTarget.style.color = '#C9C9C9'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#252540'; e.currentTarget.style.color = '#5A5A72'; }}
                >
                  <span style={{ fontSize: '13px' }}>📎</span>
                </button>
                <input ref={fileRef} type="file" multiple accept={ACCEPT_TYPES} className="hidden" onChange={handleFiles} />

                {/* Mic */}
                <button
                  onClick={toggleRecording}
                  className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg transition-all"
                  style={recording
                    ? { border: '1px solid rgba(239,68,68,0.5)', background: 'rgba(239,68,68,0.1)', color: '#F87171' }
                    : { border: '1px solid #252540', color: '#5A5A72' }
                  }
                  title={recording ? 'Stop recording' : 'Voice input'}
                >
                  <span style={{ fontSize: '13px' }}>{recording ? '⏹' : '🎙'}</span>
                </button>

                {/* Text area */}
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder={recording ? 'Listening...' : 'Ask anything...'}
                  rows={1}
                  disabled={loading}
                  className="flex-1 resize-none px-3 py-2 rounded-lg text-sm focus:outline-none transition-colors disabled:opacity-50"
                  style={{
                    background: 'rgba(24,24,40,0.92)',
                    border: '1px solid #252540',
                    color: '#C9C9C9',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    maxHeight: '100px',
                    overflowY: 'auto',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(139,0,0,0.4)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#252540'; }}
                  onInput={e => {
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                  }}
                />

                {/* Send */}
                <button
                  onClick={() => send()}
                  disabled={!canSend}
                  className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-xl transition-all disabled:opacity-30"
                  style={{ background: 'linear-gradient(135deg, #8B0000, #B22222)' }}
                >
                  {loading
                    ? <span className="text-white text-sm animate-spin">⟳</span>
                    : <span className="text-white text-sm font-bold">↑</span>
                  }
                </button>
              </div>

              <p
                className="text-center mt-1.5"
                style={{ fontSize: '0.55rem', color: '#3A3A50', fontFamily: 'DM Mono, monospace', letterSpacing: '0.08em' }}
              >
                {model === 'haiku' ? '⚡ Haiku' : '✦ Sonnet'} · Enter to send
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
