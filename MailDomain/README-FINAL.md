# TempMail - ASP.NET MVC Project

## Tổng quan

TempMail là ứng dụng email tạm thời được xây dựng bằng ASP.NET MVC 5, tích hợp với Cloudflare Workers để nhận email thật.

## Cấu trúc Project

```
MailDomain/
├── Controllers/
│   ├── HomeController.cs
│   └── TempMailController.cs          # Controller chính cho TempMail
├── Models/
│   └── TempEmail.cs                   # Models cho email
├── Services/
│   └── TempMailService.cs             # Business logic
├── Views/
│   └── TempMail/
│       └── Index.cshtml               # Giao diện chính
├── Content/
│   └── tempmail.css                   # CSS riêng cho TempMail
├── Scripts/
│   └── tempmail.js                    # JavaScript logic
└── App_Start/
    └── RouteConfig.cs                 # Routing (TempMail là trang chủ)
```

## Công nghệ sử dụng

- **Backend**: ASP.NET MVC 5 (.NET Framework 4.6.1)
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **API**: Cloudflare Workers
- **Icons**: Font Awesome 6.4.0
- **Storage**: LocalStorage (client-side) + Memory (server-side)

## Tính năng

### ✅ Đã hoàn thành
- Tạo email tạm thời ngẫu nhiên
- Tự động làm mới mỗi 15 giây
- Lọc email (Tất cả, Chưa đọc, Spam)
- Xem chi tiết email
- Xóa email
- Phát hiện spam tự động
- Sao chép email vào clipboard
- Responsive design (mobile-friendly)
- Giao diện hiện đại với gradient và animations

### 🔄 Cần cấu hình
- Cloudflare Worker để nhận email thật
- Email Routing trên Cloudflare

## Cài đặt & Chạy

### Yêu cầu
- Visual Studio 2017 trở lên
- .NET Framework 4.6.1+
- IIS Express (đi kèm Visual Studio)

### Chạy trong Visual Studio
1. Mở `MailDomain.sln`
2. Nhấn **F5** hoặc click **Start**
3. Truy cập: `http://localhost:51209`

### Build Project
```cmd
cd MailDomain
msbuild MailDomain.sln /p:Configuration=Release
```

## API Endpoints

### Frontend → Cloudflare Worker

```javascript
// Tạo email mới
POST https://tempmail-store2003.levietcong2104.workers.dev/api/register
Response: { username, email, expiresAt }

// Lấy danh sách email
GET https://tempmail-store2003.levietcong2104.workers.dev/api/emails/{username}
Response: { emails: [...] }

// Xóa email
DELETE https://tempmail-store2003.levietcong2104.workers.dev/api/emails/{username}/{emailId}
Response: { success: true }
```

### Backend API (Không sử dụng - chỉ để backup)

```
POST /TempMail/Register
GET /TempMail/GetEmails?username={username}
POST /TempMail/DeleteEmail
```

## Cấu hình

### 1. Cloudflare Worker (Để nhận email thật)

File: `cloudflare-worker/worker.js`

```bash
# Cài đặt Wrangler
npm install -g wrangler

# Login
wrangler login

# Tạo KV Namespace
cd cloudflare-worker
wrangler kv:namespace create TEMPMAIL_KV

# Deploy
wrangler deploy
```

### 2. Email Routing

1. Vào Cloudflare Dashboard
2. Chọn domain `store2003.online`
3. **Email** → **Email Routing** → **Catch-all address**
4. Action: **Send to Worker**
5. Worker: Chọn worker vừa deploy

### 3. Web.config

File đã được cấu hình với:
- UTF-8 encoding
- Culture: vi-VN
- Globalization settings

## Deployment lên IIS

### Bước 1: Publish
1. Click chuột phải vào project → **Publish**
2. Chọn **Folder**
3. Đường dẫn: `C:\inetpub\wwwroot\TempMail`
4. Click **Publish**

### Bước 2: Cấu hình IIS
1. Mở **IIS Manager** (`inetmgr`)
2. **Application Pools** → **Add Application Pool**
   - Name: TempMailPool
   - .NET CLR: v4.0
   - Managed pipeline: Integrated
3. **Sites** → **Add Website**
   - Site name: TempMail
   - Application pool: TempMailPool
   - Physical path: `C:\inetpub\wwwroot\TempMail`
   - Port: 80 hoặc 8080

### Bước 3: Permissions
```cmd
icacls "C:\inetpub\wwwroot\TempMail" /grant "IIS_IUSRS:(OI)(CI)RX"
```

### Bước 4: Firewall (nếu cần)
```cmd
netsh advfirewall firewall add rule name="IIS TempMail" dir=in action=allow protocol=TCP localport=80
```

## Troubleshooting

### Lỗi: Không hiển thị tiếng Việt đúng
- Đảm bảo file `.cshtml` được save với encoding **UTF-8 with BOM**
- Trong Visual Studio: **File** → **Advanced Save Options** → **UTF-8 with signature**

### Lỗi: CSS/JS không load
- Kiểm tra file `tempmail.css` và `tempmail.js` có trong folder `Content/` và `Scripts/`
- Rebuild project

### Lỗi: Không nhận được email
- Kiểm tra Cloudflare Worker đã được deploy chưa
- Kiểm tra Email Routing đã cấu hình đúng chưa
- Xem Console (F12) để check API errors

### Lỗi: 404 Not Found
- Kiểm tra `RouteConfig.cs` - TempMail phải là default controller
- Rebuild và restart IIS

## Cấu trúc Code

### Models
```csharp
public class TempEmail
{
    public string Id { get; set; }
    public string From { get; set; }
    public string To { get; set; }
    public string Subject { get; set; }
    public string Body { get; set; }
    public DateTime ReceivedAt { get; set; }
    public bool Read { get; set; }
    public bool IsSpam { get; set; }
}
```

### Service
```csharp
public class TempMailService
{
    public TempMailAccount CreateAccount()
    public TempMailAccount GetAccount(string username)
    public List<TempEmail> GetEmails(string username)
    public void AddEmail(string username, TempEmail email)
    public bool DeleteEmail(string username, string emailId)
}
```

### JavaScript API
```javascript
// Main functions
initTempMail()
generateNewEmail()
fetchEmails()
copyEmail()
refreshInbox()
openEmail(id)
deleteEmail()
```

## Tối ưu hóa

### Performance
- CSS và JS được minify khi build Release
- LocalStorage để cache email
- Lazy loading cho email content
- Debounce cho auto-refresh

### Security
- XSS protection với `escapeHtml()`
- CORS headers trong Worker
- Input validation
- Spam detection

### UX/UI
- Loading states
- Error handling
- Smooth animations
- Responsive design
- Accessibility compliant

## Roadmap

### Phase 1 (Hoàn thành)
- ✅ Giao diện cơ bản
- ✅ Tạo email tạm thời
- ✅ Hiển thị danh sách email
- ✅ Xem chi tiết email

### Phase 2 (Đang làm)
- 🔄 Tích hợp Cloudflare Worker
- 🔄 Nhận email thật
- 🔄 Email Routing

### Phase 3 (Tương lai)
- ⏳ Database (SQL Server)
- ⏳ User accounts
- ⏳ Email attachments
- ⏳ Search functionality
- ⏳ Email forwarding

## License

MIT License - Free to use

## Support

Nếu gặp vấn đề, kiểm tra:
1. Console log (F12)
2. Network tab để xem API calls
3. IIS logs
4. Cloudflare Worker logs

## Credits

- Font Awesome for icons
- Cloudflare for Workers & Email Routing
- ASP.NET MVC Framework
