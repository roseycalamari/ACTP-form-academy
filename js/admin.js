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
    yellow12: "Bola yellow · até 12 anos",
    yellow13: "Bola yellow · 13+",
    unknown: "Bola por confirmar",
    beginner: "Iniciante",
    intermediate: "Intermédio",
    teens: "Adolescentes",
    same: "Mesmos horários",
    different: "Horários diferentes",
    girl: "Menina",
    boy: "Menino",
    sat: "Sábado",
    sun: "Domingo",
    morning: "Manhã",
    afternoon: "Tarde",
    play: "Play · €300",
    changing: "Balneários · €350",
    gym: "+ Ginásio"
  };

  const GROUPS = ["red", "orange", "green", "yellow12", "yellow13", "unknown"];
  const DAY_LONG = { mon: "Segunda", tue: "Terça", wed: "Quarta", thu: "Quinta", fri: "Sexta" };
  const DAY_SHORT = { mon: "Seg", tue: "Ter", wed: "Qua", thu: "Qui", fri: "Sex" };

  let allItems = [];
  let currentTab = "academy";

  function slotLabel(value) {
    if (!value) return "—";
    const parts = String(value).split("-");
    const time = SLOTS.times.find(function (item) { return item.id === parts[1]; });
    return (DAY_SHORT[parts[0]] || parts[0]) + " · " + (time ? time.label : parts[1]);
  }

  function peopleInRow(row) {
    return 1 + (row.child2Name && row.child2Schedule !== "different" ? 1 : 0);
  }

  function parseAge(value) {
    const n = parseInt(String(value || ""), 10);
    return isNaN(n) ? 0 : n;
  }

  function tennisGroup(row) {
    if (row.sport === "padel") return "";
    const ball = row.tennisLevel || "unknown";
    if (ball !== "yellow") return ball;
    return parseAge(row.age) >= 13 ? "yellow13" : "yellow12";
  }

  function classSize(group) {
    return group === "yellow12" ? 6 : 4;
  }

  function heatBallClass(group) {
    return String(group).indexOf("yellow") === 0 ? "yellow" : group;
  }

  function ofKind(items, kind) {
    return (items || []).filter(function (row) {
      return (row.kind || "academy") === kind;
    });
  }

  function nameWithGender(name, gender) {
    if (!name) return "";
    if (gender === "girl" || gender === "boy") return name + " (" + labels[gender] + ")";
    return name;
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

  function chipLabel(group, n) {
    if (group === "yellow12") return n + "<small>≤12</small>";
    if (group === "yellow13") return n + "<small>13+</small>";
    return String(n);
  }

  function renderAcademy(items) {
    document.getElementById("statTotal").textContent = String(items.length);
    const kids = items.reduce(function (n, row) {
      return n + 1 + (row.child2Name ? 1 : 0);
    }, 0);
    document.getElementById("statKids").textContent = String(kids);
    document.getElementById("statKidsLabel").textContent = "Crianças";
    document.getElementById("statReadyLabel").textContent = "Turmas prontas";

    const emptyCell = function () {
      return { red: 0, orange: 0, green: 0, yellow12: 0, yellow13: 0, unknown: 0 };
    };
    const byBall = {};
    SLOTS.times.forEach(function (time) {
      SLOTS.days.forEach(function (day) {
        byBall[day + "-" + time.id] = emptyCell();
      });
    });
    const padelBySlot = {};
    items.forEach(function (row) {
      const n = peopleInRow(row);
      const group = tennisGroup(row);
      if (group) {
        (row.slots || []).forEach(function (slot) {
          if (byBall[slot] && byBall[slot][group] != null) byBall[slot][group] += n;
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
        const total = GROUPS.reduce(function (sum, group) { return sum + cell[group]; }, 0);
        GROUPS.forEach(function (group) {
          if (cell[group] >= classSize(group)) ready += 1;
          if (cell[group] > 0) {
            graphRows.push({ ball: group, slot: key, count: cell[group] });
          }
        });
        const td = document.createElement("td");
        td.className = "heat-cell " + heatClass(total);
        td.setAttribute("data-day", DAY_SHORT[day] || day);
        if (!total) {
          td.textContent = "·";
        } else {
          td.innerHTML = GROUPS.filter(function (group) { return cell[group] > 0; }).map(function (group) {
            return '<span class="heat-chip ' + heatBallClass(group) + '"><i class="ball-dot ' + heatBallClass(group) + '"></i>' + chipLabel(group, cell[group]) + "</span>";
          }).join("");
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    document.getElementById("statReady").textContent = String(ready);

    const namesByKey = {};
    items.forEach(function (row) {
      const group = tennisGroup(row);
      const names = [nameWithGender(row.studentName, row.gender)].concat(
        row.child2Name && row.child2Schedule !== "different" ? [nameWithGender(row.child2Name, row.child2Gender)] : []
      ).filter(Boolean);
      (row.slots || []).forEach(function (slot) {
        if (group) {
          const key = group + "|" + slot;
          namesByKey[key] = (namesByKey[key] || []).concat(names);
        }
        if (row.sport === "padel" || row.sport === "both") {
          const key = "padel|" + slot;
          namesByKey[key] = (namesByKey[key] || []).concat(names);
        }
      });
    });

    const order = { red: 0, orange: 1, green: 2, yellow12: 3, yellow13: 4, unknown: 5, padel: 6 };
    const dayOrder = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4 };
    Object.keys(padelBySlot).forEach(function (slot) {
      if (padelBySlot[slot] > 0) graphRows.push({ ball: "padel", slot: slot, count: padelBySlot[slot] });
    });
    graphRows.sort(function (a, b) {
      if (order[a.ball] !== order[b.ball]) return (order[a.ball] || 9) - (order[b.ball] || 9);
      const ad = a.slot.split("-")[0];
      const bd = b.slot.split("-")[0];
      if (dayOrder[ad] !== dayOrder[bd]) return dayOrder[ad] - dayOrder[bd];
      return a.slot.localeCompare(b.slot);
    });

    const graph = document.getElementById("ballGraph");
    const graphEmpty = document.getElementById("graphEmpty");
    graph.innerHTML = "";
    graphEmpty.classList.toggle("is-hidden", graphRows.length > 0);

    const groups = [];
    graphRows.forEach(function (row) {
      const last = groups[groups.length - 1];
      if (!last || last.ball !== row.ball) groups.push({ ball: row.ball, rows: [row] });
      else last.rows.push(row);
    });

    groups.forEach(function (group) {
      const size = classSize(group.ball);
      const box = document.createElement("section");
      box.className = "turma-group " + heatBallClass(group.ball);
      const readyCount = group.rows.filter(function (row) { return row.count >= size; }).length;
      box.innerHTML =
        '<header class="turma-head">' +
          '<span class="ball-dot ' + heatBallClass(group.ball) + '"></span>' +
          "<div><strong>" + escapeHtml(labels[group.ball] || group.ball) + "</strong>" +
          "<span>" + group.rows.length + (group.rows.length === 1 ? " horário" : " horários") +
          (readyCount ? " · " + readyCount + " pronto" + (readyCount > 1 ? "s" : "") : "") +
          " · fecha com " + size +
          "</span></div>" +
        "</header>";
      group.rows.forEach(function (row) {
        const parts = row.slot.split("-");
        const time = SLOTS.times.find(function (item) { return item.id === parts[1]; });
        const names = namesByKey[row.ball + "|" + row.slot] || [];
        const line = document.createElement("div");
        const isReady = row.count >= size;
        line.className = "turma-line" + (isReady ? " ready" : "");
        const pips = [];
        for (let i = 0; i < size; i += 1) {
          pips.push('<i class="pip' + (i < Math.min(row.count, size) ? " on" : "") + '"></i>');
        }
        line.innerHTML =
          '<div class="turma-when"><b>' + escapeHtml(DAY_LONG[parts[0]] || parts[0]) + "</b>" +
          "<span>" + escapeHtml(time ? time.label : parts[1]) + "</span></div>" +
          '<div class="turma-pips" aria-hidden="true">' + pips.join("") + "</div>" +
          '<div class="turma-count"><b>' + row.count + "</b><span>/ " + size + "</span></div>" +
          (names.length ? '<p class="turma-names">' + escapeHtml(names.join(" · ")) + "</p>" : "") +
          (isReady ? '<span class="turma-ready">Pronto a fechar</span>' : "");
        box.appendChild(line);
      });
      graph.appendChild(box);
    });
  }

  function weekendLabel(row) {
    return (row.weekendDays || []).map(function (d) { return labels[d] || d; }).join(" + ");
  }

  function renderSocial(items) {
    document.getElementById("statTotal").textContent = String(items.length);
    const tennis = items.filter(function (r) { return r.sport === "tennis" || r.sport === "both"; }).length;
    const padel = items.filter(function (r) { return r.sport === "padel" || r.sport === "both"; }).length;
    document.getElementById("statKids").textContent = String(tennis);
    document.getElementById("statKidsLabel").textContent = "Ténis";
    document.getElementById("statReady").textContent = String(padel);
    document.getElementById("statReadyLabel").textContent = "Padel";
  }

  function renderPlay(items) {
    document.getElementById("statTotal").textContent = String(items.length);
    const play = items.filter(function (r) { return r.playPlan === "play"; }).length;
    const extra = items.filter(function (r) { return r.playPlan === "changing" || r.playPlan === "gym"; }).length;
    document.getElementById("statKids").textContent = String(play);
    document.getElementById("statKidsLabel").textContent = "Play €300";
    document.getElementById("statReady").textContent = String(extra);
    document.getElementById("statReadyLabel").textContent = "Balneários / ginásio";
  }

  function academyFields(row) {
    return (
      field("Idade", row.age) +
      field("Menina / menino", labels[row.gender] || row.gender) +
      field("Email", row.email) +
      field("Escola", row.school) +
      field("Vezes / semana", labels[row.timesPerWeek] || row.timesPerWeek) +
      field("Horários", (row.slots || []).map(slotLabel).join("; ")) +
      field("1.ª escolha", slotLabel(row.firstChoice)) +
      field("2.ª escolha", slotLabel(row.secondChoice)) +
      field("Nível ténis", labels[row.tennisLevel] || row.tennisLevel) +
      field("Nível padel", labels[row.padelLevel] || row.padelLevel) +
      field("2.º filho", [row.child2Name, row.child2Age, labels[row.child2Gender] || row.child2Gender, labels[row.child2Schedule] || row.child2Schedule].filter(Boolean).join(" · ")) +
      field("Notas", row.notes) +
      field("Idioma", row.language) +
      field("Ref", row.id)
    );
  }

  function socialFields(row) {
    return (
      field("Email", row.email) +
      field("Modalidade", labels[row.sport] || row.sport) +
      field("Dias", weekendLabel(row)) +
      field("Quando", labels[row.weekendWhen] || row.weekendWhen) +
      field("Notas", row.notes) +
      field("Idioma", row.language) +
      field("Ref", row.id)
    );
  }

  function playFields(row) {
    return (
      field("Email", row.email) +
      field("Modalidade", labels[row.sport] || row.playSports || row.sport) +
      field("Plano", labels[row.playPlan] || row.playPlan) +
      field("Já joga", row.playsAlready ? "Sim" : "") +
      field("Notas", row.notes) +
      field("Idioma", row.language) +
      field("Ref", row.id)
    );
  }

  function renderList(items) {
    const list = document.getElementById("list");
    const empty = document.getElementById("empty");
    list.innerHTML = "";
    empty.classList.toggle("is-hidden", items.length > 0);

    items.slice().reverse().forEach(function (row) {
      const card = document.createElement("article");
      card.className = "sub-card";
      const when = row.submittedAt ? new Date(row.submittedAt).toLocaleString("pt-PT") : "";
      const child2 = currentTab === "academy" && row.child2Name ? " + " + row.child2Name : "";
      let summary = "";
      if (currentTab === "academy") {
        summary = (labels[row.sport] || row.sport || "") +
          (row.tennisLevel && row.sport !== "padel" ? " · " + (labels[row.tennisLevel] || row.tennisLevel) : "") +
          " · " + when;
      } else if (currentTab === "social") {
        summary = (labels[row.sport] || row.sport || "") +
          (weekendLabel(row) ? " · " + weekendLabel(row) : "") +
          " · " + when;
      } else {
        summary = (labels[row.playPlan] || row.playPlan || "Play") +
          (row.sport ? " · " + (labels[row.sport] || row.sport) : "") +
          " · " + when;
      }
      const extra = currentTab === "academy"
        ? (labels[row.gender] || "") + (row.gender && row.age ? " · " : "") + (row.age ? row.age + " anos" : "") + (row.parentName ? " · " + row.parentName : "") + (row.phone ? " · " + row.phone : "")
        : (row.phone || "");
      const details = currentTab === "academy" ? academyFields(row) : (currentTab === "social" ? socialFields(row) : playFields(row));
      card.innerHTML =
        '<div class="sub-top">' +
          '<button type="button" class="sub-head">' +
            "<div><strong>" + escapeHtml(row.studentName || "—") + escapeHtml(child2) + "</strong>" +
            "<div><span>" + escapeHtml(extra) + "</span></div></div>" +
            "<span>" + escapeHtml(summary) + "</span>" +
          "</button>" +
          '<button type="button" class="sub-del" data-id="' + escapeHtml(row.id || "") + '">Apagar</button>' +
        "</div>" +
        '<div class="sub-body"><dl>' + details + "</dl></div>";
      card.querySelector(".sub-head").addEventListener("click", function () {
        card.classList.toggle("open");
      });
      card.querySelector(".sub-del").addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        removeFicha(row);
      });
      list.appendChild(card);
    });
  }

  function render() {
    const items = ofKind(allItems, currentTab);
    document.querySelectorAll(".admin-tabs button").forEach(function (btn) {
      btn.setAttribute("aria-selected", String(btn.getAttribute("data-tab") === currentTab));
    });
    document.getElementById("panelAcademy").classList.toggle("is-hidden", currentTab !== "academy");
    document.getElementById("panelSocial").classList.toggle("is-hidden", currentTab !== "social");
    document.getElementById("panelPlay").classList.toggle("is-hidden", currentTab !== "play");
    document.getElementById("csvLink").href = "/api/export.csv?kind=" + currentTab;

    if (currentTab === "academy") {
      document.getElementById("brandTitle").textContent = "Disponibilidade";
      document.getElementById("brandSub").textContent = "Respostas das famílias · sem compromisso";
      document.getElementById("listTitle").textContent = "Famílias";
      renderAcademy(items);
    } else if (currentTab === "social") {
      document.getElementById("brandTitle").textContent = "Social fim-de-semana";
      document.getElementById("brandSub").textContent = "Interessados em jogar ao sábado e domingo";
      document.getElementById("listTitle").textContent = "Jogadores";
      renderSocial(items);
    } else {
      document.getElementById("brandTitle").textContent = "Play Membership";
      document.getElementById("brandSub").textContent = "Play only · sem aulas";
      document.getElementById("listTitle").textContent = "Membros potenciais";
      renderPlay(items);
    }
    renderList(items);
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
    allItems = data.submissions || [];
    render();
  }

  async function removeFicha(row) {
    const name = row.studentName || "esta ficha";
    if (!window.confirm("Apagar a ficha de " + name + "? Serve para testes. Isto não se recupera.")) return;
    try {
      await api("/api/submissions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id })
      });
      await load();
    } catch (err) {
      window.alert(err && err.message === "store"
        ? "Ainda não há armazenamento no Vercel. As fichas de teste só se apagam depois de ligar o Redis."
        : "Não foi possível apagar esta ficha.");
    }
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

  document.querySelectorAll(".admin-tabs button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      currentTab = btn.getAttribute("data-tab");
      render();
    });
  });

  api("/api/submissions")
    .then(function (data) {
      enterAdmin();
      allItems = data.submissions || [];
      render();
    })
    .catch(function () {});
})();
