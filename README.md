# Прототип сайта «ЧекХаб» (рабочее название)

Статический сайт без сборки и зависимостей: чистые HTML + CSS + JS. Открывается двойным кликом
или через локальный сервер.

## Что внутри

```
сайт_чеки/
  index.html                                  главная (оффер, услуги, калькулятор, кейс)
  uslugi.html                                 услуги, цены, калькулятор, FAQ
  lichnyj-kabinet-ofd.html                    справочник: кабинеты ОФД и выгрузка чеков
  chto-takoe-ofd.html                         статья: что такое ОФД простыми словами
  proverka-cheka-po-qr.html                   инструмент: разбор QR-кода чека + форма заявки
  zayavka.html                                форма заявки (уходит в Telegram)
  politika.html                               политика обработки данных (noindex)
  404.html                                    своя страница «не найдено» (noindex, абсолютные ссылки)
  ai-katalog.html                             витрина ИИ-сервисов (карточки, фильтр по задачам)
  uslugi/index.html                           заглушка: meta refresh → /uslugi.html (noindex)
  zayavka/index.html                          заглушка: meta refresh → /zayavka.html (noindex)
  proverka-cheka-po-qr/index.html             заглушка: meta refresh → /proverka-cheka-po-qr.html (noindex)
  CNAME                                       домен chekhub.ru для GitHub Pages
  .nojekyll                                   отключает сборку Jekyll на GitHub Pages
  files/
    example-vygruzka-chekov.csv                пример файла выгрузки (тестовые данные)
  articles/
    index.html                                каталог инструкций
    kak-vygruzit-cheki-iz-ofd-v-excel.html    статья №1 (выгрузка в Excel)
    kak-vygruzit-cheki-iz-ofd-v-1s.html       статья №2 (выгрузка в 1С)
    kak-vygruzit-cheki-iz-platformy-ofd.html  статья №3 (Платформа ОФД)
    kak-vygruzit-cheki-iz-ofd-s-poziciyami.html  статья №4 (чеки с позициями)
    kak-vygruzit-cheki-iz-ofd-za-mesyac.html     статья №5 (выгрузка за месяц)
    kak-vygruzit-cheki-iz-takskom-ofd.html       статья №6 (ОФД Такском)
    kak-vygruzit-cheki-iz-1-ofd.html             статья №7 (Первый ОФД)
  assets/
    style.css                                 все стили
    app.js                                    меню, подстановка контактов, калькулятор, префилл заявки
    config.js                                 НАСТРОЙКИ: название, Telegram, почта, цены
    ai_services.json                          данные каталога ИИ-сервисов (24 карточки)
    og-cover.png                              превью ссылок 1200×630 (основное)
    og-qr.png                                 превью ссылок 1200×630 (для страницы инструмента)
    bg.webp                                   фон
  favicon.svg
  robots.txt
  sitemap.xml
```

## Что менять перед запуском (файл `assets/config.js`)

| Поле | Текущее значение |
|---|---|
| `name` | ЧекХаб |
| `telegram` / `telegramLabel` | `https://t.me/CheckHab` / `@CheckHab` |
| `email` | `startq182@gmail.com` |
| `site` | `https://chekhub.ru` (домен; при смене домена заменить ещё в `sitemap.xml`, `robots.txt` и в `canonical` на всех страницах) |
| `price.*` | база 1 500 ₽, +500 ₽ за кассу, +15 % за месяц, +1 500 ₽ за 1С, ×1,5 срочность |

Остальное подхватится автоматически по всему сайту (`data-site-name`, `data-tg`, `data-email`).

## Как посмотреть локально

```powershell
cd "C:\Users\marsf\Desktop\Порядок\Софт 2026\сайт_чеки"
python -m http.server 8080
# затем открыть http://localhost:8080
```

Проверка всех ссылок и мета-тегов:

```powershell
python "C:\Users\marsf\Desktop\Порядок\Софт 2026\_tools\_site_check.py"
```

Функциональные тесты (headless Chrome, локальный сервер):

```powershell
python "...\_tools\_qr_tool_test.py"        # разбор QR + форма заявки
python "...\_tools\_prefill_og_test.py"     # OG-теги, префилл из калькулятора, 404
```

Проверка живого сайта после деплоя:

```powershell
python "...\_tools\_post_deploy_check.py"   # заголовки, 404, редиректы, OG-картинки, поля формы
python "...\_tools\_live_prefill_test.py"   # калькулятор → форма на chekhub.ru
```

Проверка свободных доменов (WHOIS реестров):

```powershell
python "C:\Users\marsf\Desktop\Порядок\Софт 2026\_tools\_domain_check.py" --names chekhub,chekhab,checkhab --tlds ru,com,site,online,store,tech,xyz
```

Результат: `_tools\domain_out\domains.csv`.

## Публикация: GitHub Pages (текущая схема)

- Репозиторий: `https://github.com/irek98/chekhub-site` — ветка `main`, корень (`/`).
- Домен: `chekhub.ru` (файл `CNAME`), HTTPS от GitHub с принудительным перенаправлением
  (`Enforce HTTPS` включён).
- Переезд с Netlify (октябрь 2026): у бесплатного тарифа закончились кредиты сборок
  (300 кредитов, по 15 за прод-деплой), новые деплои блокируются до 22-го числа.

**Как обновить сайт:** поправить файлы в `сайт_чеки` → `git add -A`, `git commit`,
`git push` → через 30–60 секунд сайт обновлён. Лимитов на число публикаций нет.

**DNS (панель Timeweb, домен на NS Timeweb, TTL 600):**

| Тип | Хост | Значение |
|---|---|---|
| A | `@` | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` |
| CNAME | `www` | `irek98.github.io` |

`MX` (mx1/mx2.timeweb.ru), `SPF` и TXT-подтверждения Google/Яндекса остались прежними —
почта и права в вебмастерах переезд не заметили.

**Первичная настройка (если репозиторий пересоздаётся):**

```powershell
gh repo create chekhub-site --public --source=. --remote=origin --push
gh api -X POST repos/irek98/chekhub-site/pages -f 'source[branch]=main' -f 'source[path]=/'
# сертификат выпускается сам за 10–40 минут, проверить: gh api repos/irek98/chekhub-site/pages
gh api -X PUT repos/irek98/chekhub-site/pages -F 'https_enforced=true'
```

**Другие бесплатные варианты, если GitHub не подойдёт:** Cloudflare Pages (прямая загрузка
папки, домен — переводом NS), Vercel («Add New → Project»), Netlify Drop (архив собирается
`python _tools\_build_site_zip.py` → `Софт 2026\chekhub_site.zip`).

## После публикации

1. Яндекс Вебмастер: добавить сайт, подтвердить права, отправить `sitemap.xml`.
2. Яндекс Метрика: создать счётчик, вставить код на все страницы, настроить цели
   (клик по Telegram, кнопка «Отправить в Telegram» в калькуляторе).
3. Проверить скорость и мобильную версию.
4. Дальше — добавлять по 1–2 инструкции в неделю по запросам из замера спроса
   (`AI-СВЯЗЬ\П2_САЙТ.md`, раздел «Спрос по запросам»).

## Превью ссылок (Open Graph)

На всех 15 рабочих страницах (теги ставит скрипт) и на `404.html` (прописаны вручную) есть
`og:type/site_name/locale/url/title/description/image` и `twitter:card`.
Картинки 1200×630 рисуются скриптом в стиле сайта (тёмный фон, акцент `#2f7cf6 → #16c2b0`, Segoe UI):

```powershell
python "...\_tools\_make_og.py"     # → assets\og-cover.png, assets\og-qr.png
python "...\_tools\_add_og.py"      # проставить теги во все страницы (идемпотентно)
python "...\_tools\_add_og.py" --dry    # показать, что изменится, без записи
```

Что важно:

1. `og:url` берётся из `canonical`, `og:title` — из `<title>` (без хвоста «| ЧекХаб»),
   `og:description` — из `meta description` (обрезается до 200 символов).
2. `og:type = article` только у статей в `articles/`, у остальных `website`.
3. Страница инструмента использует `og-qr.png`, все остальные — `og-cover.png`.
4. Правишь заголовок/описание страницы — прогони `_add_og.py --force`, иначе `og:*`
   останутся старыми (скрипт по умолчанию ничего не дублирует).

## Префилл заявки из калькулятора

Кнопка «Заявка формой» в калькуляторе ведёт не на пустую форму, а на
`/zayavka.html?kass=3&months=2&format=1c&urgent=1&sum=6600&from=/uslugi.html`.
На странице заявки `assets/app.js` подставляет кассы, формат и текст задачи,
показывает плашку «Подставил данные из калькулятора» и пишет ориентир по цене
в скрытое поле `plan` — по нему в сообщении видно расчёт клиента.

Без параметров страница работает как раньше: плашка скрыта, поля пустые.
Параметры читаются только на форме `zayavka`, короткая `zayavka-quick`
(на странице инструмента) — не трогается.

## Заголовки, кэш и 404

На GitHub Pages своих заголовков задать нельзя: `Cache-Control: max-age=600` для всех файлов,
заголовков безопасности (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`,
`Permissions-Policy`) нет. Старый `netlify.toml` с ними удалён 28.10.2026 — нужны заголовки,
значит перед сайтом ставится Cloudflare (прокси), иначе никак. Практический риск невелик:
сайт статический, без форм-приёмников и без чужих скриптов; `Referrer-Policy` в Chrome и Firefox
по умолчанию и так `strict-origin-when-cross-origin`.

`max-age=600` (10 минут) для `app.js` и `style.css` терпимо: файлы без хэшей в имени, но правки
долетают максимум за 10 минут. Год у ассетов ставить нельзя в любом случае.

`404.html` отдаётся на любой несуществующий адрес. Внутри — абсолютные пути (`/zayavka.html`),
поэтому страница работает и на вложенных адресах. `_site_check.py` научен разрешать такие
ссылки от корня сайта. Липкая кнопка «Заявка» в `app.js` тоже строит абсолютный адрес
`/zayavka.html` — иначе на вложенном 404 (`/foo/bar`) она вела бы на `/foo/zayavka.html`.

Короткие адреса: `/uslugi`, `/zayavka`, `/proverka-cheka-po-qr` — папки с `index.html`
(`meta refresh` на нужную страницу + `canonical` + `noindex`), потому что серверных 301
на GitHub Pages нет. GitHub сам добавляет 301 `/uslugi` → `/uslugi/`. Старый `_redirects`
(Netlify) удалён 28.10.2026 вместе с `netlify.toml`.

## Формы заявок (уходят в Telegram)

Бэкенда нет: `assets/app.js` (класс `.lead-form`) собирает поля формы в текст и открывает
`t.me/CheckHab?text=…` с уже заполненным сообщением. Отправку подтверждает человек — данные
не проходят через сторонние сервисы.

| Форма | Где | Поля |
|---|---|---|
| `zayavka` | `/zayavka.html` | имя, контакт, ОФД, кассы, период, формат, задача, согласие + скрытые `source`, `plan` |
| `zayavka-quick` | `/proverka-cheka-po-qr.html` | имя, контакт, задача, согласие |

Что важно при правках:

1. Обработчик цепляется к классу `.lead-form`, а не к атрибуту: форм две, разметка общая.
2. Скрытые поля `source` (из `?from=` или referrer) и `plan` (расчёт калькулятора) попадают в текст сообщения.
3. Поле `bot-field` — ловушка для ботов: если оно заполнено, форма показывает «отправлено», но Telegram не открывается.
4. В `.form-status` после отправки появляется ссылка «Открыть чат вручную» — на случай блокировки всплывающего окна.
5. Подписи полей для сообщения — объект `LABELS` в `app.js`; новый `name` поля без записи в `LABELS` уйдёт как есть.

## Хостинг: GitHub Pages

Домен `chekhub.ru` указывает на GitHub Pages (файл `CNAME`). Публикация — коммит в `main`,
через 30–60 секунд сайт обновлён; лимитов на число деплоев нет.

- Короткие адреса (`/zayavka`, `/uslugi`, `/proverka-cheka-po-qr`) — папки с `index.html`
  (`meta refresh` + `canonical` + `noindex`): серверных 301 на Pages нет, сам GitHub добавляет
  301 `/zayavka` → `/zayavka/`.
- `.nojekyll` отключает сборку через Jekyll — файлы отдаются как есть.
- Заголовки из старого `netlify.toml` на Pages не применяются, сам файл удалён 28.10.2026
  вместе с `_redirects`; проект Netlify `luxury-cajeta-c04e42` тоже удалён.
- Домен подтверждён в аккаунте GitHub: TXT `_github-pages-challenge-irek98.chekhub.ru`
  в DNS Timeweb (TTL 600) — защита от публикации чужого репозитория на нашем домене.
- Почта домена (`MX` Timeweb) и подтверждения Вебмастера/GSC живут в DNS Timeweb и переезда не заметили.

## Ограничения прототипа

- Заявка открывает Telegram: если у клиента нет мессенджера, остаются почта и ссылка «Открыть чат вручную» (веб-версия).
- Калькулятор считает по формуле из `config.js`: это ориентир, а не оферта.
- Статьи написаны как черновики для SEO-структуры: перед публикацией стоит проверить факты
  по актуальным интерфейсам ОФД.
