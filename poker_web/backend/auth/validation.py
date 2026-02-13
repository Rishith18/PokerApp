"""Validation for email, username, and password (register)."""

import re
from typing import Optional, Tuple

# Simple email: something@something.something
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
# Username: alphanumeric and underscore, 3–64 chars
USERNAME_RE = re.compile(r"^[a-zA-Z0-9_]{3,64}$")
MIN_PASSWORD_LEN = 8


def validate_email(email: str) -> Tuple[bool, Optional[str]]:
    """Return (True, None) if valid, else (False, error_message)."""
    if not email or not isinstance(email, str):
        return False, "Email is required"
    email = email.strip().lower()
    if not email:
        return False, "Email is required"
    if len(email) > 255:
        return False, "Email is too long"
    if not EMAIL_RE.match(email):
        return False, "Invalid email format"
    return True, None


def validate_username(username: str) -> Tuple[bool, Optional[str]]:
    """Return (True, None) if valid, else (False, error_message)."""
    if not username or not isinstance(username, str):
        return False, "Username is required"
    username = username.strip()
    if len(username) < 3:
        return False, "Username must be at least 3 characters"
    if len(username) > 64:
        return False, "Username is too long"
    if not USERNAME_RE.match(username):
        return False, "Username may only contain letters, numbers, and underscores"
    return True, None


def validate_password(password: str) -> Tuple[bool, Optional[str]]:
    """Return (True, None) if valid, else (False, error_message)."""
    if not password or not isinstance(password, str):
        return False, "Password is required"
    if len(password) < MIN_PASSWORD_LEN:
        return False, f"Password must be at least {MIN_PASSWORD_LEN} characters"
    return True, None


def validate_register(email: str, username: str, password: str) -> Tuple[bool, Optional[str]]:
    """Validate all register fields. Returns (True, None) or (False, error_message)."""
    ok, err = validate_email(email)
    if not ok:
        return False, err
    ok, err = validate_username(username)
    if not ok:
        return False, err
    ok, err = validate_password(password)
    if not ok:
        return False, err
    return True, None
