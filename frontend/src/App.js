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
  const chatContainerRef = useRef(null);

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
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  // JS-fix для мобильных: динамическая высота контейнера
  useEffect(() => {
    const setContainerHeight = () => {
      if (chatContainerRef.current) {
        chatContainerRef.current.style.height = window.innerHeight + 'px';
      }
    };
    setContainerHeight();
    window.addEventListener('resize', setContainerHeight);
    // Фокус на input/textarea
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(inp => {
      inp.addEventListener('focus', setContainerHeight);
      inp.addEventListener('blur', setContainerHeight);
    });
    return () => {
      window.removeEventListener('resize', setContainerHeight);
      inputs.forEach(inp => {
        inp.removeEventListener('focus', setContainerHeight);
        inp.removeEventListener('blur', setContainerHeight);
      });
    };
  }, []);

  // Аналитика: отправка событий
  const sendAnalyticsEvent = (event) => {
    if (window.gtag) {
      window.gtag('event', event);
    }
    if (window.ym) {
      window.ym(96171108, 'reachGoal', event);
    }
  };

  useEffect(() => {
    // Событие первого рендера
    sendAnalyticsEvent('5640_page_view');
  // eslint-disable-next-line
  }, []);

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
    sendAnalyticsEvent('5640_click_send');
  };

  if (limitReached) {
    sendAnalyticsEvent('5640_end_page_view');
    return <LimitPage />;
  }

  return (
    <div className="chat-container" ref={chatContainerRef}>
      <div className={"chat-window" + (messages.length === 0 && !loading ? " empty" : "")} ref={chatWindowRef}>
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