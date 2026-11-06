/* ЧекХаб — поиск по сайту. Свой индекс, без внешних сервисов и библиотек.
 *
 * Индекс собирает `_tools\promo\_st_search.py` в /assets/search-index.json:
 *   [{ "u": "/articles/x.html", "t": "Заголовок", "k": "Инструкция",
 *      "d": "описание страницы", "h": "заголовки h2 и h3", "x": "первые ~1400 символов текста" }]
 *
 * Как ищем:
 *   1) нормализуем строки: нижний регистр, ё→е, всё кроме букв/цифр — в пробел;
 *   2) слово запроса совпадает с словом страницы точно или «по началу» (чек → чеков,
 *      выгрузка → выгрузки) — стеммера нет, для русского этого достаточно;
 *   3) вес: заголовок страницы важнее подзаголовков, подзаголовки важнее описания,
 *      описание важнее текста; сортируем по сумме, показываем первые 20.
 *
 * Адрес страницы поиска можно копировать: ?q=выгрузка сразу открывает результат.
 */
(function () {
  var INDEX_URL = "/assets/search-index.json";
  var LIMIT = 20;

  var input = document.getElementById("site-search");
  var results = document.getElementById("search-results");
  var status = document.getElementById("search-status");
  if (!input || !results || !status) return;

  var docs = null;
  var loadError = false;

  function norm(s) {
    return (s || "").toLowerCase().replace(/ё/g, "е").replace(/[^0-9a-zа-я]+/g, " ").trim();
  }

  function tokens(s) {
    var n = norm(s);
    return n ? n.split(" ") : [];
  }

  function esc(s) {
    return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* совпало ли слово страницы со словом запроса: точное / по началу */
  function hit(docWord, qWord) {
    if (docWord === qWord) return 2;
    if (qWord.length >= 4 && docWord.length >= 4) {
      if (docWord.indexOf(qWord) === 0 || qWord.indexOf(docWord) === 0) return 1;
    }
    return 0;
  }

  /* лучший вес одного слова запроса по всем полям страницы */
  function weight(doc, qWord) {
    var fields = [[doc._t, 12, 8], [doc._h, 7, 5], [doc._d, 4, 3], [doc._x, 2, 1.5]];
    var best = 0;
    for (var f = 0; f < fields.length; f++) {
      var words = fields[f][0], full = fields[f][1], part = fields[f][2];
      for (var i = 0; i < words.length; i++) {
        var h = hit(words[i], qWord);
        if (h) {
          var w = h === 2 ? full : part;
          if (w > best) best = w;
          if (best === full) break;
        }
      }
      if (best === full) break;
    }
    return best;
  }

  function score(doc, qWords) {
    var sum = 0, found = 0;
    for (var i = 0; i < qWords.length; i++) {
      var w = weight(doc, qWords[i]);
      if (w > 0) { found++; sum += w; }
    }
    return { sum: sum, found: found };
  }

  /* выделяем в готовом тексте все слова запроса (только целые слова и начала слов) */
  function mark(text, qWords) {
    var safe = esc(text);
    if (!qWords.length) return safe;
    var parts = safe.split(/(<[^>]+>)/); /* на случай уже вставленных тегов */
    var re = new RegExp("(" + qWords.map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|") + ")", "gi");
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].charAt(0) === "<") continue;
      parts[i] = parts[i].replace(re, "<mark>$1</mark>");
    }
    return parts.join("");
  }

  /* кусок текста вокруг первого совпадения: сначала основной текст, потом описание,
     потом заголовки (иначе при совпадении только в подзаголовке сниппет был бы «мимо») */
  function snippet(doc, qWords) {
    var sources = [doc.x, doc.d, doc.h];
    for (var s = 0; s < sources.length; s++) {
      var text = sources[s] || "";
      if (!text) continue;
      var low = text.toLowerCase();
      var pos = -1;
      for (var i = 0; i < qWords.length && pos < 0; i++) pos = low.indexOf(qWords[i]);
      if (pos < 0) {
        if (s === sources.length - 1) return text.slice(0, 180).trim() + "…";
        continue;
      }
      var start = Math.max(0, pos - 70);
      var end = Math.min(text.length, pos + 130);
      return (start > 0 ? "…" : "") + text.slice(start, end).trim() + (end < text.length ? "…" : "");
    }
    return "";
  }

  /* раздел статьи, который ближе всего к запросу: ссылка ведёт сразу к нему,
     а не к началу страницы (id разделов ставит `_st_search.py --anchors`) */
  function anchorOf(doc, qWords) {
    var secs = doc.s || [];
    var best = "", bestScore = 0;
    for (var i = 0; i < secs.length; i++) {
      var words = tokens(secs[i][1]);
      var sc = 0;
      for (var q = 0; q < qWords.length; q++) {
        for (var w = 0; w < words.length; w++) {
          var h = hit(words[w], qWords[q]);
          if (h === 2) { sc += 2; break; }
          if (h === 1) sc += 1;
        }
      }
      if (sc > bestScore) { bestScore = sc; best = secs[i][0]; }
    }
    return best ? "#" + best : "";
  }

  function item(doc, qWords) {
    return '<a class="article-item search-hit" href="' + esc(doc.u + anchorOf(doc, qWords)) + '">' +
      '<span class="search-kind">' + esc(doc.k || "Страница") + '</span>' +
      '<h3>' + mark(doc.t, qWords) + '</h3>' +
      '<p>' + mark(snippet(doc, qWords), qWords) + '</p>' +
      '</a>';
  }

  /* частые запросы: показываем, когда пользователь ещё ничего не ввёл
     или когда по запросу ничего не нашлось — чтобы не оставлять пустой экран */
  var POPULAR = ["выгрузка в excel", "1С", "за месяц", "Астрал", "возврат", "с позициями", "ОФД не отдаёт"];

  function popular() {
    return '<p class="search-empty">' + POPULAR.map(function (p) {
      return '<a class="btn btn-ghost" href="/search.html?q=' + encodeURIComponent(p) + '">' + esc(p) + '</a>';
    }).join(" ") + '</p>';
  }

  function render(list, total, qWords, q, partial) {
    if (!list.length) {
      status.textContent = "По запросу «" + q + "» ничего не нашлось. Попробуйте другое слово — например одно из частых:";
      results.innerHTML = popular() +
        '<p class="small muted" style="margin:14px 0 0">' +
        '<a href="/articles/">Все инструкции</a> · <a href="/kalkulyatory/">Калькуляторы</a> · ' +
        '<a href="/zayavka.html">Оставить заявку</a></p>';
      return;
    }
    var head = "Найдено: " + total + " по запросу «" + q + "»";
    if (total > list.length) head += " — показываю первые " + list.length;
    if (partial) head += " · есть только частичные совпадения";
    status.textContent = head;
    results.innerHTML = list.map(function (doc) { return item(doc, qWords); }).join("");
  }

  function run(q) {
    var qWords = tokens(q).filter(function (w) { return w.length >= 2 || /^\d/.test(w); });
    if (!docs) {
      if (loadError) status.textContent = "Индекс поиска не загрузился — список всех страниц ниже, на этой же странице.";
      return;
    }
    if (!qWords.length) {
      results.innerHTML = popular();
      status.textContent = "Введите слово — например «Астрал», «1С» или «возврат». Или начните с частого запроса:";
      return;
    }
    var scored = docs.map(function (d) {
      var r = score(d, qWords);
      return { doc: d, sum: r.sum, found: r.found };
    });
    var strict = scored.filter(function (x) { return x.found === qWords.length; });
    var partial = false;
    if (!strict.length) { strict = scored.filter(function (x) { return x.found > 0; }); partial = true; }
    strict.sort(function (a, b) { return b.sum - a.sum; });
    render(strict.slice(0, LIMIT).map(function (x) { return x.doc; }), strict.length, qWords, q, partial);
  }

  /* адрес можно скопировать и отправить: /search.html?q=астрал */
  function syncUrl(q) {
    try {
      var url = new URL(window.location.href);
      if (q) url.searchParams.set("q", q); else url.searchParams.delete("q");
      history.replaceState(null, "", url.pathname + (url.search || ""));
    } catch (e) { /* старый браузер — не страшно */ }
  }

  /* в Метрику пишем сам запрос: по нему видно, чего на сайте не хватает.
     Заодно один раз за визит шлём цель search_submit — это «человек
     воспользовался поиском», по ней видно, растёт ли спрос на поиск. */
  var goalSent = false;
  function track(q) {
    if (!q || typeof window.ym !== "function") return;
    try { window.ym(113762680, "params", { search_query: q }); } catch (e) { /* мимо */ }
    if (goalSent) return;
    goalSent = true;
    try { window.ym(113762680, "reachGoal", "search_submit", { search_query: q }); } catch (e) { /* мимо */ }
  }

  var timer = null;
  function searchNow() {
    var q = input.value.trim();
    run(q);
    syncUrl(q);
  }

  input.addEventListener("input", function () {
    clearTimeout(timer);
    timer = setTimeout(searchNow, 150);
  });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      input.value = "";
      searchNow();
    }
  });
  var form = input.form;
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearTimeout(timer);
      searchNow();
      track(input.value.trim());
    });
  }
  /* клик по результату — тоже «воспользовался поиском»:
     без Enter человек не попадёт в цель, а переход к статье и есть польза */
  results.addEventListener("click", function (e) {
    var t = e.target;
    while (t && t !== results && !(t.className && String(t.className).indexOf("search-hit") >= 0)) t = t.parentNode;
    if (t && t !== results) track(input.value.trim());
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    e.preventDefault();
    input.focus();
  });

  /* загрузка индекса */
  status.textContent = "Загружаю индекс поиска…";
  fetch(INDEX_URL, { cache: "no-store" }).then(function (res) {
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }).then(function (data) {
    docs = (data && data.pages) || data || [];
    docs.forEach(function (d) {
      d._t = tokens(d.t);
      d._h = tokens(d.h);
      d._d = tokens(d.d);
      d._x = tokens(d.x);
    });
    var q = "";
    try { q = new URL(window.location.href).searchParams.get("q") || ""; } catch (e) { q = ""; }
    if (q) {
      input.value = q;
      run(q);
      track(q);
    } else {
      status.textContent = "Индекс готов: " + docs.length + " страниц. Введите слово — например «Астрал», «1С» или «возврат».";
    }
  }).catch(function () {
    loadError = true;
    status.textContent = "Индекс поиска не загрузился (нет файла или вы открыли страницу без сервера). Список всех страниц — ниже.";
  });
})();
