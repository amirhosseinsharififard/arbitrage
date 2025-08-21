# 🔧 راهنمای عیب‌یابی وب اینترفیس

## مشکل: دیتاها آپدیت و بروزرسانی نمی‌شوند

### ✅ راه‌حل‌های سریع:

#### 1. تست اتصال
```bash
# تست وب اینترفیس با دیتای نمونه
node test_web_interface_enhanced.js
```

#### 2. بررسی پورت
```bash
# بررسی اینکه پورت 3000 در حال استفاده است
netstat -an | findstr :3000
```

#### 3. راه‌اندازی مجدد
```bash
# متوقف کردن تمام پروسه‌های Node.js
taskkill /f /im node.exe

# راه‌اندازی مجدد
npm start
```

### 🔍 عیب‌یابی مرحله به مرحله:

#### مرحله 1: بررسی اتصال
1. مرورگر را باز کنید
2. به آدرس `http://localhost:3000` بروید
3. دکمه "🔄 Test Connection" را کلیک کنید
4. کنسول مرورگر را باز کنید (F12) و پیام‌ها را بررسی کنید

#### مرحله 2: بررسی سرور
1. ترمینال را باز کنید
2. دستور `node test_web_interface_enhanced.js` را اجرا کنید
3. پیام‌های زیر را باید ببینید:
   ```
   🌐 Web interface started on http://localhost:3000
   🔄 Auto-updates enabled (every 2 seconds)
   🌐 Client connected to web interface
   🧪 Broadcasting test data update
   ```

#### مرحله 3: بررسی دیتا
1. در کنسول مرورگر باید پیام‌های زیر را ببینید:
   ```
   📊 Received data update: {timestamp: "...", tradingStatus: {...}, ...}
   ```

### 🚨 مشکلات رایج:

#### مشکل 1: "Connection refused"
**علت:** سرور در حال اجرا نیست
**راه‌حل:**
```bash
node test_web_interface_enhanced.js
```

#### مشکل 2: "Port already in use"
**علت:** پورت 3000 توسط برنامه دیگری استفاده می‌شود
**راه‌حل:**
```bash
# تغییر پورت در web_interface.js
this.port = 3001;
```

#### مشکل 3: "Socket.IO not found"
**علت:** کتابخانه Socket.IO بارگذاری نشده
**راه‌حل:**
```bash
npm install socket.io
```

#### مشکل 4: دیتا آپدیت نمی‌شود
**علت:** سیستم اصلی در حال اجرا نیست
**راه‌حل:**
```bash
# اجرای سیستم اصلی
npm start

# یا تست با دیتای نمونه
node test_web_interface_enhanced.js
```

### 📊 بررسی وضعیت:

#### در ترمینال باید ببینید:
```
🌐 Web interface started on http://localhost:3000
🔄 Auto-updates enabled (every 2 seconds)
🌐 Client connected to web interface
🧪 Broadcasting test data update
```

#### در مرورگر باید ببینید:
- وضعیت اتصال: "Connected - Real-time updates active"
- دیتا در جداول نمایش داده شود
- "Last update" در پایین صفحه آپدیت شود

### 🔧 تنظیمات پیشرفته:

#### تغییر فاصله بروزرسانی:
در فایل `web_interface.js`:
```javascript
// تغییر از 2 ثانیه به 1 ثانیه
this.updateInterval = setInterval(() => {
    if (this.isRunning) {
        this.broadcastDataUpdate();
    }
}, 1000); // 1000ms = 1 second
```

#### فعال‌سازی لاگ‌های بیشتر:
در فایل `public/index.html`:
```javascript
// اضافه کردن لاگ‌های بیشتر
socket.on('data-update', (data) => {
    console.log('📊 Received data update:', data);
    console.log('📈 Trading Status:', data.tradingStatus);
    console.log('📊 Session Stats:', data.sessionStats);
    // ...
});
```

### 📞 درخواست کمک:

اگر مشکل حل نشد:
1. اسکرین‌شات از کنسول مرورگر بگیرید
2. اسکرین‌شات از ترمینال بگیرید
3. فایل‌های لاگ را بررسی کنید
4. مشکل را در GitHub Issues گزارش دهید
