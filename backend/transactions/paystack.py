"""
Paystack API wrapper for AIM marketplace escrow simulation.
Handles payment initialization, verification, and transfers.
"""
import hashlib
import hmac
import json
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

PAYSTACK_BASE_URL = "https://api.paystack.co"


def _headers():
    return {
        "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
        "Content-Type": "application/json",
    }


def initialize_payment(email: str, amount_ngn: float, reference: str, metadata: dict = None) -> dict:
    """
    Initialize a Paystack payment.
    amount_ngn: amount in Naira (will be converted to kobo).
    Returns authorization_url and reference.
    """
    payload = {
        "email": email or f"{reference}@aim.marketplace",
        "amount": int(amount_ngn * 100),  # kobo
        "reference": reference,
        "callback_url": f"{settings.FRONTEND_URL}/transactions/confirm",
        "metadata": metadata or {},
    }
    try:
        resp = requests.post(
            f"{PAYSTACK_BASE_URL}/transaction/initialize",
            headers=_headers(),
            json=payload,
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("status"):
            return data["data"]
        raise ValueError(data.get("message", "Paystack initialization failed"))
    except requests.RequestException as e:
        logger.error(f"Paystack initialize error: {e}")
        raise


def verify_payment(reference: str) -> dict:
    """
    Verify a Paystack payment by reference.
    Returns full transaction data dict.
    """
    try:
        resp = requests.get(
            f"{PAYSTACK_BASE_URL}/transaction/verify/{reference}",
            headers=_headers(),
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("status"):
            return data["data"]
        raise ValueError(data.get("message", "Paystack verification failed"))
    except requests.RequestException as e:
        logger.error(f"Paystack verify error: {e}")
        raise


def initiate_transfer(amount_ngn: float, recipient_code: str, reference: str, reason: str = "AIM Payout") -> dict:
    """
    Initiate a transfer to a seller (requires Transfers enabled on your Paystack account).
    """
    payload = {
        "source": "balance",
        "amount": int(amount_ngn * 100),
        "recipient": recipient_code,
        "reason": reason,
        "reference": reference,
    }
    try:
        resp = requests.post(
            f"{PAYSTACK_BASE_URL}/transfer",
            headers=_headers(),
            json=payload,
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("status"):
            return data["data"]
        raise ValueError(data.get("message", "Paystack transfer failed"))
    except requests.RequestException as e:
        logger.error(f"Paystack transfer error: {e}")
        raise


def create_transfer_recipient(name: str, account_number: str, bank_code: str) -> str:
    """Create a transfer recipient and return the recipient_code."""
    payload = {
        "type": "nuban",
        "name": name,
        "account_number": account_number,
        "bank_code": bank_code,
        "currency": "NGN",
    }
    try:
        resp = requests.post(
            f"{PAYSTACK_BASE_URL}/transferrecipient",
            headers=_headers(),
            json=payload,
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("status"):
            return data["data"]["recipient_code"]
        raise ValueError(data.get("message", "Failed to create recipient"))
    except requests.RequestException as e:
        logger.error(f"Paystack recipient error: {e}")
        raise


def verify_webhook_signature(payload: bytes, signature: str) -> bool:
    """
    Verify that an incoming webhook request is genuinely from Paystack.
    """
    secret = settings.PAYSTACK_SECRET_KEY
    if not secret:
        return False
    computed = hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha512,
    ).hexdigest()
    return hmac.compare_digest(computed, signature)
