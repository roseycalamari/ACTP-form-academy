(function () {
  const SLOTS = window.ACTP_SLOTS;
  const loginBox = document.getElementById("loginBox");
  const adminSheet = document.getElementById("adminSheet");
  const loginError = document.getElementById("loginError");

  const labels = {
    tennis: "Ténis",
    padel: "Padel",
    both: "Ambos",
    "1": "1× / semana",
    "2": "2× / semana",
    "3": "3× / semana",
    flexible: "Flexível",
    red: "Red",
    orange: "Orange",
    green: "Green",
    yellow: "Yellow",
    unknown: "Não sei",
    beginner: "Iniciante",
    intermediate: "Intermédio",
    teens: "Adolescentes",
    same: "Mesmos horários",
    different: "Horários diferentes"
  };

  function slotLabel(value) {
    if (!value) return "—";
    const parts = String(value).split("-");
    const dayMap = { mon: "Seg", tue: "Ter", wed: "Qua", thu: "Qui", fri: "Sex" };
    const time = SLOTS.times.find(function (item) { return item.id === parts[1]; });
    return (dayMap[parts[0]] || parts[0]) + " · " + (time ? time.label : parts[1]);
  }

  async function api(url, opts) {
    const res = await fetch(url, Object.assign({ credentials: "same-origin" }, opts || {}));
    if (res.status === 401) throw new Error("auth");
    if (res.status === 503) throw new Error("store");
    if (!res.ok) throw new Error("http");
    return res.json();
  }

  function heatClass(n) {
    if (n >= 4) return "n4";
    if (n === 3) return "n3";
    if (n === 2) return "n2";
    if (n === 1) return "n1";
    return "n0";
  }

  function render(data) {
    const items = data.submissions || [];
    document.getElementById("statTotal").textContent = String(items.length);
    const kids = items.reduce(function (n, row) {
      return n + 1 + (row.child2Name ? 1 : 0);
    }, 0);
    document.getElementById("statKids").textContent = String(kids);

    const counts = {};
    SLOTS.times.forEach(function (time) {
      SLOTS.days.forEach(function (day) {
        counts[day + "-" + time.id] = 0;
      });
    });
    items.forEach(function (row) {
      (row.slots || []).forEach(function (slot) {
        if (counts[slot] != null) counts[slot] += 1;
      });
    });

    let ready = 0;
    const tbody = document.querySelector("#heatTable tbody");
    tbody.innerHTML = "";
    SLOTS.times.forEach(function (time) {
      const tr = document.createElement("tr");
      tr.innerHTML = '<td class="t">' + time.label + "</td>";
      SLOTS.days.forEach(function (day) {
        const key = day + "-" + time.id;
        const n = counts[key];
        if (n >= 4) ready += 1;
        const td = document.createElement("td");
        td.className = "heat-cell " + heatClass(n);
        td.textContent = n ? String(n) : "·";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    document.getElementById("statReady").textContent = String(ready);

    const list = document.getElementById("list");
    const empty = document.getElementById("empty");
    list.innerHTML = "";
    empty.classList.toggle("is-hidden", items.length > 0);

    items.slice().reverse().forEach(function (row) {
      const card = document.createElement("article");
      card.className = "sub-card";
      const when = row.submittedAt ? new Date(row.submittedAt).toLocaleString("pt-PT") : "";
      const child2 = row.child2Name ? " + " + row.child2Name : "";
      card.innerHTML =
        '<button type="button" class="sub-head">' +
          "<div><strong>" + escapeHtml(row.studentName || "—") + escapeHtml(child2) + "</strong>" +
          "<div><span>" + escapeHtml(row.parentName || "") + " · " + escapeHtml(row.phone || "") + "</span></div></div>" +
          "<span>" + escapeHtml((labels[row.sport] || row.sport || "") + " · " + when) + "</span>" +
        "</button>" +
        '<div class="sub-body"><dl>' +
          field("Idade", row.age) +
          field("Email", row.email) +
          field("Escola", row.school) +
          field("Vezes / semana", labels[row.timesPerWeek] || row.timesPerWeek) +
          field("Horários", (row.slots || []).map(slotLabel).join("; ")) +
          field("1.ª escolha", slotLabel(row.firstChoice)) +
          field("2.ª escolha", slotLabel(row.secondChoice)) +
          field("Nível ténis", labels[row.tennisLevel] || row.tennisLevel) +
          field("Nível padel", labels[row.padelLevel] || row.padelLevel) +
          field("2.º filho", [row.child2Name, row.child2Age, labels[row.child2Schedule] || row.child2Schedule].filter(Boolean).join(" · ")) +
          field("Notas", row.notes) +
          field("Idioma", row.language) +
          field("Ref", row.id) +
        "</dl></div>";
      card.querySelector(".sub-head").addEventListener("click", function () {
        card.classList.toggle("open");
      });
      list.appendChild(card);
    });
  }

  function field(label, value) {
    if (!value) return "";
    return "<dt>" + escapeHtml(label) + "</dt><dd>" + escapeHtml(String(value)) + "</dd>";
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function load() {
    const data = await api("/api/submissions");
    render(data);
  }

  document.getElementById("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    loginError.classList.remove("show");
    try {
      await api("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: document.getElementById("password").value })
      });
      loginBox.classList.add("is-hidden");
      adminSheet.classList.remove("is-hidden");
      await load();
    } catch (err) {
      loginError.textContent =
        err && err.message === "store"
          ? "No Vercel as fichas não ficam gravadas enquanto não ligar um KV: Storage → Create KV → Connect → Redeploy."
          : "Password incorreta.";
      loginError.classList.add("show");
    }
  });

  document.getElementById("refreshBtn").addEventListener("click", function () {
    load().catch(function () {});
  });

  api("/api/submissions")
    .then(function (data) {
      loginBox.classList.add("is-hidden");
      adminSheet.classList.remove("is-hidden");
      render(data);
    })
    .catch(function () {});
})();
