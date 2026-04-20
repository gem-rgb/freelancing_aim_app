"""
M-Pesa Daraja API integration for AIM Marketplace.
Supports both sandbox and production environments.
"""
import base64
import logging
import requests
from datetime import datetime
from django.conf import settings

logger = logging.getLogger(__name__)


def _base_url() -> str:
    env = getattr(settings, 'MPESA_ENVIRONMENT', 'sandbox')
    if env == 'production':
        return 'https://api.safaricom.co.ke'
    return 'https://sandbox.safaricom.co.ke'


def get_access_token() -> str:
    """
    Fetch a short-lived OAuth access token from Daraja.
    Raises on failure.
    """
    consumer_key    = settings.MPESA_CONSUMER_KEY
    consumer_secret = settings.MPESA_CONSUMER_SECRET

    if not consumer_key or not consumer_secret:
        raise ValueError("MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET must be set.")

    url = f"{_base_url()}/oauth/v1/generate?grant_type=client_credentials"
    resp = requests.get(url, auth=(consumer_key, consumer_secret), timeout=15)
    resp.raise_for_status()
    token = resp.json().get('access_token')
    if not token:
        raise RuntimeError(f"Daraja token response missing access_token: {resp.text}")
    return token


def _generate_password() -> tuple[str, str]:
    """
    Returns (password_b64, timestamp) for STK Push.
    password = base64(ShortCode + Passkey + Timestamp)
    """
    shortcode = settings.MPESA_SHORTCODE
    passkey   = settings.MPESA_PASSKEY
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    raw       = f"{shortcode}{passkey}{timestamp}"
    password  = base64.b64encode(raw.encode()).decode()
    return password, timestamp


def stk_push(phone: str, amount_kes: float, reference: str, description: str = '') -> dict:
    """
    Initiate an M-Pesa STK Push (Lipa Na M-Pesa Online).

    Args:
        phone: E.164 KE number, e.g. '254712345678'
        amount_kes: Amount in KES (rounded to int)
        reference: Unique payment reference (max 12 chars)
        description: Short description shown on M-Pesa prompt

    Returns:
        Daraja JSON response dict with CheckoutRequestID etc.
    """
    token     = get_access_token()
    password, timestamp = _generate_password()
    shortcode = settings.MPESA_SHORTCODE
    callback  = settings.MPESA_CALLBACK_URL
    acct_ref  = (settings.MPESA_ACCOUNT_REFERENCE or 'AIM')[:12]
    desc      = description or settings.MPESA_TRANSACTION_DESC or 'AIM Payment'

    # Sanitise phone: must be 12 digits starting with 254
    phone = phone.strip().lstrip('+').lstrip('0')
    if phone.startswith('7') or phone.startswith('1'):
        phone = '254' + phone

    payload = {
        'BusinessShortCode': shortcode,
        'Password':          password,
        'Timestamp':         timestamp,
        'TransactionType':   'CustomerPayBillOnline',
        'Amount':            int(round(amount_kes)),
        'PartyA':            phone,
        'PartyB':            shortcode,
        'PhoneNumber':       phone,
        'CallBackURL':       callback,
        'AccountReference':  acct_ref,
        'TransactionDesc':   desc[:13],
    }

    url  = f"{_base_url()}/mpesa/stkpush/v1/processrequest"
    resp = requests.post(
        url,
        json=payload,
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
        timeout=20,
    )
    resp.raise_for_status()
    data = resp.json()
    logger.info(f"STK Push initiated for {phone}: {data.get('CheckoutRequestID')}")
    return data


def query_stk_status(checkout_request_id: str) -> dict:
    """
    Query the status of a pending STK Push request.
    """
    token     = get_access_token()
    password, timestamp = _generate_password()
    shortcode = settings.MPESA_SHORTCODE

    payload = {
        'BusinessShortCode': shortcode,
        'Password':          password,
        'Timestamp':         timestamp,
        'CheckoutRequestID': checkout_request_id,
    }
    url  = f"{_base_url()}/mpesa/stkpushquery/v1/query"
    resp = requests.post(
        url,
        json=payload,
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()
