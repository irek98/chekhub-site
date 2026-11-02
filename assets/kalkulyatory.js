/* Калькуляторы ЧекХаб: НДС, НДФЛ, налоговый вычет.
   Подключается только на страницах /kalkulyatory/. Без зависимостей. */
(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  function num(id, def) {
    var el = $(id);
    if (!el) return def || 0;
    var v = parseFloat(String(el.value).replace(/\s/g, "").replace(",", "."));
    return isFinite(v) ? v : (def || 0);
  }

  function money(v) {
    return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(v) + " ₽";
  }

  function put(id, text) {
    var el = $(id);
    if (el) el.textContent = text;
  }

  function goal(name) {
    if (typeof window.ym === "function") {
      try { window.ym(113762680, "reachGoal", name); } catch (e) {}
    }
  }

  /* ---------- НДС ---------- */
  function nds() {
    var form = $("nds-form");
    if (!form) return;
    function calc() {
      var sum = Math.max(0, num("nds-sum", 0));
      var rate = num("nds-rate", 20);
      var modeEl = $("nds-mode");
      var mode = modeEl ? modeEl.value : "add";
      var vat, net, gross;
      if (mode === "add") {
        vat = sum * rate / 100;
        net = sum;
        gross = sum + vat;
      } else {
        vat = sum * rate / (100 + rate);
        net = sum - vat;
        gross = sum;
      }
      put("nds-vat", money(vat));
      put("nds-net", money(net));
      put("nds-gross", money(gross));
    }
    form.addEventListener("input", calc);
    form.addEventListener("change", calc);
    calc();
  }

  /* ---------- НДФЛ ---------- */
  var NDFL_STEPS = [
    [2400000, 0.13],
    [5000000, 0.15],
    [20000000, 0.18],
    [50000000, 0.20],
    [Infinity, 0.22]
  ];

  function ndflTax(base) {
    var tax = 0, prev = 0;
    for (var i = 0; i < NDFL_STEPS.length; i++) {
      var top = NDFL_STEPS[i][0], rate = NDFL_STEPS[i][1];
      if (base > prev) tax += (Math.min(base, top) - prev) * rate;
      prev = top;
      if (base <= top) break;
    }
    return tax;
  }

  /* стандартные вычеты на детей: 1400 (1-й), 1400 (2-й), 3000 (3-й и далее),
     применяются пока доход с начала года не превысил 450 000 ₽ */
  function ndfl() {
    var form = $("ndfl-form");
    if (!form) return;
    function calc() {
      var salary = Math.max(0, num("ndfl-salary", 0));
      var months = Math.min(12, Math.max(1, Math.round(num("ndfl-months", 12))));
      var kids = Math.min(6, Math.max(0, Math.round(num("ndfl-kids", 0))));

      var childDeduction = 0;
      if (kids >= 1) childDeduction += 1400;
      if (kids >= 2) childDeduction += 1400;
      if (kids >= 3) childDeduction += 3000 * (kids - 2);

      var annual = salary * months;
      var deductions = 0, accrued = 0;
      for (var m = 0; m < months; m++) {
        if (accrued < 450000) deductions += childDeduction;
        accrued += salary;
      }
      var base = Math.max(0, annual - deductions);
      var taxYear = ndflTax(base);
      var monthlyTax = months ? taxYear / months : 0;

      put("ndfl-taxyear", money(taxYear));
      put("ndfl-monthly", money(monthlyTax));
      put("ndfl-net", money(salary - monthlyTax));
      put("ndfl-base", money(base));
      put("ndfl-rate", base > 0 ? (taxYear / base * 100).toFixed(1).replace(".", ",") + " %" : "0 %");
    }
    form.addEventListener("input", calc);
    form.addEventListener("change", calc);
    calc();
  }

  /* ---------- вычет ---------- */
  var VYCHET_LIMITS = {
    social: 150000,      // лечение, обучение, спорт — общий лимит
    flat: 2000000,       // покупка жилья
    mortgage: 3000000,   // проценты по ипотеке
    charity: 0
  };

  function vychet() {
    var form = $("vychet-form");
    if (!form) return;
    function calc() {
      var typeEl = $("vychet-type");
      var type = typeEl ? typeEl.value : "social";
      var spent = Math.max(0, num("vychet-sum", 0));
      var paid = Math.max(0, num("vychet-paid", 0));
      var expensive = $("vychet-expensive") && $("vychet-expensive").checked;

      var limit = VYCHET_LIMITS[type] || 0;
      if (type === "social" && expensive) limit = 0; // дорогостоящее лечение — без лимита
      var base = limit > 0 ? Math.min(spent, limit) : spent;
      var back = base * 0.13;
      if (paid > 0 && back > paid) back = paid;

      put("vychet-base", money(base));
      put("vychet-back", money(back));
      var note = $("vychet-note");
      if (note) {
        if (limit > 0 && spent > limit) {
          note.textContent = "Расходы выше лимита: к вычету принимается только " + money(limit) + ".";
        } else if (paid > 0 && base * 0.13 > paid) {
          note.textContent = "Возврат ограничен уплаченным НДФЛ за год — " + money(paid) + ".";
        } else {
          note.textContent = "Это оценка: точную сумму считает ФНС по вашей декларации.";
        }
      }
      var exp = $("vychet-expensive-wrap");
      if (exp) exp.hidden = type !== "social";
    }
    form.addEventListener("input", calc);
    form.addEventListener("change", calc);
    calc();
  }

  /* ---------- инициализация ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    nds();
    ndfl();
    vychet();

    var buttons = document.querySelectorAll("[data-goal-kalk]");
    Array.prototype.forEach.call(buttons, function (b) {
      b.addEventListener("click", function () { goal(b.getAttribute("data-goal-kalk")); });
    });
  });
})();
