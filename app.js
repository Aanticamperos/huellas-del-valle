// =============================================================
// CONFIGURACIÓN DEL SISTEMA
// Reemplazar estos valores cuando creemos el webhook y la hoja.
// =============================================================
const CONFIG = {
  MAKE_WEBHOOK_URL: "https://hook.us2.make.com/chqwajoneb23k0z7b6w8dif73mqo6vxd",
  CITAS_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTjUxLokj3masUXmrmUWJo_e1gbHADDc6sSEIISG126MY-M3qRxAOmD9sSoaMP_5UYbLftaiwts6u3X/pub?gid=1086141472&single=true&output=csv",
};

const form = document.getElementById("appointment-form");
const submitBtn = document.getElementById("submit-btn");
const resultEmpty = document.getElementById("result-empty");
const resultContent = document.getElementById("result-content");
const resultStatus = document.getElementById("result-status");
const resultTitle = document.getElementById("result-title");
const resultMessage = document.getElementById("result-message");
const detailFecha = document.getElementById("detail-fecha");
const detailHora = document.getElementById("detail-hora");
const detailLibres = document.getElementById("detail-libres");

const agendaDate = document.getElementById("agenda-date");
const refreshAgenda = document.getElementById("refresh-agenda");
const agendaBody = document.getElementById("agenda-body");
const agendaState = document.getElementById("agenda-state");

function todayISO() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function showResult({ status = "PROCESADA", title = "Solicitud procesada", message = "", fecha = "—", hora = "—", libres = "—" }) {
  resultEmpty.classList.add("hidden");
  resultContent.classList.remove("hidden");
  resultStatus.textContent = status;
  resultTitle.textContent = title;
  resultMessage.textContent = message || "El escenario 1 procesó la solicitud.";
  detailFecha.textContent = fecha || "—";
  detailHora.textContent = hora || "—";
  detailLibres.textContent = libres === undefined || libres === null || libres === "" ? "—" : libres;

  const statusUpper = String(status).toUpperCase();
  resultStatus.style.background = "#eef2f6";
  resultStatus.style.color = "#344054";
  if (statusUpper.includes("CONFIRMADA") && statusUpper.includes("ALERTA")) {
    resultStatus.style.background = "#fff5e6";
    resultStatus.style.color = "#a15c00";
  } else if (statusUpper.includes("CONFIRMADA")) {
    resultStatus.style.background = "#eaf8f0";
    resultStatus.style.color = "#176b43";
  } else if (statusUpper.includes("RECHAZADA")) {
    resultStatus.style.background = "#fdecec";
    resultStatus.style.color = "#a12626";
  }
}

function normalizeMakeResponse(data) {
  if (typeof data === "string") {
    try { return JSON.parse(data); } catch { return { mensaje: data }; }
  }
  return data && typeof data === "object" ? data : {};
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (CONFIG.MAKE_WEBHOOK_URL.startsWith("REEMPLAZAR")) {
    showResult({
      status: "CONFIGURACIÓN PENDIENTE",
      title: "Webhook aún no conectado",
      message: "La interfaz ya está lista. Cuando creemos el escenario 1 en Make, pegaremos aquí su URL pública.",
    });
    return;
  }

  const data = Object.fromEntries(new FormData(form).entries());

  submitBtn.disabled = true;
  submitBtn.textContent = "Enviando…";

  try {
    const response = await fetch(CONFIG.MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const text = await response.text();
    const result = normalizeMakeResponse(text);

    showResult({
      status: result.resultado || result.estado || result.status || (response.ok ? "PROCESADA" : "ERROR"),
      title: result.titulo || result.mensaje_titulo || "Solicitud procesada",
      message: result.mensaje || result.message || result.detalle || "Respuesta recibida desde Make.",
      fecha: result.fecha || data.fecha,
      hora: result.hora || data.hora,
      libres: result.libres ?? result.cupos_libres ?? "—",
    });

    if (response.ok) await loadAgenda();
  } catch (error) {
    showResult({
      status: "ERROR DE CONEXIÓN",
      title: "No se pudo contactar Make",
      message: "Revisa que la URL del webhook sea correcta y que el escenario esté activo.",
      fecha: data.fecha,
      hora: data.hora,
    });
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Agendar cita";
  }
});

function csvToRows(csv) {
  const lines = csv.trim().split(/\r?\n/);
  if (!lines.length) return [];

  const parseLine = (line) => {
    const values = [];
    let current = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') { current += '"'; i++; }
        else { quoted = !quoted; }
      } else if (ch === ',' && !quoted) {
        values.push(current); current = "";
      } else current += ch;
    }
    values.push(current);
    return values.map(v => v.trim());
  };

  const headers = parseLine(lines[0]).map(h => h.toLowerCase());
  return lines.slice(1).filter(Boolean).map(line => {
    const values = parseLine(line);
    return headers.reduce((obj, h, i) => { obj[h] = values[i] ?? ""; return obj; }, {});
  });
}

function statusBadge(status) {
  const s = String(status || "").toUpperCase();
  let cls = "";
  if (s.includes("CONFIRMADA") && s.includes("ALERTA")) cls = "warning";
  else if (s.includes("CONFIRMADA")) cls = "success";
  else if (s.includes("RECHAZADA")) cls = "danger";
  return `<span class="badge ${cls}">${escapeHtml(status || "—")}</span>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadAgenda() {
  const targetDate = agendaDate.value;
  agendaState.textContent = "Consultando las citas…";

  if (CONFIG.CITAS_CSV_URL.startsWith("REEMPLAZAR")) {
    agendaState.textContent = "La conexión con la hoja Citas está pendiente. La conectaremos después de crear la hoja y Make.";
    agendaBody.innerHTML = "";
    return;
  }

  try {
    const response = await fetch(CONFIG.CITAS_CSV_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudo leer la hoja.");
    const csv = await response.text();
    const rows = csvToRows(csv);

    const filtered = rows
      .filter(row => String(row.fecha || "") === targetDate)
      .sort((a, b) => String(a.hora || "").localeCompare(String(b.hora || "")));

    agendaBody.innerHTML = filtered.length ? filtered.map(row => `
      <tr>
        <td>${escapeHtml(row.hora)}</td>
        <td>${escapeHtml(row.propietario)}</td>
        <td>${escapeHtml(row.mascota)}</td>
        <td>${escapeHtml(row.especie)}</td>
        <td>${escapeHtml(row.servicio)}</td>
        <td>${statusBadge(row.estado_cita || row.resultado_proceso)}</td>
      </tr>
    `).join("") : `
      <tr><td colspan="6" style="text-align:center;color:#667085;padding:28px">No hay citas registradas para esta fecha.</td></tr>
    `;

    agendaState.textContent = `${filtered.length} cita(s) encontrada(s) para ${targetDate}.`;
  } catch (error) {
    agendaState.textContent = "No fue posible cargar la agenda. Revisa la URL pública de la hoja Citas.";
    agendaBody.innerHTML = "";
  }
}

// Vistas
for (const button of document.querySelectorAll(".tab")) {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active-view"));
    button.classList.add("active");
    document.getElementById(`view-${button.dataset.view}`).classList.add("active-view");
    if (button.dataset.view === "agenda") loadAgenda();
  });
}

agendaDate.value = todayISO();
refreshAgenda.addEventListener("click", loadAgenda);
