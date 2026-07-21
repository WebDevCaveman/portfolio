# Deploy na Vercel

## Struktura
```
index.html          strona (dawne portfolio_full.html)
assets/             36 obrazow .webp
api/contact.js      funkcja formularza (Vercel wykrywa /api/* automatycznie)
```

## 1. Resend (wysylka maili)
1. Zaloz konto na resend.com (3000 maili/mc za darmo).
2. Dodaj i **zweryfikuj swoja domene** (Domains -> Add Domain, wpisy DNS wg instrukcji).
3. Wygeneruj API key (API Keys -> Create).

## 2. Zmienne srodowiskowe w Vercel
Settings -> Environment Variables, dla Production i Preview:

| Zmienna | Wartosc |
|---|---|
| `RESEND_API_KEY` | klucz z Resend |
| `CONTACT_TO` | Twoj adres docelowy |
| `CONTACT_FROM` | `Hearth <hearth@twojadomena.pl>` - **musi byc na zweryfikowanej domenie** |

Bez tych trzech formularz zwroci 500, a strona pokaze komunikat bledu.

## 3. Deploy
```
npm i -g vercel
vercel --prod
```
albo: podepnij repo z GitHuba w panelu Vercel (auto-deploy po pushu).

## 4. Do sprawdzenia po wdrozeniu
- [ ] formularz wysyla, mail przychodzi
- [ ] reply-to dziala (odpowiedz idzie do nadawcy, nie do siebie)
- [ ] po wyslaniu odslania sie ekran swit; po F5 znika (ulotnosc - zamierzone)
- [ ] bledy walidacji pokazuja sie przy pustych polach
- [ ] podmienic URL GitHuba w `index.html` (`.hlinks`) - teraz jest placeholder
