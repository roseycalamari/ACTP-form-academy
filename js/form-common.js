(function (w) {
  const i18n = w.ACTP_I18N;
  const cfg = w.ACTP_CONFIG || {};

  function t(lang, key) {
    return (i18n[lang] && i18n[lang][key]) || (i18n.pt && i18n.pt[key]) || key;
  }

  function guessLang() {
    const saved = localStorage.getItem("actp-lang");
    if (saved === "en" || saved === "pt") return saved;
    return (navigator.language || "pt").toLowerCase().indexOf("en") === 0 ? "en" : "pt";
  }

  function applyLang(lang, titleKey) {
    localStorage.setItem("actp-lang", lang);
    document.documentElement.lang = t(lang, "htmlLang");
    if (titleKey) document.title = t(lang, titleKey);
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(lang, el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      el.setAttribute("placeholder", t(lang, el.getAttribute("data-i18n-placeholder")));
    });
    document.querySelectorAll(".langs button").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(btn.getAttribute("data-lang") === lang));
    });
  }

  function bindLang(onChange) {
    document.querySelectorAll(".langs button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        onChange(btn.getAttribute("data-lang"));
      });
    });
  }

  function fillFooter() {
    const phone = cfg.phoneDisplay || "+351 962 669 288";
    const email = cfg.email || "pinecliffs@annabelcrofttennis.com";
    document.querySelectorAll("#footerPhone, .footerPhoneCopy").forEach(function (el) {
      el.textContent = phone;
    });
    document.querySelectorAll("#footerEmail, .footerEmailCopy").forEach(function (el) {
      el.textContent = email;
      el.href = "mailto:" + email;
    });
  }

  function radioVal(form, name) {
    const el = form.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : "";
  }

  function checkedList(form, name) {
    return Array.prototype.map.call(
      form.querySelectorAll('input[name="' + name + '"]:checked'),
      function (el) { return el.value; }
    );
  }

  function digits(str) {
    return String(str || "").replace(/\D/g, "");
  }

  function validEmail(value) {
    if (!value) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  async function postJson(url, data) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    try {
      return await res.json();
    } catch (e) {
      return { ok: true };
    }
  }

  async function submitData(data) {
    const attempts = [postJson("/api/submit", data)];
    if (cfg.endpoint) attempts.push(postJson(cfg.endpoint, data));
    const results = await Promise.allSettled(attempts);
    const ok = results.find(function (r) { return r.status === "fulfilled"; });
    if (ok) return ok.value || { ok: true };
    throw results[0] && results[0].reason ? results[0].reason : new Error("submit failed");
  }

  function setWhatsApp(text) {
    const link = document.getElementById("whatsAppLink");
    if (!link) return;
    link.href =
      "https://wa.me/" +
      (cfg.phoneWhatsApp || "351962669288") +
      "?text=" +
      encodeURIComponent(text);
  }

  function showSuccess(lang, id, delivered, fallback) {
    document.body.classList.add("done");
    const ref = document.getElementById("successRef");
    if (ref) ref.textContent = t(lang, "successRef") + " · " + (id || "local");
    const body = document.getElementById("successBody");
    if (body && !delivered && fallback) body.textContent = fallback;
    window.scrollTo(0, 0);
  }

  function bindDeptSelect() {
    document.querySelectorAll(".dept-select").forEach(function (sel) {
      if (sel.getAttribute("data-bound") || sel.id === "adminDept") return;
      sel.setAttribute("data-bound", "1");
      sel.addEventListener("change", function () {
        if (sel.value) location.href = sel.value;
      });
    });
  }

  w.ACTP_FORM = {
    t: t,
    guessLang: guessLang,
    applyLang: applyLang,
    bindLang: bindLang,
    bindDeptSelect: bindDeptSelect,
    fillFooter: fillFooter,
    radioVal: radioVal,
    checkedList: checkedList,
    digits: digits,
    validEmail: validEmail,
    submitData: submitData,
    setWhatsApp: setWhatsApp,
    showSuccess: showSuccess
  };

  bindDeptSelect();
})(window);
