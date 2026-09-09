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
    red: "Bola red",
    orange: "Bola orange",
    green: "Bola green",
    yellow: "Bola yellow",
    unknown: "Bola por confirmar",
    beginner: "Iniciante",
    intermediate: "Intermédio",
    teens: "Adolescentes",
    same: "Mesmos horários",
    different: "Horários diferentes"
  };

  const BALLS = ["red", "orange", "green", "yellow", "unknown"];
  const DAY_LONG = { mon: "Segunda", tue: "Terça", wed: "Quarta", thu: "Quinta", fri: "Sexta" };
  const DAY_SHORT = { mon: "Seg", tue: "Ter", wed: "Qua", thu: "Qui", fri: "Sex" };

  function slotLabel(value) {
    if (!value) return "—";
    const parts = String(value).split("-");
    const time = SLOTS.times.find(function (item) { return item.id === parts[1]; });
    return (DAY_SHORT[parts[0]] || parts[0]) + " · " + (time ? time.label : parts[1]);
  }

  function slotLong(value) {
    if (!value) return "—";
    const parts = String(value).split("-");
    const time = SLOTS.times.find(function (item) { return item.id === parts[1]; });
    return (DAY_LONG[parts[0]] || parts[0]) + " · " + (time ? time.label : parts[1]);
  }

  function peopleInRow(row) {
    return 1 + (row.child2Name && row.child2Schedule !== "different" ? 1 : 0);
  }

  function tennisBall(row) {
    if (row.sport === "padel") return "";
    return row.tennisLevel || "unknown";
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

    const byBall = {};
    SLOTS.times.forEach(function (time) {
      SLOTS.days.forEach(function (day) {
        const key = day + "-" + time.id;
        byBall[key] = { red: 0, orange: 0, green: 0, yellow: 0, unknown: 0 };
      });
    });
    const padelBySlot = {};
    items.forEach(function (row) {
      const n = peopleInRow(row);
      const ball = tennisBall(row);
      if (ball) {
        (row.slots || []).forEach(function (slot) {
          if (byBall[slot]) byBall[slot][ball] += n;
        });
      }
      if (row.sport === "padel" || row.sport === "both") {
        (row.slots || []).forEach(function (slot) {
          padelBySlot[slot] = (padelBySlot[slot] || 0) + n;
        });
      }
    });

    let ready = 0;
    const graphRows = [];
    const tbody = document.querySelector("#heatTable tbody");
    tbody.innerHTML = "";
    SLOTS.times.forEach(function (time) {
      const tr = document.createElement("tr");
      tr.innerHTML = '<td class="t">' + time.label + "</td>";
      SLOTS.days.forEach(function (day) {
        const key = day + "-" + time.id;
        const cell = byBall[key];
        const total = BALLS.reduce(function (sum, ball) { return sum + cell[ball]; }, 0);
        BALLS.forEach(function (ball) {
          if (cell[ball] >= 4) ready += 1;
          if (cell[ball] > 0) {
            graphRows.push({ ball: ball, slot: key, count: cell[ball] });
          }
        });
        const td = document.createElement("td");
        td.className = "heat-cell " + heatClass(total);
        if (!total) {
          td.textContent = "·";
        } else {
          td.innerHTML = BALLS.filter(function (ball) { return cell[ball] > 0; }).map(function (ball) {
            return '<span class="heat-chip ' + ball + '"><i class="ball-dot ' + ball + '"></i>' + cell[ball] + "</span>";
          }).join("");
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    document.getElementById("statReady").textContent = String(ready);

    const order = { red: 0, orange: 1, green: 2, yellow: 3, unknown: 4 };
    const dayOrder = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4 };
    Object.keys(padelBySlot).forEach(function (slot) {
      if (padelBySlot[slot] > 0) graphRows.push({ ball: "padel", slot: slot, count: padelBySlot[slot] });
    });
    order.padel = 5;
    labels.padel = labels.padel || "Padel";
    graphRows.sort(function (a, b) {
      if (order[a.ball] !== order[b.ball]) return (order[a.ball] || 9) - (order[b.ball] || 9);
      const ad = a.slot.split("-")[0];
      const bd = b.slot.split("-")[0];
      if (dayOrder[ad] !== dayOrder[bd]) return dayOrder[ad] - dayOrder[bd];
      return a.slot.localeCompare(b.slot);
    });
    const maxCount = graphRows.reduce(function (m, row) { return Math.max(m, row.count); }, 1);
    const graph = document.getElementById("ballGraph");
    const graphEmpty = document.getElementById("graphEmpty");
    graph.innerHTML = "";
    graphEmpty.classList.toggle("is-hidden", graphRows.length > 0);
    graphRows.forEach(function (row) {
      const line = document.createElement("div");
      line.className = "graph-row" + (row.count >= 4 ? " ready" : "");
      const pct = Math.max(8, Math.round((row.count / maxCount) * 100));
      const people = row.count === 1 ? "1 pessoa" : row.count + " pessoas";
      line.innerHTML =
        '<div class="graph-label"><i class="ball-dot ' + row.ball + '"></i>' +
        escapeHtml(labels[row.ball] || row.ball) + " · " + escapeHtml(slotLong(row.slot)) +
        "</div>" +
        '<div class="graph-track"><div class="graph-bar" style="width:' + pct + '%"></div></div>' +
        '<div class="graph-n">' + people + (row.count >= 4 ? ' <b>Pronto</b>' : "") + "</div>";
      graph.appendChild(line);
    });

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
          "<span>" + escapeHtml((labels[row.sport] || row.sport || "") + (row.tennisLevel && row.sport !== "padel" ? " · " + (labels[row.tennisLevel] || row.tennisLevel) : "") + " · " + when) + "</span>" +
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

  const storeBanner = document.getElementById("storeBanner");
  const STORE_MSG = "As fichas da internet ainda não estão a ser gravadas. No Vercel: Storage → Upstash Redis (grátis) → ligar a este projeto → Redeploy.";

  async function load() {
    const data = await api("/api/submissions");
    if (storeBanner) storeBanner.classList.remove("show");
    render(data);
  }

  function enterAdmin() {
    loginBox.classList.add("is-hidden");
    adminSheet.classList.remove("is-hidden");
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
      enterAdmin();
      try {
        await load();
      } catch (err) {
        if (storeBanner && err && err.message === "store") storeBanner.classList.add("show");
      }
    } catch (err) {
      loginError.textContent =
        err && err.message === "store" ? STORE_MSG : "Password incorreta.";
      loginError.classList.add("show");
    }
  });

  document.getElementById("refreshBtn").addEventListener("click", function () {
    load().catch(function (err) {
      if (storeBanner && err && err.message === "store") storeBanner.classList.add("show");
    });
  });

  api("/api/submissions")
    .then(function (data) {
      enterAdmin();
      render(data);
    })
    .catch(function () {});
})();
