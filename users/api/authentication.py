"""
Custom JWT authentication that reads the access token from an HttpOnly cookie
instead of the Authorization header.

This is the foundation of the XSS-resistant strategy: JS never touches the
token, so XSS cannot exfiltrate it.

Because the browser attaches cookies automatically, cookie-authenticated
requests are CSRF-able, so they get the same CSRF check SessionAuthentication
applies: unsafe methods (POST/PUT/PATCH/DELETE) must echo the `csrftoken`
cookie back in an X-CSRFToken header. MeView hands out that cookie.
"""
from rest_framework import exceptions
from rest_framework.authentication import CSRFCheck
from rest_framework_simplejwt.authentication import JWTAuthentication


class JWTCookieAuthentication(JWTAuthentication):
    """
    Authenticates using a JWT in an HttpOnly cookie.
    Falls back to the Authorization header so curl/Postman still work in dev.
    """

    def authenticate(self, request):
        # Try header-based auth first (browsable API, dev tools, Postman).
        # No CSRF check here: browsers never attach an Authorization header on
        # their own, so a cross-site request can't carry one.
        header_result = super().authenticate(request)
        if header_result is not None:
            return header_result

        raw_token = request.COOKIES.get('access_token')
        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        user = self.get_user(validated_token)
        self.enforce_csrf(request)
        return user, validated_token

    def enforce_csrf(self, request):
        """
        Enforce CSRF validation for cookie-based authentication.
        Mirrors rest_framework.authentication.SessionAuthentication.enforce_csrf.
        """
        def dummy_get_response(request):  # pragma: no cover
            return None

        check = CSRFCheck(dummy_get_response)
        # populates request.META['CSRF_COOKIE'], which is used in process_view()
        check.process_request(request)
        reason = check.process_view(request, None, (), {})
        if reason:
            # CSRF failed, bail with explicit error message
            raise exceptions.PermissionDenied('CSRF Failed: %s' % reason)
