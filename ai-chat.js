        const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyqRmFyGrvR_mZQxxyElTPsxS8dqcldScPWG7LpDt7BI6W2z1IrICf-FIda1D938IIk/exec'; 

        let chatHistory = [];

        function toggleChat() {
            const win = document.getElementById('ai-chat-window');
            const pulse = document.getElementById('ai-pulse');
            if(win.classList.contains('hidden')) {
                win.classList.remove('hidden'); win.classList.add('flex');
                if(pulse) pulse.classList.add('hidden');
                document.getElementById('ai-chat-input').focus();
            } else {
                win.classList.add('hidden'); win.classList.remove('flex');
            }
        }

        function handleChatKeyPress(e) { if (e.key === 'Enter') sendChatMessage(); }

        function appendChatMessage(text, sender) {
            const container = document.getElementById('ai-chat-messages');
            const wrapper = document.createElement('div');
            let parsedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');

            if (sender === 'user') {
                wrapper.className = 'self-end flex flex-col gap-1 w-full max-w-[85%] items-end';
                wrapper.innerHTML = `
                    <div class="flex items-center gap-2 mr-1"><span class="text-[10px] font-medium text-gray-400">คุณ</span><div class="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div></div>
                    <div class="bg-brand-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm text-[13px] shadow-sm chat-markdown">${parsedText}</div>`;
            } else {
                wrapper.className = 'self-start flex flex-col gap-1 w-full max-w-[85%]';
                wrapper.innerHTML = `
                    <div class="flex items-center gap-2 ml-1"><div class="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg></div><span class="text-[10px] font-medium text-gray-400">AI Assistant</span></div>
                    <div class="bg-white border border-gray-200 text-gray-700 px-4 py-3 rounded-2xl rounded-tl-sm text-[13px] shadow-sm chat-markdown">${parsedText}</div>`;
            }
            container.appendChild(wrapper); container.scrollTop = container.scrollHeight;
        }

        // ระบบพิมพ์ข้อความทีละตัวอักษร
        function appendChatMessageTypewriter(text) {
            const container = document.getElementById('ai-chat-messages');
            const wrapper = document.createElement('div');
            
            let parsedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');

            wrapper.className = 'self-start flex flex-col gap-1 w-full max-w-[85%]';
            wrapper.innerHTML = `
                <div class="flex items-center gap-2 ml-1"><div class="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg></div><span class="text-[10px] font-medium text-gray-400">AI Assistant</span></div>
                <div class="bg-white border border-gray-200 text-gray-700 px-4 py-3 rounded-2xl rounded-tl-sm text-[13px] shadow-sm chat-markdown"></div>`;
            
            container.appendChild(wrapper);
            const textContainer = wrapper.querySelector('.chat-markdown');
            
            let i = 0; let isTag = false; let currentHTML = "";

            function type() {
                if (i < parsedText.length) {
                    let char = parsedText.charAt(i);
                    if (char === '<') isTag = true;
                    currentHTML += char;
                    if (char === '>') isTag = false;

                    if (isTag) {
                        i++; type(); 
                    } else {
                        textContainer.innerHTML = currentHTML;
                        container.scrollTop = container.scrollHeight;
                        i++; setTimeout(type, 15);
                    }
                }
            }
            type();
        }

        function appendTypingIndicator() {
            const container = document.getElementById('ai-chat-messages');
            const wrapper = document.createElement('div'); wrapper.id = 'ai-typing-indicator'; wrapper.className = 'self-start flex flex-col gap-1 w-full max-w-[85%]';
            wrapper.innerHTML = `<div class="flex items-center gap-2 ml-1"><div class="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg></div><span class="text-[10px] font-medium text-gray-400">กำลังพิมพ์...</span></div><div class="bg-white border border-gray-200 text-gray-400 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex gap-1 items-center w-16 h-10"><div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div><div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div><div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.4s"></div></div>`;
            container.appendChild(wrapper); container.scrollTop = container.scrollHeight;
        }

        function removeTypingIndicator() { const indicator = document.getElementById('ai-typing-indicator'); if (indicator) indicator.remove(); }

        async function sendChatMessage() {
            const inputEl = document.getElementById('ai-chat-input');
            const btnEl = document.getElementById('ai-send-btn');
            const userMsg = inputEl.value.trim();
            
            if(!userMsg) return;

            appendChatMessage(userMsg, 'user');
            inputEl.value = ''; inputEl.disabled = true; btnEl.disabled = true;
            appendTypingIndicator();

            chatHistory.push({ role: "user", parts: [{ text: userMsg }] });

            const payload = {
                action: "chatAI",
                contents: chatHistory
            };

            try {
                const response = await fetch(GAS_WEB_APP_URL, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
                });
                
                const result = await response.json();
                // console.log("AI Response Data:", result);
                
                if(result.status === 'success' && result.text) {
                    chatHistory.push({ role: "model", parts: [{ text: result.text }] });
                    removeTypingIndicator();
                    appendChatMessageTypewriter(result.text);
                } else {
                    throw new Error("AI response error");
                }

            } catch (err) {
                console.error("AI Chat Error:", err);
                removeTypingIndicator();
                chatHistory.pop(); 
                appendChatMessageTypewriter("ขออภัยค่ะ ระบบเซิร์ฟเวอร์ของโรงเรียนขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้งนะคะ");
            } finally {
                inputEl.disabled = false; btnEl.disabled = false; inputEl.focus();
            }
        }
