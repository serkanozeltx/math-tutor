/* ============================================================================
   SOCRATIC MATH TUTOR — Phase 1 Boilerplate
   ----------------------------------------------------------------------------
   Vanilla JS, no build step, no backend. Everything below is designed to be
   extended later with a real AI backend/API without changing the surrounding
   architecture (state shape, phase machine, i18n, rendering pipeline).

   ARCHITECTURE NOTES (read before extending):
   - STATE is the single source of truth and is persisted to localStorage
     after every mutation via saveState().
   - Content is organized by TOPIC. Phase 1 ships with a single topic
     ("quadratics-vertex-form") but TOPICS is a dictionary so adding a new
     grade level / concept later is just adding another key — no rewrite.
   - generateAIResponse() is the seam where real AI logic will be injected.
     It currently returns rule-based / canned Socratic prompts so the UI is
     fully testable without a backend. Replace its body with a call to your
     AI backend once available; keep its signature and return shape.
   ============================================================================ */

(function () {
  "use strict";

  /* ---------------------------------------------------------------------
   * 1. CONSTANTS & CONFIG
   * ------------------------------------------------------------------- */

  const STORAGE_KEY = "socraticMathTutor.state.v1";

  const PHASES = {
    CONCEPT_INTRO: 1,
    GUIDED_PRACTICE: 2,
    MINI_TEST: 3,
  };

  // Topic registry. Phase 1 ships one topic; the shape is deliberately
  // generic (id, title per language, content per phase) so more topics /
  // grade levels can be added later without touching the engine below.
  const TOPICS = {
    "quadratics-vertex-form": {
      id: "quadratics-vertex-form",
      title: { en: "Quadratic Functions — Vertex Form", tr: "İkinci Dereceden Fonksiyonlar — Tepe Noktası Formu" },
    },
  };

  const DEFAULT_TOPIC_ID = "quadratics-vertex-form";

  /* ---------------------------------------------------------------------
   * 2. i18n STRINGS
   *    Turkish strings strictly follow the project's terminology rules:
   *    "istem" (AI prompt), "öğrenme çıktıları" (learning outcomes),
   *    "yönerge" (task instructions), "veri kümeleri" (datasets).
   *    Never substitute "komut", "kazanımlar", "talimat", "veri setleri".
   * ------------------------------------------------------------------- */

  const STRINGS = {
    en: {
      appName: "Socratic Math Tutor",
      topicLabel: "Current Topic",
      topicName: TOPICS[DEFAULT_TOPIC_ID].title.en,
      phase1Name: "Phase 1: Concept Introduction",
      phase2Name: "Phase 2: Guided Practice",
      phase3Name: "Phase 3: Mini-Test",
      resetTitle: "Reset progress",
      inputPlaceholder: "Type your answer or question...",
      sendTitle: "Send",
      nextPhaseBtn: "Next Phase \u2192",
      nextPhaseBtnFinal: "Restart Topic \u21bb",
      visualToolBtn: "\uD83D\uDCC8 Use a Graphing Tool",
      visualPanelTitle: "Dynamic Visual Verification",
      visualPanelText:
        "Before checking, predict what will happen. Then open an interactive graphing tool or dynamic geometry " +
        "software in a separate tab and test your prediction using the function and sliders described in the chat.",
      storageNote: "Your progress is saved automatically on this device.",
      welcomeBack: "Welcome back! Picking up right where you left off, at {phase}.",
      welcomeFirstTime:
        "Hi! I'm your Socratic math coach. I won't give you direct answers — instead I'll ask questions " +
        "that help you build your own understanding. Let's begin.",
      phaseTransition: "Let's move to the next page for {phase}.",
      topicRestarted: "Starting the topic over from Phase 1. Your quiz results below remain in your history.",
      visualPromptIntro:
        "Let's verify your prediction visually. First, answer this: {question}",
      visualInstructions:
        "Now open an interactive graphing tool or dynamic geometry software in a new tab and graph:\n\n" +
        "  f(x) = a(x - h)^2 + k\n\n" +
        "Add three sliders named a, h, and k. Move each slider one at a time and compare what you see " +
        "to your prediction above. Tell me what you notice.",
    },
    tr: {
      appName: "Sokratik Matematik Koçu",
      topicLabel: "Mevcut Konu",
      topicName: TOPICS[DEFAULT_TOPIC_ID].title.tr,
      phase1Name: "1. Aşama: Kavram Tanıtımı",
      phase2Name: "2. Aşama: Yönlendirilmiş Uygulama",
      phase3Name: "3. Aşama: Kısa Sınav",
      resetTitle: "İlerlemeyi sıfırla",
      inputPlaceholder: "Cevabınızı veya sorunuzu yazın...",
      sendTitle: "Gönder",
      nextPhaseBtn: "Sonraki Aşama \u2192",
      nextPhaseBtnFinal: "Konuyu Yeniden Başlat \u21bb",
      visualToolBtn: "\uD83D\uDCC8 Grafik Aracı Kullan",
      visualPanelTitle: "Dinamik Görsel Doğrulama",
      visualPanelText:
        "Kontrol etmeden önce ne olacağını tahmin edin. Ardından ayrı bir sekmede etkileşimli bir grafik " +
        "aracı veya dinamik geometri yazılımı açın ve sohbette açıklanan fonksiyon ile kaydırıcıları " +
        "kullanarak tahmininizi test edin.",
      storageNote: "İlerlemeniz bu cihazda otomatik olarak kaydedilir.",
      welcomeBack: "Tekrar hoş geldiniz! Kaldığınız yerden, {phase} bölümünden devam ediyoruz.",
      welcomeFirstTime:
        "Merhaba! Ben senin Sokratik matematik koçunum. Sana doğrudan cevap vermeyeceğim; bunun yerine " +
        "kendi anlayışını inşa etmene yardımcı olacak sorular soracağım. Haydi başlayalım.",
      phaseTransition: "Şimdi {phase} için bir sonraki sayfaya geçelim.",
      topicRestarted: "Konu 1. Aşama'dan yeniden başlıyor. Aşağıdaki sınav sonuçlarınız geçmişinizde kalır.",
      visualPromptIntro: "Tahmininizi görsel olarak doğrulayalım. Önce şunu yanıtlayın: {question}",
      visualInstructions:
        "Şimdi yeni bir sekmede etkileşimli bir grafik aracı veya dinamik geometri yazılımı açın ve şunu " +
        "çizdirin:\n\n  f(x) = a(x - h)^2 + k\n\n" +
        "a, h ve k adında üç kaydırıcı ekleyin. Her kaydırıcıyı tek tek hareket ettirin ve gördüklerinizi " +
        "yukarıdaki tahmininizle karşılaştırın. Fark ettiklerinizi bana anlatın.",
    },
  };

  /* ---------------------------------------------------------------------
   * 3. MOCK SOCRATIC CONTENT (per phase, per language)
   *    This is illustrative placeholder content only. It exists so Phase 1
   *    is demoable end-to-end. It should be replaced with content grounded
   *    in the Sources directory (the instructional PDFs / docs) once the
   *    real AI backend is wired into generateAIResponse().
   * ------------------------------------------------------------------- */

  const MOCK_CONTENT = {
    en: {
      conceptIntro: [
        "Let's start simple. The vertex form of a quadratic function looks like this:\n\n$$f(x) = a(x - h)^2 + k$$\n\n" +
          "Here, the point $(h, k)$ is called the *vertex* — the highest or lowest point of the parabola.",
        "For example, in $f(x) = 2(x - 3)^2 + 1$, the vertex is at $(3, 1)$, and $a = 2$ tells us how " +
          "steep and which way the parabola opens.\n\nQuick check: just by looking at the equation " +
          "$f(x) = -(x + 2)^2 + 5$, where do you think the vertex is located?",
      ],
      guidedPracticeStart:
        "Good. Now let's practice. Suppose a small data set of points was collected from a ball's " +
        "trajectory, and it fits the model $f(x) = -\\tfrac{1}{2}(x - 4)^2 + 8$.\n\n" +
        "What is the maximum height the ball reaches, and at what horizontal distance does it happen? " +
        "Walk me through how you'd find it from the equation, step by step \u2014 don't just give me the numbers.",
      quiz: [
        "Question 1 of 3: For $f(x) = 3(x + 1)^2 - 4$, identify the vertex and state whether it is a minimum or maximum.",
        "Question 2 of 3: Describe, in words, how the graph of $f(x) = (x - 5)^2$ compares to the graph of $f(x) = x^2$.",
        "Question 3 of 3: A parabola has vertex $(-2, 3)$ and passes through $(0, 7)$. Set up (but do not fully solve) the vertex-form equation you would use to find $a$.",
      ],
      quizComplete:
        "Nice work \u2014 that completes the mini-test for this topic's learning outcomes. Review your reasoning above; " +
        "would you like to restart the topic to reinforce anything, or explore a related concept next?",
      genericProbe: [
        "Interesting \u2014 can you tell me *why* you think that? Walk me through your reasoning.",
        "That's a good start. What would happen to the vertex if we changed the sign of $a$?",
        "Before we move on, how confident are you in that step? What part feels shaky?",
        "Let's check that conceptually first \u2014 what does the value of $h$ actually control in the graph?",
      ],
      encouragement: [
        "Good instinct \u2014 you're reasoning through the structure, not just guessing. Let's push one step further.",
        "That's solid conceptual footing. Let's build on it.",
      ],
    },
    tr: {
      conceptIntro: [
        "Basitten başlayalım. Bir ikinci dereceden fonksiyonun tepe noktası formu şöyle görünür:\n\n" +
          "$$f(x) = a(x - h)^2 + k$$\n\nBurada $(h, k)$ noktasına *tepe noktası* denir \u2014 parabolün en yüksek " +
          "veya en düşük noktasıdır.",
        "Örneğin, $f(x) = 2(x - 3)^2 + 1$ fonksiyonunda tepe noktası $(3, 1)$'dir ve $a = 2$ değeri parabolün " +
          "ne kadar dik olduğunu ve hangi yöne açıldığını gösterir.\n\nKısa bir kontrol: sadece " +
          "$f(x) = -(x + 2)^2 + 5$ denklemine bakarak, tepe noktasının nerede olduğunu düşünüyorsunuz?",
      ],
      guidedPracticeStart:
        "Güzel. Şimdi uygulama yapalım. Bir topun hareketinden toplanan küçük bir veri kümesinin " +
        "$f(x) = -\\tfrac{1}{2}(x - 4)^2 + 8$ modeline uyduğunu varsayalım.\n\n" +
        "Topun ulaştığı en yüksek yükseklik nedir ve bu, hangi yatay uzaklıkta gerçekleşir? " +
        "Bana sadece sayıları vermek yerine, denklemden bunu adım adım nasıl bulacağınızı matematiksel " +
        "muhakeme yaparak anlatın.",
      quiz: [
        "Soru 1/3: $f(x) = 3(x + 1)^2 - 4$ için tepe noktasını belirleyin ve bunun minimum mu maksimum mu olduğunu belirtin.",
        "Soru 2/3: $f(x) = (x - 5)^2$ grafiğinin, $f(x) = x^2$ grafiğiyle nasıl karşılaştırıldığını sözlerle açıklayın.",
        "Soru 3/3: Bir parabolün tepe noktası $(-2, 3)$ olup $(0, 7)$ noktasından geçmektedir. $a$ değerini bulmak için kullanacağınız tepe noktası formundaki denklemi kurun (tam olarak çözmeyin).",
      ],
      quizComplete:
        "Aferin \u2014 bu, bu konunun öğrenme çıktılarına yönelik kısa sınavı tamamladı. Yukarıdaki muhakemenizi " +
        "gözden geçirin; konuyu pekiştirmek için yeniden başlatmak mı, yoksa ilgili bir kavramı keşfetmek mi istersiniz?",
      genericProbe: [
        "İlginç \u2014 bunu neden düşündüğünüzü söyleyebilir misiniz? Muhakemenizi benimle paylaşın.",
        "İyi bir başlangıç. $a$'nın işaretini değiştirseydik tepe noktasına ne olurdu?",
        "Devam etmeden önce, bu adıma ne kadar güveniyorsunuz? Hangi kısım size şüpheli geliyor?",
        "Önce bunu kavramsal olarak kontrol edelim \u2014 $h$ değeri grafikte aslında neyi kontrol ediyor?",
      ],
      encouragement: [
        "İyi bir sezgi \u2014 sadece tahmin etmiyor, yapıyı analiz ediyorsunuz. Bir adım daha ileri gidelim.",
        "Bu sağlam bir kavramsal temel. Üzerine inşa edelim.",
      ],
    },
  };

  /* ------------------------------------------------------------
   * 4. STATE
   * ------------------------------------------------------------------- */

  /** @type {{
   *   language: 'en'|'tr',
   *   topicId: string,
   *   phase: number,
   *   quizIndex: number,
   *   messages: Array<{role: 'ai'|'user'|'system'|'visual', text: string, ts: number}>,
   *   hasVisited: boolean
   * }} */
  let STATE = null;

  function defaultState() {
    return {
      language: "en",
      topicId: DEFAULT_TOPIC_ID,
      phase: PHASES.CONCEPT_INTRO,
      quizIndex: 0,
      messages: [],
      hasVisited: false,
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      // Shallow-merge onto defaults so new fields introduced in later
      // versions of this app don't break returning users' saved state.
      return Object.assign(defaultState(), parsed);
    } catch (err) {
      console.warn("[SocraticMathTutor] Failed to load saved state, starting fresh.", err);
      return defaultState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE));
    } catch (err) {
      // localStorage can fail in private browsing / storage-full situations.
      // The app should still function in-memory for the current session.
      console.warn("[SocraticMathTutor] Failed to save state.", err);
    }
  }

  /* ---------------------------------------------------------------------
   * 5. DOM REFERENCES
   * ------------------------------------------------------------------- */

  const el = {
    chatWindow: null,
    chatForm: null,
    userInput: null,
    sendBtn: null,
    nextPhaseBtn: null,
    visualToolBtn: null,
    visualPanel: null,
    visualPanelText: null,
    closeVisualPanel: null,
    langToggleBtn: null,
    langToggleLabel: null,
    resetBtn: null,
    phaseIndicator: null,
    phaseName: null,
    topicName: null,
  };

  function cacheDom() {
    el.chatWindow = document.getElementById("chatWindow");
    el.chatForm = document.getElementById("chatForm");
    el.userInput = document.getElementById("userInput");
    el.sendBtn = document.getElementById("sendBtn");
    el.nextPhaseBtn = document.getElementById("nextPhaseBtn");
    el.visualToolBtn = document.getElementById("visualToolBtn");
    el.visualPanel = document.getElementById("visualPanel");
    el.visualPanelText = document.getElementById("visualPanelText");
    el.closeVisualPanel = document.getElementById("closeVisualPanel");
    el.langToggleBtn = document.getElementById("langToggleBtn");
    el.langToggleLabel = document.getElementById("langToggleLabel");
    el.resetBtn = document.getElementById("resetBtn");
    el.phaseIndicator = document.getElementById("phaseIndicator");
    el.phaseName = document.getElementById("phaseName");
    el.topicName = document.getElementById("topicName");
  }

  /* ---------------------------------------------------------------------
   * 6. i18n HELPERS
   * ------------------------------------------------------------------- */

  function t(key, vars) {
    const dict = STRINGS[STATE.language] || STRINGS.en;
    let str = dict[key] != null ? dict[key] : key;
    if (vars) {
      Object.keys(vars).forEach((k) => {
        str = str.replace(new RegExp("\\{" + k + "\\}", "g"), vars[k]);
      });
    }
    return str;
  }

  function phaseLabel(phase) {
    if (phase === PHASES.CONCEPT_INTRO) return t("phase1Name");
    if (phase === PHASES.GUIDED_PRACTICE) return t("phase2Name");
    return t("phase3Name");
  }

  function applyStaticTranslations() {
    document.documentElement.lang = STATE.language;
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const key = node.getAttribute("data-i18n");
      // Skip topicName / phase labels here; handled dynamically below.
      if (key === "topicName") return;
      node.innerHTML = t(key);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
      node.setAttribute("placeholder", t(node.getAttribute("data-i18n-placeholder")));
    });
    document.querySelectorAll("[data-i18n-title]").forEach((node) => {
      node.setAttribute("title", t(node.getAttribute("data-i18n-title")));
    });

    el.langToggleLabel.textContent = STATE.language === "en" ? "TR" : "EN";
    el.topicName.textContent = TOPICS[STATE.topicId].title[STATE.language];
    el.phaseName.textContent = phaseLabel(STATE.phase);
    el.nextPhaseBtn.textContent =
      STATE.phase === PHASES.MINI_TEST ? t("nextPhaseBtnFinal") : t("nextPhaseBtn");

    updatePhaseIndicator();
  }

  function updatePhaseIndicator() {
    el.phaseIndicator.querySelectorAll(".phase-step").forEach((stepEl) => {
      const stepPhase = Number(stepEl.getAttribute("data-phase"));
      stepEl.classList.remove("active", "done");
      if (stepPhase < STATE.phase) stepEl.classList.add("done");
      if (stepPhase === STATE.phase) stepEl.classList.add("active");
    });
  }

  /* ---------------------------------------------------------------------
   * 7. RENDERING
   * ------------------------------------------------------------------- */

  function renderMathIn(node) {
    // renderMathInElement comes from the KaTeX auto-render CDN script.
    if (typeof window.renderMathInElement === "function") {
      window.renderMathInElement(node, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
        ],
        throwOnError: false,
      });
    }
  }

  function appendMessageToDom(msg) {
    const bubble = document.createElement("div");
    bubble.className = "msg " + (msg.role === "visual" ? "visual-prompt" : msg.role);

    if (msg.role === "visual") {
      const label = document.createElement("span");
      label.className = "msg-label";
      label.textContent = t("visualPanelTitle");
      bubble.appendChild(label);
    }

    const body = document.createElement("div");
    body.textContent = msg.text; // textContent first (safe), KaTeX re-parses $...$ afterwards
    bubble.appendChild(body);

    el.chatWindow.appendChild(bubble);
    renderMathIn(bubble);
    el.chatWindow.scrollTop = el.chatWindow.scrollHeight;
  }

  function renderAllMessages() {
    el.chatWindow.innerHTML = "";
    STATE.messages.forEach(appendMessageToDom);
  }

  /* ---------------------------------------------------------------------
   * 8. MESSAGE / STATE MUTATIONS
   * ------------------------------------------------------------------- */

  function pushMessage(role, text) {
    const msg = { role, text, ts: Date.now() };
    STATE.messages.push(msg);
    appendMessageToDom(msg);
    saveState();
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /* ---------------------------------------------------------------------
   * 9. AI RESPONSE PLACEHOLDER
   *    -------------------------------------------------------------------
   *    THIS IS THE INTEGRATION SEAM.
   *
   *    Replace the body of this function with a call to your AI backend
   *    (e.g. `await fetch('/api/tutor', { method: 'POST', body: ... })`)
   *    once the backend exists. The backend should be given:
   *      - the full conversation history (STATE.messages)
   *      - the current topic + phase (STATE.topicId, STATE.phase)
   *      - the language (STATE.language)
   *      - retrieved excerpts from the Sources directory (RAG over the
   *        instructional PDFs/Docs) so answers stay grounded in the
   *        approved materials
   *    and must return Socratic, non-answer-giving scaffolding text,
   *    consistent with the pedagogical rules in the project brief
   *    (never give direct answers, one question at a time, validate
   *    intermediate reasoning, explicitly announce phase transitions).
   *
   *    For now this function fakes that behavior with simple canned
   *    content keyed by phase, purely so the UI is demoable end-to-end.
   * ------------------------------------------------------------------- */
  function generateAIResponse(userInput) {
    const lang = STATE.language;
    const content = MOCK_CONTENT[lang];

    // --- TODO(real-AI-integration): swap this whole block for a call like:
    //   const istem = buildPrompt({ history: STATE.messages, phase: STATE.phase,
    //                                topicId: STATE.topicId, language: lang });
    //   return await callTutorBackend(istem);
    // "istem" here refers to the AI prompt that will be sent to the backend,
    // per this project's Turkish terminology conventions.

    if (STATE.phase === PHASES.MINI_TEST) {
      // Advance through the 2-3 quiz questions; on the last one, wrap up.
      if (STATE.quizIndex < content.quiz.length - 1) {
        STATE.quizIndex += 1;
        return content.quiz[STATE.quizIndex];
      }
      return content.quizComplete;
    }

    // Phase 1 / Phase 2: acknowledge effort, then ask a generic Socratic
    // probing question. A real implementation would analyze `userInput`
    // for the specific conceptual gap and branch accordingly.
    const ack = Math.random() > 0.5 ? pickRandom(content.encouragement) : "";
    const probe = pickRandom(content.genericProbe);
    return (ack ? ack + " " : "") + probe;
  }

  /* ---------------------------------------------------------------------
   * 10. PHASE TRANSITIONS
   * ------------------------------------------------------------------- */

  function startPhase(phase) {
    STATE.phase = phase;
    STATE.quizIndex = 0;
    saveState();
    applyStaticTranslations();

    const lang = STATE.language;
    const content = MOCK_CONTENT[lang];

    // "Actionable trigger" required by the project brief: explicitly state
    // the phase change so a future UI (or analytics) can hook into it.
    pushMessage("system", t("phaseTransition", { phase: phaseLabel(phase) }));

    if (phase === PHASES.CONCEPT_INTRO) {
      content.conceptIntro.forEach((line) => pushMessage("ai", line));
    } else if (phase === PHASES.GUIDED_PRACTICE) {
      pushMessage("ai", content.guidedPracticeStart);
    } else if (phase === PHASES.MINI_TEST) {
      pushMessage("ai", content.quiz[0]);
    }
  }

  function handleNextPhase() {
    if (STATE.phase === PHASES.CONCEPT_INTRO) {
      startPhase(PHASES.GUIDED_PRACTICE);
    } else if (STATE.phase === PHASES.GUIDED_PRACTICE) {
      startPhase(PHASES.MINI_TEST);
    } else {
      // Topic finished — loop back to the start. In a multi-topic future,
      // this is where you'd route to the *next* topic instead of restarting.
      pushMessage("system", t("topicRestarted"));
      startPhase(PHASES.CONCEPT_INTRO);
    }
  }

  /* ---------------------------------------------------------------------
   * 11. DYNAMIC VISUAL VERIFICATION (generic tool prompt)
   *     CRITICAL: never name a specific commercial product here — always
   *     use generic phrasing ("interactive graphing tool", "dynamic
   *     geometry software") to avoid brand bias in the materials.
   * ------------------------------------------------------------------- */

  function handleVisualToolRequest() {
    const lang = STATE.language;
    const predictQuestion =
      lang === "tr"
        ? "a değerini iki katına çıkarırsak parabol daha mı dar, yoksa daha mı geniş olur?"
        : "if we double the value of a, will the parabola become narrower or wider?";

    pushMessage("visual", t("visualPromptIntro", { question: predictQuestion }));
    pushMessage("visual", t("visualInstructions"));

    el.visualPanel.hidden = false;
    el.visualPanelText.textContent = t("visualPanelText");
  }

  /* ---------------------------------------------------------------------
   * 12. EVENT HANDLERS
   * ------------------------------------------------------------------- */

  function handleSubmit(evt) {
    evt.preventDefault();
    const text = el.userInput.value.trim();
    if (!text) return;

    pushMessage("user", text);
    el.userInput.value = "";
    autoGrowTextarea();

    // Simulate a brief "thinking" delay so the interaction doesn't feel
    // instantaneous/robotic. Replace with real latency from the backend call.
    el.sendBtn.disabled = true;
    setTimeout(() => {
      const reply = generateAIResponse(text);
      pushMessage("ai", reply);
      el.sendBtn.disabled = false;
      el.userInput.focus();
    }, 400);
  }

  function handleLangToggle() {
    STATE.language = STATE.language === "en" ? "tr" : "en";
    saveState();
    applyStaticTranslations();
  }

  function handleReset() {
    const confirmMsg =
      STATE.language === "tr"
        ? "Tüm ilerlemenizi sıfırlamak istediğinizden emin misiniz?"
        : "Are you sure you want to reset all your progress?";
    if (!window.confirm(confirmMsg)) return;

    localStorage.removeItem(STORAGE_KEY);
    STATE = defaultState();
    boot();
  }

  function autoGrowTextarea() {
    el.userInput.style.height = "auto";
    el.userInput.style.height = Math.min(el.userInput.scrollHeight, 120) + "px";
  }

  function bindEvents() {
    el.chatForm.addEventListener("submit", handleSubmit);
    el.userInput.addEventListener("input", autoGrowTextarea);
    el.userInput.addEventListener("keydown", (evt) => {
      if (evt.key === "Enter" && !evt.shiftKey) {
        evt.preventDefault();
        el.chatForm.requestSubmit();
      }
    });
    el.nextPhaseBtn.addEventListener("click", handleNextPhase);
    el.visualToolBtn.addEventListener("click", handleVisualToolRequest);
    el.closeVisualPanel.addEventListener("click", () => {
      el.visualPanel.hidden = true;
    });
    el.langToggleBtn.addEventListener("click", handleLangToggle);
    el.resetBtn.addEventListener("click", handleReset);
  }

  /* ---------------------------------------------------------------------
   * 13. BOOTSTRAP
   * ------------------------------------------------------------------- */

  function boot() {
    cacheDom();
    STATE = loadState();
    bindEvents();
    applyStaticTranslations();

    if (STATE.messages.length > 0) {
      // Returning user: restore their chat history and welcome them back,
      // per the Phase 1 requirement to acknowledge resumed progress.
      renderAllMessages();
      pushMessage("system", t("welcomeBack", { phase: phaseLabel(STATE.phase) }));
    } else {
      // First-time visitor: greet them and kick off Phase 1 content.
      STATE.hasVisited = true;
      saveState();
      pushMessage("ai", t("welcomeFirstTime"));
      startPhase(PHASES.CONCEPT_INTRO);
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
