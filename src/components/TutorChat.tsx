import React, { useState, useRef, useEffect } from "react";
import { UserProfile, ChatMessage } from "../types";
import { Send, Sparkles, Volume2, HelpCircle, CheckCircle, AlertCircle, RefreshCw, Languages, Info, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface TutorChatProps {
  profile: UserProfile;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onSaveVocab?: (word: string, meaning: string) => void;
}

export default function TutorChat({ profile, messages, setMessages, onSaveVocab }: TutorChatProps) {
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [showTranslator, setShowTranslator] = useState<Record<string, boolean>>({});

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Voice Speech synthesis
  const speakText = (id: string, text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      if (speakingId === id) {
        setSpeakingId(null);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      const voiceLanguageCodes: Record<string, string> = {
        English: "en-US",
        French: "fr-FR",
        Spanish: "es-ES",
        German: "de-DE",
        Japanese: "ja-JP",
        Italian: "it-IT",
        Turkish: "tr-TR",
        Arabic: "ar-SA",
      };

      utterance.lang = voiceLanguageCodes[profile.targetLanguage] || "en-US";
      utterance.rate = 0.9; // Slightly slower for language learners

      utterance.onend = () => setSpeakingId(null);
      utterance.onerror = () => setSpeakingId(null);

      setSpeakingId(id);
      window.speechSynthesis.speak(utterance);
    } else {
      alert("متصفحك لا يدعم خاصية نطق الكلمات.");
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    setErrorStatus(null);
    const userMsgId = Date.now().toString();
    const newUserMessage: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Update messages local state
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInputValue("");
    setIsLoading(true);

    try {
      // Proxy the request to our secure Express API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          nativeLanguage: profile.nativeLanguage,
          targetLanguage: profile.targetLanguage,
          level: profile.level,
          interests: profile.interests,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "فشل الاتصال بالمدرب الذكي.");
      }

      const data = await response.json();

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "model",
        content: data.reply,
        correction: data.correction,
        translation: data.translation,
        suggestedResponses: data.suggestedResponses,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || "حدث خطأ غير متوقع أثناء مراسلة المدرس الذكي.");
    } finally {
      setIsLoading(false);
    }
  };

  const startTopicConversation = () => {
    let greeting = "";
    if (profile.targetLanguage === "English") greeting = "Hello there! Let's talk about our hobbies today. What do you like doing in your free time?";
    else if (profile.targetLanguage === "French") greeting = "Bonjour ! Parlons de nos passions aujourd'hui. Qu'est-ce que vous aimez faire pendant votre temps libre ?";
    else if (profile.targetLanguage === "Spanish") greeting = "¡Hola! Hablemos de nuestros pasatiempos hoy. ¿Qué te gusta hacer en tu tiempo libre?";
    else if (profile.targetLanguage === "German") greeting = "Hallo! Lass uns heute über Hobbys sprechen. Was machst du gerne in deiner Freizeit?";
    else if (profile.targetLanguage === "Japanese") greeting = "こんにちは！今日は趣味について話しましょう。暇なときは何をするのが好きですか？";
    else if (profile.targetLanguage === "Italian") greeting = "Ciao! Parliamo dei nostri hobby oggi. Cosa ti piace fare nel tempo libero?";
    else if (profile.targetLanguage === "Turkish") greeting = "Merhaba! Bugün hobilerimiz hakkında konuşalım. Boş zamanlarında ne yapmaktan hoşlanırsın?";
    else greeting = "مرحباً بك! لنتحدث اليوم عن هواياتنا. ماذا تحب أن تفعل في وقت فراغك؟";

    handleSendMessage(greeting);
  };

  const handleSuggestClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const toggleTranslation = (id: string) => {
    setShowTranslator(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const extractWordForVocab = (text: string) => {
    // Select the word double-clicked or user selects
    const word = window.getSelection()?.toString().trim();
    if (word && word.length > 1 && onSaveVocab) {
      onSaveVocab(word, `ترجمة مضافة من محادثة ${profile.targetLanguage}`);
    }
  };

  return (
    <div id="tutor-chat-section" className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[650px] md:h-[700px] relative">
      {/* Target Level & Stats Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 text-white px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 gap-3 relative">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/15 rounded-xl border border-white/20 animate-pulse">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-sans font-semibold text-base leading-tight">المدرب الشخصي التفاعلي</h3>
              <span className="bg-emerald-500 text-emerald-50 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                نشط الآن
              </span>
            </div>
            <p className="text-[11px] text-indigo-100 mt-1">
              محادثة مخصصة بمستوى <strong className="text-amber-300">{profile.level}</strong> حول موضوع <strong className="text-amber-300">{profile.interests}</strong>
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {messages.length === 0 && (
            <button
              onClick={startTopicConversation}
              className="bg-white text-indigo-700 hover:bg-slate-50 transition-all font-medium text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm border border-indigo-150"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              ابدأ حواراً تلقائياً
            </button>
          )}

          {messages.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm("هل أنت متأكد من إعادة ضبط المحادثة الحالية؟")) {
                  setMessages([]);
                }
              }}
              className="bg-white/10 hover:bg-white/20 text-indigo-50 border border-white/10 hover:border-white/20 text-xs px-3 py-1.5 rounded-xl transition-all flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              إعادة تهيئة
            </button>
          )}
        </div>
      </div>

      {/* Main Messages Viewport */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/50">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto space-y-4">
            <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600">
              <Languages className="w-10 h-10" />
            </div>
            <h4 className="font-semibold text-slate-700">تحدث بلغة طبيعية</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              اكتب أي شيء تريده باللغة المستهدفة ({profile.targetLanguage})، وسيقوم معلمك الذكي بالرد عليك بمرونة ومساعدتك في تعديل أخطائك وصياغة جملك باحترافية.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1 text-[11px] text-indigo-600 font-medium bg-indigo-50 px-2.5 py-1 rounded-lg">
                <Info className="w-3 h-3" />
                تلميحة: حدد أو اضغط نقرًا مزدوجًا على أي كلمة لإضافتها لقاموسك
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-[85%] ${
                    isUser ? "mr-auto flex-row-reverse text-left" : "ml-auto text-right"
                  }`}
                >
                  {/* Avatar Icon */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border text-xs shadow-sm font-bold ${
                      isUser
                        ? "bg-indigo-600 text-white border-indigo-700"
                        : "bg-emerald-50 text-emerald-800 border-emerald-100"
                    }`}
                  >
                    {isUser ? "أنا" : "ذكاء"}
                  </div>

                  <div className="space-y-1.5 flex-1">
                    {/* Message Bubble */}
                    <div
                      onDoubleClick={() => !isUser && extractWordForVocab(msg.content)}
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm relative ${
                        isUser
                          ? "bg-indigo-600 text-white select-text"
                          : "bg-white border border-slate-100 text-slate-850 select-text"
                      }`}
                    >
                      <p className="whitespace-pre-line font-medium">{msg.content}</p>

                      {/* Speaking TTS Voice icon */}
                      {!isUser && (
                        <div className="flex justify-end gap-1.5 border-t border-slate-50 mt-2.5 pt-2">
                          <button
                            onClick={() => toggleTranslation(msg.id)}
                            className="text-[11px] text-indigo-500 hover:text-indigo-700 transition-colors font-medium flex items-center gap-1 cursor-pointer"
                          >
                            <Languages className="w-3.5 h-3.5" />
                            {showTranslator[msg.id] ? "إخفاء الترجمة" : "ترجمة الشرح"}
                          </button>
                          <span className="text-slate-200">|</span>
                          <button
                            onClick={() => speakText(msg.id, msg.content)}
                            className={`text-[11px] transition-all flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer ${
                              speakingId === msg.id
                                ? "bg-amber-100 text-amber-800 font-semibold"
                                : "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800"
                            }`}
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            {speakingId === msg.id ? "ينطق الآن..." : "اسمع النطق"}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Collapsible Translation Segment */}
                    {!isUser && msg.translation && showTranslator[msg.id] && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-indigo-50/50 border border-indigo-100/50 rounded-xl px-3.5 py-2 text-xs text-indigo-950 flex items-start gap-2 text-right"
                      >
                        <Languages className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block text-[10px] text-indigo-500 mb-0.5">الترجمة الفورية:</span>
                          <p>{msg.translation}</p>
                        </div>
                      </motion.div>
                    )}

                    {/* Supportive Grammar spelling Corrections Section (ONLY if tutor detects grammar mistakes) */}
                    {!isUser && msg.correction && msg.correction.trim().length > 0 && (
                      <div className="bg-amber-50 border border-amber-250 rounded-xl px-4 py-3 text-xs text-amber-900 flex items-start gap-2.5 text-right font-sans">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 animate-bounce" />
                        <div className="space-y-1">
                          <span className="font-bold text-amber-850 block">مراجعة المعلم وتصحيح الصياغة:</span>
                          <p className="leading-relaxed whitespace-pre-line">{msg.correction}</p>
                        </div>
                      </div>
                    )}

                    <span className="text-[10px] text-slate-400 block px-1 text-slate-500">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Loading Bubble */}
        {isLoading && (
          <div className="flex gap-3 max-w-[80%] ml-auto text-right">
            <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 font-bold text-emerald-800 text-xs">
              M
            </div>
            <div className="space-y-1">
              <div className="bg-slate-100 text-slate-600 rounded-2xl px-4 py-3 text-xs flex items-center gap-2">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce duration-300 delay-75"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce duration-300 delay-150"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce duration-300 delay-300"></span>
                </span>
                <span>المعلم يفكر ويحلل صياغتك...</span>
              </div>
            </div>
          </div>
        )}

        {errorStatus && (
          <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl flex items-center gap-2 max-w-xl mx-auto">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <p>{errorStatus}</p>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Suggested responses drawer */}
      {messages.length > 0 && !isLoading && messages[messages.length - 1].role === "model" && (
        <div className="bg-slate-50 border-t border-slate-100 px-4 py-2.5 flex flex-wrap gap-2 items-center">
          <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mr-2">
            <HelpCircle className="w-3 h-3 text-indigo-500" />
            خيارات الرد المقترحة لمستواك:
          </span>
          {messages[messages.length - 1].suggestedResponses?.map((suggestion, idx) => (
            <button
              key={idx}
              id={`suggested-response-${idx}`}
              onClick={() => handleSuggestClick(suggestion)}
              className="text-xs bg-white hover:bg-indigo-50 text-indigo-700 font-medium px-3 py-1.5 rounded-lg border border-slate-200/60 hover:border-indigo-300 shadow-sm transition-all text-left truncate max-w-full cursor-pointer"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Message Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(inputValue);
        }}
        className="border-t border-slate-100 p-4 bg-white flex gap-2 items-center"
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={`اكتب هنا بـ ${profile.targetLanguage}...`}
          disabled={isLoading}
          dir="ltr"
          className="flex-1 bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-indigo-500 outline-none text-slate-800 placeholder:text-slate-400 font-semibold"
        />

        <button
          type="submit"
          id="btn-send-message"
          disabled={!inputValue.trim() || isLoading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl p-3 shadow-md hover:shadow-indigo-600/15 transition-all text-sm shrink-0"
        >
          <Send className="w-4 h-4 transform rotate-180" />
        </button>
      </form>
    </div>
  );
}
