// Palenisko - odbior formularza kontaktowego.
// Vercel wykrywa /api/* automatycznie. Wysylka mailem przez Resend.
//
// WYMAGANE ZMIENNE SRODOWISKOWE (Vercel -> Settings -> Environment Variables):
//   RESEND_API_KEY  - klucz z resend.com
//   CONTACT_TO      - adres, na ktory maja isc wiadomosci
//   CONTACT_FROM    - nadawca na ZWERYFIKOWANEJ domenie, np. "Hearth <hearth@twojadomena.pl>"

const WINDOW_MS = 60 * 60 * 1000; // 1h
const MAX_PER_IP = 5;
const hits = new Map(); // pamiec instancji; przy skalowaniu limit jest per-instancja - wystarczy jako zapora na floody

function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear(); // prosty bezpiecznik pamieci
  return arr.length > MAX_PER_IP;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  if (rateLimited(ip)) {
    return res.status(429).json({ error: 'too_many_requests' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'bad_json' }); }
  }
  const { name = '', email = '', message = '', company = '', elapsed = 0 } = body || {};

  // Honeypot i czas wypelnienia: cichy sukces, zeby bot nie uczyl sie na bledach.
  if (company || Number(elapsed) < 3000) {
    return res.status(200).json({ ok: true });
  }

  // Walidacja serwerowa - klienta da sie obejsc, wiec powtarzamy wszystko tutaj.
  const n = String(name).trim();
  const e = String(email).trim();
  const m = String(message).trim();
  if (n.length < 2 || n.length > 80) return res.status(400).json({ error: 'bad_name' });
  if (!EMAIL_RE.test(e) || e.length > 120) return res.status(400).json({ error: 'bad_email' });
  if (m.length < 10 || m.length > 2000) return res.status(400).json({ error: 'bad_message' });

  const key = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO;
  const from = process.env.CONTACT_FROM;
  if (!key || !to || !from) {
    console.error('contact: brak konfiguracji RESEND_API_KEY / CONTACT_TO / CONTACT_FROM');
    return res.status(500).json({ error: 'not_configured' });
  }

  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.6;color:#23252A">
      <p style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#8E6945;margin:0 0 12px">
        The Hearth - new message
      </p>
      <p><strong>${esc(n)}</strong><br>
      <a href="mailto:${esc(e)}">${esc(e)}</a></p>
      <div style="border-left:3px solid #D68B39;padding-left:14px;margin:18px 0;white-space:pre-wrap">${esc(m)}</div>
      <p style="font-size:11px;color:#57514B">IP ${esc(ip)}</p>
    </div>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: e,
        subject: `The Hearth - ${n}`,
        html,
      }),
    });
    if (!r.ok) {
      console.error('resend error', r.status, await r.text());
      return res.status(502).json({ error: 'send_failed' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('contact handler', err);
    return res.status(500).json({ error: 'send_failed' });
  }
}
