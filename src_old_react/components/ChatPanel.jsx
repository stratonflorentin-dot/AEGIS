import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff } from 'lucide-react';

const ChatPanel = ({ messages, isThinking, streamingText, onSendMessage, isListening, startListening, stopListening }) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingText]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isThinking) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="hud-panel flex flex-col h-full overflow-hidden">
      {/* Message List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-lg border ${
              msg.role === 'user' 
                ? 'bg-hud-secondary/10 border-hud-secondary/30 text-right' 
                : 'bg-hud-primary/5 border-hud-primary/20 text-left'
            }`}>
              <div className="text-[10px] font-hud opacity-40 mb-1 uppercase tracking-widest">
                {msg.role === 'user' ? 'Sir' : 'AEGIS'}
              </div>
              <div className="text-sm font-body whitespace-pre-wrap leading-relaxed">
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        
        {isThinking && (
          <div className="flex justify-start">
            <div className="max-w-[80%] p-3 rounded-lg border bg-hud-primary/5 border-hud-primary/20 text-left">
              <div className="text-[10px] font-hud opacity-40 mb-1 uppercase tracking-widest">AEGIS</div>
              <div className="text-sm font-body whitespace-pre-wrap leading-relaxed">
                {streamingText}
                <span className="inline-block w-1.5 h-4 bg-hud-primary ml-1 animate-pulse" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border-hud bg-bg-deep/50">
        <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`p-2 rounded-full border transition-all duration-300 ${
              isListening 
                ? 'bg-hud-accent border-hud-accent text-white animate-pulse' 
                : 'border-hud-primary text-hud-primary hover:bg-hud-primary/10'
            }`}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isListening ? "Listening, Sir..." : "Command me, Sir..."}
            className="flex-1 bg-transparent border-b border-border-hud py-2 px-1 text-sm font-body focus:outline-none focus:border-hud-primary transition-colors placeholder:opacity-30"
          />
          
          <button
            type="submit"
            disabled={!input.trim() || isThinking}
            className="p-2 text-hud-primary disabled:opacity-30 hover:scale-110 transition-transform"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
