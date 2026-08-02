const scenes = {
  living: {
    icon: "🛋️", color: "#f7b39a", shadow: "#d68570", intro: "我们去客厅看看吧！",
    items: [
      ["🛋️", "沙发", "我坐在沙发上", "#f49c83"], ["📺", "电视", "我在看电视", "#8ba5ed"], ["🪴", "植物", "这是一盆植物", "#79c898"],
      ["💡", "台灯", "台灯亮起来了", "#f4ce68"], ["🧸", "玩具熊", "我喜欢玩具熊", "#c99b79"], ["⚽", "皮球", "皮球滚呀滚", "#93c8de"]
    ]
  },
  kitchen: {
    icon: "🍎", color: "#ffd37e", shadow: "#d5a74d", intro: "我们去厨房看看吧！",
    items: [
      ["🍎", "苹果", "这是一个红苹果", "#f58a7e"], ["🥛", "牛奶", "我想喝牛奶", "#92c9e8"], ["🥣", "小碗", "碗里有好吃的", "#f6b777"],
      ["🥄", "勺子", "我用勺子吃饭", "#abc2cd"], ["🍌", "香蕉", "香蕉是黄色的", "#f7dc6f"], ["🥕", "胡萝卜", "胡萝卜脆脆的", "#f29b66"]
    ]
  },
  bedroom: {
    icon: "🛏️", color: "#b7a9eb", shadow: "#887ac3", intro: "我们去卧室看看吧！",
    items: [
      ["🛏️", "小床", "我在床上睡觉", "#aaa3ea"], ["☁️", "枕头", "枕头软软的", "#efb6c7"], ["🧦", "袜子", "我穿上小袜子", "#8bc6e4"],
      ["📕", "图画书", "我在看图画书", "#ef8b7d"], ["⏰", "闹钟", "闹钟响了", "#f1c66d"], ["🌙", "月亮", "月亮出来了", "#9aa9dd"]
    ]
  },
  family: {
    icon: "👨‍👩‍👧‍👦", color: "#f4a8c2", shadow: "#ce7898", intro: "来认识我们的家人吧！",
    items: [
      ["👨", "爸爸", "这是爸爸", "#86bae2"], ["👩", "妈妈", "这是妈妈", "#f29ab5"], ["👦", "哥哥", "这是哥哥", "#8cd0b0"],
      ["👧", "姐姐", "这是姐姐", "#f5bd75"], ["👴", "爷爷", "这是爷爷", "#ada3d8"], ["👵", "奶奶", "这是奶奶", "#e9a59d"]
    ]
  }
};

const state = {
  scene: "living",
  page: 0,
  mode: "explore",
  seen: new Set(),
  target: 0,
  wins: 0,
  locked: false,
  quizTimer: null,
  stars: Number(localStorage.getItem("xiaowen-stars") || 0),
  musicOn: localStorage.getItem("xiaowen-music") !== "off",
  audioReady: false
};

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const screens = { welcome: $("#welcomeScreen"), world: $("#worldScreen"), play: $("#playScreen") };
const stage = $("#objectStage");
const promptOrb = $("#promptOrb");
const promptIcon = $("#promptIcon");
const reward = $("#reward");
const totalStars = $("#totalStars");
const canvas = $("#fxCanvas");
const ctx = canvas.getContext("2d");
let particles = [];
let audioContext;
let musicTimer;
let voices = [];

function showScreen(name) {
  Object.entries(screens).forEach(([key, screen]) => screen.classList.toggle("is-active", key === name));
}

function loadVoices() { voices = speechSynthesis.getVoices(); }
if ("speechSynthesis" in window) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}

function bestChineseVoice() {
  const list = voices.filter(voice => /^zh/i.test(voice.lang));
  const preferred = ["xiaoxiao", "yunxi", "tingting", "ting-ting", "meijia", "sin-ji", "mandarin", "natural", "premium", "enhanced"];
  return list.sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] || null;
  function scoreVoice(voice) {
    const name = voice.name.toLowerCase();
    const index = preferred.findIndex(word => name.includes(word));
    return (index < 0 ? 0 : 100 - index * 5) + (/zh[-_]?(cn|hans)/i.test(voice.lang) ? 40 : 0) + (voice.default ? 5 : 0);
  }
}

function speak(text, options = {}) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-CN";
  utterance.rate = options.slow ? .78 : .86;
  utterance.pitch = 1.06;
  const voice = bestChineseVoice();
  if (voice) utterance.voice = voice;
  utterance.onstart = () => promptOrb.classList.add("is-speaking");
  utterance.onend = () => promptOrb.classList.remove("is-speaking");
  speechSynthesis.speak(utterance);
  showAudioHint();
}

function showAudioHint() {
  const hint = $("#audioHint");
  hint.classList.add("is-showing");
  clearTimeout(showAudioHint.timer);
  showAudioHint.timer = setTimeout(() => hint.classList.remove("is-showing"), 550);
}

function ensureAudio() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === "suspended") audioContext.resume();
  state.audioReady = true;
}

function tone(frequency, duration = .12, type = "sine", volume = .035, when = 0) {
  if (!state.audioReady || !audioContext) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, audioContext.currentTime + when);
  gain.gain.exponentialRampToValueAtTime(volume, audioContext.currentTime + when + .018);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + when + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(audioContext.currentTime + when);
  oscillator.stop(audioContext.currentTime + when + duration + .03);
}

function playSfx(kind) {
  ensureAudio();
  if (kind === "tap") { tone(520, .09, "sine", .025); tone(780, .12, "sine", .018, .06); }
  if (kind === "correct") { [523, 659, 784, 1047].forEach((note, i) => tone(note, .22, "triangle", .035, i * .08)); }
  if (kind === "wrong") { tone(210, .11, "sine", .025); tone(175, .14, "sine", .02, .09); }
  if (kind === "page") { tone(440, .08, "triangle", .02); tone(587, .11, "triangle", .02, .07); }
}

function startMusic() {
  if (!state.musicOn || !state.audioReady || musicTimer) return;
  const notes = [261.63, 329.63, 392, 523.25, 392, 329.63, 293.66, 349.23];
  let step = 0;
  const playNote = () => {
    if (!state.musicOn) return;
    tone(notes[step % notes.length], .75, "sine", .012);
    if (step % 2 === 0) tone(notes[step % notes.length] / 2, 1.1, "triangle", .006);
    step += 1;
  };
  playNote();
  musicTimer = setInterval(playNote, 920);
}

function stopMusic() { clearInterval(musicTimer); musicTimer = null; }
function syncMusicButtons() { $$(".music-button").forEach(button => button.classList.toggle("is-muted", !state.musicOn)); }

function renderWorld() {
  $("#sceneGrid").innerHTML = Object.entries(scenes).map(([key, scene], index) => `
    <button class="scene-card" data-scene="${key}" style="--scene-color:${scene.color};--scene-shadow:${scene.shadow};--delay:${index * 80}ms" aria-label="${scene.intro}">
      <span aria-hidden="true">${scene.icon}</span>
    </button>
  `).join("");
  [...totalStars.children].forEach((star, index) => star.classList.toggle("is-lit", index < Math.min(3, state.stars)));
  syncMusicButtons();
}

function currentItems() { return scenes[state.scene].items.slice(state.page * 3, state.page * 3 + 3); }

function renderPlay() {
  const items = currentItems();
  stage.innerHTML = items.map((item, index) => {
    const absoluteIndex = state.page * 3 + index;
    const seen = state.seen.has(absoluteIndex);
    const inviting = state.mode === "explore" && state.seen.size === 0 && index === 0;
    return `<button class="object-button${seen ? " is-seen" : ""}${inviting ? " is-inviting" : ""}" data-index="${absoluteIndex}" style="--item:${item[3]};--delay:${index * 90}ms" aria-label="${item[1]}"><span aria-hidden="true">${item[0]}</span></button>`;
  }).join("");
  $("#pagePrev").disabled = state.page === 0;
  $("#pageNext").disabled = state.page === 1;
  promptIcon.textContent = state.mode === "quiz" ? "👂" : "👆";
  promptOrb.classList.toggle("is-listening", state.mode === "quiz");
  renderProgress();
  syncMusicButtons();
}

function renderProgress() {
  const done = state.mode === "quiz" ? state.wins : state.seen.size;
  $("#progressPips").innerHTML = [0, 1, 2].map(index => `<i class="${index < done ? "is-done" : ""}"></i>`).join("");
}

function enterScene(key) {
  clearTimeout(state.quizTimer);
  state.quizTimer = null;
  state.scene = key;
  state.page = 0;
  state.mode = "explore";
  state.seen = new Set();
  state.wins = 0;
  state.locked = false;
  showScreen("play");
  renderPlay();
  playSfx("page");
  setTimeout(() => speak(scenes[key].intro), 350);
}

function itemClick(button) {
  if (state.locked) return;
  const index = Number(button.dataset.index);
  const item = scenes[state.scene].items[index];
  button.classList.remove("is-wrong", "is-correct", "is-inviting");
  void button.offsetWidth;

  if (state.mode === "explore") {
    state.seen.add(index);
    button.classList.add("is-seen", "is-correct");
    playSfx("tap");
    burstAt(button, 9, ["#fff7a8", "#ff9f84", "#91dbc3"]);
    speak(item[1], { slow: true });
    renderProgress();
    if (state.seen.size >= 3 && !state.quizTimer) {
      state.quizTimer = setTimeout(() => { state.quizTimer = null; startQuiz(); }, 1050);
    }
    return;
  }

  if (index === state.target) {
    state.locked = true;
    button.classList.add("is-correct");
    state.wins += 1;
    state.stars += 1;
    localStorage.setItem("xiaowen-stars", String(state.stars));
    playSfx("correct");
    burstAt(button, 26, ["#ffd151", "#ff8c7a", "#80d6bd", "#8abaf0"]);
    speak(`太棒了！这是${item[1]}`);
    renderProgress();
    showReward();
    setTimeout(() => {
      state.locked = false;
      if (state.wins >= 3) finishRound(); else nextTarget();
    }, 1250);
  } else {
    button.classList.add("is-wrong");
    playSfx("wrong");
    speak("再试一次");
  }
}

function startQuiz() {
  if (state.mode !== "explore") return;
  state.mode = "quiz";
  state.wins = 0;
  state.locked = false;
  state.seen = new Set();
  nextTarget();
  renderPlay();
}

function nextTarget() {
  const choices = [state.page * 3, state.page * 3 + 1, state.page * 3 + 2].filter(index => index !== state.target);
  state.target = choices[Math.floor(Math.random() * choices.length)];
  renderPlay();
  setTimeout(repeatPrompt, 180);
}

function repeatPrompt() {
  const item = scenes[state.scene].items[state.target];
  if (state.mode === "quiz") speak(`找一找，${item[1]}在哪里？`, { slow: true });
  else speak("点一点，听一听");
}

function showReward() {
  reward.classList.remove("is-showing");
  void reward.offsetWidth;
  reward.classList.add("is-showing");
  setTimeout(() => reward.classList.remove("is-showing"), 1000);
}

function finishRound() {
  state.locked = false;
  if (state.page === 0) {
    state.page = 1;
    state.mode = "explore";
    state.seen = new Set();
    state.wins = 0;
    renderPlay();
    playSfx("page");
    speak("还有新朋友，点一点吧！");
  } else {
    burst(window.innerWidth / 2, window.innerHeight / 2, 70, ["#ffd151", "#ff8c7a", "#80d6bd", "#8abaf0", "#ffffff"]);
    speak("全部完成啦，真棒！");
    setTimeout(() => { renderWorld(); showScreen("world"); }, 1650);
  }
}

function changePage(direction) {
  const nextPage = Math.max(0, Math.min(1, state.page + direction));
  if (nextPage === state.page) return;
  clearTimeout(state.quizTimer);
  state.quizTimer = null;
  state.page = nextPage;
  state.mode = "explore";
  state.seen = new Set();
  state.wins = 0;
  state.locked = false;
  playSfx("page");
  renderPlay();
  speak("点一点，听一听");
}

function toggleMusic() {
  ensureAudio();
  state.musicOn = !state.musicOn;
  localStorage.setItem("xiaowen-music", state.musicOn ? "on" : "off");
  if (state.musicOn) startMusic(); else stopMusic();
  syncMusicButtons();
  playSfx("tap");
}

function resizeCanvas() {
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = innerWidth * ratio;
  canvas.height = innerHeight * ratio;
  canvas.style.width = `${innerWidth}px`;
  canvas.style.height = `${innerHeight}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function burstAt(element, count, colors) {
  const rect = element.getBoundingClientRect();
  burst(rect.left + rect.width / 2, rect.top + rect.height / 2, count, colors);
}

function burst(x, y, count, colors) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2.5 + Math.random() * 6;
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2, gravity: .15, life: 1, decay: .014 + Math.random() * .018, size: 5 + Math.random() * 10, color: colors[i % colors.length], spin: Math.random() * .3 });
  }
}

function animateParticles() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  particles = particles.filter(particle => particle.life > 0);
  particles.forEach(particle => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += particle.gravity;
    particle.life -= particle.decay;
    ctx.save();
    ctx.globalAlpha = Math.max(0, particle.life);
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.life * particle.spin * 10);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.roundRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size, 3);
    ctx.fill();
    ctx.restore();
  });
  requestAnimationFrame(animateParticles);
}

$("#playButton").addEventListener("click", () => {
  ensureAudio();
  playSfx("correct");
  startMusic();
  renderWorld();
  showScreen("world");
  setTimeout(() => speak("选一个地方，开始探索吧！"), 420);
});

$("#sceneGrid").addEventListener("click", event => {
  const button = event.target.closest("[data-scene]");
  if (button) enterScene(button.dataset.scene);
});

stage.addEventListener("click", event => {
  const button = event.target.closest(".object-button");
  if (button) itemClick(button);
});

document.addEventListener("click", event => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "home") {
    clearTimeout(state.quizTimer);
    state.quizTimer = null;
    state.locked = false;
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    playSfx("page");
    renderWorld();
    showScreen("world");
  }
  if (action === "music") toggleMusic();
});

$("#repeatPrompt").addEventListener("click", repeatPrompt);
$("#pagePrev").addEventListener("click", () => changePage(-1));
$("#pageNext").addEventListener("click", () => changePage(1));
window.addEventListener("resize", resizeCanvas);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { stopMusic(); if ("speechSynthesis" in window) speechSynthesis.cancel(); }
  else if (state.musicOn && state.audioReady) startMusic();
});

resizeCanvas();
renderWorld();
syncMusicButtons();
animateParticles();
