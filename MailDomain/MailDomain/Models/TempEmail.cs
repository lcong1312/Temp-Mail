using System;
using System.Collections.Generic;

namespace MailDomain.Models
{
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

    public class TempMailAccount
    {
        public string Username { get; set; }
        public string Email { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
        public List<TempEmail> Emails { get; set; }

        public TempMailAccount()
        {
            Emails = new List<TempEmail>();
        }
    }
}
