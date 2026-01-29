"""Configuration and token storage."""

import json
import os
from pathlib import Path
from typing import Optional

DEFAULT_API_URL = "https://api.aimailbox.dev"

def get_config_dir() -> Path:
    """Get the configuration directory path."""
    return Path.home() / ".aimailbox"


def get_tokens_file() -> Path:
    """Get the tokens file path."""
    return get_config_dir() / "tokens.json"


def ensure_config_dir() -> None:
    """Ensure the configuration directory exists."""
    config_dir = get_config_dir()
    config_dir.mkdir(parents=True, exist_ok=True)


def load_tokens() -> dict[str, str]:
    """Load tokens from the tokens file."""
    tokens_file = get_tokens_file()
    if not tokens_file.exists():
        return {}

    try:
        with open(tokens_file, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return {}


def save_tokens(tokens: dict[str, str]) -> None:
    """Save tokens to the tokens file."""
    ensure_config_dir()
    tokens_file = get_tokens_file()

    with open(tokens_file, "w") as f:
        json.dump(tokens, f, indent=2)

    # Set file permissions to 600 (owner read/write only)
    os.chmod(tokens_file, 0o600)


def store_token(inbox_id: str, token: str) -> None:
    """Store a token for an inbox."""
    tokens = load_tokens()
    tokens[inbox_id] = token
    save_tokens(tokens)


def get_token(inbox_id: str) -> Optional[str]:
    """Get the token for an inbox."""
    tokens = load_tokens()
    return tokens.get(inbox_id)


def remove_token(inbox_id: str) -> None:
    """Remove the token for an inbox."""
    tokens = load_tokens()
    tokens.pop(inbox_id, None)
    save_tokens(tokens)


def get_api_url() -> str:
    """Get the API URL from environment or default."""
    return os.environ.get("AIMAILBOX_API_URL", DEFAULT_API_URL)


def list_stored_inboxes() -> list[dict[str, str]]:
    """List all stored inboxes."""
    tokens = load_tokens()
    return [{"id": id, "email": f"{id}@aimailbox.dev"} for id in tokens.keys()]


def parse_inbox_id(input_str: str) -> str:
    """Extract inbox ID from either 'tuft9u' or 'tuft9u@aimailbox.dev'."""
    trimmed = input_str.strip().lower()
    if '@' in trimmed:
        return trimmed.split('@')[0]
    return trimmed
