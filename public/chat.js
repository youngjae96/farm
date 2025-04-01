document.addEventListener("DOMContentLoaded", () => {
  const isLoggedIn = document.body.dataset.username; // EJS에서 전달된 유저명
  if (!isLoggedIn) return; // ❌ 로그인 안 됐으면 소켓 연결하지 않음

const socket = io({
  withCredentials: true // ✅ 쿠키 자동 전송 보장
});

  const toggleBtn = document.getElementById("chat-toggle");
  const popup = document.getElementById("chat-popup");
  const closeBtn = document.getElementById("chat-close");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");
  const messages = document.getElementById("chat-messages");

  toggleBtn.addEventListener("click", () => popup.classList.toggle("hidden"));
  closeBtn.addEventListener("click", () => popup.classList.add("hidden"));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const msg = input.value.trim();
    if (msg) {
      socket.emit("chat message", msg);
      input.value = "";
    }
  });

  socket.on("chat message", (msg) => {
    const div = document.createElement("div");
    div.textContent = msg;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  });

  fetch("/chat/logs")
    .then(res => res.json())
    .then(logs => {
      logs.forEach(msg => {
        const div = document.createElement("div");
        div.textContent = `${msg.username}: ${msg.message}`;
        messages.appendChild(div);
      });
    });
});
