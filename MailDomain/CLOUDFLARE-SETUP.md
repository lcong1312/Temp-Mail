# Hướng dẫn cấu hình Cloudflare Worker

## Bước 1: Cài đặt Wrangler CLI

### Windows
```powershell
npm install -g wrangler
```

### Kiểm tra cài đặt
```bash
wrangler --version
```

## Bước 2: Login Cloudflare

```bash
wrangler login
```

Trình duyệt sẽ mở, đăng nhập vào Cloudflare account của bạn.

## Bước 3: Tạo KV Namespace

```bash
cd cloudflare-worker
wrangler kv:namespace create TEMPMAIL_KV
```

Bạn sẽ nhận được output như:
```
{ binding = "TEMPMAIL_KV", id = "abc123def456" }
```

**Lưu lại ID này!**

## Bước 4: Cập nhật wrangler.toml

Mở file `cloudflare-worker/wrangler.toml` và thêm:

```toml
name = "tempmail-store2003"
main = "worker.js"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "TEMPMAIL_KV"
id = "abc123def456"  # Thay bằng ID của bạn từ bước 3
```

## Bước 5: Deploy Worker

```bash
wrangler deploy
```

Sau khi deploy thành công, bạn sẽ nhận được URL:
```
https://tempmail-store2003.levietcong2104.workers.dev
```

## Bước 6: Cấu hình Email Routing

### 6.1. Vào Cloudflare Dashboard
1. Truy cập: https://dash.cloudflare.com
2. Chọn domain: `store2003.online`

### 6.2. Enable Email Routing
1. Click **Email** trong sidebar
2. Click **Email Routing**
3. Click **Get started** (nếu chưa enable)
4. Verify domain ownership (nếu cần)

### 6.3. Cấu hình Catch-all
1. Scroll xuống **Catch-all address**
2. Click **Edit**
3. **Action**: Chọn **Send to Worker**
4. **Destination**: Chọn worker `tempmail-store2003`
5. Click **Save**

## Bước 7: Test

### Test 1: Tạo email
```bash
curl -X POST https://tempmail-store2003.levietcong2104.workers.dev/api/register
```

Response:
```json
{
  "username": "abc123xyz",
  "email": "abc123xyz@store2003.online",
  "expiresAt": "2025-11-30T..."
}
```

### Test 2: Gửi email test
Gửi email đến: `abc123xyz@store2003.online`

### Test 3: Kiểm tra email
```bash
curl https://tempmail-store2003.levietcong2104.workers.dev/api/emails/abc123xyz
```

## Troubleshooting

### Lỗi: "No such namespace"
- Kiểm tra KV namespace ID trong `wrangler.toml`
- Chạy lại: `wrangler kv:namespace create TEMPMAIL_KV`

### Lỗi: "Authentication error"
- Chạy lại: `wrangler login`
- Kiểm tra Cloudflare account có quyền deploy Workers

### Lỗi: "Email not received"
- Kiểm tra Email Routing đã enable chưa
- Kiểm tra Catch-all đã cấu hình đúng Worker chưa
- Xem Worker logs: `wrangler tail`

### Lỗi: CORS
- Worker đã có CORS headers, kiểm tra lại code
- Xem Console (F12) để check error details

## Xem Logs

```bash
wrangler tail
```

Hoặc vào Cloudflare Dashboard → Workers → Chọn worker → Logs

## Cập nhật Worker

Sau khi sửa code trong `worker.js`:

```bash
wrangler deploy
```

## Xóa Worker (nếu cần)

```bash
wrangler delete
```

## Giới hạn Free Plan

- **100,000 requests/day**
- **10ms CPU time/request**
- **1GB KV storage**
- **1,000 KV writes/day**
- **Unlimited KV reads**

Đủ cho hàng nghìn users!

## Monitoring

### Xem thống kê
1. Cloudflare Dashboard
2. Workers → Chọn worker
3. Tab **Metrics**

### Xem KV data
```bash
wrangler kv:key list --binding=TEMPMAIL_KV
wrangler kv:key get "username:abc123xyz" --binding=TEMPMAIL_KV
```

## Security

### Best Practices
- ✅ CORS headers đã được cấu hình
- ✅ Rate limiting (100 requests/minute)
- ✅ Email validation
- ✅ XSS protection
- ✅ Auto-cleanup sau 24h

### Nâng cao (Optional)
- Thêm API key authentication
- IP whitelist
- DDoS protection (Cloudflare tự động)

## Custom Domain (Optional)

Nếu muốn dùng domain riêng cho API:

1. Cloudflare Dashboard → Workers
2. Chọn worker → **Triggers**
3. **Add Custom Domain**
4. Nhập: `api.store2003.online`
5. Click **Add Custom Domain**

Sau đó API sẽ là: `https://api.store2003.online/api/register`

## Backup & Restore

### Backup KV data
```bash
wrangler kv:key list --binding=TEMPMAIL_KV > backup.json
```

### Restore
```bash
# Tạo script để restore từ backup.json
```

## Tối ưu hóa

### Giảm KV writes
- Cache trong memory
- Batch writes
- Lazy cleanup

### Tăng performance
- Edge caching
- Minimize KV reads
- Optimize Worker code

## Next Steps

1. ✅ Deploy Worker
2. ✅ Cấu hình Email Routing
3. ✅ Test nhận email
4. 🔄 Monitor logs
5. 🔄 Optimize performance

## Support

- Cloudflare Docs: https://developers.cloudflare.com/workers/
- Wrangler Docs: https://developers.cloudflare.com/workers/wrangler/
- Community: https://community.cloudflare.com/
