(function () {
  const cfg = window.ACTP_CONFIG || {};
  const i18n = window.ACTP_I18N;
  const SLOTS = window.ACTP_SLOTS;
  const form = document.getElementById("availabilityForm");
  const errorEl = document.getElementById("formError");
  const summaryEl = document.getElementById("slotSummary");
  const firstSel = document.getElementById("firstChoice");
  const secondSel = document.getElementById("secondChoice");
  const tennisBlock = document.getElementById("tennisLevelBlock");
  const padelBlock = document.getElementById("padelLevelBlock");
  const submitBtn = form.querySelector('button[type="submit"]');

  let lang = "pt";

  function t(key) {
    return (i18n[lang] && i18n[lang][key]) || (i18n.pt && i18n.pt[key]) || key;
  }

  function applyLang(next) {
    lang = next;
    localStorage.setItem("actp-lang", next);
    document.documentElement.lang = t("htmlLang");
    document.title = t("title");
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
    });
    document.querySelectorAll(".langs button").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(btn.getAttribute("data-lang") === lang));
    });
    refreshChoiceSelects();
    refreshSummary();
  }

  function buildGrid() {
    const tbody = document.querySelector("#slotGrid tbody");
    tbody.innerHTML = "";
    SLOTS.times.forEach(function (time) {
      const tr = document.createElement("tr");
      const th = document.createElement("td");
      th.className = "t";
      th.textContent = time.label;
      tr.appendChild(th);
      SLOTS.days.forEach(function (day) {
        const td = document.createElement("td");
        td.className = "cell";
        const id = day + "-" + time.id;
        td.innerHTML =
          '<label class="slot">' +
          '<input type="checkbox" name="slots" value="' + id + '" />' +
          '<span class="mark"></span>' +
          "</label>";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  function selectedSlots() {
    return Array.prototype.map.call(
      form.querySelectorAll('input[name="slots"]:checked'),
      function (el) { return el.value; }
    );
  }

  function slotLabel(value) {
    const parts = value.split("-");
    const day = parts[0];
    const timeId = parts[1];
    const time = SLOTS.times.find(function (item) { return item.id === timeId; });
    return t(day + "Long") + " · " + (time ? time.label : timeId);
  }

  function refreshSummary() {
    const slots = selectedSlots();
    summaryEl.textContent = slots.length
      ? t("selectedCount").replace("{n}", String(slots.length)) +
        " — " +
        slots.map(slotLabel).join("; ")
      : t("selectedNone");
  }

  function refreshChoiceSelects() {
    const slots = selectedSlots();
    const keepFirst = firstSel.value;
    const keepSecond = secondSel.value;
    const opts = ['<option value="">' + t("chooseSlot") + "</option>"];
    if (!slots.length) {
      opts[0] = '<option value="">' + t("placeholderChoice") + "</option>";
    }
    slots.forEach(function (value) {
      opts.push('<option value="' + value + '">' + slotLabel(value) + "</option>");
    });
    firstSel.innerHTML = opts.join("");
    secondSel.innerHTML = opts.join("");
    firstSel.value = slots.indexOf(keepFirst) >= 0 ? keepFirst : "";
    secondSel.value = slots.indexOf(keepSecond) >= 0 ? keepSecond : "";
  }

  function sportValue() {
    const el = form.querySelector('input[name="sport"]:checked');
    return el ? el.value : "";
  }

  function toggleLevels() {
    const sport = sportValue();
    tennisBlock.classList.toggle("is-hidden", sport === "padel");
    padelBlock.classList.toggle("is-hidden", sport === "tennis" || sport === "");
    if (sport === "padel") {
      form.querySelectorAll('input[name="tennisLevel"]').forEach(function (el) { el.checked = false; });
    }
    if (sport === "tennis") {
      form.querySelectorAll('input[name="padelLevel"]').forEach(function (el) { el.checked = false; });
    }
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.add("show");
    errorEl.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function clearError() {
    errorEl.textContent = "";
    errorEl.classList.remove("show");
  }

  function radioVal(name) {
    const el = form.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : "";
  }

  function digits(str) {
    return String(str || "").replace(/\D/g, "");
  }

  function validEmail(value) {
    if (!value) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function collect() {
    return {
      language: lang,
      studentName: form.studentName.value.trim(),
      age: form.age.value.trim(),
      parentName: form.parentName.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      school: form.school.value.trim(),
      sport: sportValue(),
      timesPerWeek: radioVal("timesPerWeek"),
      slots: selectedSlots(),
      firstChoice: firstSel.value,
      secondChoice: secondSel.value,
      tennisLevel: radioVal("tennisLevel"),
      padelLevel: radioVal("padelLevel"),
      child2Name: form.child2Name.value.trim(),
      child2Age: form.child2Age.value.trim(),
      child2Schedule: radioVal("child2Schedule"),
      notes: form.notes.value.trim(),
      confirmed: form.confirmed.checked,
      website: form.website.value
    };
  }

  function validate(data) {
    if (!data.studentName || !data.age || !data.parentName || !data.phone) return t("errRequired");
    if (digits(data.phone).length < 9) return t("errPhone");
    if (!validEmail(data.email)) return t("errEmail");
    if (!data.sport) return t("errSport");
    if (!data.timesPerWeek) return t("errTimes");
    if (!data.slots.length) return t("errSlots");
    if (!data.confirmed) return t("errConfirm");
    return "";
  }

  function whatsAppText(data) {
    const lines = [
      "ACTP · " + (lang === "en" ? "Availability (no commitment)" : "Disponibilidade (sem compromisso)"),
      "",
      (lang === "en" ? "Student" : "Aluno") + ": " + data.studentName + " (" + data.age + ")",
      (lang === "en" ? "Parent" : "Encarregado") + ": " + data.parentName,
      "WhatsApp: " + data.phone,
      data.email ? "Email: " + data.email : "",
      (lang === "en" ? "Sport" : "Modalidade") + ": " + data.sport,
      (lang === "en" ? "Times / week" : "Vezes / semana") + ": " + data.timesPerWeek,
      (lang === "en" ? "Slots" : "Horários") + ": " + data.slots.map(slotLabel).join(", "),
      data.firstChoice ? (lang === "en" ? "1st choice" : "1.ª escolha") + ": " + slotLabel(data.firstChoice) : "",
      data.secondChoice ? (lang === "en" ? "2nd choice" : "2.ª escolha") + ": " + slotLabel(data.secondChoice) : "",
      data.notes ? (lang === "en" ? "Notes" : "Notas") + ": " + data.notes : ""
    ].filter(Boolean);
    return lines.join("\n");
  }

  function setWhatsApp(data) {
    const url =
      "https://wa.me/" +
      (cfg.phoneWhatsApp || "351962669288") +
      "?text=" +
      encodeURIComponent(whatsAppText(data));
    document.getElementById("whatsAppLink").href = url;
  }

  function showSuccess(data, id, delivered) {
    document.body.classList.add("done");
    document.getElementById("successRef").textContent =
      t("successRef") + " · " + (id || "local");
    setWhatsApp(data);
    const body = document.querySelector("#successSheet [data-i18n='successBody']");
    if (body && !delivered) {
      body.textContent =
        lang === "en"
          ? "Please tap the WhatsApp button below so the club receives your availability. Nothing is paid now — this is only information."
          : "Toque no botão WhatsApp abaixo para a ficha chegar ao clube. Não se paga nada agora — isto é só informação.";
    }
    window.scrollTo(0, 0);
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
    const attempts = [];
    attempts.push(postJson("/api/submit", data));
    if (cfg.endpoint) attempts.push(postJson(cfg.endpoint, data));

    const results = await Promise.allSettled(attempts);
    const ok = results.find(function (r) { return r.status === "fulfilled"; });
    if (ok) return ok.value || { ok: true };

    throw results[0] && results[0].reason ? results[0].reason : new Error("submit failed");
  }

  form.addEventListener("change", function (e) {
    if (e.target.name === "slots") {
      refreshChoiceSelects();
      refreshSummary();
    }
    if (e.target.name === "sport") toggleLevels();
  });

  document.querySelectorAll(".langs button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      applyLang(btn.getAttribute("data-lang"));
    });
  });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    clearError();
    const data = collect();
    const err = validate(data);
    if (err) {
      showError(err);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = t("sending");
    try {
      const result = await submitData(data);
      showSuccess(data, result && result.id, true);
    } catch (ex) {
      showSuccess(data, "whatsapp", false);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = t("submit");
    }
  });

  document.getElementById("againBtn").addEventListener("click", function () {
    document.body.classList.remove("done");
    form.reset();
    applyLang(lang);
    toggleLevels();
    refreshChoiceSelects();
    refreshSummary();
    window.scrollTo(0, 0);
  });

  document.getElementById("footerPhone").textContent = cfg.phoneDisplay || "+351 962 669 288";
  document.querySelectorAll(".footerPhoneCopy").forEach(function (el) {
    el.textContent = cfg.phoneDisplay || "+351 962 669 288";
  });

  buildGrid();
  const saved = localStorage.getItem("actp-lang");
  const guess = (navigator.language || "pt").toLowerCase().indexOf("en") === 0 ? "en" : "pt";
  applyLang(saved || guess);
  toggleLevels();
})();
