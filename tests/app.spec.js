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
  await page.selectOption("#vsel", "2");
  await expect(page.locator("#vdetail table")).toHaveCount(2);
  await expect(page.locator("#vdetail")).toContainText("Diputados, por bloque");
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
