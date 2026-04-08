// Cloudflare Worker - TempMail store2003.online
// Xử lý email đến và lưu vào KV Storage

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
    
    // Lấy username từ email (phần trước @)
    const username = recipient.split('@')[0].toLowerCase();
    
    // Lấy danh sách email hiện có của user
    let userEmails = await env.TEMPMAIL_KV.get(`emails:${username}`, 'json') || [];
    
    // Thêm email mới vào đầu danh sách
    userEmails.unshift(emailData);
    
    // Giới hạn 50 email mỗi inbox, xóa email cũ
    if (userEmails.length > 50) {
      userEmails = userEmails.slice(0, 50);
    }
    
    // Lưu vào KV với TTL 24 giờ
    await env.TEMPMAIL_KV.put(
      `emails:${username}`, 
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
      if (path.startsWith('/api/emails/') && request.method === 'GET') {
        const username = path.split('/')[3]?.toLowerCase();
        
        if (!username || !this.isValidUsername(username)) {
          return new Response(
            JSON.stringify({ error: 'Invalid username' }), 
            { status: 400, headers: corsHeaders }
          );
        }
        
        const emails = await env.TEMPMAIL_KV.get(`emails:${username}`, 'json') || [];
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            email: `${username}@store2003.online`,
            emails: emails 
          }), 
          { headers: corsHeaders }
        );
      }
      
      // POST /api/register - Đăng ký email mới (tạo inbox trống)
      if (path === '/api/register' && request.method === 'POST') {
        const username = this.generateUsername();
        
        // Tạo inbox trống
        await env.TEMPMAIL_KV.put(
          `emails:${username}`, 
          JSON.stringify([]),
          { expirationTtl: 86400 }
        );
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            email: `${username}@store2003.online`,
            username: username
          }), 
          { headers: corsHeaders }
        );
      }
      
      // DELETE /api/emails/:username/:emailId - Xóa email
      if (path.match(/^\/api\/emails\/[\w]+\/[\w-]+$/) && request.method === 'DELETE') {
        const parts = path.split('/');
        const username = parts[3]?.toLowerCase();
        const emailId = parts[4];
        
        let emails = await env.TEMPMAIL_KV.get(`emails:${username}`, 'json') || [];
        emails = emails.filter(e => e.id !== emailId);
        
        await env.TEMPMAIL_KV.put(
          `emails:${username}`, 
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
          JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), 
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
