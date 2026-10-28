// ЧекХаб — общая логика: подстановка настроек, меню, калькулятор.
(function () {
  var cfg = window.CH_CONFIG || {};

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // 1. Подстановка названия и контактов из config.js
  $$("[data-site-name]").forEach(function (el) { el.textContent = cfg.name || "Сайт"; });
  $$("[data-tg]").forEach(function (el) { el.setAttribute("href", cfg.telegram || "#"); });
  $$("[data-tg-label]").forEach(function (el) { el.textContent = cfg.telegramLabel || "Telegram"; });
  $$("[data-email]").forEach(function (el) {
    el.setAttribute("href", "mailto:" + (cfg.email || ""));
    el.textContent = cfg.email || "";
  });
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // 2. Мобильное меню
  var burger = $(".burger");
  var nav = $(".nav");
  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    $$(".nav a", nav).forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
      });
    });
  }

  // 2.5 Цели Яндекс.Метрики (id счётчика — в config.js)
  function goal(name) {
    if (typeof window.ym === "function" && cfg.metrikaId) {
      window.ym(cfg.metrikaId, "reachGoal", name);
    }
  }

  // Клик по любой кнопке «Написать в Telegram»
  $$("[data-tg]").forEach(function (el) {
    el.addEventListener("click", function () { goal("telegram_click"); });
  });
  $$("[data-email]").forEach(function (el) {
    el.addEventListener("click", function () { goal("email_click"); });
  });

  // 2.6 Липкая панель на мобильных: «Заявка» + Telegram.
  // Элемент создаём всегда, видимость ограничивает CSS (max-width: 900px).
  (function stickyCta() {
    if (document.querySelector(".mobile-cta")) return;
    var bar = document.createElement("div");
    bar.className = "mobile-cta";

    // Адрес абсолютный: панель строится и на 404, где относительная ссылка
    // развалилась бы на вложенном пути (/foo/bar → /foo/zayavka.html).
    var lead = document.createElement("a");
    lead.className = "btn btn-primary";
    lead.href = "/zayavka.html";
    lead.textContent = "Заявка";
    lead.addEventListener("click", function () { goal("lead_open"); });
    bar.appendChild(lead);

    if (cfg.telegram) {
      var link = document.createElement("a");
      link.className = "btn btn-ghost";
      link.href = cfg.telegram;
      link.textContent = cfg.telegramLabel || "Telegram";
      link.addEventListener("click", function () { goal("telegram_click"); });
      bar.appendChild(link);
    }

    document.body.appendChild(bar);
    function update() {
      bar.classList.toggle("is-visible", window.pageYOffset > 400);
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
  })();

  // 2.7 Заявки уходят прямо в Telegram: форма собирает текст и открывает чат
  // с уже заполненным сообщением. Сторонних сервисов нет — отправку подтверждает человек.
  (function leadForms() {
    var forms = $$("form.lead-form");
    if (!forms.length) return;

    var LABELS = {
      name: "Имя",
      contact: "Связь",
      ofd: "ОФД",
      cashboxes: "Кассы",
      period: "Период",
      format: "Формат",
      task: "Задача",
      plan: "Тариф",
      comment: "Комментарий"
    };

    // Источник заявки: ?from=… или страница, с которой пришли
    $$('input[name="source"]').forEach(function (el) {
      if (el.value) return;
      var from = "";
      try { from = new URLSearchParams(window.location.search).get("from") || ""; } catch (e) {}
      el.value = String(from || document.referrer || window.location.pathname).slice(0, 160);
    });

    forms.forEach(function (form) {
      var status = form.querySelector(".form-status");

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!form.checkValidity()) { form.reportValidity(); return; }

        // Ловушка для ботов: поле скрыто от людей, бот его заполняет — молча выходим.
        var trap = form.querySelector('input[name="bot-field"]');
        if (trap && trap.value) {
          if (status) { status.className = "form-status ok"; status.textContent = "Заявка отправлена."; }
          return;
        }

        var lines = [];
        new FormData(form).forEach(function (value, key) {
          if (key === "form-name" || key === "bot-field" || key === "consent") return;
          var v = String(value == null ? "" : value).trim();
          if (!v) return;
          lines.push((LABELS[key] || key) + ": " + v);
        });

        var text = "Заявка с сайта " + location.hostname + "\n" + lines.join("\n");
        var url = cfg.telegram + "?text=" + encodeURIComponent(text.slice(0, 3500));

        if (status) {
          status.className = "form-status ok";
          status.textContent = "Открыли Telegram — нажмите там «Отправить». Не открылось? ";
          var again = document.createElement("a");
          again.href = url;
          again.target = "_blank";
          again.rel = "noopener";
          again.textContent = "Открыть чат вручную";
          status.appendChild(again);
        }
        goal("lead_form");
        window.open(url, "_blank", "noopener");
      });
    });
  })();

  // 2.8 Инструмент «Проверить чек по QR»: разбор QR-строки чека (тег 1192).
  // Всё считается в браузере — данные чека никуда не уходят.
  (function qrTool() {
    var input = $("#qr-input");
    if (!input) return;

    var out = $("#qr-result");
    var csvBtn = $("#qr-csv");
    var hint = $("#qr-hint");
    var OPERATIONS = { "1": "Приход", "2": "Возврат прихода", "3": "Расход", "4": "Возврат расхода" };
    var parsed = [];

    function esc(s) {
      return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
      });
    }

    function onlyDigits(v) { return String(v == null ? "" : v).replace(/\s+/g, ""); }

    function parseDate(v) {
      var m = /^(\d{4})(\d{2})(\d{2})T?(\d{2})(\d{2})(\d{2})?$/.exec(onlyDigits(v).toUpperCase());
      if (!m) return null;
      var y = +m[1], mo = +m[2], d = +m[3], h = +m[4], mi = +m[5];
      if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
      return {
        text: ("0" + d).slice(-2) + "." + ("0" + mo).slice(-2) + "." + y + " " + ("0" + h).slice(-2) + ":" + ("0" + mi).slice(-2),
        iso: y + "-" + m[2] + "-" + m[3]
      };
    }

    function parseLine(line) {
      var res = { raw: line, ok: false, errors: [], f: {} };
      var text = String(line || "").trim();
      if (!text) { res.errors.push("пустая строка"); return res; }

      // На случай, если вставили ссылку целиком — оставляем только параметры
      var q = text.indexOf("?");
      if (q > -1 && text.slice(0, q).indexOf("=") === -1) text = text.slice(q + 1);

      var obj = {};
      text.split("&").forEach(function (part) {
        var i = part.indexOf("=");
        if (i < 1) return;
        obj[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim();
      });

      var fn = onlyDigits(obj.fn);
      if (!fn) res.errors.push("нет ФН (fn=…)");
      else if (!/^\d{16}$/.test(fn)) res.errors.push("ФН — ровно 16 цифр");

      var fd = onlyDigits(obj.i);
      if (!fd) res.errors.push("нет ФД (i=…)");
      else if (!/^\d{1,10}$/.test(fd)) res.errors.push("ФД — число до 10 цифр");

      var fp = onlyDigits(obj.fp);
      if (!fp) res.errors.push("нет ФПД (fp=…)");
      else if (!/^\d{9,10}$/.test(fp)) res.errors.push("ФПД — 9–10 цифр");

      var sum = String(obj.s || "").replace(",", ".").replace(/\s/g, "");
      var sumOk = /^\d+(\.\d{1,2})?$/.test(sum);
      if (!sum) res.errors.push("нет суммы (s=…)");
      else if (!sumOk) res.errors.push("сумма — число, например 1999.00");

      var dt = parseDate(obj.t || "");
      if (!dt) res.errors.push("дата — в формате 20261024T1830");

      var op = String(obj.n || "").trim();
      if (op && !OPERATIONS[op]) res.errors.push("тип расчёта — цифра от 1 до 4");

      res.f = {
        fn: fn, fd: fd, fp: fp,
        sum: sumOk ? Number(sum) : null,
        date: dt ? dt.text : "",
        iso: dt ? dt.iso : "",
        op: OPERATIONS[op] || "",
        raw: text
      };
      res.ok = res.errors.length === 0;
      return res;
    }

    function money(v) {
      return v.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function render() {
      if (!out) return;
      if (!parsed.length) {
        out.innerHTML = '<p class="small muted" style="margin:0">Результат появится здесь: дата, сумма, ФН, ФД и ФПД.</p>';
        if (csvBtn) csvBtn.disabled = true;
        return;
      }
      var good = parsed.filter(function (r) { return r.ok; }).length;
      var html = ['<div class="tool-sum">',
        '<span class="badge badge-ok">Корректных: ' + good + '</span>'];
      if (parsed.length - good) {
        html.push('<span class="badge badge-err">С ошибками: ' + (parsed.length - good) + '</span>');
      }
      html.push('<span class="badge badge-warn">Строк: ' + parsed.length + '</span></div>');

      html.push('<table class="tool-table"><thead><tr><th>#</th><th>Дата и время</th><th>Сумма, ₽</th><th>ФН</th><th>ФД</th><th>ФПД</th><th>Операция</th><th>Статус</th></tr></thead><tbody>');
      parsed.forEach(function (r, idx) {
        var f = r.f;
        html.push('<tr>',
          '<td>' + (idx + 1) + '</td>',
          '<td>' + (esc(f.date) || "—") + '</td>',
          '<td>' + (f.sum === null ? "—" : money(f.sum)) + '</td>',
          '<td>' + (esc(f.fn) || "—") + '</td>',
          '<td>' + (esc(f.fd) || "—") + '</td>',
          '<td>' + (esc(f.fp) || "—") + '</td>',
          '<td>' + (esc(f.op) || "—") + '</td>',
          '<td>' + (r.ok
            ? '<span class="badge badge-ok">ок</span>'
            : '<span class="badge badge-err">ошибка</span><div class="small muted" style="margin-top:6px">' + esc(r.errors.join("; ")) + '</div>') + '</td>',
          '</tr>');
      });
      html.push('</tbody></table>');
      out.innerHTML = html.join("");
      if (csvBtn) csvBtn.disabled = !good;
    }

    function run() {
      var lines = String(input.value || "").split(/[\r\n]+/).filter(function (l) { return l.trim(); });
      parsed = lines.map(parseLine);
      render();
      if (lines.length) goal("qr_parse");
      if (hint) {
        hint.textContent = lines.length
          ? "Разобрали строк: " + lines.length + ". Всё считается в браузере — данные чека мы не сохраняем."
          : "Вставьте хотя бы одну строку QR-кода.";
      }
    }

    function downloadCsv() {
      var rows = [["Дата и время", "Сумма", "ФН", "ФД", "ФПД", "Операция", "Статус"]];
      parsed.forEach(function (r) {
        rows.push([
          r.f.date,
          r.f.sum === null ? "" : r.f.sum.toFixed(2).replace(".", ","),
          r.f.fn, r.f.fd, r.f.fp, r.f.op,
          r.ok ? "ок" : r.errors.join("; ")
        ]);
      });
      var csv = "\uFEFF" + rows.map(function (row) {
        return row.map(function (cell) { return '"' + String(cell).replace(/"/g, '""') + '"'; }).join(";");
      }).join("\r\n");

      var blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "cheki-qr.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      goal("qr_csv");
    }

    var btnParse = $("#qr-parse");
    if (btnParse) btnParse.addEventListener("click", run);

    var btnExample = $("#qr-example");
    if (btnExample) btnExample.addEventListener("click", function () {
      input.value = [
        "t=20261024T1830&s=1999.00&fn=7380440700123456&i=12345&fp=1234567890&n=1",
        "t=20261024T1905&s=540.50&fn=7380440700123456&i=12346&fp=9876543210&n=1"
      ].join("\n");
      run();
    });

    var btnClear = $("#qr-clear");
    if (btnClear) btnClear.addEventListener("click", function () {
      input.value = "";
      parsed = [];
      render();
      if (hint) hint.textContent = "";
    });

    if (csvBtn) csvBtn.addEventListener("click", downloadCsv);

    input.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); run(); }
    });
  })();

  // 2.75 Заявка из калькулятора: /zayavka.html?kass=3&months=2&format=1c&urgent=1&sum=6000
  // Человек не вводит второй раз то, что уже выбрал в расчёте.
  (function leadPrefill() {
    var form = $$("form.lead-form").filter(function (f) {
      var name = f.querySelector('input[name="form-name"]');
      return name && name.value === "zayavka";
    })[0];
    if (!form) return;

    var params;
    try { params = new URLSearchParams(window.location.search); } catch (e) { return; }
    var keys = ["kass", "months", "format", "sum", "urgent"];
    if (!keys.some(function (k) { return params.get(k); })) return;

    var cashboxes = parseInt(params.get("kass") || "", 10);
    var months = parseInt(params.get("months") || "", 10);
    var sum = parseInt(params.get("sum") || "", 10);
    var urgent = params.get("urgent") === "1";
    var formatMap = { excel: "Excel", csv: "CSV", "1c": "Загрузка в 1С" };
    var format = formatMap[params.get("format") || ""] || "";

    var elCash = $("#f-cashboxes");
    if (elCash && cashboxes >= 1 && cashboxes <= 500) elCash.value = String(cashboxes);

    var elFormat = $("#f-format");
    if (elFormat && format) elFormat.value = format;

    var elTask = $("#f-task");
    if (elTask && !elTask.value) {
      var parts = [];
      if (cashboxes) parts.push("касс: " + cashboxes);
      if (months) parts.push("период: " + months + " мес.");
      if (format) parts.push("формат: " + format);
      if (urgent) parts.push("срочно, нужно за сутки");
      if (sum) parts.push("ориентир по цене: от " + sum + " ₽");
      elTask.value = "Расчёт с калькулятора сайта — " + parts.join(", ") + ". Нужны чеки за: ";
    }

    var elPlan = $('input[name="plan"]');
    if (elPlan && sum) elPlan.value = "от " + sum + " ₽";

    var note = $("#lead-prefill");
    if (note) {
      var bits = [];
      if (cashboxes) bits.push(cashboxes + " касс.");
      if (months) bits.push(months + " мес.");
      if (format) bits.push(format);
      if (urgent) bits.push("срочно");
      note.textContent = "Подставил данные из калькулятора: " + bits.join(" · ") +
        (sum ? " — ориентир от " + sum + " ₽" : "") + ". Проверьте и дополните поля.";
      note.hidden = false;
    }
    goal("lead_prefill");
  })();

  // 3. Калькулятор стоимости
  var form = $("#calc-form");
  if (!form) return;

  var p = cfg.price || {};
  var out = $("#calc-price");
  var reqBox = $("#calc-request");
  var tgLink = $("#calc-tg");
  var copyBtn = $("#calc-copy");
  var leadLink = $("#calc-lead");
  if (leadLink) leadLink.addEventListener("click", function () { goal("lead_open"); });

  function num(sel, def) {
    var el = $(sel);
    var v = el ? parseInt(el.value, 10) : def;
    return isNaN(v) ? def : v;
  }

  function buildRequest(price, cashboxes, months, format, urgent) {
    return [
      "Заявка с сайта " + (cfg.name || ""),
      "Касс: " + cashboxes,
      "Период: " + months + " мес.",
      "Формат: " + (format === "1c" ? "выгрузка в 1С" : format === "csv" ? "CSV" : "Excel"),
      "Срочность: " + (urgent ? "срочно" : "обычная"),
      "Предварительная стоимость: от " + price + " ₽"
    ].join("\n");
  }

  function recalc() {
    var cashboxes = Math.max(1, num("#calc-cashboxes", 1));
    var months = Math.max(1, num("#calc-months", 1));
    var formatEl = $("#calc-format");
    var format = formatEl ? formatEl.value : "excel";
    var urgentEl = $("#calc-urgent");
    var urgent = urgentEl ? urgentEl.checked : false;

    var price = (p.base || 1500) + (cashboxes - 1) * (p.perCashbox || 500);
    price = price * (1 + Math.max(0, months - 1) * (p.perMonthCoef || 0.15));
    if (format === "1c") price += (p.format1c || 1500);
    if (urgent) price = price * (p.urgentCoef || 1.5);
    price = Math.round(price / 100) * 100;

    if (out) out.textContent = "от " + price.toLocaleString("ru-RU") + " ₽";
    var text = buildRequest(price, cashboxes, months, format, urgent);
    if (reqBox) reqBox.textContent = text;
    if (tgLink) tgLink.setAttribute("href", cfg.telegram || "#");
    if (copyBtn) copyBtn.dataset.text = text;

    // «Заявка формой»: переносим расчёт в форму, чтобы не спрашивать то же второй раз
    if (leadLink) {
      var q = new URLSearchParams();
      q.set("kass", String(cashboxes));
      q.set("months", String(months));
      q.set("format", format);
      if (urgent) q.set("urgent", "1");
      q.set("sum", String(price));
      q.set("from", window.location.pathname.replace(/\/index\.html$/, "/"));
      leadLink.setAttribute("href", "zayavka.html?" + q.toString());
    }
  }

  $$("input, select", form).forEach(function (el) {
    el.addEventListener("input", recalc);
    el.addEventListener("change", recalc);
  });

  // Копирование заявки — цель «оставил заявку» в Метрике
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      goal("calc_copy");
      var text = copyBtn.dataset.text || "";
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          copyBtn.textContent = "Скопировано ✓";
          setTimeout(function () { copyBtn.textContent = "Скопировать заявку"; }, 2000);
        });
      } else {
        window.prompt("Скопируйте текст заявки:", text);
      }
    });
  }

  recalc();
})();
