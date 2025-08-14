## معرفی سیستم آربیتراژ (فارسی)

این پروژه یک سیستم آربیتراژ رمز‌ارز است که با استفاده از داده‌های صرافی‌ها (MEXC و LBank) فرصت‌های سودآور را شناسایی می‌کند. حالت‌های معامله به دو صورت پشتیبانی می‌شوند:
- معامله بر اساس دلار (USD)
- معامله بر اساس تعداد توکن (TOKEN)

همچنین ماژول Puppeteer برای آماده‌سازی و اجرای رابط کاربری صرافی‌ها (باز/بسته کردن پوزیشن، پر کردن ورودی تعداد توکن) ادغام شده است؛ عملیات تنها پس از تایید اجرا می‌شود و پس از یک‌بار تایید لاگین برای هر دو صرافی، دیگر چک لاگین تکرار نمی‌شود و صفحه‌ها رفرش نمی‌شوند.

## ویژگی‌ها

- **حالت‌های معامله**: USD و TOKEN
- **کنترل دقیق حجم**: بر اساس نقدشوندگی دفتر سفارش و محدودیت‌های پیکربندی
- **ثبت لاگ کامل**: رویدادهای Open/Close با جزئیات کامل در `trades.log`
- **مدیریت خطا**: با `retryWrapper` و گزارش‌ خطا
- **Puppeteer Controller**: باز کردن صفحات، بررسی وضعیت لاگین (فقط تا اولین تایید)، آماده‌سازی و اجرای UI (تب‌ها/ورودی‌ها/کلیک دکمه)

## ساختار پروژه (خلاصه)

```
src/
├─ Arbitrage Logic/
│  ├─ arbitrage_bot/arbitrage.js           # منطق اصلی آربیتراژ و مدیریت پوزیشن‌ها
│  ├─ config/config.js                     # تنظیمات مرکزی سیستم (درصدها، مقادیر، حالت معامله)
│  ├─ error/errorBoundory.js               # مدیریت تلاش مجدد و خطاها
│  ├─ exchanges/exchangeManager.js         # مدیریت اتصال به صرافی‌ها
│  ├─ logging/logger.js                    # ثبت لاگ‌ها
│  ├─ monitoring/statistics.js             # آمار و پایش عملکرد
│  ├─ services/*                           # سرویس‌های قیمت و ثبت درخواست‌ها
│  ├─ utils/*                              # ابزارهای محاسبات، فرمت‌دهی، اعتبارسنجی، ...
│  └─ prices.js                            # حلقه اصلی دریافت قیمت و تحلیل اسپرد
│
└─ Puppeteer Logic/
   ├─ core/browser.js                      # لانچر مرورگر و ساخت Page
   ├─ core/cookies.js                      # ذخیره/بازیابی کوکی‌ها برای سشن
   ├─ mexc Config/*                        # پیکربندی و اکشن‌های MEXC (سلکتورها/اقدامات)
   ├─ lbank config/*                       # پیکربندی و اکشن‌های LBank (سلکتورها/اقدامات)
   ├─ controller.js                        # کنترلر مرکزی Puppeteer (بازکردن صفحات، بررسی لاگین، API)
   └─ index.js                             # اسکریپت تستی مستقل Puppeteer
```

## راه‌اندازی

1) نصب وابستگی‌ها:
```bash
npm install
```

2) پیکربندی اصلی:
- فایل `src/Arbitrage Logic/config/config.js` را باز کرده و مقادیر زیر را بررسی/تنظیم کنید:
  - `tradingMode`: یکی از "USD" یا "TOKEN"
  - `targetTokenQuantity`, `maxTokenQuantity`
  - `profitThresholdPercent`, `closeThresholdPercent`
  - `feesPercent.{mexc,lbank}`

3) اجرای برنامه اصلی:
```bash
npm start
```

پس از اجرا:
- سیستم آربیتراژ شروع می‌شود.
- کنترلر Puppeteer همزمان صفحات MEXC و LBank را باز می‌کند.
- اگر نیاز به لاگین باشد، در ترمینال اعلام می‌شود کدام صفحه نیاز به لاگین دارد.

4) اجرای تستی Puppeteer (اختیاری):
```bash
npm run puppeteer -- mexc
npm run puppeteer -- lbank
npm run puppeteer -- blank
```

## تنظیمات Puppeteer

- متغیرهای محیطی (اختیاری):
  - `PUPPETEER_HEADLESS`: مقادیر قابل قبول: `true`, `false`, یا `new`
  - `CHROME_PATH`: مسیر اجرایی مرورگر دلخواه
  - `PUPPETEER_SLOWMO`: تاخیر اعمال عملیات‌ها (ms)
  
- پروفایل پایدار مرورگر و کوکی‌ها:
  - برای جلوگیری از لاگین مجدد، از دو روش استفاده شده است:
    1) ذخیره/بازیابی کوکی‌ها در `src/Puppeteer Logic/.cookies/{mexc|lbank}.json`
    2) اجرای مرورگر با پروفایل اختصاصی پایدار:
       - MEXC: `./src/Puppeteer Logic/.profile_mexc`
       - LBank: `./src/Puppeteer Logic/.profile_lbank`
  - کافیست یک‌بار لاگین را تکمیل کنید؛ بعد از آن سشن در پروفایل و کوکی‌ها حفظ می‌شود و در اجرای بعدی نیازی به لاگین نیست (تا زمانی که صرافی سشن را منقضی نکند).

## وضعیت لاگین

- MEXC: اگر دکمه‌های `loginButton` و `registerButton` هر دو وجود داشته باشند، کاربر لاگین نیست.
- LBank: یا با `loginButton`/`registerButton` (در صورت ارائه CSS) یا با `loginIndicator` (آواتار) چک می‌شود.

## APIهای Puppeteer Controller

در `src/Puppeteer Logic/controller.js`:

- `startPuppeteerController()`
  - صفحات را باز می‌کند، وضعیت لاگین را بررسی و پیام لازم را لاگ می‌کند.

- `requestOpenPosition(exchange, tokenQuantity, confirmed)`
  - پس از تایید (`confirmed: true`) تب Open را فعال می‌کند، مقدار `targetTokenQuantity` را از کانفیگ وارد می‌کند، سپس روی دکمه‌های باز کردن پوزیشن کلیک می‌کند:
    - LBank: Open Long
    - MEXC: Open Short

- `requestClosePosition(exchange, confirmed)`
  - پس از تایید تب Close را فعال می‌کند، مقدار `targetTokenQuantity` را وارد می‌کند، سپس روی دکمه‌های بستن پوزیشن کلیک می‌کند:
    - LBank: Close Long
    - MEXC: Close Short

نمونه استفاده از تاییدها در منطق آربیتراژ:
```javascript
import { setOpenApproved, setCloseApproved } from "./src/Arbitrage Logic/system/approval.js";

// فعال‌سازی تایید خودکار از طریق محیط:
// PUPPETEER_AUTO_APPROVE_OPEN=true
// PUPPETEER_AUTO_APPROVE_CLOSE=true

// یا در زمان اجرا:
setOpenApproved('mexc', true);
setCloseApproved('mexc', true);
```

### تایید خودکار در پیکربندی
به‌صورت پیش‌فرض در `config.js` تایید خودکار فعال است:
```js
approvals: {
  autoApproveOpen: true,
  autoApproveClose: true
}
```
می‌توانید این‌ها را false کنید یا با متغیر محیطی بازنویسی نمایید.

## مدیریت خطا

`retryWrapper(fn, args, maxRetries, delayMs)` برای عملیات‌های حساس استفاده می‌شود. کنترلر Puppeteer و بخش‌های کلیدی با این مکانیزم پوشش داده شده‌اند تا:
- خطاها لاگ شوند
- تلاش مجدد با تاخیر انجام شود
- در صورت اتمام تلاش‌ها، شکست به‌صورت شفاف گزارش شود

## ثبت لاگ

رویدادهای باز/بسته شدن پوزیشن‌ها در `trades.log` ذخیره می‌شوند. مثال:
```json
{"action":"ARBITRAGE_OPEN","symbol":"DEBT/USDT:USDT", "data": {"arbitrageId":"lbank-mexc", "volume":1000}}
```

## خطاها و پیام‌ها

برای عیب‌یابی سریع، پیام‌های خطا با کد اختصاصی لاگ می‌شوند:
- MEXC: `MEXC_NOT_LOGGED_IN`, `MEXC_QTY_INPUT_NOT_FOUND`, `MEXC_BUTTON_NOT_FOUND`
- LBank: `LBANK_NOT_LOGGED_IN`, `LBANK_QTY_INPUT_NOT_FOUND`, `LBANK_BUTTON_NOT_FOUND`

همچنین در `controller.js` همه‌ی عملیات‌های Open/Close در بلوک try/catch لاگ شده و در صورت خطا پیام‌هایی مانند `[PUPPETEER][OPEN][mexc] Failed: ...` چاپ می‌شود.

## نکات امنیتی

- API Keyها و کوکی‌ها را امن نگه دارید.
- پیشنهاد: استفاده از `.env` و ابزار مدیریت رازها برای نگهداری مسیر مرورگر و تنظیمات حساس.

## موارد لازم برای تکمیل پروژه (To-Add)

1) سلکتورهای تکمیلی (CSS):
   - MEXC:
     - `openLongButton`, `openShortButton`, `closeShortButton`, `closeLongButton`
     - در صورت نیاز: `bidButton`, `askButton`
   - LBank:
     - `loginButton`, `registerButton` (برای تشخیص دقیق لاگین)

2) مدیریت امن اعتبارنامه‌ها:
   - در حال حاضر از کوکی‌ها استفاده می‌شود. در صورت نیاز اضافه کنید: ذخیره‌سازی رمزنگاری‌شده یا پروفایل اختصاصی مرورگر.

3) تست‌ها و CI:
   - افزودن تست‌های واحد/یکپارچه برای ماژول‌های مهم و پیکربندی CI.

4) سند نمونه `.env`:
```
PUPPETEER_HEADLESS=false
PUPPETEER_SLOWMO=0
CHROME_PATH=
PUPPETEER_AUTO_APPROVE_OPEN=false
PUPPETEER_AUTO_APPROVE_CLOSE=false
```

5) مدیریت خروج:
   - اتصال `stopPuppeteerController()` به خروج سیستم برای بستن مرورگرها (در صورت تمایل).

## هشدار ریسک

معاملات رمزارز ریسک بالایی دارند. مسئولیت هرگونه استفاده از این نرم‌افزار بر عهده کاربر است.

## پشتیبانی

در صورت سوال، Issue باز کنید یا پیام دهید.