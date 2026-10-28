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
  netlify.toml                                заголовки безопасности и кэш статики
  _redirects                                  короткие адреса (/zayavka, /proverka-cheka-po-qr)
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

## Публикация (бесплатно)

Пошаговая инструкция для домена `chekhub.ru`: `Софт 2026\КАК_ОПУБЛИКОВАТЬ.md`.

1. **Netlify Drop** (проще всего) — https://app.netlify.com/drop, перетащить `chekhub_site.zip`
   (собирается `_tools\_build_site_zip.py`), затем привязать домен и прописать A-запись
   `75.2.60.5` + CNAME `www` в DNS-панели регистратора.
2. **Cloudflare Pages** — «Create project → Direct upload», загрузить папку `сайт_чеки`;
   домен подключается переводом NS на Cloudflare.
3. **Vercel** — то же самое, «Add New → Project», папка с `index.html`.
4. **GitHub Pages** — если заведём репозиторий.

Архив для загрузки: `python _tools\_build_site_zip.py` → `Софт 2026\chekhub_site.zip`
(логи и служебные файлы в архив не попадают).

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
в скрытое поле `plan` (оно есть в форме Netlify — по нему видно расчёт клиента).

Без параметров страница работает как раньше: плашка скрыта, поля пустые.
Параметры читаются только на форме `zayavka`, короткая `zayavka-quick`
(на странице инструмента) — не трогается.

## Заголовки, кэш и 404

`netlify.toml`: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`,
`Permissions-Policy`; `assets/*` — `max-age=3600, must-revalidate`, HTML — `max-age=0`.
Год у ассетов ставить нельзя: имена файлов без хэшей, иначе правки `app.js` не долетят
до вернувшихся посетителей.

`404.html` отдаётся на любой несуществующий адрес. Внутри — абсолютные пути (`/zayavka.html`),
поэтому страница работает и на вложенных адресах. `_site_check.py` научен разрешать такие
ссылки от корня сайта. Липкая кнопка «Заявка» в `app.js` тоже строит абсолютный адрес
`/zayavka.html` — иначе на вложенном 404 (`/foo/bar`) она вела бы на `/foo/zayavka.html`.

Короткие адреса (`_redirects`): `/zayavka`, `/proverka-cheka-po-qr`, `/articles/index.html` → `/articles/`.

Правило `/articles → /articles/` с флагом `301!` **даёт петлю** (Netlify сам нормализует папки,
а форс-редирект зацикливает внутренний rewrite на `index.html`). Поэтому для статей оставлено
только правило с `index.html`.

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

- Короткие адреса из `_redirects` (`/zayavka`, `/uslugi`, `/proverka-cheka-po-qr`) на GitHub Pages
  не работают: серверных 301 там нет. Вместо них — папки (`zayavka/index.html` и т.п.) с
  `meta refresh` + `canonical` + `noindex`; плюс сам GitHub добавляет 301 `/zayavka` → `/zayavka/`.
- `.nojekyll` отключает сборку через Jekyll — файлы отдаются как есть.
- `netlify.toml` и `_redirects` оставлены как справка (заголовки безопасности, правила Netlify).
  На GitHub Pages заголовки из `netlify.toml` **не применяются**.
- Почта домена (`MX` Timeweb) и подтверждения Вебмастера/GSC живут в DNS Timeweb и переезда не заметили.

## Ограничения прототипа

- Заявка открывает Telegram: если у клиента нет мессенджера, остаются почта и ссылка «Открыть чат вручную» (веб-версия).
- Калькулятор считает по формуле из `config.js`: это ориентир, а не оферта.
- Статьи написаны как черновики для SEO-структуры: перед публикацией стоит проверить факты
  по актуальным интерфейсам ОФД.
