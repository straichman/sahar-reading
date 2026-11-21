// קריאה ביום של סהר. השיעור נטען מ-days/dNNN.json לפי ?d=N (בלי d: השיעור האחרון).
// FORM: טופס גוגל שאליו נשלחות התשובות. כל עוד הוא ריק, התוצאה נשמרת רק באייפד.
const FORM = { url: "", f: { name: "", day: "", score: "", total: "", detail: "", topic: "" } };

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const get = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v) } catch (e) { return d } };
const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) {} };
const bare = s => s.replace(/[֑-ׇ]/g, "").replace(/[^א-ת]/g, "");
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a };
const LET = ["א", "ב", "ג", "ד", "ה", "ו"];

let D, qi = -1, res = [], tried = false, topic = null;

// ---------- קול: לחיצה על מילה מקריאה אותה ----------
let heVoice = null;
function pickVoice() { const v = speechSynthesis.getVoices(); heVoice = v.find(x => /^he/i.test(x.lang)) || null }
if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice }
function say(t) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(t.replace(/[.,!?״"]/g, ""));
  u.lang = "he-IL"; u.rate = .8; if (heVoice) u.voice = heVoice;
  speechSynthesis.speak(u);
}

// ---------- קונפטי ----------
const cv = $("#confetti"), cx = cv.getContext("2d"); let parts = [];
function burst(n = 70) {
  cv.width = innerWidth; cv.height = innerHeight;
  const C = ["#ffb300", "#ff5c8a", "#3a7bff", "#1faa6b", "#a259ff"];
  for (let i = 0; i < n; i++) parts.push({ x: innerWidth / 2, y: innerHeight / 3, vx: (Math.random() - .5) * 14, vy: Math.random() * -12 - 3, c: C[i % 5], r: Math.random() * 6 + 4, a: 1 });
  if (parts.length === n) requestAnimationFrame(tick);
}
function tick() {
  cx.clearRect(0, 0, cv.width, cv.height);
  parts.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .4; p.a -= .012; cx.globalAlpha = Math.max(p.a, 0); cx.fillStyle = p.c; cx.fillRect(p.x, p.y, p.r, p.r) });
  parts = parts.filter(p => p.a > 0 && p.y < cv.height + 20);
  if (parts.length) requestAnimationFrame(tick); else cx.clearRect(0, 0, cv.width, cv.height);
}

// ---------- מסך השיעור ----------
function layout() {
  document.documentElement.style.setProperty("--hero", D.color || "#2fa36b");
  let k = 0;
  const txt = D.passage.map(s => s.split(" ").map(w => `<span class="w" data-i="${k++}">${esc(w)}</span>`).join(" ")).join(" ");
  $("#app").innerHTML = `
   <div class="hero"><h1>${esc(D.title)}</h1><p>${esc(D.subtitle || "")}</p><div class="big">${D.emoji}</div></div>
   <div class="grid two">
     <div class="card passage"><div class="tip">🔊 לֹא בָּטוּחַ אֵיךְ קוֹרְאִים מִלָּה? לְחַץ עָלֶיהָ וּתְשַׁמַּע</div><div class="txt" id="txt">${txt}</div></div>
     <div id="panel"></div>
   </div>`;
  $("#txt").onclick = e => { const w = e.target.closest(".w"); if (!w) return; if ($("#txt").classList.contains("findmode")) return pickWord(w); flash(w); say(w.textContent) };
  intro();
}
function flash(w) { w.classList.add("say"); setTimeout(() => w.classList.remove("say"), 900) }

function intro() {
  $("#panel").innerHTML = `<div class="card" style="text-align:center">
     <div style="font-size:64px">📖</div>
     <div style="font-size:30px;font-weight:700">קְרָא אֶת הַקֶּטַע בְּקוֹל</div>
     <p style="font-size:22px;color:var(--muted)">לְאַט לְאַט, מִלָּה אַחֲרֵי מִלָּה.<br>אַחַר כָּךְ יֵשׁ ${D.questions.length} שְׁאֵלוֹת.</p>
     <div class="nav"><button class="btn go" id="start">קָרָאתִי! לַשְּׁאֵלוֹת ⬅</button></div></div>`;
  $("#start").onclick = () => { qi = 0; question() };
}

function question() {
  const Q = D.questions[qi]; tried = false;
  $("#txt").classList.toggle("findmode", Q.t === "find");
  document.querySelectorAll(".w").forEach(w => w.classList.remove("found", "miss", "pick"));
  let body = "";
  if (Q.t === "mc") body = `<div class="opts ${Q.big ? "big" : ""}">${Q.o.map((o, i) =>
      `<button class="opt" data-i="${i}">${Q.big ? "" : `<span class="l">${LET[i]}</span>`}${o[0] ? `<span class="e">${o[0]}</span>` : ""}<span>${esc(o[1])}</span></button>`).join("")}</div>`;
  if (Q.t === "tf") body = `<div class="opts tf"><button class="opt" data-v="1"><span class="e">👍</span>נָכוֹן</button><button class="opt" data-v="0"><span class="e">👎</span>לֹא נָכוֹן</button></div>`;
  if (Q.t === "find") body = `<div style="font-size:22px;color:var(--muted)">👈 לְחַץ עַל הַמִּלָּה בְּתוֹךְ הַקֶּטַע</div>`;
  if (Q.t === "order") body = `<div class="chips answer" id="ans"></div><div class="chips" id="pool">${shuffleOrder(Q.w).map(w =>
      `<button class="chip" data-w="${esc(w)}">${esc(w)}</button>`).join("")}</div>`;
  $("#panel").innerHTML = `<div class="card">
     <div class="qbox"><span class="qn">${qi + 1}</span>${esc(Q.q)}</div>${body}
     <div class="fb" id="fb"></div>
     <div class="nav"><button class="btn" id="next" style="display:none">${qi + 1 < D.questions.length ? "לַשְּׁאֵלָה הַבָּאָה ⬅" : "סִיַּמְתִּי! 🎉"}</button></div>
     <div class="prog">שְׁאֵלָה ${qi + 1} מִתּוֹךְ ${D.questions.length}</div><div class="bar"><i style="width:${qi / D.questions.length * 100}%"></i></div></div>`;
  $("#next").onclick = () => { qi++; qi < D.questions.length ? question() : finish() };
  if (Q.t === "mc") document.querySelectorAll(".opt").forEach(b => b.onclick = () => judge(+b.dataset.i === Q.a, b));
  if (Q.t === "tf") document.querySelectorAll(".opt").forEach(b => b.onclick = () => judge((b.dataset.v === "1") === Q.a, b));
  if (Q.t === "order") document.querySelectorAll("#pool .chip").forEach(c => c.onclick = () => place(c, Q));
  if (window.innerWidth < 900 && Q.t !== "find") $("#panel").scrollIntoView({ behavior: "smooth", block: "start" });
}
function shuffleOrder(w) { let s; do { s = shuffle(w) } while (w.length > 1 && s.join() === w.join()); return s }

function judge(ok, el) {
  if ($("#next").style.display !== "none") return;
  if (!tried) { res[qi] = ok; tried = true }
  const fb = $("#fb");
  if (ok) {
    if (el) el.classList.add("right");
    fb.className = "fb ok"; fb.textContent = ["כׇּל הַכָּבוֹד! ⭐", "מְצֻיָּן! 🌟", "יֹפִי! 👏", "אַלּוּף! 🏆"][qi % 4];
    $("#next").style.display = ""; burst(50);
    document.querySelector(".bar i").style.width = (qi + 1) / D.questions.length * 100 + "%";
  } else {
    if (el) { el.classList.remove("wrong"); void el.offsetWidth; el.classList.add("wrong") }
    fb.className = "fb bad"; fb.textContent = "כִּמְעַט! נַסֵּה שׁוּב 💪";
  }
}

function pickWord(w) {
  const Q = D.questions[qi];
  if ($("#next").style.display !== "none") return;
  const ok = bare(w.textContent) === bare(Q.w);
  w.classList.add(ok ? "found" : "miss");
  if (!ok) setTimeout(() => w.classList.remove("miss"), 700);
  judge(ok, null);
  if (ok) $("#txt").classList.remove("findmode");
}

function place(c, Q) {
  const a = document.createElement("button");
  a.className = "chip"; a.textContent = c.dataset.w; c.classList.add("used");
  a.onclick = () => { if ($("#next").style.display !== "none") return; a.remove(); c.classList.remove("used") };
  $("#ans").appendChild(a);
  const got = [...$("#ans").children].map(x => x.textContent);
  if (got.length === Q.w.length) {
    const ok = got.join(" ") === Q.w.join(" ");
    judge(ok, null);
    if (!ok) setTimeout(() => { $("#ans").innerHTML = ""; document.querySelectorAll("#pool .chip").forEach(x => x.classList.remove("used")) }, 700);
    else $("#ans").style.borderColor = "var(--ok)";
  }
}

// ---------- סוף השיעור ----------
function finish() {
  $("#txt").classList.remove("findmode");
  const score = res.filter(Boolean).length, total = D.questions.length;
  const stk = get("sahar-stickers", {}); stk[D.n] = D.sticker; put("sahar-stickers", stk);
  burst(160);
  $("#panel").innerHTML = `<div class="card done">
     <div style="font-size:32px;font-weight:700">סִיַּמְתָּ אֶת הַקְּרִיאָה שֶׁל הַיּוֹם!</div>
     <div class="stars">${res.map(r => r ? "⭐" : "☆").join("")}</div>
     <div style="font-size:22px">${score} כּוֹכָבִים מִתּוֹךְ ${total}</div>
     <div class="sticker">${D.sticker}</div>
     <div style="font-size:22px">קִבַּלְתָּ מַדְבֵּקָה חֲדָשָׁה לָאַלְבּוֹם!</div>
     ${D.next && D.next.length ? `<hr style="border:none;border-top:2px dashed var(--line);margin:18px 0">
     <div style="font-size:26px;font-weight:700">עַל מָה תִּרְצֶה לִקְרֹא מָחָר? 🤔</div>
     <div class="topics">${D.next.map((t, i) => `<button class="topic" data-i="${i}"><span class="e">${t[0]}</span>${esc(t[1])}</button>`).join("")}</div>` : ""}
     <div class="nav"><button class="btn go" id="send">📬 שְׁלַח לְאַבָּא</button><a class="btn ghost" href="./" style="text-decoration:none">🏠 לָאַלְבּוֹם</a></div>
     <div class="fb ok" id="sent"></div></div>`;
  document.querySelectorAll(".topic").forEach(b => b.onclick = () => {
    document.querySelectorAll(".topic").forEach(x => x.classList.remove("sel")); b.classList.add("sel");
    topic = D.next[+b.dataset.i][1]; say(topic);
  });
  $("#send").onclick = () => send(score, total);
}

async function send(score, total) {
  const detail = D.questions.map((q, i) => `${i + 1}. ${res[i] ? "✓" : "✗ (הצליח בניסיון נוסף)"} ${q.q}`).join("\n");
  put("sahar-last", { n: D.n, score, total, topic, at: Date.now() });
  if (FORM.url) {
    const p = new URLSearchParams();
    p.append(FORM.f.name, "סהר"); p.append(FORM.f.day, D.n); p.append(FORM.f.score, score); p.append(FORM.f.total, total);
    p.append(FORM.f.detail, detail); p.append(FORM.f.topic, topic || "-");
    try { await fetch(FORM.url, { method: "POST", mode: "no-cors", body: p }) } catch (e) { $("#sent").textContent = "לֹא הִצְלַחְתִּי לִשְׁלֹחַ, נַסֵּה שׁוּב"; return }
  }
  $("#sent").textContent = topic ? `נִשְׁלַח! מָחָר נִקְרָא עַל ${topic} 🎉` : "נִשְׁלַח לְאַבָּא! 🎉";
  $("#send").textContent = "📬 נִשְׁלַח"; $("#send").disabled = true; burst(120);
}

(async () => {
  try {
    const idx = await (await fetch("days/index.json", { cache: "no-store" })).json();
    const want = +new URLSearchParams(location.search).get("d") || idx.days[idx.days.length - 1].n;
    D = await (await fetch(`days/d${String(want).padStart(3, "0")}.json`, { cache: "no-store" })).json();
    document.title = "קריאה ביום: " + D.title;
    layout();
  } catch (e) { $("#app").innerHTML = `<div class="loading">לֹא הִצְלַחְתִּי לִטְעֹן. נַסֵּה לְרַעְנֵן 🔄</div>` }
})();
