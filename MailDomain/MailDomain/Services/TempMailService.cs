using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using MailDomain.Models;

namespace MailDomain.Services
{
    public class TempMailService
    {
        private static Dictionary<string, TempMailAccount> accounts = new Dictionary<string, TempMailAccount>();
        private const string DOMAIN = "store2003.online";
        private static readonly string[] SPAM_KEYWORDS = {
            "bounce", "mailer-daemon", "postmaster", "noreply", "no-reply",
            "unsubscribe", "spam", "junk", "promo", "marketing"
        };

        public TempMailAccount CreateAccount()
        {
            string username = GenerateRandomString(10);
            var account = new TempMailAccount
            {
                Username = username,
                Email = $"{username}@{DOMAIN}",
                CreatedAt = DateTime.Now,
                ExpiresAt = DateTime.Now.AddHours(24)
            };

            accounts[username] = account;
            CleanupExpiredAccounts();
            
            return account;
        }

        public TempMailAccount GetAccount(string username)
        {
            if (accounts.ContainsKey(username))
            {
                var account = accounts[username];
                if (account.ExpiresAt > DateTime.Now)
                {
                    return account;
                }
                accounts.Remove(username);
            }
            return null;
        }

        public List<TempEmail> GetEmails(string username)
        {
            var account = GetAccount(username);
            return account?.Emails ?? new List<TempEmail>();
        }

        public void AddEmail(string username, TempEmail email)
        {
            var account = GetAccount(username);
            if (account != null)
            {
                email.Id = Guid.NewGuid().ToString();
                email.ReceivedAt = DateTime.Now;
                email.IsSpam = DetectSpam(email);
                account.Emails.Insert(0, email);
            }
        }

        public bool DeleteEmail(string username, string emailId)
        {
            var account = GetAccount(username);
            if (account != null)
            {
                var email = account.Emails.FirstOrDefault(e => e.Id == emailId);
                if (email != null)
                {
                    account.Emails.Remove(email);
                    return true;
                }
            }
            return false;
        }

        public TempEmail MarkAsRead(string username, string emailId)
        {
            var account = GetAccount(username);
            if (account != null)
            {
                var email = account.Emails.FirstOrDefault(e => e.Id == emailId);
                if (email != null)
                {
                    email.Read = true;
                    return email;
                }
            }
            return null;
        }

        private bool DetectSpam(TempEmail email)
        {
            string fromLower = (email.From ?? "").ToLower();
            string subjectLower = (email.Subject ?? "").ToLower();

            foreach (var keyword in SPAM_KEYWORDS)
            {
                if (fromLower.Contains(keyword) || subjectLower.Contains(keyword))
                {
                    return true;
                }
            }

            return fromLower.Contains("bounce+") || fromLower.Contains("=");
        }

        private void CleanupExpiredAccounts()
        {
            var expired = accounts.Where(a => a.Value.ExpiresAt < DateTime.Now)
                                 .Select(a => a.Key)
                                 .ToList();
            foreach (var key in expired)
            {
                accounts.Remove(key);
            }
        }

        private string GenerateRandomString(int length)
        {
            const string chars = "abcdefghijklmnopqrstuvwxyz0123456789";
            var random = new Random();
            return new string(Enumerable.Repeat(chars, length)
                .Select(s => s[random.Next(s.Length)]).ToArray());
        }
    }
}
