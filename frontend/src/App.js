import React, { useState, useEffect, useRef } from 'react';
import './Chat.css';
import LimitPage from './LimitPage';

function formatAIText(text) {
  // Заменяем **жирный** и *курсив* и \n на переносы строк, а также списки
  let formatted = text
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.*?)\*/g, '<i>$1</i>')
    .replace(/\n/g, '<br/>')
    .replace(/^- (.*)$/gm, '<li>$1</li>');
  // Если есть <li>, обернуть в <ul>
  if (/<li>/.test(formatted)) {
    formatted = formatted.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
  }
  return formatted;
}

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [dots, setDots] = useState(1);

  const LIMIT = 5;
  const [questionCount, setQuestionCount] = useState(
    Number(localStorage.getItem('questionCount') || 0)
  );
  const [limitReached, setLimitReached] = useState(
    localStorage.getItem('limitReached') === '1'
  );

  const chatWindowRef = useRef(null);
  const lastAIRef = useRef(null);

  useEffect(() => {
    if (!loading) {
      setDots(1);
      return;
    }
    const interval = setInterval(() => {
      setDots(prev => (prev % 3) + 1);
    }, 500);
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (lastAIRef.current && chatWindowRef.current) {
      const chatRect = chatWindowRef.current.getBoundingClientRect();
      const aiRect = lastAIRef.current.getBoundingClientRect();
      // Скроллим так, чтобы AI-бабл был вверху с отступом 20px
      chatWindowRef.current.scrollTop += (aiRect.top - chatRect.top) - 20;
    }
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || limitReached) return;
    const userMsg = { sender: 'user', text: input };
    setMessages((msgs) => [...msgs, userMsg]);
    setInput('');
    setLoading(true);

    const newCount = questionCount + 1;
    setQuestionCount(newCount);
    localStorage.setItem('questionCount', newCount);
    if (newCount >= LIMIT) {
      setLimitReached(true);
      localStorage.setItem('limitReached', '1');
    }

    try {
      const res = await fetch((process.env.REACT_APP_BACKEND_URL || 'http://localhost:5002') + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, promptcount: newCount }),
      });
      const data = await res.json();
      setMessages((msgs) => [
        ...msgs,
        { sender: 'ai', text: data.reply || 'Ошибка ответа AI' },
      ]);
    } catch {
      setMessages((msgs) => [
        ...msgs,
        { sender: 'ai', text: 'Ошибка соединения с сервером' },
      ]);
    }
    setLoading(false);
  };

  if (limitReached) {
    return <LimitPage />;
  }

  return (
    <div className="chat-container">
      <div className="chat-window" ref={chatWindowRef}>
        {messages.length === 0 && !loading && (
          <div className="placeholder-message">
            Я - ИИ-ассистент.
            {"\n"}
            Если у вас есть вопросы по ЖКУ, постараюсь вам помочь.
            {"\n"}
            Пожалуйста, не указывайте ФИО, номер счета и другие личные данные.
          </div>
        )}
        {messages.map((msg, i) => (
          msg.sender === 'ai' ? (
            <div
              key={i}
              className={`chat-bubble ${msg.sender}`}
              dangerouslySetInnerHTML={{ __html: formatAIText(msg.text) }}
              ref={i === messages.length - 1 ? lastAIRef : null}
            />
          ) : (
            <div
              key={i}
              className={`chat-bubble ${msg.sender}`}
            >
              {msg.text}
            </div>
          )
        ))}
        {loading && <div className="chat-bubble ai">AI печатает{".".repeat(dots)}</div>}
      </div>
      <form className="chat-input" onSubmit={sendMessage}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Введите сообщение..."
        />
        <button type="submit" disabled={loading}>Отправить</button>
      </form>
    </div>
  );
}

export default App; 