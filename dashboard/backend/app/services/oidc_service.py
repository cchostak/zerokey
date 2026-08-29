from typing import Any, Dict, List
import httpx
import structlog

from app.core.config import settings
from app.models.schemas import JWKSResponse, OIDCDiscoveryDoc

logger = structlog.get_logger()


class OIDCService:
    """Service to query SPIRE OIDC Discovery provider for JWKS and metadata."""

    def __init__(self):
        self.internal_url = settings.OIDC_INTERNAL_URL
        self.external_url = settings.OIDC_EXTERNAL_URL
        self.trust_domain = settings.TRUST_DOMAIN

    async def get_discovery_doc(self) -> OIDCDiscoveryDoc:
        """Fetch OIDC discovery document."""
        try:
            from app.core.metrics import oidc_requests_counter
            oidc_requests_counter.labels(endpoint="discovery").inc()
        except Exception:
            pass

        url = f"{self.internal_url}/.well-known/openid-configuration"
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    return OIDCDiscoveryDoc(
                        issuer=data.get("issuer", f"https://{self.trust_domain}"),
                        jwks_uri=data.get("jwks_uri", f"{self.external_url}/keys"),
                        authorization_endpoint=data.get("authorization_endpoint"),
                        response_types_supported=data.get("response_types_supported", ["id_token"]),
                        id_token_signing_alg_values_supported=data.get(
                            "id_token_signing_alg_values_supported", ["RS256", "ES256"]
                        ),
                    )
        except Exception as err:
            logger.debug("Failed to fetch discovery doc from provider, using fallback", error=str(err))

        # Fallback default OIDC discovery doc
        return OIDCDiscoveryDoc(
            issuer=f"https://{self.trust_domain}",
            jwks_uri=f"{self.external_url}/keys",
            response_types_supported=["id_token"],
            id_token_signing_alg_values_supported=["RS256", "ES256", "ES384"],
        )

    async def get_jwks(self) -> JWKSResponse:
        """Fetch JSON Web Key Set (JWKS)."""
        try:
            from app.core.metrics import oidc_requests_counter
            oidc_requests_counter.labels(endpoint="jwks").inc()
        except Exception:
            pass

        url = f"{self.internal_url}/keys"
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    return JWKSResponse(keys=data.get("keys", []))
        except Exception as err:
            logger.debug("Failed to fetch JWKS from provider, using fallback", error=str(err))

        # Mock fallback JWKS key for display
        return JWKSResponse(
            keys=[
                {
                    "kty": "RSA",
                    "use": "sig",
                    "kid": "spire-demo-jwt-key-2026-08",
                    "alg": "RS256",
                    "n": "u1w_mock_spire_rsa_modulus_key_example_base64url_encoded",
                    "e": "AQAB",
                }
            ]
        )

    async def check_health(self) -> bool:
        """Verify if OIDC discovery service is reachable."""
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"{self.internal_url}/.well-known/openid-configuration")
                return res.status_code == 200
        except Exception:
            return False


oidc_service = OIDCService()
