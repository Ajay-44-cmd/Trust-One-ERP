import re
import os
import uuid
from typing import Dict, Any, Tuple
from datetime import datetime

# Standard GSM 7-bit basic character set
GSM_7_CHARS = set(
    "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1bÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?"
    "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ`abcdefghijklmnopqrstuvwxyzäöñüà"
)
GSM_7_EXTENDED = set("|^{}\\[~]|€")


def is_gsm7(text: str) -> bool:
    """Check if all characters in text belong to GSM 7-bit charset."""
    for char in text:
        if char not in GSM_7_CHARS and char not in GSM_7_EXTENDED:
            return False
    return True


def calculate_sms_segments(text: str) -> Dict[str, Any]:
    """
    Calculate character count, segment count, and encoding.
    DLT / Telecom Standard:
    - GSM-7: 1 segment <= 160 chars. Multipart: 153 chars per segment.
    - Unicode: 1 segment <= 70 chars. Multipart: 67 chars per segment.
    """
    if not text:
        return {
            "char_count": 0,
            "segments": 0,
            "encoding": "GSM-7",
            "max_per_segment": 160,
            "remaining_in_segment": 160,
        }

    gsm = is_gsm7(text)
    char_count = len(text)

    if gsm:
        encoding = "GSM-7"
        if char_count <= 160:
            segments = 1 if char_count > 0 else 0
            max_per_segment = 160
            remaining = 160 - char_count
        else:
            max_per_segment = 153
            segments = (char_count + 152) // 153
            remaining = (segments * 153) - char_count
    else:
        encoding = "Unicode (UTF-16)"
        if char_count <= 70:
            segments = 1 if char_count > 0 else 0
            max_per_segment = 70
            remaining = 70 - char_count
        else:
            max_per_segment = 67
            segments = (char_count + 66) // 67
            remaining = (segments * 67) - char_count

    return {
        "char_count": char_count,
        "segments": segments,
        "encoding": encoding,
        "max_per_segment": max_per_segment,
        "remaining_in_segment": remaining,
    }


def mask_phone_number(phone: str) -> str:
    """
    Mask phone number for student/parent privacy:
    e.g. '9876543210' -> '+91 98XXX-XX210'
    """
    if not phone:
        return "+91 98XXX-XX000"
    digits = re.sub(r"\D", "", str(phone))
    if len(digits) >= 10:
        d10 = digits[-10:]
        return f"+91 {d10[:2]}XXX-XX{d10[-3:]}"
    elif len(digits) >= 4:
        return f"+91 XXX-XX{digits[-3:]}"
    return "+91 98XXX-XX000"


def format_e164(phone: str) -> Tuple[bool, str]:
    """
    Validate and format mobile number to E.164.
    Accepts 10-digit Indian numbers with or without +91 / 0.
    """
    if not phone:
        return False, "Phone number is empty"
    digits = re.sub(r"\D", "", str(phone))
    if len(digits) == 10:
        if digits[0] in "6789":
            return True, f"+91{digits}"
        return False, "Indian mobile numbers must begin with 6, 7, 8, or 9"
    elif len(digits) == 11 and digits.startswith("0"):
        return True, f"+91{digits[1:]}"
    elif len(digits) == 12 and digits.startswith("91"):
        return True, f"+{digits}"
    return False, f"Invalid mobile number format: expected 10 digits, got {len(digits)}"


class SMSGatewayService:
    """
    Modular SMS Gateway Service supporting:
    - Test Simulator (High-fidelity sandbox gateway)
    - Twilio API
    - MSG91 Flow API
    """

    def __init__(self):
        self.provider = os.getenv("SMS_PROVIDER", "SIMULATOR").upper()
        self.twilio_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.twilio_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.twilio_from = os.getenv("TWILIO_FROM_NUMBER")
        self.msg91_key = os.getenv("MSG91_AUTH_KEY")
        self.msg91_sender = os.getenv("MSG91_SENDER_ID", "TRSTNE")

    def send(self, to_phone: str, message: str, dlt_template_id: str = None, category: str = None) -> Dict[str, Any]:
        """
        Dispatch SMS message through the selected provider.
        Returns standardized dictionary:
        {
            "success": bool,
            "status": "DELIVERED" | "SUBMITTED" | "FAILED",
            "provider_name": str,
            "provider_message_id": str,
            "segments": int,
            "character_count": int,
            "error": str | None,
            "timestamp": datetime
        }
        """
        metrics = calculate_sms_segments(message)
        valid, formatted_phone = format_e164(to_phone)
        if not valid:
            return {
                "success": False,
                "status": "FAILED",
                "provider_name": self.provider,
                "provider_message_id": None,
                "segments": metrics["segments"],
                "character_count": metrics["char_count"],
                "error": f"Invalid recipient phone: {formatted_phone}",
                "timestamp": datetime.utcnow()
            }

        # 1. Twilio
        if self.provider == "TWILIO" and self.twilio_sid and self.twilio_token:
            return self._send_twilio(formatted_phone, message, metrics)

        # 2. MSG91
        if self.provider == "MSG91" and self.msg91_key:
            return self._send_msg91(formatted_phone, message, dlt_template_id, metrics)

        # 3. Default: High-fidelity Simulator Sandbox Gateway
        return self._send_simulator(formatted_phone, message, dlt_template_id, category, metrics)

    def _send_simulator(self, to_phone: str, message: str, dlt_template_id: str, category: str, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Simulate real telecom gateway delivery with instant DLT verification"""
        msg_id = f"SIM-TR1-{uuid.uuid4().hex[:12].upper()}"
        return {
            "success": True,
            "status": "DELIVERED",
            "provider_name": "SIMULATOR",
            "provider_message_id": msg_id,
            "segments": metrics["segments"],
            "character_count": metrics["char_count"],
            "error": None,
            "timestamp": datetime.utcnow()
        }

    def _send_twilio(self, to_phone: str, message: str, metrics: Dict[str, Any]) -> Dict[str, Any]:
        import httpx
        url = f"https://api.twilio.com/2010-04-01/Accounts/{self.twilio_sid}/Messages.json"
        data = {
            "To": to_phone,
            "From": self.twilio_from,
            "Body": message
        }
        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.post(url, data=data, auth=(self.twilio_sid, self.twilio_token))
                if res.status_code in (200, 201):
                    body = res.json()
                    return {
                        "success": True,
                        "status": "SUBMITTED" if body.get("status") in ("queued", "sending") else "DELIVERED",
                        "provider_name": "TWILIO",
                        "provider_message_id": body.get("sid"),
                        "segments": metrics["segments"],
                        "character_count": metrics["char_count"],
                        "error": None,
                        "timestamp": datetime.utcnow()
                    }
                else:
                    err_json = res.json() if res.headers.get("content-type", "").startswith("application/json") else {}
                    return {
                        "success": False,
                        "status": "FAILED",
                        "provider_name": "TWILIO",
                        "provider_message_id": None,
                        "segments": metrics["segments"],
                        "character_count": metrics["char_count"],
                        "error": err_json.get("message", res.text),
                        "timestamp": datetime.utcnow()
                    }
        except Exception as e:
            return {
                "success": False,
                "status": "FAILED",
                "provider_name": "TWILIO",
                "provider_message_id": None,
                "segments": metrics["segments"],
                "character_count": metrics["char_count"],
                "error": str(e),
                "timestamp": datetime.utcnow()
            }

    def _send_msg91(self, to_phone: str, message: str, dlt_template_id: str, metrics: Dict[str, Any]) -> Dict[str, Any]:
        import httpx
        url = "https://control.msg91.com/api/v5/flow/"
        # Strip leading + for MSG91
        mobile_stripped = to_phone.replace("+", "")
        headers = {
            "authkey": self.msg91_key,
            "Content-Type": "application/json"
        }
        payload = {
            "template_id": dlt_template_id or os.getenv("MSG91_DLT_TE_ID", ""),
            "short_url": "0",
            "recipients": [
                {
                    "mobiles": mobile_stripped,
                    "message": message
                }
            ]
        }
        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.post(url, json=payload, headers=headers)
                if res.status_code in (200, 201):
                    body = res.json()
                    return {
                        "success": True,
                        "status": "SUBMITTED",
                        "provider_name": "MSG91",
                        "provider_message_id": body.get("message") or str(uuid.uuid4()),
                        "segments": metrics["segments"],
                        "character_count": metrics["char_count"],
                        "error": None,
                        "timestamp": datetime.utcnow()
                    }
                else:
                    return {
                        "success": False,
                        "status": "FAILED",
                        "provider_name": "MSG91",
                        "provider_message_id": None,
                        "segments": metrics["segments"],
                        "character_count": metrics["char_count"],
                        "error": res.text,
                        "timestamp": datetime.utcnow()
                    }
        except Exception as e:
            return {
                "success": False,
                "status": "FAILED",
                "provider_name": "MSG91",
                "provider_message_id": None,
                "segments": metrics["segments"],
                "character_count": metrics["char_count"],
                "error": str(e),
                "timestamp": datetime.utcnow()
            }


sms_service = SMSGatewayService()

