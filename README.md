# MathDash — Matematika test platformasi

To'liq ishlaydigan test platformasi: foydalanuvchilar ro'yxatdan o'tadi,
administrator tasdig'idan so'ng kirish huquqi oladi, testlar ishlaydi va
har bir savolga sarflangan vaqt, to'g'ri/noto'g'ri javoblar, zaif mavzular
va reyting kabi batafsil statistikalar yig'iladi. Admin panelda barcha
foydalanuvchilar, so'rovlar va umumiy statistika professional tarzda
boshqariladi.

Loyiha **Vercel bepul (Hobby) tarifida** ishlashga moslashtirilgan:
- Frontend: oddiy HTML/CSS/JS (`/public`) — Vercel avtomatik statik sayt sifatida joylaydi
- Backend: Vercel Serverless Functions (`/api`) — alohida server kerak emas
- Ma'lumotlar bazasi: **Vercel Postgres** (bepul tarifda mavjud)

## Loyiha tuzilishi

```
/api
  /auth        — ro'yxatdan o'tish, kirish, admin kirish, blokdan chiqish so'rovi
  /admin       — so'rovlar, foydalanuvchilar, statistika, testlar boshqaruvi
  /tests       — testlar ro'yxati va boshlash
  /attempts    — javob yuborish va testni yakunlash
  /user        — shaxsiy dashboard va natijalar
/lib
  db.js        — Postgres ulanishi va jadvallarni avtomatik yaratish
  auth.js      — parol xeshlash, JWT, avtorizatsiya
/public
  index.html      — kirish / ro'yxatdan o'tish / admin kirish
  dashboard.html   — asosiy oyna (namunadagi dizayn asosida)
  test.html        — test ishlash muhiti (namunadagi dizayn asosida)
  results.html     — shaxsiy natijalar tarixi
  admin.html       — admin panel
adminloginpassword — admin login/parol va ularni qayerga qo'yish haqida ko'rsatma
```

## 1-qadam: Vercel'ga joylash

1. Bu loyiha papkasini GitHub'ga yuklang (yangi repository yarating).
2. [vercel.com](https://vercel.com) saytida hisob oching (bepul), "Add New Project"
   tugmasini bosing va GitHub repositoryingizni tanlang.
3. Vercel loyihani avtomatik aniqlaydi — hech qanday qo'shimcha build sozlamasi
   kerak emas, shunchaki "Deploy" tugmasini bosing.

## 2-qadam: Ma'lumotlar bazasini ulash (Vercel Postgres)

1. Vercel loyihangiz sahifasida **Storage** bo'limiga o'ting.
2. **Create Database → Postgres** ni tanlang (bepul tarifda mavjud).
3. Yaratilgandan so'ng uni loyihangizga **Connect** qiling — Vercel
   `POSTGRES_URL` kabi barcha kerakli muhit o'zgaruvchilarini avtomatik qo'shadi.

## 3-qadam: Admin va xavfsizlik o'zgaruvchilarini qo'shish

Loyihangiz **Settings → Environment Variables** bo'limiga kiring va quyidagilarni qo'shing:

| Nomi | Qiymati |
|---|---|
| `ADMIN_USERNAME` | `mathadmin` |
| `ADMIN_PASSWORD` | `mathadminpassword` |
| `JWT_SECRET` | o'zingiz tanlagan uzun, tasodifiy matn (masalan 40+ belgidan iborat) |

Bu qiymatlar `adminloginpassword` faylida ham yozilgan — parolni almashtirmoqchi
bo'lsangiz, ikkala joyda ham bir xil qiymatni yangilang.

O'zgaruvchilarni qo'shgandan so'ng loyihani **qayta deploy** qiling (Deployments
bo'limidan "Redeploy").

## 4-qadam: Tekshirish

- `https://loyihangiz.vercel.app` ga kiring
- Yangi foydalanuvchi sifatida ro'yxatdan o'ting
- `mathadmin` / `mathadminpassword` bilan "Administrator sifatida kirish"
  orqali admin panelga kiring va yangi so'rovni tasdiqlang
- O'sha foydalanuvchi bilan qayta kirib, testni ishlab ko'ring

Birinchi so'rov yuborilganda ma'lumotlar bazasi jadvallari va bitta namuna
test (4 ta savol bilan) avtomatik yaratiladi — qo'lda SQL yozish shart emas.

## Asosiy ishlash mexanizmi

1. Foydalanuvchi `index.html` orqali ro'yxatdan o'tadi → holati `pending`
   bo'ladi va admin uchun so'rov yaratiladi.
2. Admin `so'rovlar` bo'limida so'rovni ko'radi va tasdiqlaydi/rad etadi.
3. Tasdiqlangan foydalanuvchi tizimga kiradi → `dashboard.html` ochiladi.
4. Foydalanuvchi test boshlaganda har bir savol uchun ketgan vaqt serverga
   yuboriladi va saqlanadi (`answer_attempts.time_spent_seconds`).
5. Har bir javob serverda tekshiriladi (to'g'ri javob hech qachon
   brauzerga oldindan yuborilmaydi).
6. Test tugagach, ball hisoblanadi va foydalanuvchining umumiy balliga
   qo'shiladi.
7. Admin panelda: umumiy statistika, top foydalanuvchilar, eng zaif
   mavzular, so'nggi faoliyat, va har bir foydalanuvchi bo'yicha alohida
   chuqur tahlil (o'rtacha javob vaqti, to'g'ri/noto'g'ri nisbat, zaif
   mavzular, reytingdagi o'rni) mavjud.
8. Admin foydalanuvchini bloklasa, keyingi kirishda unga blokdan
   chiqarish so'rovini yuborish imkoniyati ko'rsatiladi.

## Kengaytirish g'oyalari (keyingi bosqich uchun)

Quyidagilar loyihada hali yo'q, lekin professional platforma sifatida
tavsiya etiladi:

- **Email orqali bildirishnoma** — so'rov tasdiqlanganda/rad etilganda
  foydalanuvchiga email yuborish (masalan Resend yoki SendGrid orqali).
- **Parolni tiklash** — "parolni unutdim" oqimi.
- **Savol banki import** — Excel/CSV orqali ko'plab savollarni bir vaqtda
  yuklash (admin panelga savolni birma-bir qo'shish o'rniga).
- **Vaqt bo'yicha progress grafigi** — foydalanuvchining ballari vaqt
  o'tishi bilan qanday o'zgarganini ko'rsatuvchi chart.
- **Rate limiting** — login va ro'yxatdan o'tish endpoint'lariga
  himoya qo'shish (masalan Vercel'ning Firewall funksiyasi orqali).
- **Ikki faktorli autentifikatsiya** — admin hisobi uchun qo'shimcha
  xavfsizlik qatlami.

## Lokal muhitda ishga tushirish (ixtiyoriy)

```bash
npm install -g vercel
npm install
vercel dev
```

`vercel dev` buyrug'i sizdan Postgres ma'lumotlar bazasi ulanishini so'raydi —
Vercel Storage'da yaratgan bazangizni tanlang, u avtomatik `.env.local`
faylga yoziladi.
