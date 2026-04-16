"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { BackArrow } from "@/components/portal/BackArrow";
import { OxSend } from "@/components/icons/OxIcons";

type Message = {
  id: number;
  sender: "you" | "trainer";
  text: string;
  time: string;
};

// Professional Arabic messages — subscription / training context
const initialMessages: Message[] = [
  {
    id: 1,
    sender: "trainer",
    text: "من: المدرب\nإلى: العضو\n\nتم تحديث برنامج تمرينك للأسبوع القادم. يرجى مراجعة الجدول الجديد والالتزام بمواعيد الجلسات.",
    time: "9:15 ص",
  },
  {
    id: 2,
    sender: "you",
    text: "تم الاطلاع على البرنامج. سأبدأ التطبيق غداً في الموعد المحدد.",
    time: "9:22 ص",
  },
  {
    id: 3,
    sender: "trainer",
    text: "من: المدرب\nإلى: العضو\n\nتذكير: اشتراكك الحالي يتضمن جلستين أسبوعيًا مع المدرب. تواصل معنا لتعديل الخطة أو الترقية.",
    time: "9:25 ص",
  },
  {
    id: 4,
    sender: "you",
    text: "أريد الاستفسار عن ترقية الاشتراك لتشمل جلسة إضافية أسبوعيًا.",
    time: "9:30 ص",
  },
  {
    id: 5,
    sender: "trainer",
    text: "من: المدرب\nإلى: العضو\n\nيمكنك ترقية اشتراكك عبر الاستقبال أو التواصل معنا مباشرة. سنوفر لك خطة مخصصة وفق أهدافك.",
    time: "9:33 ص",
  },
];

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        sender: "you",
        text: input.trim(),
        time: new Date().toLocaleTimeString("ar-SA", { hour: "numeric", minute: "2-digit", hour12: true }),
      },
    ]);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="px-5 py-3 border-b border-gold/10 bg-[#0D0D0D] flex items-center gap-3 flex-shrink-0">
        <BackArrow href="/portal/trainer" />
        <div className="w-10 h-10 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
          <span className="text-gold text-[13px] font-bold">مد</span>
        </div>
        <div>
          <p className="text-white text-[16px] font-semibold">المدرب</p>
          <p className="text-gold text-[12px]">متصل</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex", msg.sender === "you" ? "justify-start" : "justify-end")}>
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-4 py-3",
                msg.sender === "you"
                  ? "bg-white/[0.06] text-white rounded-bl-sm"
                  : "bg-gold text-void rounded-br-sm"
              )}
            >
              {msg.sender === "trainer" && (
                <p className="text-void/60 text-[11px] font-semibold mb-1">المدرب الشخصي</p>
              )}
              <p className="text-[15px] leading-relaxed whitespace-pre-line">{msg.text}</p>
              <p
                className={cn(
                  "text-[10px] mt-1.5",
                  msg.sender === "you" ? "text-white/25" : "text-void/50 text-left"
                )}
              >
                {msg.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gold/10 bg-[#0D0D0D] mb-[72px] lg:mb-0 flex-shrink-0">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="اكتب رسالتك..."
            className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-lg px-5 py-3.5 text-[15px] text-white placeholder:text-white/20 focus:outline-none focus:border-gold/30 transition"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className={cn(
              "bg-gold text-void p-3.5 rounded-lg hover:bg-gold-high transition-colors flex-shrink-0",
              !input.trim() && "opacity-30 cursor-not-allowed"
            )}
            style={{ minHeight: "48px", minWidth: "48px" }}
          >
            <OxSend size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
