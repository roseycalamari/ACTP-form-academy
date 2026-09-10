(function () {
  const F = window.ACTP_FORM;
  const form = document.getElementById("playForm");
  const errorEl = document.getElementById("formError");
  const submitBtn = form.querySelector('button[type="submit"]');
  let lang = F.guessLang();

  function apply() {
    F.applyLang(lang, "titlePlay");
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.add("show");
    errorEl.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function collect() {
    return {
      kind: "play",
      language: lang,
      studentName: form.studentName.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      sport: F.radioVal(form, "sport"),
      playSports: F.radioVal(form, "sport"),
      playPlan: F.radioVal(form, "playPlan"),
      playsAlready: form.playsAlready.checked,
      notes: form.notes.value.trim(),
      confirmed: form.confirmed.checked,
      website: form.website.value
    };
  }

  function validate(data) {
    if (!data.studentName || !data.phone) return F.t(lang, "errRequired");
    if (F.digits(data.phone).length < 9) return F.t(lang, "errPhone");
    if (!F.validEmail(data.email)) return F.t(lang, "errEmail");
    if (!data.playsAlready) return F.t(lang, "errPlayAlready");
    if (!data.sport) return F.t(lang, "errSport");
    if (!data.playPlan) return F.t(lang, "errPlayPlan");
    if (!data.confirmed) return F.t(lang, "errConfirm");
    return "";
  }

  function planLabel(value) {
    return {
      play: F.t(lang, "playPlanPlay"),
      changing: F.t(lang, "playPlanChanging"),
      gym: F.t(lang, "playPlanGym")
    }[value] || value;
  }

  function whatsAppText(data) {
    const en = lang === "en";
    return [
      "ACTP · Play Membership",
      "",
      (en ? "Name" : "Nome") + ": " + data.studentName,
      "WhatsApp: " + data.phone,
      data.email ? "Email: " + data.email : "",
      (en ? "Sport" : "Modalidade") + ": " + data.sport,
      (en ? "Plan" : "Plano") + ": " + planLabel(data.playPlan),
      data.notes ? (en ? "Notes" : "Notas") + ": " + data.notes : ""
    ].filter(Boolean).join("\n");
  }

  F.bindLang(function (next) {
    lang = next;
    apply();
  });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    errorEl.textContent = "";
    errorEl.classList.remove("show");
    const data = collect();
    const err = validate(data);
    if (err) {
      showError(err);
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = F.t(lang, "sending");
    F.setWhatsApp(whatsAppText(data));
    try {
      const result = await F.submitData(data);
      F.showSuccess(lang, result && result.id, true);
    } catch (ex) {
      F.showSuccess(
        lang,
        "whatsapp",
        false,
        lang === "en"
          ? "Please tap WhatsApp below so the club receives your request."
          : "Toque no WhatsApp abaixo para o pedido chegar ao clube."
      );
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = F.t(lang, "playSubmit");
    }
  });

  document.getElementById("againBtn").addEventListener("click", function () {
    document.body.classList.remove("done");
    form.reset();
    apply();
    window.scrollTo(0, 0);
  });

  F.fillFooter();
  apply();
})();
