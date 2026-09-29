"""
Brute-force protection for the Django admin login.

/admin/ is a plain Django view, so the DRF throttles in settings never see it.
This wraps admin.site.login with the same cache-backed throttle machinery,
limiting login POSTs both per client IP and per submitted username (the latter
also stops an attacker who rotates IPs against a single account).
"""
import math

from django.contrib import admin
from django.http import HttpResponse
from rest_framework.throttling import SimpleRateThrottle


class AdminLoginIPThrottle(SimpleRateThrottle):
    scope = "admin_login"

    def get_cache_key(self, request, view):
        # get_ident honours REST_FRAMEWORK['NUM_PROXIES'], so behind nginx this
        # is the real client IP, not the nginx container's.
        return self.cache_format % {"scope": f"{self.scope}_ip", "ident": self.get_ident(request)}


class AdminLoginUsernameThrottle(SimpleRateThrottle):
    scope = "admin_login"

    def get_cache_key(self, request, view):
        username = request.POST.get("username", "").strip().lower()
        if not username:
            return None
        return self.cache_format % {"scope": f"{self.scope}_user", "ident": username}


def throttled_admin_login(request, extra_context=None):
    if request.method == "POST":
        for throttle in (AdminLoginIPThrottle(), AdminLoginUsernameThrottle()):
            if not throttle.allow_request(request, None):
                wait = math.ceil(throttle.wait() or 60)
                response = HttpResponse(
                    f"Too many login attempts. Try again in {wait} seconds.",
                    status=429,
                    content_type="text/plain",
                )
                response["Retry-After"] = str(wait)
                return response
    return admin.site.login(request, extra_context)
