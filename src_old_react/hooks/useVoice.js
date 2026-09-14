import { useState, useCallback, useRef } from 'react';
import { AEGIS_INTRO_PHRASES } from '../utils/aegisPersonality';

export function useVoice({ onResult, onError }) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  // Initialize Speech Recognition
  if (!recognitionRef.current && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = (event) => {
      const current = event.resultIndex;
      const resultTranscript = event.results[current][0].transcript;
      setTranscript(resultTranscript);
      
      if (event.results[current].isFinal) {
        onResult?.(resultTranscript);
        setIsListening(false);
      }
    };

    recognitionRef.current.onerror = (event) => {
      onError?.(event.error);
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };
  }

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const speak = useCallback((text, options = {}) => {
    if (!synthRef.current) return;

    // Stop any current speaking
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // AEGIS Voice Settings
    utterance.rate = options.rate || 0.9;
    utterance.pitch = options.pitch || 0.85;
    utterance.volume = options.volume || 1.0;

    // Try to find a good English voice
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(v => 
      v.name.includes('Google UK English Male') || 
      v.name.includes('Daniel') || 
      v.name.includes('Alex') ||
      v.lang.includes('en-GB')
    );
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  }, []);

  const getRandomIntro = () => {
    return AEGIS_INTRO_PHRASES[Math.floor(Math.random() * AEGIS_INTRO_PHRASES.length)];
  };

  return { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    speak, 
    isSpeaking,
    getRandomIntro 
  };
}
