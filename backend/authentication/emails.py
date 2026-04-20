"""
Email helpers for AIM authentication — OTP delivery and platform notifications.
"""
import random
import string
import logging
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)


def generate_otp(length: int = 6) -> str:
    """Return a random numeric OTP string."""
    return ''.join(random.choices(string.digits, k=length))


def create_and_send_otp(user, email: str) -> 'EmailOTP':
    """
    Generate a fresh OTP, persist it (upsert), and email it to the user.
    Returns the EmailOTP instance.
    """
    from .models import EmailOTP  # local import avoids circular deps

    otp_code  = generate_otp()
    expiry    = timezone.now() + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)

    otp_obj, _ = EmailOTP.objects.update_or_create(
        user=user,
        defaults={
            'email':      email,
            'otp':        otp_code,
            'is_used':    False,
            'expires_at': expiry,
        },
    )

    subject = 'Your AIM Verification Code'
    message = (
        f'Hello {user.username},\n\n'
        f'Your AIM Marketplace verification code is:\n\n'
        f'    {otp_code}\n\n'
        f'This code expires in {settings.OTP_EXPIRY_MINUTES} minutes.\n'
        f'If you did not request this, you can ignore this email.\n\n'
        f'— The AIM Team'
    )
    html_message = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;
                background:#221a0f;border-radius:12px;color:#d3af86;">
      <h1 style="font-size:1.4rem;font-weight:800;
                 background:linear-gradient(90deg,#f79a32,#dc3d22);
                 -webkit-background-clip:text;-webkit-text-fill-color:transparent;">
        AIM Marketplace
      </h1>
      <p style="color:#8a7359;">Your email verification code:</p>
      <div style="font-size:2.5rem;font-weight:900;letter-spacing:0.4em;
                  color:#f79a32;padding:16px 0;">{otp_code}</div>
      <p style="font-size:0.85rem;color:#5c4228;">
        Expires in <strong>{settings.OTP_EXPIRY_MINUTES} minutes</strong>.
        If you didn't request this, ignore this email.
      </p>
    </div>
    """

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info(f"OTP email sent to {email} for user {user.username}")
    except Exception as exc:
        logger.error(f"Failed to send OTP email to {email}: {exc}")
        raise

    return otp_obj


def send_welcome_email(user) -> None:
    """Send a welcome email after successful OTP verification."""
    if not getattr(user, 'email_otp', None):
        return
    email = user.email_otp.email
    try:
        send_mail(
            subject='Welcome to AIM Marketplace',
            message=(
                f'Hello {user.username},\n\n'
                'Your account has been verified. Welcome to the Anonymous Information Marketplace.\n\n'
                'You are now ready to trade securely and anonymously.\n\n'
                '— The AIM Team'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=True,
        )
    except Exception as exc:
        logger.warning(f"Welcome email failed for {user.username}: {exc}")
