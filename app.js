// ====== DATA & STATE ======
let ALL_QUESTIONS = [];
let selectedTopic = 'all';
let selectedMode = 'quiz';
let selectedCount = 30;
let currentQuestions = [];
let currentIndex = 0;
let answers = {}; // {index: chosenKey}
let startTime = null;
let flashIndex = 0;
let flashKnew = new Set();
let flashReview = new Set();
let sessionData = null; // last session for restart

const TOPICS = [
  { id: 'all', label: '🌐 Tất Cả', keywords: [] },
  { id: 'sql', label: '🗄 SQL', keywords: ['sql','select','insert','update','delete','join','where','group by','having','index','trigger','procedure','transaction','cơ sở dữ liệu','bảng','truy vấn','union','rollback','commit','ddl','dml','dcl','oracle','mysql','nosql','mongodb','acid'] },
  { id: 'git', label: '🔀 Git', keywords: ['git','commit','branch','merge','push','pull','fetch','checkout','repository','staging','remote','rebase','stash','reflog'] },
  { id: 'agile', label: '🔄 Agile', keywords: ['agile','scrum','sprint','waterfall','backlog','devops','ci/cd','cicd','kanban','iterative','incremental','release','stand-up','retrospective','thác nước','lặp','kiểm thử','testing','unit test'] },
  { id: 'dsa', label: '🧮 DSA', keywords: ['mảng','array','stack','queue','ngăn xếp','hàng đợi','linked list','danh sách liên kết','cây','tree','đồ thị','graph','sort','sắp xếp','tìm kiếm','search','đệ quy','recursion','bubble','binary','fibonacci','độ phức tạp','thuật toán'] },
  { id: 'attt', label: '🔒 ATTT', keywords: ['xss','sql injection','attt','bảo mật','mã hóa','hash','salt','session','cookie','csrf','upload','whitelist','blacklist','phân quyền','authentication','encryption','md5','sha','owasp'] },
  { id: 'linux', label: '🐧 Linux', keywords: ['linux','chmod','chown','ls','cp','mv','rm','grep','sudo','root','bash','shell','rpm','apt','yum','mount','fstab','process','runlevel','crontab','pipe','redirect'] },
  { id: 'oop', label: '💡 OOP', keywords: ['class','object','inheritance','polymorphism','encapsulation','abstraction','interface','java','đa hình','kế thừa','đóng gói','hướng đối tượng','uml','diagram','use case'] },
];

// ====== INIT ======
async function init() {
  createParticles();
  try {
    const resp = await fetch('questions.json');
    const raw = await resp.json();
    ALL_QUESTIONS = raw.filter(q => {
      const text = q.question || q.quesition || q.cau_hoi || '';
      const ansA = q.A || q.dap_an_A || '';
      const ansB = q.B || q.dap_an_B || '';
      return text.trim() && ansA && ansB;
    });
  } catch(e) {
    console.error('Failed to load questions', e);
    ALL_QUESTIONS = [];
  }
  renderTopics();
  renderTopicPill('all');
  selectMode('quiz');
  updateStartInfo();
}

function getCorrectKey(q) {
  const correctVal = q.result || q.dap_an_dung_cua_cau_hoi;
  const correctNum = parseInt(correctVal);
  return ['A','B','C','D'][correctNum - 1] || 'A';
}

function createParticles() {
  const container = document.getElementById('bgParticles');
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 6 + 2;
    const colors = ['rgba(108,99,255,0.4)','rgba(0,212,255,0.3)','rgba(255,107,157,0.3)'];
    p.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;background:${colors[Math.floor(Math.random()*3)]};animation-duration:${8+Math.random()*12}s;animation-delay:${Math.random()*10}s`;
    container.appendChild(p);
  }
}

// ====== TOPIC DETECTION ======
function detectTopic(q) {
  const text = ((q.question || q.quesition || q.cau_hoi || '') + ' ' + (q.A || q.dap_an_A || '') + ' ' + (q.B || q.dap_an_B || '') + ' ' + (q.C || q.dap_an_C || '') + ' ' + (q.D || q.dap_an_D || '')).toLowerCase();
  for (const t of TOPICS.slice(1)) {
    if (t.keywords.some(k => text.includes(k))) return t.id;
  }
  return 'other';
}

function getQuestionsForTopic(topicId) {
  if (topicId === 'all') return ALL_QUESTIONS;
  return ALL_QUESTIONS.filter(q => detectTopic(q) === topicId);
}

function countForTopic(topicId) {
  return getQuestionsForTopic(topicId).length;
}

// ====== RENDER TOPICS ======
function renderTopics() {
  const grid = document.getElementById('topicGrid');
  grid.innerHTML = '';
  TOPICS.forEach(t => {
    const cnt = countForTopic(t.id);
    const pill = document.createElement('button');
    pill.className = 'topic-pill' + (t.id === selectedTopic ? ' selected' : '');
    pill.id = 'topic_' + t.id;
    pill.innerHTML = `${t.label} <span class="count">${cnt}</span>`;
    pill.onclick = () => { selectedTopic = t.id; renderTopicPill(t.id); updateStartInfo(); };
    grid.appendChild(pill);
  });
}

function renderTopicPill(activeId) {
  document.querySelectorAll('.topic-pill').forEach(el => el.classList.remove('selected'));
  const el = document.getElementById('topic_' + activeId);
  if (el) el.classList.add('selected');
}

// ====== MODE ======
function selectMode(mode) {
  selectedMode = mode;
  document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
  document.getElementById(mode === 'quiz' ? 'modeQuiz' : 'modeFlash').classList.add('selected');
  updateStartInfo();
}

function selectCount(count) {
  selectedCount = count;
  document.querySelectorAll('#countSelection .mode-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('count' + (count === 'all' ? 'All' : count)).classList.add('selected');
  updateStartInfo();
}

function updateStartInfo() {
  const topicLabel = TOPICS.find(t => t.id === selectedTopic)?.label || 'Tất cả';
  const modeLabel = selectedMode === 'quiz' ? '📝 Quiz Mode' : '⚡ Flashcard';
  const pool = getQuestionsForTopic(selectedTopic);
  const cnt = selectedCount === 'all' ? pool.length : Math.min(selectedCount, pool.length);
  document.getElementById('selectedTopicLabel').textContent = topicLabel;
  document.getElementById('selectedModeLabel').textContent = modeLabel;
  document.getElementById('questionCountLabel').textContent = `${cnt} câu`;
}

// ====== START ======
function startSession() {
  const pool = getQuestionsForTopic(selectedTopic);
  if (pool.length === 0) { alert('Không có câu hỏi nào cho chủ đề này!'); return; }
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const cnt = selectedCount === 'all' ? pool.length : selectedCount;
  currentQuestions = shuffled.slice(0, cnt);
  sessionData = { topic: selectedTopic, mode: selectedMode, count: selectedCount };
  if (selectedMode === 'quiz') startQuiz();
  else startFlash();
}

// ====== QUIZ ======
function startQuiz() {
  currentIndex = 0;
  answers = {};
  startTime = Date.now();
  showView('quiz');
  const topicLabel = TOPICS.find(t => t.id === selectedTopic)?.label || 'Quiz';
  document.getElementById('quizTopicTag').textContent = topicLabel;
  renderQuestion();
  renderDots();
}

function renderQuestion() {
  const q = currentQuestions[currentIndex];
  const total = currentQuestions.length;
  document.getElementById('quizProgressText').textContent = `Câu ${currentIndex + 1} / ${total}`;
  document.getElementById('progressBarFill').style.width = `${((currentIndex + 1) / total) * 100}%`;
  document.getElementById('questionNumber').textContent = String(currentIndex + 1).padStart(2, '0');
  document.getElementById('questionText').textContent = cleanText(q.question || q.quesition || q.cau_hoi);
  const optGrid = document.getElementById('optionsGrid');
  optGrid.innerHTML = '';
  const opts = [
    { key: 'A', text: q.A || q.dap_an_A },
    { key: 'B', text: q.B || q.dap_an_B },
    { key: 'C', text: q.C || q.dap_an_C },
    { key: 'D', text: q.D || q.dap_an_D },
  ].filter(o => o.text && o.text.trim());

  const correctKey = getCorrectKey(q);
  const chosen = answers[currentIndex];

  opts.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerHTML = `<span class="option-letter">${opt.key}</span><span>${cleanText(opt.text)}</span>`;
    if (chosen) {
      btn.disabled = true;
      if (opt.key === correctKey) btn.classList.add('correct');
      else if (opt.key === chosen) btn.classList.add('wrong');
      else btn.classList.add('dimmed');
    } else {
      btn.onclick = () => chooseAnswer(opt.key, correctKey);
    }
    optGrid.appendChild(btn);
  });

  // Show feedback if already answered
  const fb = document.getElementById('feedbackArea');
  if (chosen) {
    const isRight = chosen === correctKey;
    fb.className = 'feedback-area ' + (isRight ? 'correct-fb' : 'wrong-fb');
    document.getElementById('feedbackIcon').textContent = isRight ? '🎉' : '😅';
    document.getElementById('feedbackText').textContent = isRight ? 'Chính xác! Bạn đã trả lời đúng.' : `Chưa đúng! Đáp án đúng là: ${correctKey}. ${cleanText(q[correctKey] || q['dap_an_' + correctKey] || '')}`;
  } else {
    fb.className = 'feedback-area hidden';
  }

  document.getElementById('btnPrev').disabled = currentIndex === 0;
  document.getElementById('btnNext').textContent = currentIndex === currentQuestions.length - 1 ? 'Kết Thúc →' : 'Câu Tiếp →';
  updateDots();
}

function cleanText(t) {
  if (!t) return '';
  return t.replace(/\[/g, '').replace(/\]/g, '').replace(/\n+/g, '\n').trim();
}

function chooseAnswer(key, correctKey) {
  answers[currentIndex] = key;
  // Track wrong answers for stats
  const q = currentQuestions[currentIndex];
  const isRight = key === correctKey;
  const sttId = q.Stt || q.stt;
  if (!isRight) {
    trackWrong(sttId);
  } else {
    trackCorrect(sttId);
  }
  renderQuestion();
  renderDots();
}

function prevQuestion() {
  if (currentIndex > 0) { currentIndex--; renderQuestion(); }
}

function nextQuestion() {
  if (currentIndex < currentQuestions.length - 1) {
    currentIndex++;
    renderQuestion();
  } else {
    finishQuiz();
  }
}

function renderDots() {
  const container = document.getElementById('questionDots');
  container.innerHTML = '';
  currentQuestions.forEach((q, i) => {
    const d = document.createElement('div');
    d.className = 'q-dot';
    const correctKey = getCorrectKey(q);
    const chosen = answers[i];
    if (i === currentIndex) d.classList.add('current');
    else if (chosen && chosen === correctKey) d.classList.add('answered');
    else if (chosen) d.classList.add('wrong');
    d.onclick = () => { currentIndex = i; renderQuestion(); updateDots(); };
    container.appendChild(d);
  });
}

function updateDots() { renderDots(); }

function finishQuiz() {
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  let correct = 0, wrong = 0, skipped = 0;
  const wrongItems = [];
  currentQuestions.forEach((q, i) => {
    const correctKey = getCorrectKey(q);
    const chosen = answers[i];
    if (!chosen) skipped++;
    else if (chosen === correctKey) correct++;
    else { wrong++; wrongItems.push({ q, chosen, correctKey }); }
  });
  const pct = Math.round((correct / currentQuestions.length) * 100);
  const wrongIds = wrongItems.map(w => w.q.Stt || w.q.stt);
  saveHistory({ id: Date.now(), topic: selectedTopic, mode: 'quiz', correct, wrong, skipped, total: currentQuestions.length, pct, elapsed, date: new Date().toISOString(), wrongIds });
  showResultView(correct, wrong, skipped, pct, elapsed, wrongItems);
}

function showResultView(correct, wrong, skipped, pct, elapsed, wrongItems) {
  showView('result');
  document.getElementById('statCorrect').textContent = correct;
  document.getElementById('statWrong').textContent = wrong;
  document.getElementById('statSkipped').textContent = skipped;
  document.getElementById('statTime').textContent = elapsed + 's';
  document.getElementById('scoreNum').textContent = pct;

  // Trophy & message
  let trophy = '🏆', title = 'Xuất Sắc!', msg = 'Bạn đã làm rất tốt! Hãy tiếp tục phát huy nhé.';
  if (pct < 50) { trophy = '😓'; title = 'Cần Cố Gắng!'; msg = 'Đừng nản lòng! Xem lại lý thuyết và thử lại nhé.'; }
  else if (pct < 70) { trophy = '💪'; title = 'Khá Ổn!'; msg = 'Bạn đang tiến bộ. Xem lại các câu sai để hoàn thiện hơn!'; }
  else if (pct < 90) { trophy = '🎯'; title = 'Tốt Lắm!'; msg = 'Kết quả rất ấn tượng! Chỉ còn một chút nữa là hoàn hảo.'; }
  document.getElementById('resultTrophy').textContent = trophy;
  document.getElementById('resultTitle').textContent = title;
  document.getElementById('resultMessage').textContent = msg;

  // Circular progress
  const circle = document.getElementById('scoreCircle');
  const circumference = 314;
  setTimeout(() => {
    circle.style.strokeDashoffset = circumference - (pct / 100) * circumference;
  }, 200);

  // Review wrong
  const reviewList = document.getElementById('reviewList');
  reviewList.innerHTML = '';
  if (wrongItems.length === 0) {
    reviewList.innerHTML = '<div class="empty-state"><div class="empty-icon">🎊</div><div>Không có câu nào sai!</div></div>';
  } else {
    wrongItems.forEach(({ q, chosen, correctKey }) => {
      const div = document.createElement('div');
      div.className = 'review-item';
      div.innerHTML = `<div class="review-q">${cleanText(q.question || q.quesition || q.cau_hoi)}</div>
        <div class="review-answers">
          <span class="review-your">❌ Bạn chọn: ${chosen} — ${cleanText(q[chosen] || q['dap_an_' + chosen] || '')}</span><br>
          <span class="review-correct-ans">✅ Đúng: ${correctKey} — ${cleanText(q[correctKey] || q['dap_an_' + correctKey] || '')}</span>
        </div>`;
      reviewList.appendChild(div);
    });
  }
}

function restartQuiz() {
  if (sessionData) {
    if (sessionData.isRetry && sessionData.wrongIds) {
      currentQuestions = ALL_QUESTIONS.filter(q => sessionData.wrongIds.includes(q.Stt || q.stt)).sort(() => Math.random() - 0.5);
      startQuiz();
    } else {
      selectedTopic = sessionData.topic;
      selectedMode = sessionData.mode;
      if (sessionData.count) selectCount(sessionData.count);
      startSession();
    }
  }
}

function exitQuiz() { showView('home'); }

// ====== FLASHCARD ======
function startFlash() {
  flashIndex = 0;
  flashKnew = new Set();
  flashReview = new Set();
  showView('flash');
  const topicLabel = TOPICS.find(t => t.id === selectedTopic)?.label || 'Flashcard';
  document.getElementById('flashTopicTag').textContent = topicLabel;
  renderFlashCard();
}

function renderFlashCard() {
  const q = currentQuestions[flashIndex];
  const total = currentQuestions.length;
  document.getElementById('flashProgressText').textContent = `${flashIndex + 1} / ${total}`;
  document.getElementById('flashProgressFill').style.width = `${((flashIndex + 1) / total) * 100}%`;
  document.getElementById('flashQuestion').textContent = cleanText(q.question || q.quesition || q.cau_hoi);
  const correctKey = getCorrectKey(q);
  const correctText = cleanText(q[correctKey] || q['dap_an_' + correctKey] || 'Không có đáp án');
  document.getElementById('flashAnswer').textContent = `${correctKey}. ${correctText}`;
  // reset flip
  document.getElementById('cardInner').classList.remove('flipped');
  updateFlashCounters();
}

function flipCard() {
  document.getElementById('cardInner').classList.toggle('flipped');
}

function flashPrev() {
  if (flashIndex > 0) { flashIndex--; renderFlashCard(); }
}

function flashNext() {
  if (flashIndex < currentQuestions.length - 1) { flashIndex++; renderFlashCard(); }
  else { alert('Bạn đã xem hết flashcard!'); }
}

function markKnew() {
  flashKnew.add(flashIndex);
  flashReview.delete(flashIndex);
  updateFlashCounters();
  if (flashIndex < currentQuestions.length - 1) { flashIndex++; renderFlashCard(); }
}

function markReview() {
  flashReview.add(flashIndex);
  flashKnew.delete(flashIndex);
  updateFlashCounters();
  if (flashIndex < currentQuestions.length - 1) { flashIndex++; renderFlashCard(); }
}

function updateFlashCounters() {
  document.getElementById('knewCount').textContent = flashKnew.size;
  document.getElementById('reviewCount').textContent = flashReview.size;
}

// ====== HISTORY ======
function saveHistory(entry) {
  const hist = JSON.parse(localStorage.getItem('quizHistory') || '[]');
  hist.unshift(entry);
  if (hist.length > 50) hist.length = 50;
  localStorage.setItem('quizHistory', JSON.stringify(hist));
}

function renderHistory() {
  const hist = JSON.parse(localStorage.getItem('quizHistory') || '[]');
  const list = document.getElementById('historyList');
  if (hist.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><div>Chưa có lịch sử bài thi nào.<br>Hãy bắt đầu làm quiz!</div></div>';
    return;
  }
  list.innerHTML = hist.map(h => {
    const dateStr = new Date(h.date).toLocaleString('vi-VN');
    const topicLabel = TOPICS.find(t => t.id === h.topic)?.label || h.topic;
    const cls = h.pct >= 90 ? 'excellent' : h.pct >= 70 ? 'good' : h.pct >= 50 ? 'average' : 'poor';
    return `<div class="history-item-wrap" style="background:var(--card); border:1px solid var(--card-border); border-radius:var(--radius); margin-bottom:14px; padding:20px;">
      <div class="history-item" style="border:none; padding:0; margin-bottom:0; background:transparent;">
        <div class="history-info">
          <div class="history-date">🕐 ${dateStr}</div>
          <div class="history-topic">${topicLabel}</div>
          <div class="history-meta">✅ ${h.correct} đúng &nbsp;❌ ${h.wrong} sai &nbsp;⏭ ${h.skipped} bỏ qua &nbsp;⏱ ${h.elapsed}s</div>
        </div>
        <div class="history-score">
          <div class="score-badge ${cls}">${h.pct}%</div>
          <div class="score-mode">${h.total} câu</div>
        </div>
      </div>
      ${h.wrongIds && h.wrongIds.length > 0 ? `<div style="margin-top: 16px; border-top: 1px solid var(--card-border); padding-top: 12px; text-align: right;"><button class="btn-secondary" style="padding: 6px 14px; font-size: 0.8rem;" onclick="retryWrongHistory(${h.id})">🔄 Làm lại ${h.wrongIds.length} câu sai</button></div>` : ''}
    </div>`;
  }).join('');
}

function clearHistory() {
  if (confirm('Xóa toàn bộ lịch sử?')) {
    localStorage.removeItem('quizHistory');
    renderHistory();
  }
}

function retryWrongHistory(id) {
  const hist = JSON.parse(localStorage.getItem('quizHistory') || '[]');
  const entry = hist.find(h => h.id === id);
  if (!entry || !entry.wrongIds || entry.wrongIds.length === 0) return;
  
  currentQuestions = ALL_QUESTIONS.filter(q => entry.wrongIds.includes(q.Stt || q.stt));
  if (currentQuestions.length === 0) {
    alert('Không tìm thấy dữ liệu các câu sai này (có thể file dữ liệu đã thay đổi).');
    return;
  }
  
  selectedTopic = entry.topic;
  selectedMode = 'quiz';
  selectedCount = currentQuestions.length;
  sessionData = { topic: selectedTopic, mode: 'quiz', count: selectedCount, isRetry: true, wrongIds: entry.wrongIds };
  
  currentQuestions = currentQuestions.sort(() => Math.random() - 0.5);
  startQuiz();
}

// ====== WEAK TRACKING ======
function trackWrong(stt) {
  const data = JSON.parse(localStorage.getItem('wrongStats') || '{}');
  data[stt] = (data[stt] || 0) + 1;
  localStorage.setItem('wrongStats', JSON.stringify(data));
}

function trackCorrect(stt) {
  const data = JSON.parse(localStorage.getItem('correctStats') || '{}');
  data[stt] = (data[stt] || 0) + 1;
  localStorage.setItem('correctStats', JSON.stringify(data));
}

function renderStats() {
  // Overview
  const hist = JSON.parse(localStorage.getItem('quizHistory') || '[]');
  const totalSessions = hist.length;
  const avgScore = totalSessions ? Math.round(hist.reduce((s, h) => s + h.pct, 0) / totalSessions) : 0;
  const bestScore = totalSessions ? Math.max(...hist.map(h => h.pct)) : 0;
  document.getElementById('statsOverview').innerHTML = `
    <div class="overview-card"><div class="overview-val">${totalSessions}</div><div class="overview-lbl">Bài đã làm</div></div>
    <div class="overview-card"><div class="overview-val">${avgScore}%</div><div class="overview-lbl">Điểm TB</div></div>
    <div class="overview-card"><div class="overview-val">${bestScore}%</div><div class="overview-lbl">Điểm cao nhất</div></div>
  `;

  // Weak questions
  const wrongStats = JSON.parse(localStorage.getItem('wrongStats') || '{}');
  const sortedWrong = Object.entries(wrongStats).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const weakList = document.getElementById('weakList');
  if (sortedWrong.length === 0) {
    weakList.innerHTML = '<div class="empty-state"><div class="empty-icon">🎉</div><div>Chưa có dữ liệu thống kê.</div></div>';
  } else {
    weakList.innerHTML = sortedWrong.map(([stt, cnt]) => {
      const q = ALL_QUESTIONS.find(q => String(q.Stt || q.stt) === stt);
      const qText = q ? cleanText(q.question || q.quesition || q.cau_hoi).slice(0, 120) + '...' : `Câu #${stt}`;
      return `<div class="weak-item">
        <div class="weak-count"><div class="times">${cnt}</div><div class="label">lần sai</div></div>
        <div class="weak-q">${qText}</div>
      </div>`;
    }).join('');
  }

  // Topic stats
  const topicList = document.getElementById('topicStatsList');
  const correctStats = JSON.parse(localStorage.getItem('correctStats') || '{}');
  const topicRows = TOPICS.slice(1).map(t => {
    const pool = getQuestionsForTopic(t.id);
    const stts = pool.map(q => String(q.Stt || q.stt));
    const totalW = stts.reduce((s, stt) => s + (wrongStats[stt] || 0), 0);
    const totalC = stts.reduce((s, stt) => s + (correctStats[stt] || 0), 0);
    const total = totalW + totalC;
    const pct = total ? Math.round((totalC / total) * 100) : 0;
    return { label: t.label, totalC, totalW, total, pct };
  }).filter(r => r.total > 0);

  if (topicRows.length === 0) {
    topicList.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div><div>Làm quiz để có thống kê theo chủ đề!</div></div>';
  } else {
    topicList.innerHTML = topicRows.map(r => `
      <div class="topic-stat-row">
        <div class="topic-stat-name">${r.label}</div>
        <div class="topic-bar-wrap"><div class="topic-bar-fill" style="width:${r.pct}%"></div></div>
        <div class="topic-stat-pct">${r.pct}%</div>
        <div class="topic-stat-details">${r.totalC}✅ ${r.totalW}❌</div>
      </div>`).join('');
  }
}

// ====== VIEWS ======
function showView(name) {
  document.querySelectorAll('.view').forEach(v => { v.classList.remove('active'); v.classList.add('hidden'); });
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const viewMap = { home: 'viewHome', quiz: 'viewQuiz', result: 'viewResult', flash: 'viewFlash', history: 'viewHistory', stats: 'viewStats' };
  const el = document.getElementById(viewMap[name]);
  if (el) { el.classList.remove('hidden'); el.classList.add('active'); }
  const navMap = { home: 'navHome', history: 'navHistory', stats: 'navStats' };
  if (navMap[name]) document.getElementById(navMap[name])?.classList.add('active');
  if (name === 'history') renderHistory();
  if (name === 'stats') renderStats();
  window.scrollTo(0, 0);
}

// Add SVG gradient for score circle
document.addEventListener('DOMContentLoaded', () => {
  const svg = document.querySelector('.score-svg');
  if (svg) {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `<linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#6c63ff"/>
      <stop offset="100%" style="stop-color:#00d4ff"/>
    </linearGradient>`;
    svg.insertBefore(defs, svg.firstChild);
  }
  init();
});
