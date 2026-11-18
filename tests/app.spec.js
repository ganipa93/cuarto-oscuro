const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

function watch(page) {
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  return errs;
}
async function answerAll(page, n, pick) {
  for (let i = 0; i < n; i++) {
    await page.locator("#opts .opt").nth(pick(i)).click();
  }
}

test("versión corta: 15 preguntas, resultado, filtros y ficha", async ({ page }) => {
  const errs = watch(page);
  await page.goto("/");
  await page.click("#start-short");
  await expect(page.locator("#qnum")).toHaveText("1 / 15");
  await page.click("#weight");
  await answerAll(page, 15, (i) => i % 5);
  await expect(page.locator("#headline")).toBeVisible();
  expect(page.url()).toContain("#r/s/");
  await expect(page.locator("#list .match")).toHaveCount(5);
  await page.click("#toggle");
  await expect(page.locator("#list .match")).toHaveCount(25);
  await page.click("#chips button:has-text('Votos')");
  await expect(page.locator("#list").first()).toHaveAttribute("data-filter", "vt");
  await expect(page.locator("#list .sec[data-sec=cp]").first()).toBeHidden();
  await page.locator("#list .more a").first().click();
  await expect(page.locator("#pcard h2")).toBeVisible();
  expect(errs.join("\n")).toBe("");
});

test("versión completa y enlace compartido reproduce el resultado", async ({ page }) => {
  const errs = watch(page);
  await page.goto("/");
  await page.click("#start-full");
  const total = Number((await page.locator("#qnum").textContent()).split("/")[1]);
  expect(total).toBeGreaterThan(44);
  await answerAll(page, total, (i) => (i * 3) % 5);
  const url = page.url();
  const first = await page.locator("#list .match .name").first().textContent();
  await page.goto("/");
  await page.goto(url);
  await expect(page.locator("#list .match .name").first()).toHaveText(first);
  await page.click("summary:has-text('Explorador de votaciones')");
  await page.selectOption("#vsel", "2");
  await expect(page.locator("#vdetail table")).toHaveCount(2);
  await expect(page.locator("#vdetail")).toContainText("Diputados, por bloque");
  // votación solo del Senado, con pregunta propia en el test (propiedad privada, 2026)
  await page.selectOption("#vsel", "7");
  await expect(page.locator("#vdetail table")).toHaveCount(1);
  await expect(page.locator("#vdetail")).toContainText("Senado, por bloque");
  await expect(page.locator("#vdetail")).toContainText("Con tus respuestas");
  // votación sin preguntas en el test (acuerdo con holdouts, 2026)
  await page.selectOption("#vsel", "9");
  await expect(page.locator("#vdetail")).toContainText("no compara tu postura");
  await page.click("#png", { trial: true });
  expect(errs.join("\n")).toBe("");
});

test("votos históricos en la línea de tiempo", async ({ page }) => {
  await page.goto("/#linea");
  await expect(page.locator("#histcard")).toBeVisible();
  await page.selectOption("#hsel", { label: "Matrimonio: modificación del Código Civil (2010)" });
  await expect(page.locator("#hdetail")).toContainText("126 a favor, 110 en contra");
  await page.selectOption("#hsel", { label: "Interrupción voluntaria del embarazo (2018)" });
  await expect(page.locator("#hdetail table")).toHaveCount(2);
});

test("enlace inválido vuelve al inicio y la línea de tiempo carga", async ({ page }) => {
  await page.goto("/#r/s/zzz/1");
  await expect(page.locator("#start-short")).toBeVisible();
  await page.goto("/#linea");
  await expect(page.locator("#tl li").first()).toBeVisible();
  const all = await page.locator("#tl li").count();
  await page.locator("#tl-chips button").nth(1).click();
  expect(await page.locator("#tl li").count()).toBeLessThanOrEqual(all);
  await expect(page.locator("#dnucard table")).toBeVisible();
});

test("método, comparar partidos y provincias", async ({ page }) => {
  const errs = watch(page);
  await page.goto("/#metodo");
  await expect(page.locator("#mcard table tbody tr")).toHaveCount(25);
  await page.goto("/#comparar/la-libertad-avanza/partido-obrero");
  await expect(page.locator("#cmp table")).toBeVisible();
  await expect(page.locator("#cmp-b")).toHaveValue("partido-obrero");
  await page.goto("/#distritos/mendoza");
  await expect(page.locator("#ddetail h3").first()).toContainText("Mendoza");
  await page.selectOption("#dsel", "tucuman");
  await expect(page).toHaveURL(/#distritos\/tucuman/);
  await expect(page.locator("#ddetail")).toContainText("Osvaldo Jaldo");
  expect(errs.join("\n")).toBe("");
});

test("comparar con otra persona, 'qué pesó más' y enlace viejo de 44 preguntas", async ({ page }) => {
  const errs = watch(page);
  await page.goto("/");
  await page.click("#start-short");
  await answerAll(page, 15, (i) => (i % 2 ? 4 : 0));
  await expect(page.locator("#why h3")).toHaveCount(4);
  const mine = page.url();
  await page.fill("#friend-in", mine.replace(/\/r\/s\//, "/r/s/").replace(/[01]\/?$/, "0"));
  await page.click("#friend-go");
  await expect(page.locator("#friend table")).toBeVisible();
  // formato nuevo para compartir: …/r/s/…/…
  await page.fill("#friend-in", "https://cuarto-oscuro.vercel.app/" + mine.split("#")[1]);
  await page.click("#friend-go");
  await expect(page.locator("#friend table")).toBeVisible();
  await page.fill("#friend-in", "no es un enlace");
  await page.click("#friend-go");
  await expect(page.locator("#friend .err")).toBeVisible();
  const old = "/#r/f/" + "2".repeat(44) + "/" + "0".repeat(44);
  await page.goto(old);
  await page.reload();
  await expect(page.locator("#headline")).toBeVisible();
  expect(errs.join("\n")).toBe("");
});

for (const scheme of ["light", "dark"]) {
  test("accesibilidad (axe) en modo " + scheme, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/");
    await page.click("#start-short");
    let r = await new AxeBuilder({ page }).analyze();
    expect(r.violations.filter((v) => ["serious", "critical"].includes(v.impact))).toEqual([]);
    await answerAll(page, 15, () => 3);
    await expect(page.locator("#headline")).toBeVisible();
    r = await new AxeBuilder({ page }).analyze();
    expect(r.violations.filter((v) => ["serious", "critical"].includes(v.impact))).toEqual([]);
  });
}

for (const route of ["#metodo", "#comparar", "#distritos/cordoba", "#linea"]) {
  test("accesibilidad (axe) en " + route, async ({ page }) => {
    await page.goto("/" + route);
    await page.waitForSelector("[data-view].on h2");
    const r = await new AxeBuilder({ page }).analyze();
    expect(r.violations.filter((v) => ["serious", "critical"].includes(v.impact))).toEqual([]);
  });
}

test("la imagen para redes calcula el mismo resultado que el navegador", async ({ page }) => {
  const { resultado } = await import(require("url").pathToFileURL(require("path").join(__dirname, "..", "api", "_resultado.mjs")).href);
  for (const pick of [(i) => i % 5, (i) => (i % 2 ? 4 : 0), (i) => (i * 3) % 5]) {
    await page.goto("/");
    await page.click("#start-short");
    await answerAll(page, 15, pick);
    await expect(page.locator("#headline")).toBeVisible();
    const code = page.url().split("#r/")[1];
    const r = resultado(code);
    const top = page.locator("#list .match").first();
    const nombre = (await top.locator(".name").evaluate((e) => e.firstChild.textContent)).trim();
    expect(nombre).toBe(r.top[0].n);
    await expect(top.locator(".pct")).toHaveText(r.top[0].pct + "%");
  }
});

test("teclado: 1 a 5 responden, 0 saltea y W da más peso; sin pedidos a Google Fonts", async ({ page }) => {
  const errs = watch(page);
  const ext = [];
  page.on("request", (r) => { if (/fonts\.(googleapis|gstatic)\.com/.test(r.url())) ext.push(r.url()); });
  await page.goto("/");
  await page.click("#start-short");
  await expect(page.locator("#qnum")).toHaveText("1 / 15");
  await page.keyboard.press("w");
  await expect(page.locator("#weight")).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("5");
  await expect(page.locator("#qnum")).toHaveText("2 / 15");
  await expect(page.locator("#qtext")).toBeFocused();
  await page.keyboard.press("0");
  await expect(page.locator("#qnum")).toHaveText("3 / 15");
  await page.click("#back");
  await expect(page.locator("#opts .opt[aria-pressed=true]")).toHaveCount(0);
  await page.click("#noans");
  await expect(page.locator("#qnum")).toHaveText("3 / 15");
  for (let i = 3; i <= 15; i++) await page.keyboard.press(String(((i * 2) % 5) + 1));
  await expect(page.locator("#headline")).toBeVisible();
  expect(page.url()).toMatch(/#r\/s\/[0-4-]+\/[01]+$/);
  const a = page.url().split("/")[5];
  expect(a.charAt(0)).toBe("4");
  expect(a.charAt(1)).toBe("-");
  await expect(page.locator("#list .match")).toHaveCount(5);
  expect(ext).toEqual([]);
  expect(errs.join("\n")).toBe("");
});

test("pantalla de preguntas sin violaciones de accesibilidad", async ({ page }) => {
  await page.goto("/");
  await page.click("#start-short");
  const r = await new AxeBuilder({ page }).analyze();
  expect(r.violations).toEqual([]);
});

test("enlace de 53 preguntas (anterior al rebalanceo) sigue dando resultado", async ({ page }) => {
  const errs = watch(page);
  await page.goto("/#r/f/" + "34".repeat(26) + "3/" + "0".repeat(53));
  await expect(page.locator("#headline")).toBeVisible();
  await expect(page.locator("#list .match")).toHaveCount(5);
  expect(errs.join("\n")).toBe("");
});

test("versión corta: ejes balanceados (mitad y mitad en Orden y Valores)", async ({ page }) => {
  const q = await (await page.request.get("/data/questions.json")).json();
  for (const a of [1, 3]) {
    const s = q.questions.filter((x) => x.a === a && x.core).map((x) => x.s);
    expect(s.filter((v) => v === 1).length).toBe(s.filter((v) => v === -1).length);
    const all = q.questions.filter((x) => x.a === a).map((x) => x.s);
    expect(Math.abs(all.filter((v) => v === 1).length - all.filter((v) => v === -1).length)).toBeLessThanOrEqual(1);
  }
});

test("versión completa: ningún eje queda desbalanceado por más de una pregunta", async ({ page }) => {
  const q = await (await page.request.get("/data/questions.json")).json();
  for (const a of [0, 1, 2, 3]) {
    const s = q.questions.filter((x) => x.a === a && !x.dup).map((x) => x.s);
    expect(Math.abs(s.filter((v) => v === 1).length - s.filter((v) => v === -1).length)).toBeLessThanOrEqual(1);
  }
});

test("votaciones nuevas: universidades, emergencia pediátrica y Ficha Limpia", async ({ page }) => {
  const errs = watch(page);
  await page.goto("/");
  await page.click("#start-full");
  const total = Number((await page.locator("#qnum").textContent()).split("/")[1]);
  await answerAll(page, total, (i) => (i % 2 ? 4 : 0));
  await page.click("summary:has-text('Explorador de votaciones')");
  for (const [id, texto] of [["14", "174 a 67"], ["15", "181 a 60"], ["16", "36 a 35"], ["17", "142 a favor"]]) {
    await page.selectOption("#vsel", id);
    await expect(page.locator("#vdetail")).toContainText(texto);
    await expect(page.locator("#vdetail table")).toHaveCount(1);
    await expect(page.locator("#vdetail")).toContainText("Con tus respuestas");
    if (id === "16") await expect(page.locator("#vdetail")).toContainText("Partido Justicialista: en contra");
    if (id === "17") await expect(page.locator("#vdetail")).toContainText("Partido Justicialista: a favor");
  }
  expect(errs.join("\n")).toBe("");
});

test("transparencia: selección de partidos, evidencia visible y límites en el método", async ({ page }) => {
  const errs = watch(page);
  await page.goto("/");
  await page.click("summary:has-text('Cómo se armó')");
  await expect(page.locator(".intro-more")).toContainText("44 partidos de orden nacional");
  await expect(page.locator(".intro-more a[href*='observatorioelectoral']")).toHaveCount(1);
  await page.click("#start-short");
  const total = Number((await page.locator("#qnum").textContent()).split("/")[1]);
  await answerAll(page, total, (i) => (i % 2 ? 4 : 0));
  await expect(page.locator(".match .ev").first()).toContainText("evidencia:");
  await page.goto("/#metodo");
  await expect(page.locator("#mcard")).toContainText("Selección de partidos");
  await expect(page.locator("#mcard")).toContainText("posición general del partido");
  expect(errs.join("\n")).toBe("");
});

test("preguntas repetidas: no se preguntan y los enlaces viejos con respuestas ahí dan lo mismo", async ({ page }) => {
  const errs = watch(page);
  const q = (await (await page.request.get("/data/questions.json")).json()).questions;
  const dups = q.filter((x) => x.dup).map((x) => x.id);
  expect(dups.length).toBeGreaterThan(0);
  await page.goto("/");
  await page.click("#start-full");
  await expect(page.locator("#qnum")).toContainText("/ " + (q.length - dups.length));
  const base = q.map((x) => (x.id % 5)).map((n) => String(n));
  const a1 = base.map((c, i) => (dups.includes(i) ? "-" : c)).join("");
  const a2 = base.join("");
  const w = "0".repeat(q.length);
  await page.goto("/#r/f/" + a1 + "/" + w);
  const h1 = await page.locator("#headline").textContent();
  const l1 = await page.locator("#list .match .name").allTextContents();
  await page.goto("/#r/f/" + a2 + "/" + w);
  await page.reload();
  expect(await page.locator("#headline").textContent()).toBe(h1);
  expect(await page.locator("#list .match .name").allTextContents()).toEqual(l1);
  expect(errs.join("\n")).toBe("");
});
