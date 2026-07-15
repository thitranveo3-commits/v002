/* ========================================
   script.js — Luyện Nói Tiếng Anh
   Static version (fetch + localStorage)
   ======================================== */

/* -- Cache version -- */
var CACHE_VERSION = 'v202607152';

/* -- 1. Toast Notification -- */
function showToast(message, type) {
  type = type || 'info';
  var colors = { success: '#22c55e', error: '#ef4444', warning: '#f59e0b', info: '#16a34a' };
  var icons = { success: '\u2713', error: '\u2715', warning: '!', info: '\u2122' };
  var c = colors[type] || colors.info;
  var ico = icons[type] || icons.info;
  var existing = document.querySelector('.toast-msg');
  if (existing) existing.remove();
  var toast = document.createElement('div');
  toast.className = 'toast-msg toast-enter';
  toast.style.backgroundColor = c;
  toast.innerHTML = '<span class="font-bold" style="font-size:1rem">' + ico + '</span><span>' + escHtml(message) + '</span>';
  document.body.appendChild(toast);
  setTimeout(function() {
    toast.classList.remove('toast-enter');
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.25s ease-in';
    setTimeout(function() { toast.remove(); }, 300);
  }, 2500);
}

/* -- 2. HTML Escape -- */
function escHtml(str) {
  if (!str) return '';
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/* ============================================
   DATA LAYER — localStorage only
   ============================================ */
var G_CONVERSATIONS = [];
var G_PROGRESS = {};
var G_RATINGS = {};
var G_GAME_BESTS = {};

function lsSave() {
  try { localStorage.setItem('luyennoi_conv', JSON.stringify(G_CONVERSATIONS)); } catch(e) {}
  try { localStorage.setItem('luyennoi_progress', JSON.stringify(G_PROGRESS)); } catch(e) {}
  try { localStorage.setItem('luyennoi_ratings', JSON.stringify(G_RATINGS)); } catch(e) {}
  try { localStorage.setItem('luyennoi_bests', JSON.stringify(G_GAME_BESTS)); } catch(e) {}
}
function lsLoad() {
  try {
    var c = localStorage.getItem('luyennoi_conv');
    if (c) G_CONVERSATIONS = JSON.parse(c);
    var p = localStorage.getItem('luyennoi_progress');
    if (p) G_PROGRESS = JSON.parse(p);
    var r = localStorage.getItem('luyennoi_ratings');
    if (r) G_RATINGS = JSON.parse(r);
    var b = localStorage.getItem('luyennoi_bests');
    if (b) G_GAME_BESTS = JSON.parse(b);
  } catch(e) {}
}

function resetData() {
  showConfirmModal(
    '\u0110\u1eb7t l\u1ea1i d\u1eef li\u1ec7u?',
    'D\u1eef li\u1ec7u hi\u1ec7n t\u1ea1i (ti\u1ebfn b\u1ed9, \u0111i\u1ec3m s\u1ed1) s\u1ebd b\u1ecb xo\u00e1. D\u1eef li\u1ec7u g\u1ed1c s\u1ebd \u0111\u01b0\u1ee3c t\u1ea3i l\u1ea1i t\u1eeb data001.json.',
    function() {
      localStorage.removeItem('luyennoi_conv');
      localStorage.removeItem('luyennoi_progress');
      localStorage.removeItem('luyennoi_ratings');
      localStorage.removeItem('luyennoi_bests');
      localStorage.removeItem('luyennoi_daily');
      G_PROGRESS = {};
      G_RATINGS = {};
      G_GAME_BESTS = {};
      G_DAILY = {};
      showToast('\u0110\u00e3 reset d\u1eef li\u1ec7u', 'success');
      initData().then(function() { switchView('home'); });
    }
  );
}

var DATA_VERSION_KEY = 'luyennoi_data_version';

async function initData() {
  // Try localStorage first
  lsLoad();
  // Check if data_version matches current (meaning data001.json was loaded before)
  var storedVer = localStorage.getItem(DATA_VERSION_KEY);
  if (G_CONVERSATIONS.length > 0 && storedVer === CACHE_VERSION) {
    return;
  }
  // Fetch from data001.json
  try {
    var res = await fetch('data001.json?v=' + CACHE_VERSION);
    var json = await res.json();
    var lessons = json.lessons || json;
    var convs = [];
    for (var i = 0; i < lessons.length; i++) {
      var l = lessons[i];
      // Build sentences (vocabulary IPA now inline per sentence)
      var sentences = l.sentences.map(function(s) {
        return { en: s.en, vi: s.vi || '', ipa: s.ipa || '' };
      });
      convs.push({
        id: l.id || (i + 1),
        title: l.title || 'Lesson ' + (i + 1),
        icon: l.icon || '\uD83D\uDCAC',
        subtitle: l.subtitle || '',
        videoUrl: l.videoUrl || '',
        sentences: sentences,
        vocabulary: l.vocabulary || []
      });
    }
    if (convs.length > 0) {
      G_CONVERSATIONS = convs;
      try { localStorage.setItem(DATA_VERSION_KEY, CACHE_VERSION); } catch(e) {}
      lsSave();
    }
  } catch (e) {
    console.warn('Failed to load data001.json:', e);
    if (G_CONVERSATIONS.length === 0) {
      showToast('Không thể tải dữ liệu bài học', 'error');
    }
  }
}

/* ============================================
   PROGRESS HELPERS
   ============================================ */
function getCorrectCount(convId, idx) {
  return G_PROGRESS[convId + '_' + idx] || 0;
}
function incrementCorrect(convId, idx) {
  var key = convId + '_' + idx;
  G_PROGRESS[key] = (G_PROGRESS[key] || 0) + 1;
  lsSave();
  trackDailyCorrect();
  return G_PROGRESS[key];
}
function getConvTotalCorrect(convId, count) {
  var total = 0;
  for (var i = 0; i < count; i++) total += G_PROGRESS[convId + '_' + i] || 0;
  return total;
}
function saveGameBest(convId, game, score) {
  var key = convId + '_' + game;
  if (score > (G_GAME_BESTS[key] || 0)) {
    G_GAME_BESTS[key] = score;
    lsSave();
  }
}
function getGameBest(convId, game) {
  return G_GAME_BESTS[convId + '_' + game] || 0;
}
function getSentenceRating(convId, idx) {
  return G_RATINGS[convId + '_' + idx] || 0;
}
function setSentenceRating(convId, idx, stars) {
  G_RATINGS[convId + '_' + idx] = stars;
  lsSave();
}

/* ============================================
   DAILY STATS TRACKING
   ============================================ */
var G_DAILY = {};

function lsDailySave() {
  try { localStorage.setItem('luyennoi_daily', JSON.stringify(G_DAILY)); } catch(e) {}
}
function lsDailyLoad() {
  try {
    var d = localStorage.getItem('luyennoi_daily');
    if (d) G_DAILY = JSON.parse(d);
  } catch(e) {}
}

function trackDailyCorrect() {
  var today = new Date();
  var key = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
  G_DAILY[key] = (G_DAILY[key] || 0) + 1;
  lsDailySave();
}

function getLast7DaysStats() {
  var result = [];
  for (var i = 6; i >= 0; i--) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    var key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    var weekday = ['CN','T2','T3','T4','T5','T6','T7'][d.getDay()];
    var dayLabel = weekday;
    result.push({ key: key, label: dayLabel, count: G_DAILY[key] || 0 });
  }
  return result;
}

/* ============================================
   BACKGROUND AUDIO (keep tab alive when screen off)
   ============================================ */
var bgAudioCtx = null;
var bgAudioSrc = null;

function startBackgroundAudio(convTitle, sentenceText) {
  try {
    if (!bgAudioCtx) {
      bgAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (bgAudioSrc) {
      try { bgAudioSrc.stop(); } catch(e) {}
      bgAudioSrc = null;
    }
    // Create silent buffer (0.1s), loop
    var sr = bgAudioCtx.sampleRate;
    var len = sr * 0.1;
    var buf = bgAudioCtx.createBuffer(1, len, sr);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) { data[i] = 0; }
    bgAudioSrc = bgAudioCtx.createBufferSource();
    bgAudioSrc.buffer = buf;
    bgAudioSrc.loop = true;
    var gain = bgAudioCtx.createGain();
    gain.gain.value = 0.001; // nearly silent
    bgAudioSrc.connect(gain);
    gain.connect(bgAudioCtx.destination);
    bgAudioSrc.start();

    // Update Media Session
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: sentenceText || 'Luyện Nói Tiếng Anh',
        artist: convTitle || 'Luyện Nói',
        album: 'English Speaking Practice'
      });
      navigator.mediaSession.setActionHandler('play', function() {});
      navigator.mediaSession.setActionHandler('pause', function() {});
    }
  } catch(e) {
    // Silently fail — background audio is a nice-to-have
  }
}

function stopBackgroundAudio() {
  try {
    if (bgAudioSrc) {
      try { bgAudioSrc.stop(); } catch(e) {}
      bgAudioSrc.disconnect();
      bgAudioSrc = null;
    }
    if (bgAudioCtx) {
      bgAudioCtx.close().catch(function(){});
      bgAudioCtx = null;
    }
  } catch(e) {}
}

/* ============================================
   NAVIGATION
   ============================================ */
var currentConvData = null;
var currentSentenceIndex = 0;
var isListening = false;
var isEvaluating = false;
var isPlayingAudio = false;
var recognition = null;

/* Game state */
var vocabQuestions = [];
var vocabIndex = 0;
var vocabScore = 0;
var vocabAnswered = false;
var vocabHearMode = false;
var writingIndex = 0;
var writingScore = 0;
var writingAnswered = false;
var speakFastIndex = 0;
var speakFastScore = 0;
var speakFastTimer = null;
var speakFastSeconds = 7;
var speakFastRemaining = 7;
var speakFastAnswered = false;
var speakFastListening = false;

/* Player state */
var playerSpeechRate = 1.0;
var playerRepeatConversation = false;
var playerVietnameseFirst = false;
var playerHideEnglish = false;
var playerIsPlaying = false;
var playerCurrentIdx = -1;
var playerUtterance = null;
var playerAvatars = ['\uD83D\uDC64', '\uD83D\uDC69']; // alternating A/B

function switchView(view, data) {
  var views = ['homeView','practiceView','modeSelectView','vocabView','writingView','speakFastView','playerView','roleplayView','reviewView','statsView'];
  views.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  // Stop bg audio when switching away from audio views
  stopBackgroundAudio();
  if (recognition) { try { recognition.abort(); } catch(e) {} }
  isListening = false;

  if (view === 'home') {
    var hv = document.getElementById('homeView');
    if (hv) { hv.classList.remove('hidden'); void hv.offsetWidth; hv.classList.add('animate-fade-in'); }
    renderHomeView();
  } else if (view === 'practice') {
    if (data) { currentConvData = data; currentSentenceIndex = 0; }
    document.getElementById('practiceView').classList.remove('hidden');
    renderPracticeView();
  } else if (view === 'modeSelect') {
    if (data) { currentConvData = data; }
    document.getElementById('modeSelectView').classList.remove('hidden');
    void document.getElementById('modeSelectView').offsetWidth;
    document.getElementById('modeSelectView').classList.add('animate-fade-in');
    renderModeSelectView();
  } else if (view === 'vocab') {
    document.getElementById('vocabView').classList.remove('hidden');
    void document.getElementById('vocabView').offsetWidth;
    document.getElementById('vocabView').classList.add('animate-fade-in');
    initVocabGame();
  } else if (view === 'writing') {
    document.getElementById('writingView').classList.remove('hidden');
    void document.getElementById('writingView').offsetWidth;
    document.getElementById('writingView').classList.add('animate-fade-in');
    initWritingGame();
  } else if (view === 'speakfast') {
    document.getElementById('speakFastView').classList.remove('hidden');
    void document.getElementById('speakFastView').offsetWidth;
    document.getElementById('speakFastView').classList.add('animate-fade-in');
    initSpeakFastGame();
  } else if (view === 'player') {
    if (data) {
      currentConvData = data;
      playerCurrentIdx = -1;
      if (playerUtterance) { try { speechSynthesis.cancel(); } catch(e) {} playerUtterance = null; }
      playerIsPlaying = false;
    }
    document.getElementById('playerView').classList.remove('hidden');
    void document.getElementById('playerView').offsetWidth;
    document.getElementById('playerView').classList.add('animate-fade-in');
    renderPlayerView();
  } else if (view === 'roleplay') {
    if (data) currentConvData = data;
    // Reset roleplay to pre-start state (role selection)
    roleplayRole = 'A';
    roleplayStep = -1;
    roleplayScore = 0;
    roleplayAnswered = false;
    roleplayListening = false;
    roleplayStepResult = null;
    roleplayUserText = '';
    if (roleplayRecognition) { try { roleplayRecognition.abort(); } catch(e) {} roleplayRecognition = null; }
    try { speechSynthesis.cancel(); } catch(e) {}
    document.getElementById('roleplayView').classList.remove('hidden');
    void document.getElementById('roleplayView').offsetWidth;
    document.getElementById('roleplayView').classList.add('animate-fade-in');
    renderRoleplayView();
  } else if (view === 'review') {
    document.getElementById('reviewView').classList.remove('hidden');
    void document.getElementById('reviewView').offsetWidth;
    document.getElementById('reviewView').classList.add('animate-fade-in');
    renderReviewView();
  } else if (view === 'stats') {
    document.getElementById('statsView').classList.remove('hidden');
    void document.getElementById('statsView').offsetWidth;
    document.getElementById('statsView').classList.add('animate-fade-in');
    renderStatsView();
  }
}

/* ============================================
   HOME VIEW
   ============================================ */
function renderHomeView() {
  var container = document.getElementById('conversationList');
  if (!container) return;
  if (G_CONVERSATIONS.length === 0) {
    container.innerHTML = '<div class="text-center py-12 text-gray-400"><div class="text-4xl mb-3">📭</div><p>Chưa có hội thoại nào.</p></div>';
    return;
  }
  var html = '';
  G_CONVERSATIONS.forEach(function(c) {
    var totalCorrect = getConvTotalCorrect(c.id, c.sentences.length);
    html += '<div class="conversation-card">';
    html += '<div class="flex items-center gap-4 cursor-pointer" onclick="switchView(\'modeSelect\', getConvById(' + c.id + '))">';
    html += '<div class="text-3xl w-12 h-12 flex items-center justify-center bg-purple-50 rounded-xl flex-shrink-0">' + escHtml(c.icon || '💬') + '</div>';
    html += '<div class="flex-1 min-w-0">';
    html += '<h3 class="font-semibold text-gray-800 text-base truncate">' + escHtml(c.title) + '</h3>';
    html += '<p class="text-gray-400 text-xs truncate">' + escHtml(c.subtitle || '') + ' · ' + c.sentences.length + ' câu</p>';
    html += '</div>';
    var badgeClass = totalCorrect > 0 ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-100';
    html += '<span class="inline-block px-2.5 py-1 rounded-full text-xs font-medium ' + badgeClass + '">✓ ' + totalCorrect + '</span>';
    html += '</div></div>';
  });
  // Review & Stats buttons
  html += '<div class="flex gap-3 mt-4">';
  html += '<button onclick="switchView(\'review\')" class="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 font-semibold text-sm hover:bg-amber-100 transition-all">📋 Ôn tập câu sai</button>';
  html += '<button onclick="switchView(\'stats\')" class="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold text-sm hover:bg-indigo-100 transition-all">📊 Thống kê</button>';
  html += '</div>';
  container.innerHTML = html;
}

function getConvById(id) {
  for (var i = 0; i < G_CONVERSATIONS.length; i++) {
    if (G_CONVERSATIONS[i].id === id) return G_CONVERSATIONS[i];
  }
  return null;
}

/* ============================================
   MODE SELECT
   ============================================ */
function renderModeSelectView() {
  var container = document.getElementById('modeSelectContent');
  if (!container || !currentConvData) return;
  var conv = currentConvData;
  var totalCorrect = getConvTotalCorrect(conv.id, conv.sentences.length);
  var bestVocab = getGameBest(conv.id, 'vocab');
  var bestWriting = getGameBest(conv.id, 'writing');
  var bestFast = getGameBest(conv.id, 'speakfast');

  var html = '';
  html += '<div class="flex items-center mb-4">';
  html += '<button onclick="switchView(\'home\')" class="flex items-center gap-1.5 text-purple-600 font-medium py-1 text-sm"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg> Quay lại</button>';
  html += '</div>';

  html += '<div class="text-center mb-5">';
  html += '<div class="text-4xl mb-2">' + escHtml(conv.icon || '💬') + '</div>';
  html += '<h2 class="font-bold text-gray-800 text-2xl">' + escHtml(conv.title) + '</h2>';
  html += '<p class="text-gray-400 text-sm mt-1">' + conv.sentences.length + ' câu · ✓ ' + totalCorrect + ' lần đúng</p>';
  html += '</div>';

  // Video button (if videoUrl exists)
  if (conv.videoUrl && conv.videoUrl.trim()) {
    html += '<div class="text-center mb-5"><a href="' + escHtml(conv.videoUrl) + '" target="_blank" rel="noopener" class="inline-flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-full shadow-md transition-all text-base">📺 Xem video hướng dẫn <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg></a></div>';
  }

  html += '<div class="space-y-3">';
  html += '<div class="mode-card mode-card-vocab" onclick="switchView(\'player\', currentConvData)"><div class="mode-icon">🔊</div><div class="flex-1"><h3 class="font-semibold text-gray-800 text-base">Hội thoại</h3><p class="text-gray-400 text-sm">Nghe toàn bộ hội thoại</p></div><div class="text-indigo-400 text-xl">→</div></div>';
  html += '<div class="mode-card mode-card-speak" onclick="switchView(\'practice\', currentConvData)"><div class="mode-icon">🎤</div><div class="flex-1"><h3 class="font-semibold text-gray-800 text-base">Luyện nói</h3><p class="text-gray-400 text-sm">Nói và so sánh với câu gốc</p></div><div class="text-green-500 text-xl">→</div></div>';
  html += '<div class="mode-card mode-card-fast" onclick="switchView(\'speakfast\', currentConvData)"><div class="mode-icon">⚡</div><div class="flex-1"><h3 class="font-semibold text-gray-800 text-base">Nói nhanh</h3><p class="text-gray-400 text-sm">Phản xạ: nhìn dịch, nói câu Anh trong 7s</p></div>' + (bestFast > 0 ? '<div class="score-badge bg-red-100 text-red-700">⚡ ' + bestFast + '</div>' : '<div class="text-red-400 text-xl">→</div>') + '</div>';
  html += '<div class="mode-card mode-card-vocab" onclick="switchView(\'vocab\', currentConvData)"><div class="mode-icon">📝</div><div class="flex-1"><h3 class="font-semibold text-gray-800 text-base">Từ vựng &amp; Cụm từ</h3><p class="text-gray-400 text-sm">Xem nghĩa, nhập từ tiếng Anh</p></div>' + (bestVocab > 0 ? '<div class="score-badge bg-indigo-100 text-indigo-700">⭐ ' + bestVocab + '</div>' : '<div class="text-indigo-400 text-xl">→</div>') + '</div>';
  html += '<div class="mode-card mode-card-write" onclick="switchView(\'writing\', currentConvData)"><div class="mode-icon">✏️</div><div class="flex-1"><h3 class="font-semibold text-gray-800 text-base">Viết câu</h3><p class="text-gray-400 text-sm">Nhìn bản dịch, gõ câu tiếng Anh</p></div>' + (bestWriting > 0 ? '<div class="score-badge bg-amber-100 text-amber-700">⭐ ' + bestWriting + '</div>' : '<div class="text-amber-400 text-xl">→</div>') + '</div>';
  html += '<div class="mode-card mode-card-speak" onclick="switchView(\'roleplay\', currentConvData)"><div class="mode-icon">🎭</div><div class="flex-1"><h3 class="font-semibold text-gray-800 text-base">Đối đáp phản xạ</h3><p class="text-gray-400 text-sm">Nhập vai, nói và đối đáp với máy</p></div><div class="text-green-500 text-xl">→</div></div>';
  html += '</div>';
  container.innerHTML = html;
}

/* ============================================
   PRACTICE VIEW — BIG FONTS, BIG BUTTONS
   ============================================ */
function renderPracticeView() {
  var container = document.getElementById('practiceContent');
  if (!container || !currentConvData) return;
  if (recognition) { try { recognition.abort(); } catch(e) {} }
  isListening = false; isEvaluating = false;

  var conv = currentConvData;
  var sentences = conv.sentences;
  var idx = currentSentenceIndex;
  if (idx >= sentences.length) { container.innerHTML = ''; showCompletion(); return; }
  var sentence = sentences[idx];
  var correctCount = getCorrectCount(conv.id, idx);

  // Gradient background
  var pv = document.getElementById('practiceView');
  pv.classList.add('practice-gradient-bg');

  var html = '';
  // Back + title
  html += '<div class="flex items-center mb-6">';
  html += '<button onclick="switchView(\'home\')" class="btn-nav-big btn-nav-big-white rounded-xl">← Quay lại</button>';
  html += '<span class="ml-auto text-gray-800 font-bold text-lg truncate max-w-[220px]">' + escHtml(conv.title) + '</span>';
  html += '</div>';

  // Progress
  var pct = ((idx + 1) / sentences.length) * 100;
  html += '<div class="mb-3"><div class="progress-bar-big"><div class="progress-fill" style="width:' + pct + '%"></div></div>';
  html += '<p class="text-right text-base text-gray-500 mt-1.5 font-medium">Câu ' + (idx + 1) + ' / ' + sentences.length + '</p></div>';

  // Sentence card with BIG font
  html += '<div id="sentenceCard" class="sentence-card-warm p-6 md:p-8 text-center mb-6">';
  html += '<p class="font-extrabold text-gray-900 leading-tight mb-4 sentence-en-big">' + escHtml(sentence.en) + '</p>';

  // Tip — always show IPA by default
  var hasIpa = sentence.ipa && sentence.ipa.trim();
  html += '<div class="mt-2 mb-3">';
  if (hasIpa) {
    html += '<div class="tip-panel mt-0"><p class="text-lg text-purple-700 font-mono leading-relaxed">🔤 ' + escHtml(sentence.ipa) + '</p></div>';
  } else {
    html += '<p class="text-sm text-gray-400 italic">Chưa có phiên âm cho câu này</p>';
  }
  html += '</div>';

  // Vietnamese
  html += '<p class="text-gray-500 text-lg md:text-xl leading-relaxed">' + escHtml(sentence.vi) + '</p>';
  if (correctCount > 0) {
    html += '<div class="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-50 text-purple-700 text-base font-semibold count-pop border border-purple-100">✓ Đã đúng ' + correctCount + ' lần</div>';
  }
  html += '</div>';

  // Action buttons — BIG
  html += '<div class="flex flex-col items-center gap-4">';
  html += '<div class="flex items-center justify-center gap-6 md:gap-8">';

  // Speaker 72px
  html += '<div class="ripple-container relative">';
  html += '<button id="speakerBtn" onclick="playSampleAudio(\'' + escHtml(sentence.en.replace(/'/g, "\\'")) + '\')" class="btn-speaker-big grad-indigo text-white">';
  html += '<span id="speakerIcon">🔊</span></button></div>';

  // Mic 88px
  html += '<div class="ripple-container relative">';
  html += '<button id="speakBtn" onclick="toggleListening()" class="btn-mic-big grad-purple-pink text-white">';
  html += '<span id="speakIcon">🎤</span></button>';
  html += '<div id="rippleRing" class="ripple-ring" style="display:none"></div></div>';
  html += '</div>';

  html += '<div id="listeningStatus" class="text-base md:text-lg text-gray-500 text-center min-h-[28px] font-medium"></div>';
  html += '<div id="resultFeedback" class="w-full max-w-xl mx-auto"></div>';

  // Nav buttons
  html += '<div class="flex items-center justify-between w-full mt-4">';
  if (idx > 0) {
    html += '<button onclick="prevSentence()" class="btn-nav-big btn-nav-big-white"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg> Câu trước</button>';
  } else { html += '<div></div>'; }
  if (idx < sentences.length - 1) {
    html += '<button onclick="nextSentence()" class="btn-nav-big btn-nav-big-white">Câu sau <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg></button>';
  } else { html += '<div></div>'; }
  html += '</div></div>';

  container.innerHTML = html;
}

function showCompletion() {
  var container = document.getElementById('practiceContent');
  if (!container) return;
  container.innerHTML = '';
  var html = '<div class="text-center py-12 animate-scale-in">';
  html += '<div class="text-7xl mb-5">🎉</div>';
  html += '<h3 class="text-2xl md:text-3xl text-purple-700 mb-3 font-extrabold">Xuất sắc! Hoàn thành!</h3>';
  html += '<p class="text-gray-500 mb-8 text-lg md:text-xl">Bạn đã luyện xong đoạn hội thoại <strong class="text-purple-600">' + escHtml(currentConvData.title) + '</strong></p>';
  html += '<button onclick="switchView(\'home\')" class="grad-purple-pink text-white font-bold py-4 px-12 rounded-xl shadow-lg text-lg">← Về danh sách</button>';
  html += '</div>';
  container.innerHTML = html;
}

/* ============================================
   SPEECH HELPERS
   ============================================ */
function playSampleAudio(text) {
  if (isPlayingAudio) { window.speechSynthesis.cancel(); isPlayingAudio = false; updateSpeakerButton(false); return; }
  if (!('speechSynthesis' in window)) { showToast('Trình duyệt không hỗ trợ phát âm', 'error'); return; }
  window.speechSynthesis.cancel();
  var utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US'; utterance.rate = 0.85; utterance.pitch = 1.0;
  var voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    for (var i = 0; i < voices.length; i++) {
      if (voices[i].lang && voices[i].lang.startsWith('en')) { utterance.voice = voices[i]; break; }
    }
  }
  isPlayingAudio = true; updateSpeakerButton(true);
  utterance.onend = function() { isPlayingAudio = false; updateSpeakerButton(false); };
  utterance.onerror = function() { isPlayingAudio = false; updateSpeakerButton(false); };
  setTimeout(function() { window.speechSynthesis.speak(utterance); }, 50);
}
function primeSpeechSynthesis() {
  if (!('speechSynthesis' in window)) return;
  if (!window.speechSynthesis.getVoices().length) { window.speechSynthesis.onvoiceschanged = function() {}; }
  try { var p = new SpeechSynthesisUtterance(' '); p.volume = 0; p.rate = 1; p.lang = 'en-US'; window.speechSynthesis.speak(p); } catch(e) {}
}
function updateSpeakerButton(playing) {
  var btn = document.getElementById('speakerBtn'); var icon = document.getElementById('speakerIcon');
  if (!btn || !icon) return;
  if (playing) { icon.innerHTML = '<span class="sound-wave-bars"><span></span><span></span><span></span><span></span></span>'; btn.classList.add('animate-pulse-soft'); }
  else { icon.textContent = '🔊'; btn.classList.remove('animate-pulse-soft'); }
}
function updateListenButton(listening) {
  var btn = document.getElementById('speakBtn'); var icon = document.getElementById('speakIcon');
  var ring = document.getElementById('rippleRing'); var status = document.getElementById('listeningStatus');
  if (!btn || !icon) return;
  if (listening) {
    icon.innerHTML = '<span class="listening-bars"><span></span><span></span><span></span><span></span><span></span></span>';
    btn.classList.add('recording');
    if (ring) ring.style.display = 'block';
    if (status) status.innerHTML = '<span class="text-red-500 font-semibold text-lg">🎤 Đang nghe... (bấm lại để dừng)</span>';
  } else {
    icon.textContent = '🎤';
    btn.classList.remove('recording');
    if (ring) ring.style.display = 'none';
    if (status) status.innerHTML = '';
  }
}
function toggleListening() { if (isEvaluating) return; if (isListening) { stopListening(); return; } startListening(); }
function stopListening() {
  if (recognition) { try { recognition.stop(); } catch(e) { try { recognition.abort(); } catch(e2) {} } }
  isListening = false; updateListenButton(false);
  var st = document.getElementById('listeningStatus');
  if (st) st.innerHTML = '';
}
function startListening() {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { showToast('Trình duyệt không hỗ trợ nhận diện giọng nói (dùng Chrome)', 'error'); return; }
  if (recognition) { try { recognition.abort(); } catch(e) {} recognition = null; }
  try {
    var nr = new SR(); nr.lang = 'en-US'; nr.continuous = false; nr.interimResults = false; nr.maxAlternatives = 1;
    var gotResult = false; recognition = nr;
    nr.onstart = function() { isListening = true; updateListenButton(true); };
    nr.onresult = function(ev) {
      gotResult = true; isListening = false; updateListenButton(false);
      var t = ev.results[0][0].transcript.trim();
      if (t) evaluateSpeech(t);
    };
    nr.onerror = function(ev) {
      gotResult = true; isListening = false; updateListenButton(false);
      if (ev.error === 'no-speech') showToast('Không nghe thấy giọng nói, hãy thử lại', 'warning');
      else if (ev.error === 'not-allowed') showToast('Vui lòng cấp quyền truy cập microphone', 'warning');
      else if (ev.error !== 'aborted') showToast('Lỗi: ' + ev.error, 'error');
    };
    nr.onend = function() {
      if (recognition === nr && !gotResult && isListening) {
        isListening = false; updateListenButton(false);
        var st = document.getElementById('listeningStatus');
        if (st) st.innerHTML = '<span class="text-gray-400 text-sm">⏱ Không nhận được giọng nói, hãy thử lại</span>';
      }
    };
    nr.start();
  } catch(e) { showToast('Lỗi mic: ' + e.message, 'error'); }
}
function normalizeText(text) {
  if (!text) return '';
  return text.toLowerCase().replace(/[^\w\s']/g, '').replace(/\s+/g, ' ').trim();
}
function evaluateSpeech(recognizedText) {
  isEvaluating = true;
  var sentence = currentConvData.sentences[currentSentenceIndex];
  var original = sentence.en; var convId = currentConvData.id; var idx = currentSentenceIndex;
  var nr = normalizeText(recognizedText); var no = normalizeText(original);
  var fb = document.getElementById('resultFeedback'); var st = document.getElementById('listeningStatus');
  if (!fb) return;
  var isCorrect = (nr === no);
  if (isCorrect) {
    var nc = incrementCorrect(convId, idx);
    fb.innerHTML = '<div class="result-pop result-correct-warm text-center animate-scale-in"><div class="text-3xl mb-2">✅</div><p class="text-base text-gray-500 mb-1">Bạn đã nói:</p><p class="font-semibold text-gray-800 text-xl md:text-2xl mb-3 leading-relaxed">"' + escHtml(recognizedText) + '"</p><div class="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-green-200 text-green-800 text-base font-bold shadow-sm">✓ Chính xác! (' + nc + ' lần)</div></div>';
    setTimeout(function() { fb.innerHTML = ''; isEvaluating = false; currentSentenceIndex++; renderPracticeView(); }, 1500);
  } else {
    var ipaHint = '';
    if (sentence.ipa && sentence.ipa.trim()) {
      ipaHint = '<div class="mt-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-left"><p class="text-sm text-amber-600 font-semibold mb-1.5">🔤 Phiên âm IPA:</p><p class="text-base text-amber-800 font-mono leading-relaxed">' + escHtml(sentence.ipa) + '</p></div>';
    }
    fb.innerHTML = '<div class="result-pop result-incorrect-warm text-center animate-scale-in"><div class="text-3xl mb-2">❌</div><p class="text-base text-gray-500 mb-1">Bạn đã nói:</p><p class="font-semibold text-red-700 text-xl md:text-2xl mb-3 leading-relaxed">"' + escHtml(recognizedText) + '"</p><div class="border-t border-red-200 pt-4 mt-2"><p class="text-base text-gray-500 mb-1.5">Câu đúng:</p><p class="font-semibold text-gray-800 text-xl md:text-2xl leading-relaxed">' + escHtml(original) + '</p></div><div class="flex items-center justify-center gap-4 mt-5"><button onclick="playSampleAudio(\'' + escHtml(original.replace(/'/g, "\\'")) + '\')" class="btn-practice-big grad-indigo text-white shadow-md">🔊 Nghe mẫu</button><button onclick="retrySpeaking()" class="btn-practice-big bg-white text-red-600 border-2 border-red-300">🎤 Nói lại</button></div>' + ipaHint + '</div>';
    if (st) st.innerHTML = '';
  }
}
function retrySpeaking() {
  var fb = document.getElementById('resultFeedback');
  if (fb) fb.innerHTML = ''; isEvaluating = false; startListening();
}
function prevSentence() { if (currentSentenceIndex > 0) { currentSentenceIndex--; renderPracticeView(); } }
function nextSentence() { if (currentSentenceIndex < currentConvData.sentences.length - 1) { currentSentenceIndex++; renderPracticeView(); } }

/* ============================================
   VOCABULARY GAME
   ============================================ */
function extractVocabulary(conv) {
  if (!conv || !conv.vocabulary || !conv.vocabulary.length) return [];
  var v = [];
  conv.vocabulary.forEach(function(item) {
    if (item && item.word) {
      v.push({ en: item.word, vi: item.meaning || '' });
    }
  });
  // Shuffle
  for (var i = v.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = v[i]; v[i] = v[j]; v[j] = t; }
  return v;
}
function initVocabGame() {
  vocabQuestions = extractVocabulary(currentConvData);
  vocabIndex = 0; vocabScore = 0; vocabAnswered = false;
  if (vocabQuestions.length === 0) { showToast('Hội thoại này chưa có từ vựng.', 'warning'); switchView('home'); return; }
  renderVocabQuestion();
}
function renderVocabQuestion() {
  var c = document.getElementById('vocabContent');
  if (!c) return;
  if (vocabIndex >= vocabQuestions.length) { renderVocabResult(); return; }
  var q = vocabQuestions[vocabIndex]; var total = vocabQuestions.length;
  var html = '<div class="flex items-center mb-3"><button onclick="switchView(\'home\')" class="flex items-center gap-1 text-purple-600 font-medium py-1 text-sm">← Quay lại</button><span class="ml-auto text-xs text-gray-400">' + escHtml(currentConvData.title) + '</span></div>';
  var pct = (vocabIndex / total) * 100;
  html += '<div class="mb-3"><div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden"><div class="progress-fill h-full rounded-full bg-indigo-500" style="width:' + pct + '%"></div></div><p class="text-right text-xs text-gray-500 mt-0.5">Câu ' + (vocabIndex + 1) + ' / ' + total + ' · ⭐ ' + vocabScore + '</p></div>';
  // Toggle buttons
  html += '<div class="flex justify-center gap-2 mb-3">';
  html += '<button id="vocabModeSee" class="px-4 py-2 rounded-lg text-sm font-medium transition-all ' + (!vocabHearMode ? 'bg-indigo-100 text-indigo-700 font-semibold shadow-sm' : 'bg-gray-100 text-gray-500') + '" onclick="setVocabMode(false)">👁️ Xem nghĩa</button>';
  html += '<button id="vocabModeHear" class="px-4 py-2 rounded-lg text-sm font-medium transition-all ' + (vocabHearMode ? 'bg-indigo-100 text-indigo-700 font-semibold shadow-sm' : 'bg-gray-100 text-gray-500') + '" onclick="setVocabMode(true)">🔊 Nghe từ</button>';
  html += '</div>';
  if (!vocabHearMode) {
    html += '<div class="bg-white rounded-card shadow-card p-6 text-center mb-4"><div class="text-4xl mb-2">📝</div><p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Nhập từ/cụm từ tiếng Anh</p><p class="font-bold text-gray-900 text-xl mb-4">' + escHtml(q.vi) + '</p><input id="vocabInput" type="text" class="writing-input text-center text-lg" placeholder="Gõ từ tiếng Anh..." autocomplete="off" autocapitalize="none" onkeydown="if(event.key===\'Enter\')checkVocabAnswer()"></div>';
  } else {
    html += '<div class="bg-white rounded-card shadow-card p-6 text-center mb-4"><div class="text-4xl mb-2">🔊</div><p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Nghe và nhập từ tiếng Anh</p><button id="vocabHearBtn" class="w-20 h-20 bg-indigo-100 hover:bg-indigo-200 text-indigo-600 rounded-full text-4xl mx-auto mb-4 flex items-center justify-center transition-all shadow-sm" onclick="playVocabWord()">🔊</button><p class="text-gray-400 text-sm mb-3 hidden" id="vocabHint">' + escHtml(q.vi) + '</p><input id="vocabInput" type="text" class="writing-input text-center text-lg" placeholder="Nghe và gõ..." autocomplete="off" autocapitalize="none" onkeydown="if(event.key===\'Enter\')checkVocabAnswer()"></div>';
  }
  html += '<div class="text-center"><button id="vocabCheckBtn" onclick="checkVocabAnswer()" class="bg-indigo-500 text-white font-semibold py-3 px-10 rounded-button shadow">Kiểm tra</button></div>';
  html += '<div id="vocabFeedback" class="text-center mt-4"></div><div id="vocabNextWrap" class="text-center mt-4" style="display:none"><button onclick="nextVocab()" class="bg-indigo-500 text-white font-semibold py-3 px-8 rounded-button shadow">Tiếp theo →</button></div>';
  c.innerHTML = html;
  setTimeout(function() { var inp = document.getElementById('vocabInput'); if (inp) inp.focus(); }, 300);
}
function setVocabMode(hear) {
  vocabHearMode = hear;
  renderVocabQuestion();
}
function playVocabWord() {
  if (!vocabQuestions || !vocabQuestions[vocabIndex]) return;
  var word = vocabQuestions[vocabIndex].en;
  try { speechSynthesis.cancel(); } catch(e) {}
  var u = new SpeechSynthesisUtterance(word);
  u.lang = 'en-US';
  u.rate = 0.8;
  speechSynthesis.speak(u);
}
/* -- Âm thanh "ting" dùng Web Audio API -- */
function playTingSound() {
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch(e) {}
}

function checkVocabAnswer() {
  if (vocabAnswered) return;
  var inp = document.getElementById('vocabInput');
  if (!inp) return;
  var ans = inp.value.trim().toLowerCase();
  if (!ans) { showToast('Hãy nhập từ tiếng Anh!', 'warning'); return; }
  vocabAnswered = true;
  var q = vocabQuestions[vocabIndex];
  var correct = q.en.trim().toLowerCase(); var isCorrect = (ans === correct);
  var fb = document.getElementById('vocabFeedback'); var btn = document.getElementById('vocabCheckBtn');
  if (isCorrect) {
    vocabScore++;
    inp.style.borderColor = '#22c55e'; inp.style.backgroundColor = '#f0fdf4';
    if (fb) fb.innerHTML = '<div class="text-green-600 font-semibold text-lg">✅ Đúng! +1 ⭐</div>';
    playTingSound();
    if (btn) btn.disabled = true; inp.disabled = true;
    setTimeout(function() {
      nextVocab();
      // Auto-play next word if in hear mode
      if (vocabHearMode && vocabIndex < vocabQuestions.length) {
        setTimeout(function() { playVocabWord(); }, 400);
      }
    }, 800);
    return;
  } else {
    inp.style.borderColor = '#ef4444'; inp.style.backgroundColor = '#fef2f2';
    var meaningExtra = vocabHearMode && q.vi ? ' — "' + escHtml(q.vi) + '"' : '';
    if (fb) fb.innerHTML = '<div class="text-red-500 font-semibold text-lg">❌ Sai rồi!</div><div class="text-gray-600 mt-2">Đáp án: <strong class="text-gray-800">' + escHtml(q.en) + '</strong>' + meaningExtra + '</div><div class="mt-3 flex justify-center gap-2"><button onclick="playVocabWord()" class="inline-flex items-center gap-1 py-1.5 px-3 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium">🔊 Nghe lại</button><button onclick="retryVocab()" class="inline-flex items-center gap-1 py-1.5 px-3 rounded-full bg-red-100 text-red-700 text-sm font-medium">✏️ Nhập lại</button></div>';
  }
  if (btn) btn.disabled = true; inp.disabled = true;
  var nw = document.getElementById('vocabNextWrap');
  if (nw) nw.style.display = 'block';
}
function retryVocab() {
  vocabAnswered = false;
  var inp = document.getElementById('vocabInput');
  if (inp) { inp.value = ''; inp.disabled = false; inp.style.borderColor = ''; inp.style.backgroundColor = ''; inp.focus(); }
  var fb = document.getElementById('vocabFeedback');
  if (fb) fb.innerHTML = '';
  var nw = document.getElementById('vocabNextWrap');
  if (nw) nw.style.display = 'none';
  var btn = document.getElementById('vocabCheckBtn');
  if (btn) btn.disabled = false;
}
function nextVocab() { vocabIndex++; vocabAnswered = false; renderVocabQuestion(); }
function renderVocabResult() {
  var c = document.getElementById('vocabContent');
  if (!c) return;
  var total = vocabQuestions.length; var pct = total > 0 ? Math.round((vocabScore / total) * 100) : 0;
  saveGameBest(currentConvData.id, 'vocab', vocabScore);
  var rc = pct >= 80 ? 'bg-green-100 text-green-600' : (pct >= 50 ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-500');
  var html = '<div class="text-center py-8 animate-scale-in"><div class="text-6xl mb-4">🏆</div><h3 class="text-2xl font-bold text-gray-800 mb-1">Kết thúc!</h3><p class="text-gray-500 mb-4">Bạn đã hoàn thành phần Từ vựng</p><div class="inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 ' + rc + '" style="font-size:2rem;font-weight:700">' + vocabScore + '/' + total + '</div><p class="text-gray-400 text-sm mb-6">' + pct + '% đúng</p><div class="flex gap-3 justify-center"><button onclick="switchView(\'home\')" class="bg-white text-gray-700 font-medium py-3 px-6 rounded-button border hover:bg-gray-50">← Về danh sách</button><button onclick="initVocabGame()" class="bg-indigo-500 text-white font-semibold py-3 px-6 rounded-button shadow">Chơi lại</button></div></div>';
  c.innerHTML = html;
}

/* ============================================
   WRITING GAME
   ============================================ */
/* Writing state */
var writingHearMode = false;

function initWritingGame() { writingIndex = 0; writingScore = 0; writingAnswered = false; writingHearMode = false; renderWritingQuestion(); }
function setWritingMode(hear) { writingHearMode = hear; renderWritingQuestion(); }
function playWritingWord() {
  if (!currentConvData || !currentConvData.sentences[writingIndex]) return;
  var word = currentConvData.sentences[writingIndex].en;
  try { speechSynthesis.cancel(); } catch(e) {}
  var u = new SpeechSynthesisUtterance(word); u.lang = 'en-US'; u.rate = 0.8;
  speechSynthesis.speak(u);
}
function renderWritingQuestion() {
  var c = document.getElementById('writingContent');
  if (!c || !currentConvData) return;
  var sentences = currentConvData.sentences;
  if (writingIndex >= sentences.length) { renderWritingResult(); return; }
  var s = sentences[writingIndex]; var total = sentences.length;
  var html = '<div class="flex items-center mb-3"><button onclick="switchView(\'home\')" class="flex items-center gap-1 text-purple-600 font-medium py-1 text-sm">← Quay lại</button><span class="ml-auto text-xs text-gray-400">' + escHtml(currentConvData.title) + '</span></div>';
  var pct = (writingIndex / total) * 100;
  html += '<div class="mb-3"><div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden"><div class="progress-fill h-full rounded-full bg-amber-500" style="width:' + pct + '%"></div></div><p class="text-right text-xs text-gray-500 mt-0.5">Câu ' + (writingIndex + 1) + ' / ' + total + ' · ⭐ ' + writingScore + '</p></div>';
  // Toggle buttons
  html += '<div class="flex justify-center gap-2 mb-3">';
  html += '<button id="writingModeSee" class="px-4 py-2 rounded-lg text-sm font-medium transition-all ' + (!writingHearMode ? 'bg-amber-100 text-amber-700 font-semibold shadow-sm' : 'bg-gray-100 text-gray-500') + '" onclick="setWritingMode(false)">👁️ Xem nghĩa</button>';
  html += '<button id="writingModeHear" class="px-4 py-2 rounded-lg text-sm font-medium transition-all ' + (writingHearMode ? 'bg-amber-100 text-amber-700 font-semibold shadow-sm' : 'bg-gray-100 text-gray-500') + '" onclick="setWritingMode(true)">🔊 Nghe câu</button>';
  html += '</div>';
  if (!writingHearMode) {
    html += '<div class="bg-white rounded-card shadow-card p-5 text-center mb-4"><div class="text-3xl mb-2">✏️</div><p class="text-xs text-gray-400 uppercase tracking-wide mb-2">Viết câu tiếng Anh</p><p class="text-gray-500 mb-1">Dịch:</p><p class="font-bold text-gray-900 text-xl">' + escHtml(s.vi) + '</p></div>';
  } else {
    html += '<div class="bg-white rounded-card shadow-card p-5 text-center mb-4"><div class="text-3xl mb-2">🔊</div><p class="text-xs text-gray-400 uppercase tracking-wide mb-2">Nghe và viết câu tiếng Anh</p><button id="writingHearBtn" class="w-20 h-20 bg-amber-100 hover:bg-amber-200 text-amber-600 rounded-full text-4xl mx-auto mb-4 flex items-center justify-center transition-all shadow-sm" onclick="playWritingWord()">🔊</button></div>';
  }
  html += '<div class="mb-3"><input id="writingInput" type="text" class="writing-input" placeholder="Gõ câu tiếng Anh..." onkeydown="if(event.key===\'Enter\') checkWriting()"></div>';
  html += '<button id="writingCheckBtn" onclick="checkWriting()" class="w-full bg-amber-500 text-white font-semibold py-3.5 rounded-button shadow text-lg">✔ Kiểm tra</button>';
  html += '<div id="writingResult" class="mt-3"></div><div id="writingNextWrap" class="text-center mt-3" style="display:none"><button onclick="nextWriting()" class="bg-amber-500 text-white font-semibold py-3 px-8 rounded-button shadow">Tiếp theo →</button></div>';
  c.innerHTML = html;
  // Auto-play if in hear mode
  if (writingHearMode) { setTimeout(function() { playWritingWord(); }, 500); }
  setTimeout(function() { var inp = document.getElementById('writingInput'); if (inp) inp.focus(); }, 100);
}
function checkWriting() {
  if (writingAnswered) return;
  var inp = document.getElementById('writingInput');
  if (!inp) return;
  var userText = inp.value.trim();
  if (!userText) { showToast('Vui lòng nhập câu tiếng Anh', 'warning'); inp.focus(); return; }
  writingAnswered = true;
  var s = currentConvData.sentences[writingIndex];
  var nu = normalizeText(userText); var nc = normalizeText(s.en);
  var isCorrect = (nu === nc);
  if (isCorrect) {
    writingScore++;
    inp.classList.add('correct-input'); inp.disabled = true;
    document.getElementById('writingResult').innerHTML = '<div class="result-correct p-3 text-center result-pop"><div class="text-lg">✅ Đúng! +1 ⭐</div></div>';
    document.getElementById('writingCheckBtn').style.display = 'none';
    playTingSound();
    setTimeout(function() {
      nextWriting();
      if (writingHearMode && writingIndex < currentConvData.sentences.length) {
        setTimeout(function() { playWritingWord(); }, 400);
      }
    }, 800);
    return;
  } else {
    inp.classList.add('wrong-input'); inp.disabled = true;
    var meaningExtra = writingHearMode ? '' : '';
    document.getElementById('writingResult').innerHTML = '<div class="result-incorrect p-3 text-center result-pop"><div class="text-lg mb-1">❌ Sai rồi!</div><p class="text-red-700 font-medium text-sm mb-1">Bạn viết: ' + escHtml(userText) + '</p><p class="text-gray-700 text-sm">Đáp án: <strong>' + escHtml(s.en) + '</strong></p><div class="mt-2 flex justify-center gap-2">' + (writingHearMode ? '<button onclick="playWritingWord()" class="inline-flex items-center gap-1 py-1.5 px-3 rounded-full bg-amber-100 text-amber-700 text-sm font-medium">🔊 Nghe lại</button>' : '') + '<button onclick="retryWriting()" class="inline-flex items-center gap-1 py-1.5 px-3 rounded-full bg-red-100 text-red-700 text-sm font-medium">✏️ Nhập lại</button></div></div>';
  }
  document.getElementById('writingCheckBtn').style.display = 'none';
}
function retryWriting() {
  writingAnswered = false;
  var inp = document.getElementById('writingInput');
  if (inp) { inp.value = ''; inp.disabled = false; inp.classList.remove('correct-input', 'wrong-input'); inp.focus(); }
  document.getElementById('writingResult').innerHTML = '';
  document.getElementById('writingNextWrap').style.display = 'none';
  document.getElementById('writingCheckBtn').style.display = 'block';
}
function nextWriting() { writingIndex++; writingAnswered = false; renderWritingQuestion(); }
function renderWritingResult() {
  var c = document.getElementById('writingContent');
  if (!c) return;
  var total = currentConvData.sentences.length; var pct = total > 0 ? Math.round((writingScore / total) * 100) : 0;
  saveGameBest(currentConvData.id, 'writing', writingScore);
  var rc = pct >= 80 ? 'bg-green-100 text-green-600' : (pct >= 50 ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-500');
  var html = '<div class="text-center py-8 animate-scale-in"><div class="text-6xl mb-4">🎯</div><h3 class="text-2xl font-bold text-gray-800 mb-1">Kết thúc!</h3><p class="text-gray-500 mb-4">Bạn đã hoàn thành phần Viết câu</p><div class="inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 ' + rc + '" style="font-size:2rem;font-weight:700">' + writingScore + '/' + total + '</div><p class="text-gray-400 text-sm mb-6">' + pct + '% đúng</p><div class="flex gap-3 justify-center"><button onclick="switchView(\'home\')" class="bg-white text-gray-700 font-medium py-3 px-6 rounded-button border hover:bg-gray-50">← Về danh sách</button><button onclick="initWritingGame()" class="bg-amber-500 text-white font-semibold py-3 px-6 rounded-button shadow">Chơi lại</button></div></div>';
  c.innerHTML = html;
}

/* ============================================
   SPEAK FAST GAME
   ============================================ */
function initSpeakFastGame() {
  speakFastIndex = 0; speakFastScore = 0; speakFastAnswered = false; speakFastListening = false;
  renderSpeakFastStart();
}
function renderSpeakFastStart() {
  var c = document.getElementById('speakFastContent');
  if (!c || !currentConvData) return;
  var html = '<div class="flex items-center mb-4"><button onclick="switchView(\'home\')" class="flex items-center gap-1 text-purple-600 font-medium py-1 text-sm">← Quay lại</button></div>';
  html += '<div class="text-center py-8 animate-scale-in"><div class="text-6xl mb-4">⚡</div><h2 class="text-2xl font-bold text-gray-800 mb-2">Nói nhanh</h2><p class="text-gray-500 mb-2">Tập phản xạ — nhìn bản dịch, nói câu tiếng Anh trong <strong class="text-red-500">7 giây</strong></p>';
  html += '<div class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left text-sm text-amber-800 mb-6"><p class="font-medium mb-1">📋 Cách chơi:</p><ul class="space-y-1 list-disc pl-4"><li>Nhìn bản dịch tiếng Việt</li><li>Nói câu tiếng Anh tương ứng</li><li>Mic tự động bật, có 7 giây cho mỗi câu</li><li>Đúng ✅ tự động sang câu tiếp</li></ul></div>';
  html += '<button onclick="startSpeakFastGame()" class="grad-red text-white font-semibold py-4 px-12 rounded-button shadow-lg text-xl">🚀 Bắt đầu</button></div>';
  c.innerHTML = html;
}
function startSpeakFastGame() {
  speakFastIndex = 0; speakFastScore = 0; speakFastAnswered = false;
  renderSpeakFastQuestion();
  setTimeout(function() { sfStartListening(); }, 400);
}
function renderSpeakFastQuestion() {
  var c = document.getElementById('speakFastContent');
  if (!c || !currentConvData) return;
  var sentences = currentConvData.sentences;
  if (speakFastIndex >= sentences.length) { renderSpeakFastResult(); return; }
  var s = sentences[speakFastIndex]; var total = sentences.length;
  var html = '<div class="flex items-center mb-3"><button onclick="switchView(\'home\')" class="flex items-center gap-1 text-purple-600 font-medium py-1 text-sm">← Quay lại</button><span class="ml-auto text-xs text-gray-400">' + escHtml(currentConvData.title) + '</span></div>';
  var pct = (speakFastIndex / total) * 100;
  html += '<div class="mb-3"><div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden"><div class="progress-fill h-full rounded-full bg-red-500" style="width:' + pct + '%"></div></div><p class="text-right text-xs text-gray-500 mt-0.5">Câu ' + (speakFastIndex + 1) + ' / ' + total + ' · ⚡ ' + speakFastScore + '</p></div>';
  html += '<div class="bg-white rounded-card shadow-card p-6 text-center mb-4"><div class="text-4xl mb-2">⚡</div><p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Nhìn dịch, nói câu tiếng Anh</p><p class="font-bold text-gray-900 text-xl mb-3">' + escHtml(s.vi) + '</p><p id="sfHint" class="text-gray-400 text-xs italic mb-3" style="display:none">💬 ' + escHtml(s.en) + '</p></div>';
  html += '<div class="mb-4"><div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden"><div id="sfTimerBar" class="h-full rounded-full bg-green-500" style="width:100%;transition:width 1s linear"></div></div><div class="flex justify-between text-xs text-gray-400 mt-1"><span id="sfTimerText">7s</span><span><button onclick="sfRevealHint()" class="text-indigo-500 hover:text-indigo-700">👁 Xem câu mẫu</button></span></div></div>';
  html += '<div class="flex flex-col items-center gap-3"><div class="relative"><div id="sfMicBtn" class="w-20 h-20 rounded-full grad-red text-white shadow-lg flex items-center justify-center" style="font-size:36px"><span id="sfMicIcon">🎤</span></div><div id="sfRippleRing" class="ripple-ring" style="display:none"></div></div><p id="sfStatus" class="text-sm text-gray-500 min-h-[20px]">⏳ Đang chuẩn bị...</p></div>';
  html += '<div id="sfResult" class="mt-4"></div>';
  html += '<div class="flex items-center justify-between w-full mt-4">';
  html += (speakFastIndex > 0) ? '<button onclick="sfPrev()" class="flex items-center gap-1 text-purple-600 font-medium py-2 px-3 text-sm">← Trước</button>' : '<div></div>';
  html += '<button id="sfNextBtn" style="display:none" class="flex items-center gap-1 text-purple-600 font-medium py-2 px-3 text-sm">Sau →</button>';
  html += '</div></div>';
  c.innerHTML = html;
}
function sfRevealHint() { var h = document.getElementById('sfHint'); if (h) h.style.display = 'block'; }
function sfStartListening() {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { showToast('Trình duyệt không hỗ trợ', 'error'); return; }
  try {
    if (window.sfRecognition) { try { window.sfRecognition.abort(); } catch(e) {} window.sfRecognition = null; }
    var nr = new SR(); nr.lang = 'en-US'; nr.continuous = false; nr.interimResults = false; nr.maxAlternatives = 1;
    var got = false; window.sfRecognition = nr; speakFastListening = true;
    speakFastRemaining = speakFastSeconds;
    var btn = document.getElementById('sfMicBtn'), icon = document.getElementById('sfMicIcon'), ring = document.getElementById('sfRippleRing');
    var status = document.getElementById('sfStatus'), bar = document.getElementById('sfTimerBar'), txt = document.getElementById('sfTimerText');
    if (btn) btn.classList.add('recording');
    if (icon) icon.innerHTML = '<span class="listening-bars"><span></span><span></span><span></span><span></span><span></span></span>';
    if (ring) ring.style.display = 'block';
    if (status) status.innerHTML = '<span class="text-red-500 font-medium">🎤 Đang nghe... ' + speakFastRemaining + 's</span>';
    if (speakFastTimer) clearInterval(speakFastTimer);
    speakFastTimer = setInterval(function() {
      speakFastRemaining--;
      if (txt) txt.textContent = speakFastRemaining + 's';
      var pct = (speakFastRemaining / speakFastSeconds) * 100;
      if (bar) bar.style.width = Math.max(0, pct) + '%';
      if (status) status.innerHTML = '<span class="text-red-500 font-medium">🎤 Đang nghe... ' + speakFastRemaining + 's</span>';
      if (speakFastRemaining <= 0) {
        clearInterval(speakFastTimer); speakFastTimer = null;
        if (txt) txt.textContent = '0s'; if (bar) bar.style.width = '0%';
        if (status) status.innerHTML = '<span class="text-red-500 font-medium">⏰ Hết giờ!</span>';
        if (speakFastListening) { sfStopListening(); if (!speakFastAnswered) sfEvaluateFast(null); }
      }
    }, 1000);
    nr.onresult = function(ev) {
      got = true; var t = ev.results[0][0].transcript.trim();
      clearInterval(speakFastTimer); speakFastTimer = null; sfStopListening();
      if (t) sfEvaluateFast(t); else if (!speakFastAnswered) sfEvaluateFast(null);
    };
    nr.onerror = function(ev) {
      got = true; clearInterval(speakFastTimer); speakFastTimer = null; sfStopListening();
      if (ev.error !== 'aborted' && ev.error !== 'no-speech') showToast('Lỗi: ' + ev.error, 'error');
      if (!speakFastAnswered) sfEvaluateFast(null);
    };
    nr.onend = function() {
      if (window.sfRecognition === nr && !got && speakFastListening && !speakFastAnswered) {
        clearInterval(speakFastTimer); speakFastTimer = null; sfStopListening(); sfEvaluateFast(null);
      }
    };
    nr.start();
  } catch(e) { showToast('Lỗi mic: ' + e.message, 'error'); }
}
function sfStopListening() {
  speakFastListening = false;
  if (window.sfRecognition) { try { window.sfRecognition.stop(); } catch(e) { try { window.sfRecognition.abort(); } catch(e2) {} } window.sfRecognition = null; }
  if (speakFastTimer) { clearInterval(speakFastTimer); speakFastTimer = null; }
  var btn = document.getElementById('sfMicBtn'), icon = document.getElementById('sfMicIcon'), ring = document.getElementById('sfRippleRing');
  var status = document.getElementById('sfStatus');
  if (btn) btn.classList.remove('recording'); if (icon) icon.textContent = '🎤'; if (ring) ring.style.display = 'none'; if (status) status.innerHTML = '';
}
function sfEvaluateFast(recognizedText) {
  if (speakFastAnswered) return; speakFastAnswered = true;
  var s = currentConvData.sentences[speakFastIndex];
  var fb = document.getElementById('sfResult'); var st = document.getElementById('sfStatus');
  if (!fb) return;
  if (recognizedText) {
    var nr = normalizeText(recognizedText); var no = normalizeText(s.en);
    var isCorrect = (nr === no);
    if (isCorrect) {
      speakFastScore++;
      fb.innerHTML = '<div class="result-pop result-correct p-4 text-center"><div class="text-2xl mb-1">✅</div><p class="text-green-700 font-medium">Đúng! +1 ⚡</p><p class="text-sm text-gray-500 mt-1">"' + escHtml(recognizedText) + '"</p></div>';
      setTimeout(sfNext, 1200); return;
    } else {
      fb.innerHTML = '<div class="result-pop result-incorrect p-4 text-center"><div class="text-2xl mb-1">❌</div><p class="text-sm text-gray-500 mb-1">Bạn nói:</p><p class="font-medium text-red-700 text-lg mb-2">"' + escHtml(recognizedText) + '"</p><div class="border-t-red-200 pt-2 mt-1"><p class="text-sm text-gray-500">Đáp án:</p><p class="font-medium text-gray-800 text-lg">' + escHtml(s.en) + '</p><button onclick="playSampleAudio(\'' + escHtml(s.en.replace(/'/g, "\\'")) + '\')" class="mt-2 mr-2 inline-flex items-center gap-1 py-1 px-3 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium">🔊 Nghe mẫu</button><button onclick="sfRetry()" class="mt-2 inline-flex items-center gap-1 py-1.5 px-3 rounded-full bg-red-100 text-red-700 text-sm font-medium">🎤 Nói lại</button></div></div>';
    }
  } else {
    fb.innerHTML = '<div class="result-pop result-incorrect p-4 text-center"><div class="text-2xl mb-1">⏰</div><p class="text-red-600 font-medium">Hết giờ!</p><div class="mt-2"><p class="text-sm text-gray-500">Đáp án:</p><p class="font-medium text-gray-800 text-lg">' + escHtml(s.en) + '</p><button onclick="playSampleAudio(\'' + escHtml(s.en.replace(/'/g, "\\'")) + '\')" class="mt-2 mr-2 inline-flex items-center gap-1 py-1 px-3 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium">🔊 Nghe mẫu</button><button onclick="sfRetry()" class="mt-2 inline-flex items-center gap-1 py-1.5 px-3 rounded-full bg-red-100 text-red-700 text-sm font-medium">🎤 Nói lại</button></div></div>';
  }
  if (st) st.innerHTML = '';
  var nb = document.getElementById('sfNextBtn'); if (nb) nb.style.display = '';
}
function sfNext() { speakFastIndex++; speakFastAnswered = false; renderSpeakFastQuestion(); setTimeout(function() { sfStartListening(); }, 400); }
function sfPrev() { if (speakFastIndex > 0) { speakFastIndex--; speakFastAnswered = false; renderSpeakFastQuestion(); setTimeout(function() { sfStartListening(); }, 400); } }
function sfRetry() { speakFastAnswered = false; var fb = document.getElementById('sfResult'); if (fb) fb.innerHTML = ''; var st = document.getElementById('sfStatus'); if (st) st.innerHTML = '<span class="text-red-500 font-medium">🎤 Đang nghe...</span>'; sfStartListening(); }
function renderSpeakFastResult() {
  var c = document.getElementById('speakFastContent');
  if (!c) return;
  var total = currentConvData.sentences.length; var pct = total > 0 ? Math.round((speakFastScore / total) * 100) : 0;
  saveGameBest(currentConvData.id, 'speakfast', speakFastScore);
  var rc = pct >= 80 ? 'bg-green-100 text-green-600' : (pct >= 50 ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-500');
  var html = '<div class="text-center py-8 animate-scale-in"><div class="text-6xl mb-4">⚡</div><h3 class="text-2xl font-bold text-gray-800 mb-1">Hoàn thành!</h3><p class="text-gray-500 mb-4">Bạn đã hoàn thành phần Nói nhanh</p><div class="inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 ' + rc + '" style="font-size:2rem;font-weight:700">' + speakFastScore + '/' + total + '</div><p class="text-gray-400 text-sm mb-6">' + pct + '% đúng</p><div class="flex gap-3 justify-center"><button onclick="switchView(\'home\')" class="bg-white text-gray-700 font-medium py-3 px-6 rounded-button border hover:bg-gray-50">← Về danh sách</button><button onclick="startSpeakFastGame()" class="grad-red text-white font-semibold py-3 px-6 rounded-button shadow">Chơi lại</button></div></div>';
  c.innerHTML = html;
}

/* ============================================
   CONVERSATION PLAYER
   ============================================ */
function renderPlayerView() {
  var c = document.getElementById('playerContent');
  if (!c || !currentConvData) return;
  var conv = currentConvData; var sentences = conv.sentences;
  var html = '';
  html += '<div class="flex items-center mb-3"><button onclick="switchView(\'modeSelect\', currentConvData)" class="flex items-center gap-1 text-purple-600 font-medium py-1 text-sm">← Quay lại</button><span class="ml-auto text-xs text-gray-400">' + escHtml(conv.title) + '</span></div>';

  // Config card
  html += '<div class="player-config-card"><div class="player-config-title"><span class="icon">🔊</span> Speech Speed</div>';
  html += '<input type="range" class="player-range" id="playerSpeedRange" min="0.5" max="2.0" step="0.1" value="' + playerSpeechRate.toFixed(1) + '" oninput="updatePlayerSpeed(this.value)">';
  html += '<div class="speed-label" id="playerSpeedLabel">Speed: ' + playerSpeechRate.toFixed(1) + 'x</div>';
  html += '<div class="player-checkbox-group">';
  html += '<label class="player-checkbox-label' + (playerRepeatConversation ? ' active' : '') + '"><input type="checkbox" ' + (playerRepeatConversation ? 'checked' : '') + ' onchange="togglePlayerRepeat(this.checked)"> 🔄 Repeat Conversation</label>';
  html += '<label class="player-checkbox-label' + (playerVietnameseFirst ? ' active' : '') + '"><input type="checkbox" ' + (playerVietnameseFirst ? 'checked' : '') + ' onchange="togglePlayerVietnameseFirst(this.checked)"> 🇻🇳 VI trước → 5s → EN</label>';
  html += '<label class="player-checkbox-label' + (playerHideEnglish ? ' active' : '') + '"><input type="checkbox" ' + (playerHideEnglish ? 'checked' : '') + ' onchange="togglePlayerHideEnglish(this.checked)"> 🙈 Hide English</label>';
  html += '</div></div>';

  // Control bar — Play toggles Play/Stop
  html += '<div class="player-control-bar"><button class="player-btn player-btn-play" id="playerPlayBtn" onclick="togglePlayerPlay()">▶</button><span class="player-playing-indicator" id="playerIndicator">Sẵn sàng</span></div>';

  // Video button (if videoUrl exists)
  if (conv.videoUrl && conv.videoUrl.trim()) {
    html += '<div class="text-center my-3"><a href="' + escHtml(conv.videoUrl) + '" target="_blank" rel="noopener" class="inline-flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-full shadow-md transition-all text-sm">📺 Xem video hướng dẫn <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg></a></div>';
  }

  // Sentence list
  html += '<div id="playerSentenceList">';
  for (var i = 0; i < sentences.length; i++) {
    var s = sentences[i]; var sc = 'player-sentence-card';
    if (i % 2 === 0) sc += ' border-l-indigo-400'; else sc += ' border-l-green-400';
    var avatar = playerAvatars[i % 2];
    html += '<div class="' + sc + '" id="psc_' + i + '"><div class="player-avatar">' + avatar + '</div>';
    html += '<div class="player-sentence-body"><div class="player-sentence-en' + (playerHideEnglish ? ' hidden-text' : '') + '" id="ps_en_' + i + '">' + escHtml(s.en) + '</div>';
    html += '<div class="player-tip-area" id="ps_tip_' + i + '"><span class="player-tip-btn" onclick="togglePlayerTip(' + i + ')">💡 Tip</span>';
    html += '<div class="player-tip-ipa" id="ps_ipa_' + i + '" style="display:none">';
    if (s.ipa && s.ipa.trim()) {
      html += '<span class="player-tip-word text-base">IPA: <span class="player-tip-ipa-text">' + escHtml(s.ipa) + '</span></span>';
    } else { html += '<span class="player-tip-empty">Chưa có phiên âm</span>'; }
    html += '</div></div>';
    html += '<div class="player-sentence-vi" id="ps_vi_' + i + '">' + escHtml(s.vi) + '</div></div>';
    var correctCount = getCorrectCount(conv.id, i);
    html += '<div class="player-sentence-actions"><button class="player-action-btn" onclick="toggleSentenceVisibility(' + i + ')" title="Ẩn/Hiện">👁</button><button class="player-action-btn" id="ps_speak_' + i + '" onclick="playSingleSentence(' + i + ')" title="Phát câu này">🔊</button><button class="player-action-btn" id="ps_mic_' + i + '" onclick="playerSpeakSentence(' + i + ')" title="Nói và so sánh">🎤</button>' + (correctCount > 0 ? '<span class="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold">' + correctCount + '</span>' : '') + '</div></div>';
  }
  html += '</div>';
  c.innerHTML = html;
  updatePlayerRange();
}

/* Player helpers */
function updatePlayerSpeed(val) {
  playerSpeechRate = parseFloat(val);
  var l = document.getElementById('playerSpeedLabel'); if (l) l.textContent = 'Speed: ' + playerSpeechRate.toFixed(1) + 'x';
  updatePlayerRange();
  if (playerUtterance && speechSynthesis.speaking) playerUtterance.rate = playerSpeechRate;
}
function updatePlayerRange() {
  var r = document.getElementById('playerSpeedRange'); if (!r) return;
  var min = parseFloat(r.min) || 0.5; var max = parseFloat(r.max) || 2.0; var val = parseFloat(r.value) || 1.0;
  var pct = ((val - min) / (max - min)) * 100;
  r.style.background = 'linear-gradient(to right, #6366f1 0%, #6366f1 ' + pct + '%, #e5e7eb ' + pct + '%, #e5e7eb 100%)';
}
function togglePlayerRepeat(c) { playerRepeatConversation = c; var ls = document.querySelectorAll('.player-checkbox-label'); if (ls[0]) ls[0].classList.toggle('active', c); }
function togglePlayerVietnameseFirst(c) {
  playerVietnameseFirst = c; var ls = document.querySelectorAll('.player-checkbox-label'); if (ls[1]) ls[1].classList.toggle('active', c);
  if (!currentConvData) return;
  for (var i = 0; i < currentConvData.sentences.length; i++) {
    var en = document.getElementById('ps_en_' + i); var vi = document.getElementById('ps_vi_' + i);
    if (!en || !vi) continue;
    var body = en.parentNode;
    if (c) { if (vi.nextSibling !== en) body.insertBefore(vi, en); }
    else { if (en.nextSibling !== vi) body.insertBefore(en, vi); }
  }
}
function togglePlayerHideEnglish(c) {
  playerHideEnglish = c; var ls = document.querySelectorAll('.player-checkbox-label'); if (ls[2]) ls[2].classList.toggle('active', c);
  if (!currentConvData) return;
  for (var i = 0; i < currentConvData.sentences.length; i++) {
    var en = document.getElementById('ps_en_' + i); if (en) en.classList.toggle('hidden-text', c);
  }
}
function toggleSentenceVisibility(idx) {
  var en = document.getElementById('ps_en_' + idx); var vi = document.getElementById('ps_vi_' + idx);
  if (en) en.classList.toggle('hidden-text'); if (vi) vi.classList.toggle('hidden-text');
}

/* Player speech rec per sentence */
var playerRecognition = null; var playerListeningIdx = -1; var playerIsRecognizing = false;
function playerSpeakSentence(idx) {
  if (playerIsRecognizing) return; if (!currentConvData || !currentConvData.sentences[idx]) return;
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { showToast('Trình duyệt không hỗ trợ', 'error'); return; }
  try { speechSynthesis.cancel(); } catch(e) {}
  var btn = document.getElementById('ps_mic_' + idx);
  if (btn) { btn.textContent = '⏺'; btn.classList.add('speaking'); }
  playerIsRecognizing = true; playerListeningIdx = idx;
  try {
    if (playerRecognition) { try { playerRecognition.abort(); } catch(e) {} playerRecognition = null; }
    var nr = new SR(); nr.lang = 'en-US'; nr.continuous = false; nr.interimResults = false; nr.maxAlternatives = 1;
    playerRecognition = nr;
    var ind = document.getElementById('playerIndicator'); if (ind) ind.textContent = '🎤 Đang nghe...';
    nr.onresult = function(ev) {
      var t = ev.results[0][0].transcript.trim(); playerIsRecognizing = false;
      if (btn) { btn.textContent = '🎤'; btn.classList.remove('speaking'); }
      var conv = currentConvData; var sentence = conv.sentences[idx]; var original = sentence.en;
      var nr2 = t.toLowerCase().replace(/[^\w\s']/g, '').replace(/\s+/g, ' ').trim();
      var no = original.toLowerCase().replace(/[^\w\s']/g, '').replace(/\s+/g, ' ').trim();
      var correct = (nr2 === no);
      if (correct) {
        var key = conv.id + '_' + idx; G_PROGRESS[key] = (G_PROGRESS[key] || 0) + 1; lsSave();
        if (ind) ind.textContent = '✅ Đúng! (' + G_PROGRESS[key] + ' lần)';
        var card = document.getElementById('psc_' + idx);
        if (card) { card.classList.add('correct-flash'); setTimeout(function() { card.classList.remove('correct-flash'); }, 800); }
      } else {
        if (ind) ind.textContent = '❌ Chưa đúng. Câu gốc: "' + original + '"';
        var card = document.getElementById('psc_' + idx);
        if (card) { card.classList.add('incorrect-flash'); setTimeout(function() { card.classList.remove('incorrect-flash'); }, 800); }
      }
    };
    nr.onerror = function(ev) {
      playerIsRecognizing = false; if (btn) { btn.textContent = '🎤'; btn.classList.remove('speaking'); }
      var ind = document.getElementById('playerIndicator');
      if (ev.error === 'no-speech') { if (ind) ind.textContent = '⚠️ Không nghe thấy, thử lại'; }
      else if (ev.error !== 'aborted') { if (ind) ind.textContent = '⚠️ Lỗi: ' + ev.error; }
    };
    nr.onend = function() {
      if (playerIsRecognizing) { playerIsRecognizing = false; if (btn) { btn.textContent = '🎤'; btn.classList.remove('speaking'); } }
    };
    nr.start();
  } catch(e) { playerIsRecognizing = false; if (btn) { btn.textContent = '🎤'; btn.classList.remove('speaking'); } }
}

/* Single sentence playback */
function playSingleSentence(idx) {
  if (!currentConvData || !currentConvData.sentences[idx]) return;
  try { speechSynthesis.cancel(); } catch(e) {}
  if (playerUtterance) playerUtterance = null;
  var text = currentConvData.sentences[idx].en;
  var utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'en-US'; utterance.rate = playerSpeechRate || 1.0;
  var btn = document.getElementById('ps_speak_' + idx); if (btn) btn.classList.add('speaking');
  utterance.onend = function() { if (btn) btn.classList.remove('speaking'); };
  utterance.onerror = function() { if (btn) btn.classList.remove('speaking'); };
  playerUtterance = utterance; speechSynthesis.speak(utterance);
}

/* Play/Stop all */
function togglePlayerPlay() { if (playerIsPlaying) { stopPlayerPlay(); return; } startPlayerPlay(); }
function startPlayerPlay() {
  if (!currentConvData || !currentConvData.sentences || !currentConvData.sentences.length) return;
  playerCurrentIdx = -1; playerIsPlaying = true;
  var btn = document.getElementById('playerPlayBtn'); if (btn) btn.textContent = '⏸';
  // Set media session for lock screen controls
  setupMediaSession();
  startBackgroundAudio(currentConvData.title, '');
  playerPlayNext();
}
function playerPlayNext() {
  if (!playerIsPlaying) return;
  if (!currentConvData || !currentConvData.sentences) { stopPlayerPlay(); return; }
  var sentences = currentConvData.sentences;
  if (playerCurrentIdx >= 0) {
    var pc = document.getElementById('psc_' + playerCurrentIdx); if (pc) pc.classList.remove('playing-highlight');
    var pb = document.getElementById('ps_speak_' + playerCurrentIdx); if (pb) pb.classList.remove('speaking');
  }
  if (playerCurrentIdx + 1 >= sentences.length) {
    if (playerRepeatConversation) { playerCurrentIdx = -1; var ind = document.getElementById('playerIndicator'); if (ind) ind.textContent = '🔄 Lặp lại...'; playerPlayNext(); return; }
    stopPlayerPlay(); var ind = document.getElementById('playerIndicator'); if (ind) ind.textContent = '✅ Hoàn thành'; return;
  }
  playerCurrentIdx++; var idx = playerCurrentIdx; var s = sentences[idx];
  var card = document.getElementById('psc_' + idx); if (card) card.classList.add('playing-highlight');
  var ind = document.getElementById('playerIndicator'); if (ind) ind.textContent = '🔊 ' + (idx + 1) + '/' + sentences.length;
  try { speechSynthesis.cancel(); } catch(e) {}
  
  // Update Media Session metadata
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: s.en,
      artist: currentConvData.title,
      artwork: [{ src: '', sizes: '512x512', type: 'image/png' }]
    });
  }

  // Determine if we speak Vietnamese first
  var viFirst = typeof playerVietnameseFirst !== 'undefined' ? playerVietnameseFirst : true;
  
  if (viFirst && s.vi && s.vi.trim()) {
    // Speak Vietnamese first
    var viUtter = new SpeechSynthesisUtterance(s.vi); viUtter.lang = 'vi-VN'; viUtter.rate = 0.9;
    var sb = document.getElementById('ps_speak_' + idx); if (sb) sb.classList.add('speaking');
    viUtter.onend = function() {
      // Wait 5 seconds
      if (ind) ind.textContent = '🔊 ' + (idx + 1) + '/' + sentences.length + ' ⏳ Đợi 5s...';
      setTimeout(function() {
        if (!playerIsPlaying) return;
        // Then speak English
        if (ind) ind.textContent = '🔊 ' + (idx + 1) + '/' + sentences.length + ': ' + s.en;
        var enUtter = new SpeechSynthesisUtterance(s.en); enUtter.lang = 'en-US'; enUtter.rate = playerSpeechRate || 1.0;
        enUtter.onend = function() { if (sb) sb.classList.remove('speaking'); setTimeout(function() { playerPlayNext(); }, 800); };
        enUtter.onerror = function() { if (sb) sb.classList.remove('speaking'); setTimeout(function() { playerPlayNext(); }, 400); };
        playerUtterance = enUtter; speechSynthesis.speak(enUtter);
      }, 5000);
    };
    viUtter.onerror = function() { if (sb) sb.classList.remove('speaking'); setTimeout(function() { playerPlayNext(); }, 400); };
    playerUtterance = viUtter; speechSynthesis.speak(viUtter);
  } else {
    // Speak English only (original behavior)
    if (ind) ind.textContent = '🔊 ' + (idx + 1) + '/' + sentences.length + ': ' + s.en.substring(0, 40) + '...';
    var enUtter = new SpeechSynthesisUtterance(s.en); enUtter.lang = 'en-US'; enUtter.rate = playerSpeechRate || 1.0;
    var sb = document.getElementById('ps_speak_' + idx); if (sb) sb.classList.add('speaking');
    enUtter.onend = function() { if (sb) sb.classList.remove('speaking'); setTimeout(function() { playerPlayNext(); }, 600); };
    enUtter.onerror = function() { if (sb) sb.classList.remove('speaking'); setTimeout(function() { playerPlayNext(); }, 400); };
    playerUtterance = enUtter; speechSynthesis.speak(enUtter);
  }
}
function setupMediaSession() {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.setActionHandler('play', function() { if (!playerIsPlaying) startPlayerPlay(); });
  navigator.mediaSession.setActionHandler('pause', function() { if (playerIsPlaying) stopPlayerPlay(); });
  navigator.mediaSession.setActionHandler('previoustrack', function() {
    if (playerCurrentIdx > 0) { playerCurrentIdx -= 2; playerPlayNext(); }
  });
  navigator.mediaSession.setActionHandler('nexttrack', function() {
    if (playerCurrentIdx < currentConvData.sentences.length - 1) { playerPlayNext(); }
  });
}
function stopPlayerPlay() {
  playerIsPlaying = false; try { speechSynthesis.cancel(); } catch(e) {}
  stopBackgroundAudio();
  if (playerUtterance) playerUtterance = null;
  if (currentConvData && currentConvData.sentences) {
    for (var i = 0; i < currentConvData.sentences.length; i++) {
      var card = document.getElementById('psc_' + i); if (card) card.classList.remove('playing-highlight');
      var btn = document.getElementById('ps_speak_' + i); if (btn) btn.classList.remove('speaking');
    }
  }
  var pb = document.getElementById('playerPlayBtn'); if (pb) pb.textContent = '▶';
  var ind = document.getElementById('playerIndicator'); if (ind) ind.textContent = '⏹ Đã dừng';
}
function togglePlayerTip(idx) {
  var ipa = document.getElementById('ps_ipa_' + idx);
  if (ipa) { if (ipa.style.display === 'none') ipa.style.display = 'block'; else ipa.style.display = 'none'; }
}

/* ============================================
   ROLEPLAY — Đối đáp phản xạ
   ============================================ */
var roleplayRole = 'A'; // 'A' = even indices, 'B' = odd indices
var roleplayStep = 0;
var roleplayScore = 0;
var roleplayAnswered = false;
var roleplayListening = false;
var roleplayRecognition = null;
var roleplayStepResult = null; // null | 'correct' | 'wrong'
var roleplayUserText = ''; // last spoken text by user

function roleplayPickRole(role) {
  if (!currentConvData || !currentConvData.sentences || currentConvData.sentences.length < 2) {
    showToast('Hội thoại này cần ít nhất 2 câu để đối đáp', 'warning');
    return;
  }
  roleplayRole = role;
  roleplayStep = -1;
  roleplayScore = 0;
  roleplayAnswered = false;
  roleplayListening = false;
  roleplayRecognition = null;
  roleplayStepResult = null;
  roleplayUserText = '';
  try { speechSynthesis.cancel(); } catch(e) {}
  roleplayNext();
}

function renderRoleplayView() {
  // Stop any active recognition before re-render
  if (roleplayRecognition) { try { roleplayRecognition.abort(); } catch(e) {} roleplayRecognition = null; }
  roleplayListening = false;

  var c = document.getElementById('roleplayContent');
  if (!c || !currentConvData) return;
  var conv = currentConvData;
  var sentences = conv.sentences;
  var total = sentences.length;

  var isUserStep = function(idx) {
    return (roleplayRole === 'A' && idx % 2 === 0) || (roleplayRole === 'B' && idx % 2 === 1);
  };

  var html = '';
  html += '<div class="flex items-center mb-4">';
  html += '<button onclick="switchView(\'modeSelect\', currentConvData)" class="flex items-center gap-1.5 text-purple-600 font-medium py-1 text-sm"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg> Quay lại</button>';
  html += '<span class="ml-auto text-xs text-gray-400">' + escHtml(conv.title) + '</span></div>';

  if (roleplayStep === -1) {
    // === Role selection screen (pre-start) ===
    html += '<div class="text-center" style="padding-top:2rem">';
    html += '<div class="text-6xl mb-4">🎭</div>';
    html += '<h2 class="text-2xl font-bold text-gray-800 mb-2">Chọn vai của bạn</h2>';
    html += '<p class="text-gray-400 text-sm mb-8">Bạn sẽ đóng vai nào trong hội thoại này?</p>';
    html += '<div class="flex flex-col gap-4 max-w-sm mx-auto">';
    html += '<button onclick="roleplayPickRole(\'A\')" class="w-full py-6 px-6 rounded-2xl bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold text-xl transition-all shadow-sm border-2 border-indigo-200 hover:border-indigo-400 flex items-center justify-center gap-4">';
    html += '<span class="text-4xl">👨</span><div class="text-left"><div class="font-bold text-xl">Vai A</div><div class="text-sm font-normal text-indigo-500">Câu chẵn (1, 3, 5, 7...)</div></div></button>';
    html += '<button onclick="roleplayPickRole(\'B\')" class="w-full py-6 px-6 rounded-2xl bg-green-100 hover:bg-green-200 text-green-700 font-bold text-xl transition-all shadow-sm border-2 border-green-200 hover:border-green-400 flex items-center justify-center gap-4">';
    html += '<span class="text-4xl">👩</span><div class="text-left"><div class="font-bold text-xl">Vai B</div><div class="text-sm font-normal text-green-500">Câu lẻ (2, 4, 6, 8...)</div></div></button>';
    html += '</div>';
    html += '<div class="mt-8 p-4 bg-gray-50 rounded-xl text-left text-sm text-gray-500 max-w-sm mx-auto">';
    html += '<p class="font-semibold text-gray-700 mb-2">📖 Cách chơi:</p>';
    html += '<ul class="space-y-1 list-disc list-inside"><li>Máy sẽ đọc câu của nhân vật kia</li><li>Đến lượt bạn: bấm 🎤 và nói câu của mình</li><li>Đúng ✅ → tự động sang câu tiếp</li><li>Sai ❌ → xem đáp án và nói lại</li></ul>';
    html += '</div>';
    html += '</div>';
  } else {
    // Progress
    var pct = total > 0 ? ((roleplayStep + 1) / total) * 100 : 0;
    if (pct > 100) pct = 100;
    html += '<div class="mb-3"><div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden"><div class="progress-fill h-full rounded-full bg-green-500" style="width:' + pct + '%"></div></div><p class="text-right text-xs text-gray-500 mt-0.5">Câu ' + Math.min(roleplayStep + 1, total) + ' / ' + total + ' · Vai: ' + (roleplayRole === 'A' ? '👨 A' : '👩 B') + ' · ⭐ ' + roleplayScore + '</p></div>';

    // Chat bubbles
    html += '<div class="space-y-3 mb-4" id="roleplayBubbles">';
    var displayEnd = roleplayStep;
    if (roleplayStep >= total) displayEnd = total - 1;
    for (var i = 0; i <= displayEnd; i++) {
    var s = sentences[i];
    var isUser = isUserStep(i);
    var who = isUser ? 'Bạn' : 'Máy';
    var align = isUser ? 'text-right' : 'text-left';
    var bgClass = isUser ? 'bg-indigo-100 text-indigo-900' : 'bg-gray-100 text-gray-800';
    var nameColor = isUser ? 'text-indigo-600' : 'text-gray-500';
    var showVi = (i < roleplayStep) || (i === roleplayStep && (roleplayAnswered || roleplayStepResult !== null));
    html += '<div class="' + align + '">';
    html += '<p class="text-xs font-semibold ' + nameColor + ' mb-1 px-1">' + who + '</p>';
    html += '<div class="inline-block max-w-[85%] md:max-w-[75%] px-4 py-3 rounded-2xl ' + bgClass + ' text-left leading-relaxed shadow-sm">';
    html += '<p class="font-medium">' + escHtml(s.en) + '</p>';
    if (showVi) {
      html += '<p class="text-xs mt-1 opacity-60">' + escHtml(s.vi) + '</p>';
    }
    // Feedback on current step
    if (i === roleplayStep && roleplayStepResult === 'correct') {
      html += '<div class="mt-2 text-green-600 font-semibold text-sm text-center">✅ Đúng! +1 ⭐</div>';
    } else if (i === roleplayStep && roleplayStepResult === 'wrong') {
      html += '<div class="mt-2 text-red-500 font-semibold text-sm text-center">❌ Sai</div>';
    }
    html += '</div></div>';
  }
  html += '</div>';

  // Action area
  if (roleplayStep < total && roleplayStep >= 0) {
    if (isUserStep(roleplayStep)) {
      if (!roleplayAnswered && roleplayStepResult === null) {
        // User's turn — show mic + auto-listen
        html += '<div class="flex flex-col items-center gap-3 py-4">';
        html += '<div class="relative">';
        html += '<div id="rpMicBtn" class="w-24 h-24 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg flex items-center justify-center cursor-pointer transition-all" style="font-size:42px" onclick="roleplayToggleMic()"><span id="rpMicIcon">🎤</span></div>';
        html += '<div id="rpRippleRing" class="ripple-ring" style="display:none"></div></div>';
        html += '<p id="rpStatus" class="text-base text-gray-500 font-medium min-h-[24px]">🎤 Đến lượt bạn!</p>';
        html += '</div>';
        html += '<div id="rpResult" class="w-full max-w-lg mx-auto"></div>';
      } else if (roleplayStepResult === 'correct') {
        // Correct — show transition message
        html += '<div class="text-center py-2"><p class="text-sm text-gray-400 italic">⏳ Chuyển tiếp...</p></div>';
      } else if (roleplayStepResult === 'wrong') {
        // Wrong — show retry/next buttons
        var s = sentences[roleplayStep];
        html += '<div class="text-center py-3 space-y-3">';
        if (roleplayUserText) {
          html += '<p class="text-sm text-red-600">Bạn nói: "' + escHtml(roleplayUserText) + '"</p>';
        }
        html += '<p class="text-sm text-gray-500">Đáp án: <strong class="text-gray-800">' + escHtml(s.en) + '</strong></p>';
        html += '<p class="text-xs text-gray-400">' + escHtml(s.vi) + '</p>';
        html += '<div class="flex justify-center gap-3 mt-2"><button onclick="roleplayRetry()" class="inline-flex items-center gap-1.5 py-2.5 px-6 rounded-full bg-red-100 hover:bg-red-200 text-red-700 font-semibold text-base shadow-sm transition-all">🎤 Nói lại</button><button onclick="roleplayNext()" class="inline-flex items-center gap-1.5 py-2.5 px-6 rounded-full bg-green-100 hover:bg-green-200 text-green-700 font-semibold text-base shadow-sm transition-all">Tiếp theo →</button></div>';
        html += '</div>';
      }
    } else {
      // Machine's turn
      if (!roleplayAnswered) {
        html += '<div class="text-center py-4"><div class="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 rounded-full text-gray-600 font-medium"><span class="sound-wave-bars inline-flex"><span></span><span></span><span></span><span></span></span> Máy đang nói...</div></div>';
      }
    }
  } else if (roleplayStep >= total) {
    // Result screen
    var pct2 = total > 0 ? Math.round((roleplayScore / total) * 100) : 0;
    var rc = pct2 >= 80 ? 'bg-green-100 text-green-600' : (pct2 >= 50 ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-500');
    html += '<div class="text-center py-8 animate-scale-in"><div class="text-6xl mb-4">🎭</div><h3 class="text-2xl font-bold text-gray-800 mb-1">Hoàn thành!</h3><p class="text-gray-500 mb-4">Bạn đã hoàn thành Đối đáp phản xạ</p><div class="inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 ' + rc + '" style="font-size:2rem;font-weight:700">' + roleplayScore + '/' + total + '</div><p class="text-gray-400 text-sm mb-6">' + pct2 + '% đúng</p><div class="flex gap-3 justify-center"><button onclick="switchView(\'modeSelect\', currentConvData)" class="bg-white text-gray-700 font-medium py-3 px-6 rounded-button border hover:bg-gray-50">← Quay lại</button><button onclick="switchView(\'roleplay\', currentConvData)" class="bg-green-500 text-white font-semibold py-3 px-6 rounded-button shadow">Chơi lại</button></div></div>';
  }
  } // end else (roleplayStep >= 0)

  c.innerHTML = html;

  // Auto-start listening for user's turn
  if (roleplayStep >= 0 && roleplayStep < total && isUserStep(roleplayStep) && !roleplayAnswered && roleplayStepResult === null) {
    setTimeout(function() {
      if (!roleplayAnswered && roleplayStepResult === null) roleplayStartListening();
    }, 400);
  }
}

function roleplayNext() {
  if (!currentConvData || !currentConvData.sentences) return;
  var sentences = currentConvData.sentences;
  roleplayStep++;
  roleplayAnswered = false;
  roleplayStepResult = null;
  roleplayUserText = '';

  if (roleplayStep >= sentences.length) {
    renderRoleplayView();
    return;
  }

  var isUser = (roleplayRole === 'A' && roleplayStep % 2 === 0) || (roleplayRole === 'B' && roleplayStep % 2 === 1);
  renderRoleplayView();

  if (!isUser) {
    // Machine speaks
    setTimeout(function() {
      var s = sentences[roleplayStep];
      try { speechSynthesis.cancel(); } catch(e) {}
      startBackgroundAudio(currentConvData ? currentConvData.title : '', s.en);
      var u = new SpeechSynthesisUtterance(s.en);
      u.lang = 'en-US';
      u.rate = 0.85;
      u.onend = function() {
        setTimeout(function() { roleplayNext(); }, 1200);
      };
      u.onerror = function() {
        setTimeout(function() { roleplayNext(); }, 800);
      };
      speechSynthesis.speak(u);
    }, 200);
  }
}

function roleplayToggleMic() {
  if (roleplayListening) {
    roleplayStopListening();
  } else {
    roleplayStartListening();
  }
}

function roleplayStartListening() {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { showToast('Trình duyệt không hỗ trợ nhận diện giọng nói', 'error'); return; }
  try {
    if (roleplayRecognition) { try { roleplayRecognition.abort(); } catch(e) {} roleplayRecognition = null; }
    var nr = new SR(); nr.lang = 'en-US'; nr.continuous = false; nr.interimResults = false; nr.maxAlternatives = 1;
    var got = false; roleplayRecognition = nr; roleplayListening = true;
    var btn = document.getElementById('rpMicBtn'), icon = document.getElementById('rpMicIcon'), ring = document.getElementById('rpRippleRing');
    var status = document.getElementById('rpStatus');
    if (btn) btn.classList.add('recording');
    if (icon) icon.innerHTML = '<span class="listening-bars"><span></span><span></span><span></span><span></span><span></span></span>';
    if (ring) ring.style.display = 'block';
    if (status) status.innerHTML = '<span class="text-red-500 font-medium text-base">🎤 Đang nghe... (bấm để dừng)</span>';
    nr.onresult = function(ev) {
      got = true; roleplayListening = false;
      roleplayStopRecognition();
      var t = ev.results[0][0].transcript.trim();
      if (t) roleplayEvaluate(t);
    };
    nr.onerror = function(ev) {
      got = true; roleplayListening = false;
      roleplayStopRecognition();
      if (ev.error === 'no-speech') showToast('Không nghe thấy, hãy thử lại', 'warning');
      else if (ev.error !== 'aborted') showToast('Lỗi: ' + ev.error, 'error');
      roleplayResetMicUI();
    };
    nr.onend = function() {
      if (roleplayRecognition === nr && !got && roleplayListening) {
        roleplayListening = false;
        roleplayResetMicUI();
        var st = document.getElementById('rpStatus');
        if (st) st.innerHTML = '<span class="text-gray-400">⏱ Không nghe thấy, bấm mic để thử lại</span>';
      }
    };
    nr.start();
  } catch(e) { showToast('Lỗi mic: ' + e.message, 'error'); }
}

function roleplayStopRecognition() {
  if (roleplayRecognition) {
    try { roleplayRecognition.stop(); } catch(e) { try { roleplayRecognition.abort(); } catch(e2) {} }
    roleplayRecognition = null;
  }
}

function roleplayStopListening() {
  roleplayListening = false;
  roleplayStopRecognition();
  roleplayResetMicUI();
}

function roleplayResetMicUI() {
  var btn = document.getElementById('rpMicBtn'), icon = document.getElementById('rpMicIcon'), ring = document.getElementById('rpRippleRing');
  if (btn) btn.classList.remove('recording');
  if (icon) icon.textContent = '🎤';
  if (ring) ring.style.display = 'none';
}

function roleplayEvaluate(text) {
  if (roleplayAnswered || roleplayStepResult !== null) return;
  roleplayAnswered = true;
  if (!currentConvData || !currentConvData.sentences[roleplayStep]) return;
  var s = currentConvData.sentences[roleplayStep];
  var nr = normalizeText(text);
  var no = normalizeText(s.en);
  var isCorrect = (nr === no);
  roleplayUserText = text;

  if (isCorrect) {
    roleplayScore++;
    roleplayStepResult = 'correct';
    playTingSound();
    renderRoleplayView();
    setTimeout(function() { roleplayNext(); }, 1200);
  } else {
    roleplayStepResult = 'wrong';
    renderRoleplayView();
  }
}

function roleplayRetry() {
  roleplayAnswered = false;
  roleplayStepResult = null;
  roleplayUserText = '';
  renderRoleplayView();
}

/* Override old initVocabGame to use flashcard */
function initVocabGame() {
  initFlashcardGame();
}

/* ============================================
   FLASHCARD VOCABULARY
   ============================================ */
var fcList = [];
var fcIndex = 0;
var fcLearned = {};
var fcFlipped = false;

function initFlashcardGame() {
  if (!currentConvData || !currentConvData.sentences || !currentConvData.sentences.length) {
    showToast('Hội thoại này chưa có câu nào', 'warning');
    switchView('home');
    return;
  }
  fcList = [];
  for (var fi = 0; fi < currentConvData.sentences.length; fi++) {
    var fs = currentConvData.sentences[fi];
    fcList.push({ en: fs.en, vi: fs.vi || '', ipa: fs.ipa || '' });
  }
  fcIndex = 0;
  fcFlipped = false;
  // Load learned state
  try {
    var lrn = localStorage.getItem('luyennoi_fc_' + currentConvData.id);
    if (lrn) fcLearned = JSON.parse(lrn);
    else fcLearned = {};
  } catch(e) { fcLearned = {}; }
  renderFlashcard();
}

function renderFlashcard() {
  var c = document.getElementById('vocabContent');
  if (!c) return;
  var total = fcList.length;
  if (fcIndex >= total) { renderFlashcardResult(); return; }
  var card = fcList[fcIndex];
  var isLearned = fcLearned[fcIndex] || false;

  var html = '';
  html += '<div class="flex items-center mb-3"><button onclick="switchView(\'modeSelect\', currentConvData)" class="flex items-center gap-1 text-purple-600 font-medium py-1 text-sm">← Quay lại</button><span class="ml-auto text-xs text-gray-400">' + escHtml(currentConvData.title) + '</span></div>';

  // Progress
  var pct = (fcIndex / total) * 100;
  html += '<div class="mb-3"><div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden"><div class="progress-fill h-full rounded-full bg-indigo-500" style="width:' + pct + '%"></div></div><p class="text-right text-xs text-gray-500 mt-0.5">Thẻ ' + (fcIndex + 1) + ' / ' + total + ' · ✅ ' + Object.keys(fcLearned).filter(function(k){return fcLearned[k];}).length + '</p></div>';

  // Flashcard
  html += '<div class="flashcard-container" onclick="flipFlashcard()">';
  html += '<div class="flashcard' + (fcFlipped ? ' flipped' : '') + '">';
  html += '<div class="flashcard-face flashcard-front"><div class="fc-label">👁️ Bấm để xem nghĩa</div><div class="fc-text">' + escHtml(card.en) + '</div></div>';
  html += '<div class="flashcard-face flashcard-back"><div class="fc-label">📖 Nghĩa</div><div class="fc-text">' + escHtml(card.vi) + '</div>' + (card.ipa ? '<div class="fc-ipa">🔤 ' + escHtml(card.ipa) + '</div>' : '') + '</div>';
  html += '</div></div>';

  // Action buttons
  html += '<div class="flex items-center justify-center gap-4 mt-5">';
  html += '<button onclick="fcPrev()" class="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-lg transition-all' + (fcIndex <= 0 ? ' opacity-30' : '') + '"' + (fcIndex <= 0 ? ' disabled' : '') + '>◀</button>';
  html += '<button onclick="playFlashcardAudio()" class="w-14 h-14 rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-600 flex items-center justify-center text-2xl transition-all shadow-sm">🔊</button>';
  html += '<button onclick="toggleFlashcardLearned()" class="px-5 py-3 rounded-xl font-semibold text-sm transition-all ' + (isLearned ? 'bg-green-100 text-green-700 border-2 border-green-300' : 'bg-gray-100 text-gray-500 border-2 border-gray-200') + '">' + (isLearned ? '✅ Đã thuộc' : '☑️ Đánh dấu đã thuộc') + '</button>';
  html += '<button onclick="fcNext()" class="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-lg transition-all' + (fcIndex >= total - 1 ? ' opacity-30' : '') + '"' + (fcIndex >= total - 1 ? ' disabled' : '') + '>▶</button>';
  html += '</div>';

  // Counter
  html += '<div class="text-center mt-4 text-xs text-gray-400">' + (fcIndex + 1) + ' / ' + total + '</div>';

  c.innerHTML = html;
}

function flipFlashcard() { fcFlipped = !fcFlipped; renderFlashcard(); }
function fcPrev() { if (fcIndex > 0) { fcIndex--; fcFlipped = false; renderFlashcard(); } }
function fcNext() { if (fcIndex < fcList.length - 1) { fcIndex++; fcFlipped = false; renderFlashcard(); } }
function playFlashcardAudio() {
  if (!fcList[fcIndex]) return;
  try { speechSynthesis.cancel(); } catch(e) {}
  var u = new SpeechSynthesisUtterance(fcList[fcIndex].en);
  u.lang = 'en-US'; u.rate = 0.85;
  speechSynthesis.speak(u);
}
function toggleFlashcardLearned() {
  fcLearned[fcIndex] = !fcLearned[fcIndex];
  try { localStorage.setItem('luyennoi_fc_' + currentConvData.id, JSON.stringify(fcLearned)); } catch(e) {}
  renderFlashcard();
}
function renderFlashcardResult() {
  var c = document.getElementById('vocabContent');
  if (!c) return;
  var total = fcList.length;
  var learned = Object.keys(fcLearned).filter(function(k){return fcLearned[k];}).length;
  var html = '<div class="text-center py-8 animate-scale-in"><div class="text-6xl mb-4">📚</div><h3 class="text-2xl font-bold text-gray-800 mb-1">Hoàn thành!</h3><p class="text-gray-500 mb-4">Bạn đã xem xong tất cả thẻ</p><div class="inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 bg-green-100 text-green-600" style="font-size:2rem;font-weight:700">✅<br>' + learned + '/' + total + '</div><p class="text-gray-400 text-sm mb-6">' + learned + ' thẻ đã thuộc</p><div class="flex gap-3 justify-center"><button onclick="switchView(\'modeSelect\', currentConvData)" class="bg-white text-gray-700 font-medium py-3 px-6 rounded-button border hover:bg-gray-50">← Quay lại</button><button onclick="initFlashcardGame()" class="bg-indigo-500 text-white font-semibold py-3 px-6 rounded-button shadow">Học lại</button></div></div>';
  c.innerHTML = html;
}

/* Override old initVocabGame to use flashcard */
function initVocabGame() {
  initFlashcardGame();
}

/* ============================================
   REVIEW — Ôn tập câu sai
   ============================================ */
function renderReviewView() {
  var c = document.getElementById('reviewContent');
  if (!c) return;
  var weakSentences = [];
  // Collect sentences with 0 correct count, or only 1-2
  for (var ri = 0; ri < G_CONVERSATIONS.length; ri++) {
    var rc = G_CONVERSATIONS[ri];
    for (var rj = 0; rj < rc.sentences.length; rj++) {
      var corrects = getCorrectCount(rc.id, rj);
      if (corrects < 2) {
        weakSentences.push({
          convId: rc.id,
          convTitle: rc.title,
          idx: rj,
          en: rc.sentences[rj].en,
          vi: rc.sentences[rj].vi || '',
          corrects: corrects
        });
      }
    }
  }

  var html = '';
  html += '<div class="flex items-center mb-4">';
  html += '<button onclick="switchView(\'home\')" class="flex items-center gap-1.5 text-purple-600 font-medium py-1 text-sm"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg> Quay lại</button>';
  html += '<span class="ml-auto text-xs text-gray-400">📋 Ôn tập</span></div>';

  html += '<h2 class="text-lg font-bold text-gray-800 mb-1">📋 Ôn tập câu sai</h2>';
  html += '<p class="text-sm text-gray-400 mb-4">Các câu bạn chưa đọc đúng hoặc mới đọc 1 lần</p>';

  if (weakSentences.length === 0) {
    html += '<div class="review-zero-state"><div class="text-5xl mb-3">🎉</div><p class="text-lg font-medium text-gray-500">Không có câu nào cần ôn!</p><p class="text-sm mt-1">Bạn đã đọc đúng tất cả các câu ít nhất 2 lần rồi.</p></div>';
  } else {
    html += '<div class="space-y-2">';
    for (var rk = 0; rk < weakSentences.length; rk++) {
      var ws = weakSentences[rk];
      var timesText = ws.corrects === 0 ? 'Chưa đọc đúng' : 'Đã đúng ' + ws.corrects + ' lần';
      var badgeCls = ws.corrects === 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700';
      html += '<div class="review-sentence-card" onclick="reviewPractice(\'' + ws.convId + '\',' + ws.idx + ')">';
      html += '<div class="flex-1 min-w-0"><p class="review-en">' + escHtml(ws.en) + '</p><p class="review-vi">' + escHtml(ws.vi) + '</p>';
      html += '<p class="text-xs text-gray-400 mt-0.5">📖 ' + escHtml(ws.convTitle) + '</p></div>';
      html += '<span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ' + badgeCls + '">' + timesText + '</span>';
      html += '<span class="text-gray-300 text-lg">🎤</span>';
      html += '</div>';
    }
    html += '</div>';
  }

  c.innerHTML = html;
}

function reviewPractice(convId, idx) {
  for (var ri = 0; ri < G_CONVERSATIONS.length; ri++) {
    if (G_CONVERSATIONS[ri].id == convId) {
      currentConvData = G_CONVERSATIONS[ri];
      currentSentenceIndex = idx;
      switchView('practice');
      return;
    }
  }
  showToast('Không tìm thấy bài học', 'error');
}

/* ============================================
   STATS — Thống kê 7 ngày
   ============================================ */
function renderStatsView() {
  var c = document.getElementById('statsContent');
  if (!c) return;
  var stats = getLast7DaysStats();
  var maxCount = 1;
  for (var si = 0; si < stats.length; si++) {
    if (stats[si].count > maxCount) maxCount = stats[si].count;
  }
  var totalWeek = 0;
  for (var sj = 0; sj < stats.length; sj++) totalWeek += stats[sj].count;

  var html = '';
  html += '<div class="flex items-center mb-4">';
  html += '<button onclick="switchView(\'home\')" class="flex items-center gap-1.5 text-purple-600 font-medium py-1 text-sm"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg> Quay lại</button>';
  html += '<span class="ml-auto text-xs text-gray-400">📊 Thống kê</span></div>';

  html += '<div class="text-center mb-6">';
  html += '<h2 class="text-lg font-bold text-gray-800 mb-1">📊 Thống kê 7 ngày</h2>';
  html += '<p class="text-xs text-gray-400">Số câu đã đọc đúng mỗi ngày</p>';
  html += '</div>';

  // Total
  html += '<div class="text-center mb-6"><span class="stats-total">' + totalWeek + '</span><p class="text-xs text-gray-400 mt-1">câu đúng trong 7 ngày qua</p></div>';

  // Bar chart
  html += '<div class="bg-white rounded-xl shadow-sm p-4 mb-4">';
  html += '<div class="stats-chart">';
  for (var sk = 0; sk < stats.length; sk++) {
    var barH = maxCount > 0 ? Math.max(4, (stats[sk].count / maxCount) * 100) : 4;
    html += '<div class="stats-bar-wrap"><div class="stats-bar-count">' + stats[sk].count + '</div><div class="stats-bar" style="height:' + barH + 'px"></div><div class="stats-bar-label">' + stats[sk].label + '</div></div>';
  }
  html += '</div></div>';

  // Daily breakdown
  html += '<div class="space-y-2">';
  var dayNames = ['Chủ nhật','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'];
  for (var sl = 0; sl < stats.length; sl++) {
    var d = new Date();
    d.setDate(d.getDate() - (6 - sl));
    var dateStr = d.getDate() + '/' + (d.getMonth()+1);
    html += '<div class="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-gray-100">';
    html += '<div><span class="font-medium text-sm text-gray-700">' + stats[sl].label + '</span><span class="text-xs text-gray-400 ml-2">' + dateStr + '</span></div>';
    html += '<span class="font-semibold text-sm ' + (stats[sl].count > 0 ? 'text-green-600' : 'text-gray-400') + '">' + stats[sl].count + ' câu</span>';
    html += '</div>';
  }
  html += '</div>';

  c.innerHTML = html;
}

/* ============================================
   DARK MODE
   ============================================ */
function initDarkMode() {
  var saved = localStorage.getItem('luyennoi_darkmode');
  if (saved === 'true') {
    document.body.classList.add('dark');
  }
  var btn = document.getElementById('darkModeToggle');
  if (btn) {
    btn.onclick = function() {
      document.body.classList.toggle('dark');
      var isDark = document.body.classList.contains('dark');
      btn.textContent = isDark ? '☀️' : '🌙';
      try { localStorage.setItem('luyennoi_darkmode', isDark ? 'true' : 'false'); } catch(e) {}
    };
    // Set initial icon
    btn.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
  }
}

/* ============================================
   CONFIRM MODAL
   ============================================ */
function showConfirmModal(title, message, onConfirm) {
  hideConfirmModal();
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay'; overlay.id = 'confirmModal';
  overlay.onclick = function(e) { if (e.target === overlay) hideConfirmModal(); };
  overlay.innerHTML = '<div class="modal-box"><h3 class="text-lg font-bold text-gray-800 mb-2">' + title + '</h3><p class="text-gray-600 text-sm mb-6">' + message + '</p><div class="flex items-center gap-3"><button onclick="hideConfirmModal()" class="flex-1 py-2.5 rounded-button border border-gray-200 text-gray-700 font-medium text-sm">Huỷ</button><button id="confirmBtn" class="flex-1 py-2.5 rounded-button bg-red-500 text-white font-medium text-sm">Xác nhận</button></div></div>';
  document.body.appendChild(overlay);
  document.getElementById('confirmBtn').onclick = function() { hideConfirmModal(); if (typeof onConfirm === 'function') onConfirm(); };
}
function hideConfirmModal() { var m = document.getElementById('confirmModal'); if (m) m.remove(); }

/* ============================================
   DOMContentLoaded
   ============================================ */
document.addEventListener('DOMContentLoaded', function() {
  primeSpeechSynthesis();
  lsDailyLoad();
  initDarkMode();

  var container = document.getElementById('conversationList');
  if (container) container.innerHTML = '<div class="text-center py-12 text-gray-400"><div class="spinner mx-auto mb-3"></div><p>Đang tải dữ liệu...</p></div>';

  var resetBtn = document.getElementById('resetDataBtn');
  if (resetBtn) { resetBtn.onclick = resetData; }

  initData().then(function() {
    switchView('home');
  }).catch(function() {
    switchView('home');
  });
});
