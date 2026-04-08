using System;
using System.Web.Mvc;
using MailDomain.Models;
using MailDomain.Services;

namespace MailDomain.Controllers
{
    public class TempMailController : Controller
    {
        private static TempMailService _service = new TempMailService();

        public ActionResult Index()
        {
            return View();
        }

        [HttpPost]
        public JsonResult Register()
        {
            var account = _service.CreateAccount();
            return Json(new
            {
                username = account.Username,
                email = account.Email,
                expiresAt = account.ExpiresAt
            });
        }

        [HttpGet]
        public JsonResult GetEmails(string username)
        {
            var emails = _service.GetEmails(username);
            return Json(new { emails }, JsonRequestBehavior.AllowGet);
        }

        [HttpPost]
        public JsonResult MarkAsRead(string username, string emailId)
        {
            var email = _service.MarkAsRead(username, emailId);
            if (email != null)
            {
                return Json(new { success = true, email });
            }
            return Json(new { success = false });
        }

        [HttpPost]
        public JsonResult DeleteEmail(string username, string emailId)
        {
            bool success = _service.DeleteEmail(username, emailId);
            return Json(new { success });
        }
    }
}
