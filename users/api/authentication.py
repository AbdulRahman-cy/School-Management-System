"""
Custom JWT authentication that reads the access token from an HttpOnly cookie
instead of the Authorization header.

This is the foundation of the XSS-resistant strategy: JS never touches the
token, so XSS cannot exfiltrate it.
"""
from rest_framework_simplejwt.authentication import JWTAuthentication


class JWTCookieAuthentication(JWTAuthentication):
    """
    Authenticates using a JWT in an HttpOnly cookie.
    Falls back to the Authorization header so curl/Postman still work in dev.
    """

    def authenticate(self, request):
        # Try header-based auth first (browsable API, dev tools, Postman)
        header_result = super().authenticate(request)
        if header_result is not None:
            return header_result

        raw_token = request.COOKIES.get('access_token')
        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        user = self.get_user(validated_token)
        return user, validated_token