from rest_framework.throttling import SimpleRateThrottle


class LoginRateThrottle(SimpleRateThrottle):
    """
    Limits login attempts per target account (the submitted email), not per
    IP. Password guessing is aimed at an account, and on a campus network many
    students share one public IP, so a tight per-IP limit would lock out
    legitimate users while barely slowing an attacker who rotates IPs. The
    global AnonRateThrottle still caps raw request volume per IP.
    """
    scope = "login"

    def get_cache_key(self, request, view):
        data = request.data if isinstance(request.data, dict) else {}
        email = data.get("email")
        if not isinstance(email, str) or not email.strip():
            return None  # nothing to key on; the serializer will reject the request anyway
        return self.cache_format % {"scope": self.scope, "ident": email.strip().lower()}
