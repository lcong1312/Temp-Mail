// Cloudflare Worker - TempMail Multi-Domain
// Xử lý email đến và lưu vào KV Storage
// Supported domains: store2003.online, lcong2003.cyou, store2003.cyou, store2003.bond, lcong2003.bond

const ALLOWED_DOMAINS = [
  'store2003.online',
  'lcong2003.cyou',
  'store2003.cyou',
  'store2003.bond',
  'lcong2003.bond',
  'vcong2003.cyou',
  'azxcd121.cloud'
];

const DEFAULT_DOMAIN = ALLOWED_DOMAINS[Math.floor(Math.random() * ALLOWED_DOMAINS.length)];

export default {
  // Xử lý email đến
  async email(message, env, ctx) {
    const recipient = message.to;
    const sender = message.from;
    const subject = message.headers.get('subject') || '(Không có tiêu đề)';
    
    // Lấy nội dung email
    const rawEmail = await new Response(message.raw).text();
    
    // Tạo object email
    const emailData = {
      id: crypto.randomUUID(),
      to: recipient,
      from: sender,
      subject: subject,
      body: await this.parseEmailBody(rawEmail),
      rawHeaders: Object.fromEntries(message.headers),
      receivedAt: new Date().toISOString(),
      read: false
    };
    
    // Lấy username và domain từ email
    const [username, domain] = recipient.split('@').map(s => s.toLowerCase());
    
    // Chỉ xử lý email đến các domain được phép
    if (!ALLOWED_DOMAINS.includes(domain)) {
      console.log(`Rejected email for unknown domain: ${domain}`);
      return;
    }
    
    // Lưu vào KV với key gồm cả domain để tránh trùng username giữa các domain
    const kvKey = `emails:${username}@${domain}`;
    
    // Lấy danh sách email hiện có của user
    let userEmails = await env.TEMPMAIL_KV.get(kvKey, 'json') || [];
    
    // Thêm email mới vào đầu danh sách
    userEmails.unshift(emailData);
    
    // Giới hạn 50 email mỗi inbox, xóa email cũ
    if (userEmails.length > 50) {
      userEmails = userEmails.slice(0, 50);
    }
    
    // Lưu vào KV với TTL 24 giờ
    await env.TEMPMAIL_KV.put(
      kvKey, 
      JSON.stringify(userEmails),
      { expirationTtl: 86400 } // 24 giờ
    );
    
    console.log(`Email received for ${recipient} from ${sender}`);
  },

  // Parse body từ raw email
  async parseEmailBody(rawEmail) {
    // Tìm phần body (sau header trống)
    const parts = rawEmail.split('\r\n\r\n');
    if (parts.length > 1) {
      return parts.slice(1).join('\r\n\r\n');
    }
    return rawEmail;
  },

  // Xử lý HTTP requests (API)
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // GET /api/emails/:username - Lấy danh sách email
      // Hỗ trợ query param ?domain=store2003.bond để chọn domain
      if (path.startsWith('/api/emails/') && request.method === 'GET') {
        const username = path.split('/')[3]?.toLowerCase();
        const domain = url.searchParams.get('domain')?.toLowerCase() || DEFAULT_DOMAIN;
        
        if (!username || !this.isValidUsername(username)) {
          return new Response(
            JSON.stringify({ error: 'Invalid username' }), 
            { status: 400, headers: corsHeaders }
          );
        }
        
        if (!ALLOWED_DOMAINS.includes(domain)) {
          return new Response(
            JSON.stringify({ error: 'Invalid domain', allowedDomains: ALLOWED_DOMAINS }), 
            { status: 400, headers: corsHeaders }
          );
        }
        
        const kvKey = `emails:${username}@${domain}`;
        const emails = await env.TEMPMAIL_KV.get(kvKey, 'json') || [];
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            email: `${username}@${domain}`,
            emails: emails 
          }), 
          { headers: corsHeaders }
        );
      }
      
      // POST /api/register - Đăng ký email mới (tạo inbox trống)
      // Hỗ trợ body JSON: { domain: "store2003.bond" } để chọn domain
      if (path === '/api/register' && request.method === 'POST') {
        let domain = DEFAULT_DOMAIN;
        
        try {
          const body = await request.json();
          if (body.domain && ALLOWED_DOMAINS.includes(body.domain.toLowerCase())) {
            domain = body.domain.toLowerCase();
          }
        } catch (_) {
          // Không có body hoặc body không hợp lệ, dùng domain mặc định
        }
        
        const username = this.generateUsername();
        const kvKey = `emails:${username}@${domain}`;
        
        // Tạo inbox trống
        await env.TEMPMAIL_KV.put(
          kvKey, 
          JSON.stringify([]),
          { expirationTtl: 86400 }
        );
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            email: `${username}@${domain}`,
            username: username,
            domain: domain,
            allowedDomains: ALLOWED_DOMAINS
          }), 
          { headers: corsHeaders }
        );
      }
      
      // DELETE /api/emails/:username/:emailId - Xóa email
      // Hỗ trợ query param ?domain=store2003.bond
      if (path.match(/^\/api\/emails\/[\w]+\/[\w-]+$/) && request.method === 'DELETE') {
        const parts = path.split('/');
        const username = parts[3]?.toLowerCase();
        const emailId = parts[4];
        const domain = url.searchParams.get('domain')?.toLowerCase() || DEFAULT_DOMAIN;
        
        if (!ALLOWED_DOMAINS.includes(domain)) {
          return new Response(
            JSON.stringify({ error: 'Invalid domain' }), 
            { status: 400, headers: corsHeaders }
          );
        }
        
        const kvKey = `emails:${username}@${domain}`;
        let emails = await env.TEMPMAIL_KV.get(kvKey, 'json') || [];
        emails = emails.filter(e => e.id !== emailId);
        
        await env.TEMPMAIL_KV.put(
          kvKey, 
          JSON.stringify(emails),
          { expirationTtl: 86400 }
        );
        
        return new Response(
          JSON.stringify({ success: true }), 
          { headers: corsHeaders }
        );
      }
      
      // GET /api/health - Health check
      if (path === '/api/health') {
        return new Response(
          JSON.stringify({ status: 'ok', timestamp: new Date().toISOString(), allowedDomains: ALLOWED_DOMAINS }), 
          { headers: corsHeaders }
        );
      }
      
      // GET /api/domains - Lấy danh sách domain được hỗ trợ
      if (path === '/api/domains') {
        return new Response(
          JSON.stringify({ success: true, domains: ALLOWED_DOMAINS, default: DEFAULT_DOMAIN }), 
          { headers: corsHeaders }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Not found' }), 
        { status: 404, headers: corsHeaders }
      );
      
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message }), 
        { status: 500, headers: corsHeaders }
      );
    }
  },

  // Tạo username ngẫu nhiên
  generateUsername() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  // Validate username
  isValidUsername(username) {
    return /^[a-z0-9]{3,30}$/.test(username);
  }
};
