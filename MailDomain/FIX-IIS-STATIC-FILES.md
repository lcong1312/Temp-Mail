# Fix CSS/JS không load trên IIS

## Vấn đề
Sau khi publish lên IIS, CSS và JS không load được.

## Nguyên nhân
IIS không serve static files (.css, .js) đúng cách.

## Giải pháp

### 1. Đã thêm vào Web.config
```xml
<system.webServer>
  <staticContent>
    <remove fileExtension=".css" />
    <mimeMap fileExtension=".css" mimeType="text/css" />
    <remove fileExtension=".js" />
    <mimeMap fileExtension=".js" mimeType="application/javascript" />
  </staticContent>
</system.webServer>
```

### 2. Rebuild Project
```cmd
cd MailDomain
msbuild MailDomain.sln /p:Configuration=Release /t:Rebuild
```

### 3. Publish lại
- Click chuột phải vào project → **Publish**
- Hoặc copy files thủ công

### 4. Kiểm tra files đã được copy
Đảm bảo các files này có trong folder publish:
- `Content/tempmail.css`
- `Scripts/tempmail.js`

### 5. Test trên IIS
Truy cập trực tiếp:
- `http://localhost:8080/Content/tempmail.css`
- `http://localhost:8080/Scripts/tempmail.js`

Nếu thấy nội dung file = OK!

### 6. Clear browser cache
Nhấn `Ctrl + F5` để hard refresh.

## Nếu vẫn không được

### Kiểm tra IIS MIME Types
1. Mở IIS Manager
2. Click vào website
3. Double-click **MIME Types**
4. Đảm bảo có:
   - `.css` → `text/css`
   - `.js` → `application/javascript`

### Kiểm tra Handler Mappings
1. IIS Manager → Website
2. **Handler Mappings**
3. Đảm bảo `StaticFile` handler enabled

### Kiểm tra permissions
```cmd
icacls "C:\inetpub\wwwroot\TempMail\Content" /grant "IIS_IUSRS:(OI)(CI)RX"
icacls "C:\inetpub\wwwroot\TempMail\Scripts" /grant "IIS_IUSRS:(OI)(CI)RX"
```

### Restart IIS
```cmd
iisreset
```

## Debug
Mở F12 Console và check:
- Network tab → Xem status code của CSS/JS
- 404 = File không tồn tại
- 403 = Permission denied
- 200 = OK

## Workaround nhanh
Nếu vẫn không được, embed CSS/JS trực tiếp vào Index.cshtml:

```cshtml
<style>
    /* Copy toàn bộ nội dung tempmail.css vào đây */
</style>

<script>
    // Copy toàn bộ nội dung tempmail.js vào đây
</script>
```
