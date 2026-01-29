"""API client for AIMail service."""

from typing import Any, Optional
import httpx

from .config import get_api_url, get_token


class APIError(Exception):
    """API error exception."""
    pass


class ApiClient:
    """Client for the AIMail API."""

    def __init__(self, base_url: Optional[str] = None):
        self.base_url = base_url or get_api_url()
        self._client = httpx.Client(timeout=30.0)

    def _request(
        self,
        method: str,
        path: str,
        token: Optional[str] = None,
        **kwargs: Any
    ) -> Any:
        """Make an API request."""
        headers = {"Content-Type": "application/json"}

        if token:
            headers["Authorization"] = f"Bearer {token}"

        response = self._client.request(
            method,
            f"{self.base_url}{path}",
            headers=headers,
            **kwargs
        )

        data = response.json()

        if not data.get("success"):
            raise APIError(data.get("error", "API request failed"))

        return data.get("data")

    def _resolve_token(self, inbox_id: str, explicit_token: Optional[str] = None) -> Optional[str]:
        """Resolve token: explicit > stored > None."""
        if explicit_token:
            return explicit_token
        return get_token(inbox_id)

    def create_inbox(self) -> dict[str, Any]:
        """Create a new inbox."""
        return self._request("POST", "/inbox")

    def get_inbox(self, inbox_id: str, token: Optional[str] = None) -> dict[str, Any]:
        """Get inbox information."""
        resolved_token = self._resolve_token(inbox_id, token)
        return self._request("GET", f"/inbox/{inbox_id}", token=resolved_token)

    def delete_inbox(self, inbox_id: str, token: Optional[str] = None) -> None:
        """Delete an inbox."""
        resolved_token = self._resolve_token(inbox_id, token)
        self._request("DELETE", f"/inbox/{inbox_id}", token=resolved_token)

    def list_messages(
        self,
        inbox_id: str,
        limit: int = 20,
        offset: int = 0,
        token: Optional[str] = None
    ) -> dict[str, Any]:
        """List messages in an inbox."""
        resolved_token = self._resolve_token(inbox_id, token)
        return self._request(
            "GET",
            f"/inbox/{inbox_id}/messages?limit={limit}&offset={offset}",
            token=resolved_token
        )

    def get_message(
        self,
        inbox_id: str,
        msg_id: str,
        token: Optional[str] = None
    ) -> dict[str, Any]:
        """Get a specific message."""
        resolved_token = self._resolve_token(inbox_id, token)
        return self._request(
            "GET",
            f"/inbox/{inbox_id}/messages/{msg_id}",
            token=resolved_token
        )


# Global client instance
api = ApiClient()
