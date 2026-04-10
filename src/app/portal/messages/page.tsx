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

const initialMessages: Message[] = [
  { id: 1, sender: "trainer", text: "Hey! How did your workout go yesterday? Did you manage to hit the new PR on deadlifts?", time: "9:15 AM" },
  { id: 2, sender: "you", text: "It went great! I hit 140kg for 3 reps. Felt solid the whole way through.", time: "9:22 AM" },
  { id: 3, sender: "trainer", text: "That's awesome progress! Last month you were at 125kg. Let's push for 150kg by end of next month.", time: "9:25 AM" },
  { id: 4, sender: "you", text: "Sounds like a plan. Should I keep the same rep scheme or change it up?", time: "9:30 AM" },
  { id: 5, sender: "trainer", text: "Let's switch to 5x3 heavy sets with longer rest periods. I'll update your program tonight.", time: "9:33 AM" },
  { id: 6, sender: "you", text: "Perfect, I'll check the app tomorrow morning before my session. Thanks Coach!", time: "9:35 AM" },
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
    setMessages((prev) => [...prev, {
      id: prev.length + 1, sender: "you", text: input.trim(),
      time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
    }]);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="px-5 py-3 border-b border-gold/10 bg-[#0D0D0D] flex items-center gap-3 flex-shrink-0">
        <BackArrow href="/portal/trainer" />
        <div className="w-10 h-10 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
          <span className="text-gold text-[13px] font-bold">CA</span>
        </div>
        <div>
          <p className="text-white text-[16px] font-semibold">Coach Ahmed</p>
          <p className="text-gold text-[12px]">Online</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex", msg.sender === "you" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[80%] rounded-lg px-4 py-3",
              msg.sender === "you" ? "bg-gold text-void rounded-br-sm" : "bg-white/[0.06] text-white rounded-bl-sm"
            )}>
              {msg.sender === "trainer" && <p className="text-gold text-[11px] font-semibold mb-1">Coach Ahmed</p>}
              <p className="text-[15px] leading-relaxed">{msg.text}</p>
              <p className={cn("text-[10px] mt-1.5", msg.sender === "you" ? "text-void/50 text-right" : "text-white/25")}>{msg.time}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input — positioned above bottom nav on mobile */}
      <div className="px-4 py-3 border-t border-gold/10 bg-[#0D0D0D] mb-[72px] lg:mb-0 flex-shrink-0">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type a message..."
            className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-lg px-5 py-3.5 text-[15px] text-white placeholder:text-white/20 focus:outline-none focus:border-gold/30 transition" />
          <button onClick={handleSend} disabled={!input.trim()}
            className={cn("bg-gold text-void p-3.5 rounded-lg hover:bg-gold-high transition-colors flex-shrink-0", !input.trim() && "opacity-30 cursor-not-allowed")}
            style={{ minHeight: "48px", minWidth: "48px" }}>
            <OxSend size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
