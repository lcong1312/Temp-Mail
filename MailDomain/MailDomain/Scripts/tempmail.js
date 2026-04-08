// TempMail - store2003.online
// Cloudflare Workers API Integration

const API_BASE = 'https://tempmail-store2003.levietcong2104.workers.dev';
const DOMAIN = 'store2003.online';

let currentUsername = '';
let currentEmail = '';
let emails = [];
let filteredEmails = [];
let currentFilter = 'all';
let countdownInterval;
let countdown = 15;

const SPAM_KEYWORDS = [
    'bounce', 'mailer-daemon', 'postmaster', 'noreply', 'no-reply',
    'unsubscribe', 'spam', 'junk', 'promo', 'marketing', 'newsletter',
    'advertisement', 'offer', 'deal', 'discount', 'sale', 'winner',
    'lottery', 'prize', 'congratulations', 'urgent', 'act now'
];

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initTempMail();
    startCountdown();
});

// Initialize TempMail
async function initTempMail() {
    console.log('=== Initializing TempMail ===');
    
    // Always create new email on page load
    // Clear any old data
    localStorage.removeItem('tempmail_username');
    localStorage.removeItem('tempmail_expiry');
    localStorage.removeItem('tempmail_emails');
    
    console.log('Creating new email address...');
    await generateNewEmail();
}

// Generate new email
async function generateNewEmail() {
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) throw new Error('Cannot create email');
        
        const data = await response.json();
        
        currentUsername = data.username;
        currentEmail = data.email;
        
        // Don't save to localStorage - always create new email on page load
        
        document.getElementById('tempEmail').value = currentEmail;
        emails = [];
        updateInboxUI();
        
        const input = document.getElementById('tempEmail');
        input.style.animation = 'none';
        setTimeout(() => input.style.animation = 'pulse 0.5s ease', 10);
        
    } catch (error) {
        console.error('Error:', error);
        showOfflineMode();
    } finally {
        showLoading(false);
        countdown = 15;
    }
}

// Fetch emails from server
async function fetchEmails() {
    if (!currentUsername) return;
    
    try {
        const response = await fetch(`${API_BASE}/api/emails/${currentUsername}`);
        
        if (!response.ok) throw new Error('Cannot fetch emails');
        
        const data = await response.json();
        
        emails = (data.emails || []).map(email => ({
            id: email.id,
            from: email.from,
            subject: email.subject || '(Không có tiêu đề)',
            body: email.body,
            time: new Date(email.receivedAt).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit'
            }),
            date: new Date(email.receivedAt).toLocaleDateString('vi-VN'),
            fullDate: email.receivedAt,
            unread: !email.read,
            isSpam: detectSpam(email)
        }));
        
        updateCounts();
        filterEmails(currentFilter);
        
    } catch (error) {
        console.error('Error fetching emails:', error);
    }
}

// Detect spam
function detectSpam(email) {
    const fromLower = (email.from || '').toLowerCase();
    const subjectLower = (email.subject || '').toLowerCase();
    
    for (const keyword of SPAM_KEYWORDS) {
        if (fromLower.includes(keyword) || subjectLower.includes(keyword)) {
            return true;
        }
    }
    
    if (fromLower.includes('bounce+') || fromLower.includes('=')) {
        return true;
    }
    
    return false;
}

// Update counts
function updateCounts() {
    const all = emails.length;
    const unread = emails.filter(e => e.unread).length;
    const spam = emails.filter(e => e.isSpam).length;
    
    document.getElementById('countAll').textContent = all;
    document.getElementById('countUnread').textContent = unread;
    document.getElementById('countSpam').textContent = spam;
    document.getElementById('emailCount').textContent = all;
}

// Filter emails
function filterEmails(filter) {
    currentFilter = filter;
    
    document.querySelectorAll('.inbox-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.filter === filter) {
            tab.classList.add('active');
        }
    });
    
    switch (filter) {
        case 'unread':
            filteredEmails = emails.filter(e => e.unread);
            break;
        case 'spam':
            filteredEmails = emails.filter(e => e.isSpam);
            break;
        default:
            filteredEmails = [...emails];
    }
    
    updateInboxUI();
}

// Delete email from server
async function deleteEmailFromServer(emailId) {
    if (!currentUsername) return false;
    
    try {
        const response = await fetch(
            `${API_BASE}/api/emails/${currentUsername}/${emailId}`,
            { method: 'DELETE' }
        );
        return response.ok;
    } catch (error) {
        console.error('Error deleting:', error);
        return false;
    }
}

// Copy email to clipboard
function copyEmail() {
    const emailInput = document.getElementById('tempEmail');
    emailInput.select();
    emailInput.setSelectionRange(0, 99999);
    
    navigator.clipboard.writeText(emailInput.value).then(() => {
        showCopyNotification();
    }).catch(() => {
        document.execCommand('copy');
        showCopyNotification();
    });
}

// Show copy notification
function showCopyNotification() {
    const notification = document.getElementById('copyNotification');
    notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), 2000);
}

// Start countdown timer
function startCountdown() {
    countdownInterval = setInterval(() => {
        countdown--;
        document.getElementById('countdown').textContent = countdown;
        
        if (countdown <= 0) {
            countdown = 15;
            refreshInbox();
        }
    }, 1000);
}

// Refresh inbox
async function refreshInbox() {
    const btn = document.querySelector('.btn-refresh-inbox');
    const icon = btn.querySelector('i');
    icon.classList.add('fa-spin');
    
    await fetchEmails();
    
    icon.classList.remove('fa-spin');
    countdown = 15;
}

// Update inbox UI
function updateInboxUI() {
    const inboxList = document.getElementById('inboxList');
    
    if (filteredEmails.length === 0) {
        const emptyMessage = currentFilter === 'spam' 
            ? 'Không có thư rác' 
            : currentFilter === 'unread' 
                ? 'Không có thư chưa đọc' 
                : 'Hộp thư trống';
        
        inboxList.innerHTML = `
            <div class="empty-inbox">
                <i class="fas fa-envelope-open"></i>
                <p>${emptyMessage}</p>
                <span>Đang chờ email đến...</span>
            </div>
        `;
        return;
    }
    
    inboxList.innerHTML = filteredEmails.map(email => `
        <div class="email-item ${email.unread ? 'unread' : ''} ${email.isSpam ? 'spam' : ''}" 
             onclick="openEmail('${email.id}')">
            <div class="email-icon">
                <i class="fas fa-${email.isSpam ? 'exclamation-triangle' : email.unread ? 'envelope' : 'envelope-open'}"></i>
            </div>
            <div class="email-info">
                <div class="email-from">${escapeHtml(formatSender(email.from))}</div>
                <div class="email-subject">${escapeHtml(email.subject)}</div>
            </div>
            <div class="email-meta">
                <div class="email-time">${email.time}</div>
                <div class="email-badges">
                    ${email.isSpam ? '<span class="badge-spam">SPAM</span>' : ''}
                    ${email.unread ? '<span class="badge-new">MỚI</span>' : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// Format sender name
function formatSender(from) {
    if (!from) return 'Unknown';
    
    if (from.length > 40) {
        const atIndex = from.indexOf('@');
        if (atIndex > 0 && atIndex < 30) {
            return from.substring(0, atIndex + 15) + '...';
        }
        return from.substring(0, 37) + '...';
    }
    return from;
}

// Open email detail
function openEmail(id) {
    const email = emails.find(e => e.id === id);
    if (!email) return;
    
    email.unread = false;
    updateCounts();
    filterEmails(currentFilter);
    
    document.getElementById('emailSubject').textContent = email.subject;
    document.getElementById('emailFrom').textContent = email.from;
    document.getElementById('emailTime').textContent = `${email.date} ${email.time}`;
    document.getElementById('emailTo').textContent = currentEmail;
    
    const bodyEl = document.getElementById('emailBody');
    
    if (email.body) {
        console.log('=== Opening Email ===');
        console.log('Email ID:', id);
        console.log('Body length:', email.body.length);
        console.log('Body preview:', email.body.substring(0, 200));
        
        // Parse MIME email
        const parsedEmail = parseMimeEmail(email.body);
        console.log('Parsed email:', parsedEmail);
        
        if (parsedEmail.html) {
            console.log('Rendering HTML email');
            console.log('HTML length:', parsedEmail.html.length);
            console.log('HTML preview:', parsedEmail.html.substring(0, 200));
            bodyEl.innerHTML = sanitizeAndRenderHtml(parsedEmail.html);
        } else if (parsedEmail.text) {
            console.log('Rendering plain text email');
            const formattedText = parsedEmail.text
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0)
                .join('\n\n');
            bodyEl.innerHTML = `<pre style="white-space:pre-wrap;word-wrap:break-word;font-family:inherit;background:#f7fafc;padding:20px;border-radius:12px;border:2px solid #e2e8f0;">${escapeHtml(formattedText)}</pre>`;
        } else {
            console.log('No content found in parsed email');
            bodyEl.innerHTML = '<p style="color:#a0aec0;text-align:center;padding:40px 0;">Không có nội dung</p>';
        }
    } else {
        console.log('Email body is empty');
        bodyEl.innerHTML = '<p style="color:#a0aec0;text-align:center;padding:40px 0;">Không có nội dung</p>';
    }
    
    document.querySelector('.inbox-section').style.display = 'none';
    document.getElementById('emailDetail').style.display = 'block';
    document.getElementById('emailDetail').dataset.emailId = id;
}

// Close email detail
function closeEmailDetail() {
    document.querySelector('.inbox-section').style.display = 'block';
    document.getElementById('emailDetail').style.display = 'none';
}

// Delete email
async function deleteEmail() {
    const id = document.getElementById('emailDetail').dataset.emailId;
    
    showLoading(true);
    const success = await deleteEmailFromServer(id);
    showLoading(false);
    
    if (success) {
        emails = emails.filter(e => e.id !== id);
        updateCounts();
        filterEmails(currentFilter);
        closeEmailDetail();
    } else {
        alert('Không thể xóa email');
    }
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Decode Quoted-Printable encoding
function decodeQuotedPrintable(str) {
    if (!str) return '';
    
    try {
        // Remove soft line breaks first
        str = str.replace(/=\r?\n/g, '');
        
        // Convert =XX sequences to bytes
        const bytes = [];
        let i = 0;
        while (i < str.length) {
            if (str[i] === '=' && i + 2 < str.length) {
                const hex = str.substr(i + 1, 2);
                if (/^[0-9A-F]{2}$/i.test(hex)) {
                    bytes.push(parseInt(hex, 16));
                    i += 3;
                    continue;
                }
            }
            bytes.push(str.charCodeAt(i));
            i++;
        }
        
        // Convert bytes to UTF-8 string
        const uint8Array = new Uint8Array(bytes);
        const decoder = new TextDecoder('utf-8');
        return decoder.decode(uint8Array);
    } catch (e) {
        console.error('Error decoding quoted-printable:', e);
        return str;
    }
}

// Parse MIME email
function parseMimeEmail(body) {
    if (!body) return { text: '', html: '' };
    
    console.log('Parsing MIME email...');
    
    // Look for boundary in the body itself (not in headers)
    // Pattern: --BOUNDARY
    const boundaryPattern = /^--([a-zA-Z0-9]+)$/m;
    const boundaryMatch = body.match(boundaryPattern);
    
    if (boundaryMatch) {
        const boundary = boundaryMatch[1];
        console.log('Found boundary:', boundary);
        
        // Split by --boundary
        const parts = body.split('--' + boundary);
        console.log('Split into', parts.length, 'parts');
        
        let textContent = '';
        let htmlContent = '';
        
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i].trim();
            console.log(`Part ${i}:`, part.substring(0, 100));
            
            // Skip empty or end marker
            if (!part || part === '--') continue;
            
            // Check if this part uses quoted-printable encoding
            const isQuotedPrintable = part.includes('Content-Transfer-Encoding: quoted-printable');
            
            // Check for text/plain
            if (part.includes('Content-Type: text/plain')) {
                // Extract content after blank line
                const lines = part.split(/\n/);
                let contentStarted = false;
                let content = [];
                
                for (const line of lines) {
                    if (contentStarted) {
                        content.push(line);
                    } else if (line.trim() === '') {
                        contentStarted = true;
                    }
                }
                
                textContent = content.join('\n').trim();
                
                // Decode if quoted-printable
                if (isQuotedPrintable) {
                    textContent = decodeQuotedPrintable(textContent);
                    console.log('Decoded text:', textContent);
                } else {
                    console.log('Extracted text:', textContent);
                }
            }
            
            // Check for text/html
            if (part.includes('Content-Type: text/html')) {
                // Extract content after blank line
                const lines = part.split(/\n/);
                let contentStarted = false;
                let content = [];
                
                for (const line of lines) {
                    if (contentStarted) {
                        content.push(line);
                    } else if (line.trim() === '') {
                        contentStarted = true;
                    }
                }
                
                htmlContent = content.join('\n').trim();
                
                // Decode if quoted-printable
                if (isQuotedPrintable) {
                    htmlContent = decodeQuotedPrintable(htmlContent);
                    console.log('Decoded HTML:', htmlContent.substring(0, 100));
                } else {
                    console.log('Extracted HTML:', htmlContent.substring(0, 100));
                }
            }
        }
        
        return {
            text: textContent,
            html: htmlContent
        };
    }
    
    console.log('No boundary found, checking if HTML...');
    
    // Not MIME multipart - check if it's HTML or plain text
    if (body.includes('<html') || body.includes('<body') || body.includes('<!DOCTYPE') || body.includes('<div')) {
        console.log('Detected as HTML');
        return { text: '', html: body };
    }
    
    console.log('Detected as plain text');
    return { text: body, html: '' };
}

// Sanitize and render HTML email
function sanitizeAndRenderHtml(html) {
    if (!html) return '<p style="color:#a0aec0;text-align:center;padding:40px 0;">Không có nội dung HTML</p>';
    
    // Clean HTML - remove dangerous elements
    let cleanHtml = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/javascript:/gi, '');
    
    // Check if it's a simple div or needs full HTML wrapper
    const needsWrapper = !cleanHtml.includes('<!DOCTYPE') && !cleanHtml.includes('<html');
    
    if (needsWrapper) {
        cleanHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
    ${cleanHtml}
</body>
</html>`;
    }
    
    // Add responsive styles
    const styledHtml = cleanHtml.replace('</head>', `
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #2d3748;
            padding: 20px;
            margin: 0;
            background: white;
        }
        * {
            max-width: 100% !important;
            box-sizing: border-box;
        }
        img {
            max-width: 100% !important;
            height: auto !important;
            display: block;
            margin: 10px auto;
        }
        table {
            width: 100% !important;
            border-collapse: collapse;
        }
        td, th {
            padding: 8px !important;
            word-wrap: break-word !important;
        }
        a {
            color: #667eea !important;
            word-break: break-all;
        }
        div, p, span {
            word-wrap: break-word;
        }
    </style>
</head>`);
    
    // Create iframe using srcdoc (safer and simpler)
    const iframe = document.createElement('iframe');
    iframe.style.cssText = `
        width: 100%;
        min-height: 300px;
        border: 2px solid #e2e8f0;
        border-radius: 12px;
        background: white;
    `;
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('srcdoc', styledHtml);
    
    // Create container
    const container = document.createElement('div');
    container.className = 'email-html-container';
    container.appendChild(iframe);
    
    console.log('Created iframe with srcdoc');
    
    // Auto-resize iframe after content loads
    iframe.onload = function() {
        try {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            if (doc && doc.body) {
                const height = doc.body.scrollHeight;
                iframe.style.height = Math.max(height + 40, 300) + 'px';
                console.log('Iframe loaded and resized to:', iframe.style.height);
            }
        } catch (e) {
            console.warn('Could not resize iframe:', e);
            iframe.style.height = '400px';
        }
    };
    
    return container.outerHTML;
}

// Show loading overlay
function showLoading(show) {
    let loader = document.getElementById('globalLoader');
    if (!loader && show) {
        loader = document.createElement('div');
        loader.id = 'globalLoader';
        loader.innerHTML = '<div class="loader-spinner"></div>';
        loader.style.cssText = `
            position:fixed;top:0;left:0;width:100%;height:100%;
            background:rgba(255,255,255,0.9);display:flex;
            align-items:center;justify-content:center;z-index:9999;
            backdrop-filter:blur(4px);
        `;
        document.body.appendChild(loader);
    }
    if (loader) loader.style.display = show ? 'flex' : 'none';
}

// Show offline mode
function showOfflineMode() {
    currentUsername = generateRandomString(10);
    currentEmail = `${currentUsername}@${DOMAIN}`;
    document.getElementById('tempEmail').value = currentEmail;
    
    const notice = document.createElement('div');
    notice.className = 'offline-notice';
    notice.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i> 
        Không thể kết nối server. Vui lòng thử lại sau.
    `;
    notice.style.cssText = `
        background:#fef5e7;color:#d68910;padding:12px 20px;
        border-radius:12px;margin-top:12px;font-size:0.95rem;
        text-align:center;border:2px solid #f9e79f;
        font-weight:600;
    `;
    
    const existing = document.querySelector('.offline-notice');
    if (!existing) {
        document.querySelector('.email-box').appendChild(notice);
    }
}

// Generate random string
function generateRandomString(length) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Add loader spinner styles
const style = document.createElement('style');
style.textContent = `
    .loader-spinner {
        width: 60px;
        height: 60px;
        border: 5px solid #e2e8f0;
        border-top: 5px solid #667eea;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.02); }
        100% { transform: scale(1); }
    }
    .fa-spin {
        animation: spin 1s linear infinite;
    }
`;
document.head.appendChild(style);
