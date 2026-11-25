/* Разбор файла электронной подписи (.sig / .p7s) прямо в браузере.
   Файл никуда не отправляется: всё читается через FileReader и разбирается локально.
   Криптографическую проверку подписи скрипт НЕ делает — для этого нужны Госуслуги,
   Контур.Крипто или КриптоПро (браузер не умеет ГОСТ). */
(function () {
  'use strict';

  var OID = {
    '1.2.840.113549.1.7.2': 'signedData (CMS/PKCS#7)',
    '1.2.840.113549.1.7.1': 'data',
    '1.2.840.113549.1.9.3': 'contentType',
    '1.2.840.113549.1.9.4': 'messageDigest (хеш документа)',
    '1.2.840.113549.1.9.5': 'signingTime (время подписания)',
    '1.2.840.113549.1.9.6': 'countersignature',
    '1.2.840.113549.1.1.1': 'RSA',
    '1.2.840.113549.1.1.11': 'sha256WithRSA',
    '1.2.840.113549.1.1.5': 'sha1WithRSA',
    '1.2.840.10045.4.3.2': 'ecdsa-with-SHA256',
    '1.2.643.2.2.19': 'ГОСТ Р 34.11-94 (хеш)',
    '1.2.643.2.2.3': 'ГОСТ Р 34.10-2001 (подпись)',
    '1.2.643.2.2.20': 'ГОСТ 28147-89 (шифр)',
    '1.2.643.7.1.1.1.1': 'ГОСТ 2012, параметры 512',
    '1.2.643.7.1.1.1.2': 'ГОСТ 2012, параметры 256',
    '1.2.643.7.1.1.2.2': 'ГОСТ Р 34.11-2012, 256 бит (хеш)',
    '1.2.643.7.1.1.2.3': 'ГОСТ Р 34.11-2012, 512 бит (хеш)',
    '1.2.643.7.1.1.3.2': 'ГОСТ Р 34.10-2012, 256 бит (подпись)',
    '1.2.643.7.1.1.3.1': 'ГОСТ Р 34.10-2012, 512 бит (подпись)',
    '1.2.840.113549.1.9.16.2.47': 'signingCertificateV2',
    '1.2.643.100.1': 'ОГРН',
    '1.2.643.100.3': 'СНИЛС',
    '1.2.643.3.131.1.1': 'ИНН',
    '1.2.643.100.4': 'ИНН физлица',
    '2.5.4.3': 'CN (имя)',
    '2.5.4.4': 'SN (фамилия)',
    '2.5.4.5': 'serialNumber',
    '2.5.4.6': 'C (страна)',
    '2.5.4.7': 'L (город)',
    '2.5.4.8': 'ST (регион)',
    '2.5.4.9': 'street',
    '2.5.4.10': 'O (организация)',
    '2.5.4.11': 'OU (подразделение)',
    '2.5.4.12': 'title (должность)',
    '1.2.840.113549.1.9.1': 'emailAddress',
    '1.2.643.3.141.1.1': 'РН ККТ'
  };
  var NAME_KEYS = ['CN', 'O', 'OU', 'SN', 'title', 'C', 'ST', 'L', 'ИНН', 'СНИЛС', 'ОГРН',
                   'ИНН физлица', 'emailAddress', 'РН ККТ', 'street', 'serialNumber'];

  // ---------- ASN.1 BER/DER ----------
  function tlv(bytes, pos) {
    var tag = bytes[pos++];
    if (pos >= bytes.length) throw new Error('обрезанный файл');
    var len = bytes[pos++];
    if (len & 0x80) {
      var n = len & 0x7f;
      len = 0;
      for (var i = 0; i < n; i++) len = len * 256 + bytes[pos++];
    }
    if (pos + len > bytes.length) throw new Error('длина ASN.1 больше файла');
    return { tag: tag, cls: tag >> 6, num: tag & 0x1f, constructed: (tag & 0x20) !== 0,
             start: pos, end: pos + len, next: pos + len };
  }

  function children(bytes, node) {
    var out = [], pos = node.start;
    while (pos < node.end) {
      var t = tlv(bytes, pos);
      out.push(t);
      pos = t.next;
      if (t.next <= t.start) break;
    }
    return out;
  }

  function oid(bytes, node) {
    var b = bytes.subarray(node.start, node.end);
    if (!b.length) return '';
    var first = Math.floor(b[0] / 40), second = b[0] % 40;
    var parts = [first, second], v = 0;
    for (var i = 1; i < b.length; i++) {
      v = v * 128 + (b[i] & 0x7f);
      if (!(b[i] & 0x80)) { parts.push(v); v = 0; }
    }
    return parts.join('.');
  }

  function oidName(o) {
    return OID[o] || o;
  }

  function oidShort(o) {
    var name = OID[o];
    if (!name) return o;
    return name.replace(/\s*\(.*\)$/, '');
  }

  function oidFull(o) {
    var name = OID[o];
    return name ? name + ' (' + o + ')' : o;
  }

  function text(bytes, node) {
    var b = bytes.subarray(node.start, node.end);
    if (node.tag === 0x1e) { // BMPString — UTF-16BE
      var s = '';
      for (var i = 0; i + 1 < b.length; i += 2) s += String.fromCharCode((b[i] << 8) | b[i + 1]);
      return s;
    }
    // UTF8String, PrintableString, IA5String, T61String: в российских сертификатах
    // в T61String часто лежит обычный UTF-8 — пробуем строго, иначе latin1
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(b);
    } catch (e) {
      var out = '';
      for (var j = 0; j < b.length; j++) out += String.fromCharCode(b[j]);
      return out;
    }
  }


  function intVal(bytes, node) {
    var hex = '';
    for (var i = node.start; i < node.end; i++) hex += ('0' + bytes[i].toString(16)).slice(-2);
    return hex.replace(/^00+/, '') || '0';
  }

  function intDecimal(bytes, node) {
    var v = 0;
    for (var i = node.start; i < node.end; i++) v = v * 256 + bytes[i];
    return String(v);
  }

  function timeVal(bytes, node) {
    var s = text(bytes, node).replace(/[^0-9Z+\-]/g, '');
    var m;
    // формат для читателя: 20.11.2026 08:54:15 (ISO 2026-11-20 08:54:15 читается хуже)
    if (node.tag === 0x17 && (m = /^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?Z?$/.exec(s))) {
      var yy = parseInt(m[1], 10);
      var year = yy < 50 ? 2000 + yy : 1900 + yy;
      return m[3] + '.' + m[2] + '.' + year + ' ' + m[4] + ':' + m[5] + ':' + (m[6] || '00');
    }
    if (node.tag === 0x18 && (m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?Z?$/.exec(s))) {
      return m[3] + '.' + m[2] + '.' + m[1] + ' ' + m[4] + ':' + m[5] + ':' + (m[6] || '00');
    }
    return text(bytes, node);
  }

  function nameParts(bytes, node) {
    var out = [];
    children(bytes, node).forEach(function (rdnSet) {
      children(bytes, rdnSet).forEach(function (atv) {
        var kv = children(bytes, atv);
        if (kv.length < 2) return;
        var key = oidShort(oid(bytes, kv[0]));
        var val = kv[1].tag === 0x06 ? oidShort(oid(bytes, kv[1])) : text(bytes, kv[1]);
        out.push([key, val]);
      });
    });
    return out;
  }

  function nameString(parts, keys) {
    var want = keys || NAME_KEYS;
    var picked = [];
    want.forEach(function (k) {
      parts.forEach(function (p) {
        if (p[0].indexOf(k) === 0 && picked.indexOf(p[1]) === -1) picked.push(p[1]);
      });
    });
    return picked.length ? picked.slice(0, 4) : parts.slice(0, 3).map(function (p) { return p[0]; });
  }

  // ---------- CMS / PKCS#7 ----------
  function parseCertificate(bytes, node) {
    var tbs = children(bytes, node)[0];
    if (!tbs) return null;
    var f = children(bytes, tbs), cert = { raw: node };
    var idx = 0;
    if (f[idx] && f[idx].cls === 2 && f[idx].num === 0) idx++; // version [0]
    cert.serial = intVal(bytes, f[idx]);
    idx++;
    idx++; // signature algorithm
    cert.issuer = nameParts(bytes, f[idx] || {start: 0, end: 0});
    idx++;
    var validity = f[idx] || {start: 0, end: 0};
    var v = children(bytes, validity);
    cert.notBefore = v[0] ? timeVal(bytes, v[0]) : '';
    cert.notAfter = v[1] ? timeVal(bytes, v[1]) : '';
    idx++;
    cert.subject = nameParts(bytes, f[idx] || {start: 0, end: 0});
    return cert;
  }

  function parseSignedData(bytes, node) {
    var top = children(bytes, node);
    // ContentInfo SEQUENCE { contentType OID, content [0] EXPLICIT }
    var contentType = top[0] ? oid(bytes, top[0]) : '';
    var wrapper = top[1];
    if (!wrapper) throw new Error('нет содержимого ContentInfo');
    var sd = children(bytes, wrapper)[0];
    if (!sd) throw new Error('пустой signedData');
    var f = children(bytes, sd);
    var i = 0;
    var res = { contentType: contentType, version: f[i] ? intDecimal(bytes, f[i]) : '1', certs: [], signers: [] };
    i++;
    res.digestAlgs = [];
    if (f[i] && f[i].num === 17) {
      children(bytes, f[i]).forEach(function (alg) {
        var a = children(bytes, alg);
        res.digestAlgs.push(a[0] ? oidFull(oid(bytes, a[0])) : '?');
      });
      i++;
    }
    // encapContentInfo
    var eci = f[i];
    if (eci) {
      var ec = children(bytes, eci);
      res.eContentType = ec[0] ? oidName(oid(bytes, ec[0])) : '';
      res.hasContent = false;
      for (var k = 1; k < ec.length; k++) {
        if (ec[k].cls === 2 && ec[k].num === 0) {
          var inner = children(bytes, ec[k]);
          res.hasContent = !!(inner[0] && inner[0].end > inner[0].start);
          if (inner[0] && inner[0].tag === 0x04) res.contentSize = inner[0].end - inner[0].start;
        }
      }
      i++;
    }
    // certificates [0] IMPLICIT
    for (; i < f.length; i++) {
      if (f[i].cls === 2 && f[i].num === 0) {
        children(bytes, f[i]).forEach(function (c) {
          try { var cert = parseCertificate(bytes, c); if (cert) res.certs.push(cert); } catch (e) {}
        });
      } else if (f[i].cls === 2 && f[i].num === 1) {
        // signerInfos [1]? в CMS это SET OF, встречается и так
        children(bytes, f[i]).forEach(function (si) { parseSigner(bytes, si, res); });
      } else if (f[i].tag === 0x31) {
        children(bytes, f[i]).forEach(function (si) { parseSigner(bytes, si, res); });
      }
    }
    return res;
  }

  function parseSigner(bytes, node, res) {
    var f = children(bytes, node), si = { attrs: [] };
    var i = 0;
    si.version = f[i] ? intDecimal(bytes, f[i]) : '';
    i++;
    var sid = f[i];
    if (sid) {
      if (sid.tag === 0x30) {
        var sc = children(bytes, sid);
        var issuerAndSerial = sc.length > 1 ? sc : children(bytes, sc[0]);
        if (issuerAndSerial.length) {
          si.sidIssuer = nameParts(bytes, issuerAndSerial[0]);
          si.sidSerial = issuerAndSerial[1] ? intVal(bytes, issuerAndSerial[1]) : '';
        }
      } else if (sid.cls === 2 && sid.num === 0) {
        si.ski = intVal(bytes, sid);
      }
      i++;
    }
    var dAlg = f[i];
    if (dAlg) { var da = children(bytes, dAlg); si.digestAlg = da[0] ? oidFull(oid(bytes, da[0])) : ''; }
    i++;
    // signedAttrs [0] IMPLICIT
    if (f[i] && f[i].cls === 2 && f[i].num === 0) {
      children(bytes, f[i]).forEach(function (attr) {
        var a = children(bytes, attr);
        if (a.length < 2) return;
        var at = oidShort(oid(bytes, a[0]));
        var vals = children(bytes, a[1]);
        var val = vals[0];
        if (!val) return;
        if (at.indexOf('signingTime') === 0) si.signingTime = timeVal(bytes, val);
        else if (at.indexOf('messageDigest') === 0) si.messageDigest = intVal(bytes, val);
        else si.attrs.push([at, val.tag === 0x06 ? oid(bytes, val) : text(bytes, val)]);
      });
      i++;
    }
    var sAlg = f[i];
    if (sAlg) { var sa = children(bytes, sAlg); si.signatureAlg = sa[0] ? oidFull(oid(bytes, sa[0])) : ''; }
    i++;
    var sig = f[i];
    if (sig && sig.tag === 0x04) si.signatureSize = sig.end - sig.start;
    res.signers.push(si);
  }

  // ---------- разбор файла ----------
  function toBytes(buf) {
    var b = new Uint8Array(buf), s = '';
    var max = Math.min(b.length, 4000);
    for (var i = 0; i < max; i++) s += String.fromCharCode(b[i]);
    if (s.indexOf('-----BEGIN') === 0) {
      var txt = new TextDecoder('latin1').decode(b);
      var body = txt.replace(/-----BEGIN [^-]+-----/, '').replace(/-----END [^-]+-----/, '')
                    .replace(/[^A-Za-z0-9+/=]/g, '');
      var bin = atob(body), out = new Uint8Array(bin.length);
      for (var j = 0; j < bin.length; j++) out[j] = bin.charCodeAt(j);
      return { bytes: out, pem: true };
    }
    return { bytes: b, pem: false };
  }

  function analyze(bytes) {
    var root = tlv(bytes, 0);
    if (root.tag !== 0x30) throw new Error('это не CMS/PKCS#7: первый байт не SEQUENCE');
    var sd = parseSignedData(bytes, root);
    sd.signer = sd.signers[0] || null;
    return { sd: sd, cert: sd.certs[0] || null };
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }

  function rows(items) {
    return items.filter(function (r) { return r && r[1]; }).map(function (r) {
      return '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>';
    }).join('');
  }

  function hex(bytes, node) {
    if (!node) return '';
    var s = '';
    for (var i = node.start; i < node.end && i < node.start + 48; i++) {
      s += ('0' + bytes[i].toString(16)).slice(-2);
    }
    return s.toUpperCase().replace(/(..)/g, '$1 ').trim();
  }

  function pick(parts, key) {
    for (var i = 0; i < parts.length; i++) {
      if (parts[i][0].indexOf(key) === 0) return parts[i][1];
    }
    return '';
  }

  function render(bytes, res, file) {
    var sd = res.sd, cert = res.cert, si = sd.signer;
    var subject = cert ? cert.subject : [];
    var issuer = cert ? cert.issuer : [];
    var who = cert ? (pick(subject, 'CN') || pick(subject, 'O')) : '';
    var org = cert ? pick(subject, 'O') : '';
    var inn = cert ? (pick(subject, 'ИНН физлица') || pick(subject, 'ИНН')) : '';
    var snils = cert ? pick(subject, 'СНИЛС') : '';
    var ca = cert ? (pick(issuer, 'CN') || pick(issuer, 'O')) : '';
    var detached = sd.hasContent === false;
    var html = '';

    html += '<div class="sig-verdict ' + (detached ? 'sig-warn' : 'sig-ok') + '">'
      + (detached
          ? '<b>Отсоединённая подпись.</b> Документа внутри файла нет — для проверки нужен сам документ, к которому эта подпись сделана.'
          : '<b>Присоединённая подпись.</b> Внутри контейнера есть содержимое' +
            (sd.contentSize ? ' (' + Math.round(sd.contentSize / 1024) + ' КБ)' : '') +
            ' — это может быть сам документ.')
      + '</div>';

    html += '<table class="sig-table"><tbody>'
      + rows([
          ['Файл', file.name + ' · ' + Math.round(file.size / 1024 * 10) / 10 + ' КБ' + (res.pem ? ' · PEM/Base64' : ' · DER')],
          ['Формат', sd.contentType === '1.2.840.113549.1.7.2' ? 'CMS / PKCS#7 signedData' : sd.contentType],
          ['Тип содержимого', sd.eContentType],
          ['Подписант', who],
          ['Организация', org && org !== who ? org : ''],
          ['ИНН / СНИЛС', inn || snils ? (inn + (inn && snils ? ' · ' : '') + snils) : ''],
          ['Кем выдан сертификат', ca],
          ['Действителен', cert ? (cert.notBefore + ' — ' + cert.notAfter) : ''],
          ['Серийный номер', cert ? cert.serial : ''],
          ['Алгоритм хеша', si ? si.digestAlg : (sd.digestAlgs || []).join(', ')],
          ['Алгоритм подписи', si ? si.signatureAlg : ''],
          ['Время подписания', si ? si.signingTime : ''],
          ['Размер подписи', si && si.signatureSize ? si.signatureSize + ' байт' : ''],
          ['Сертификатов в файле', String(sd.certs.length)]
      ]) + '</tbody></table>';

    if (cert) {
      var extra = cert.subject.filter(function (p) {
        return !/^(CN|O|OU|C|ST|L|street|SN|title|serialNumber|emailAddress|ИНН|СНИЛС)/.test(p[0]);
      });
      if (extra.length) {
        html += '<h3 class="sig-h3">Дополнительные поля сертификата</h3><table class="sig-table"><tbody>'
          + rows(extra.map(function (p) { return [p[0], p[1]]; })) + '</tbody></table>';
      }
      html += '<p class="muted small">Начало сертификата в hex: <code>' + esc(hex(bytes, cert.raw)) + '…</code></p>';
    }

    html += '<div class="sig-note"><b>Что скрипт не делает:</b> он не проверяет криптографию '
      + '(браузер не умеет ГОСТ). Если нужно подтвердить, что подпись верна и документ не менялся, '
      + 'проверьте пару «документ + .sig» на <a href="https://e-trust.gosuslugi.ru/check/sign" target="_blank" rel="noopener">Госуслугах</a> '
      + 'или в <a href="https://crypto.kontur.ru/" target="_blank" rel="noopener">Контур.Крипто</a>. '
      + 'Файл никуда не отправлялся: разбор идёт в браузере.</div>';

    return html;
  }

  function fail(msg) {
    return '<div class="sig-verdict sig-bad"><b>Не удалось разобрать как CMS/PKCS#7.</b> '
      + esc(msg) + '<br>Возможно, это другой тип .sig — подпись почтового клиента, служебный файл '
      + 'или подпись в нестандартном формате. Разбор такого файла — отдельная задача: '
      + '<a href="/zayavka.html">пришлите его нам</a>.</div>';
  }

  function handle(file) {
    var out = document.getElementById('sig-result');
    if (!out) return;
    out.innerHTML = '<p class="muted small" style="margin:0">Читаю файл…</p>';
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var conv = toBytes(reader.result);
        var res = analyze(conv.bytes);
        out.innerHTML = render(conv.bytes, res, file);
      } catch (e) {
        out.innerHTML = fail(e.message || String(e));
      }
    };
    reader.onerror = function () { out.innerHTML = fail('не удалось прочитать файл'); };
    reader.readAsArrayBuffer(file);
  }

  function init() {
    var input = document.getElementById('sig-file');
    var zone = document.getElementById('sig-drop');
    if (!input || !zone) return;
    input.addEventListener('change', function () {
      if (input.files && input.files[0]) handle(input.files[0]);
    });
    ['dragenter', 'dragover'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('sig-over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove('sig-over'); });
    });
    zone.addEventListener('drop', function (e) {
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) handle(f);
    });
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }

  // для тестов из node (в браузере module не определён — ветка не выполняется)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { analyze: analyze, toBytes: toBytes };
  }
})();


