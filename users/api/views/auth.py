from datetime import timedelta

from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from users.models import BaseUser, StudentProfile, TeacherProfile
from users.api.serializers import BaseUserSerializer, CustomTokenObtainPairSerializer
from users.api.throttling import LoginRateThrottle

# ─────────────────────────────────────────────────────────────────────
# Cookie configuration
# ─────────────────────────────────────────────────────────────────────
# Both tokens live in HttpOnly cookies; JS never touches them.
# SameSite=Strict blocks CSRF for same-site SPAs without needing CSRF tokens.
# The refresh cookie is path-scoped to /api/auth/ — it is only attached to
# refresh and logout, never on regular API calls.

ACCESS_COOKIE_NAME  = 'access_token'
REFRESH_COOKIE_NAME = 'refresh_token'

ACCESS_COOKIE_MAX_AGE = int(
    settings.SIMPLE_JWT.get('ACCESS_TOKEN_LIFETIME', timedelta(minutes=15)).total_seconds()
)
REFRESH_COOKIE_MAX_AGE = int(
    settings.SIMPLE_JWT.get('REFRESH_TOKEN_LIFETIME', timedelta(days=7)).total_seconds()
)


def _cookie_kwargs(max_age: int, path: str = '/') -> dict:
    return {
        'httponly': True,
        'secure':   False,
        'samesite': 'Strict',             # blocks CSRF for same-site SPA
        'max_age':  max_age,
        'path':     path,
    }


def set_access_cookie(response, access_token):
    response.set_cookie(
        ACCESS_COOKIE_NAME,
        str(access_token),
        **_cookie_kwargs(ACCESS_COOKIE_MAX_AGE, path='/'),
    )
    return response


def set_refresh_cookie(response, refresh_token):
    # Path-scoped: never sent on regular /api/* calls
    response.set_cookie(
        REFRESH_COOKIE_NAME,
        str(refresh_token),
        **_cookie_kwargs(REFRESH_COOKIE_MAX_AGE, path='/api/auth/'),
    )
    return response


def clear_auth_cookies(response):
    response.delete_cookie(ACCESS_COOKIE_NAME,  path='/')
    response.delete_cookie(REFRESH_COOKIE_NAME, path='/api/auth/')
    return response


# ─────────────────────────────────────────────────────────────────────
# 1. Login
# ─────────────────────────────────────────────────────────────────────

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    # Setting throttle_classes replaces the global defaults, so keep the
    # per-IP anon limit alongside the per-account login limit.
    throttle_classes = [AnonRateThrottle, LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code != 200:
            return response

        access_token  = response.data.get('access')
        refresh_token = response.data.get('refresh')

        # Strip both tokens from the body — they live in cookies now
        response.data = {'message': 'Login successful.'}

        set_access_cookie(response, access_token)
        set_refresh_cookie(response, refresh_token)
        return response


# ─────────────────────────────────────────────────────────────────────
# 2. Refresh
# ─────────────────────────────────────────────────────────────────────

class CustomTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get(REFRESH_COOKIE_NAME)
        if not refresh_token:
            raise InvalidToken('No refresh token cookie found.')

        # SimpleJWT expects data['refresh']. Work on a copy: for form-encoded
        # bodies request.data is an immutable QueryDict, so writing into it
        # directly raised AttributeError (a 500) instead of refreshing.
        data = request.data.copy() if isinstance(request.data, dict) else {}
        data['refresh'] = refresh_token

        serializer = self.get_serializer(data=data)
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.args[0]) from e

        new_access  = serializer.validated_data.get('access')
        new_refresh = serializer.validated_data.get('refresh')   # only if ROTATE_REFRESH_TOKENS

        response = Response({'message': 'Token refreshed.'}, status=status.HTTP_200_OK)

        set_access_cookie(response, new_access)
        if new_refresh:
            set_refresh_cookie(response, new_refresh)
        return response


# ─────────────────────────────────────────────────────────────────────
# 3. Logout
# ─────────────────────────────────────────────────────────────────────

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.COOKIES.get(REFRESH_COOKIE_NAME)

        response = Response({'message': 'Logged out.'}, status=status.HTTP_200_OK)
        clear_auth_cookies(response)

        if refresh_token:
            try:
                RefreshToken(refresh_token).blacklist()
            except TokenError:
                pass  # already invalid; cookies are gone, that's enough

        return response


# ─────────────────────────────────────────────────────────────────────
# 4. Me — current user info
# ─────────────────────────────────────────────────────────────────────

@method_decorator(ensure_csrf_cookie, name='dispatch')
class MeView(APIView):
    """
    Returns the currently authenticated user.
    Frontend calls this on mount to ask "am I logged in, and as whom?"
    Since the JWT lives in an HttpOnly cookie, JS cannot decode it itself.

    Also sets the (JS-readable) `csrftoken` cookie. The frontend calls this on
    mount and right after login, and axios echoes the cookie back as
    X-CSRFToken on every unsafe request — which JWTCookieAuthentication requires.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        data = BaseUserSerializer(user).data

        if user.role == BaseUser.Role.STUDENT:
            sp = StudentProfile.objects.filter(user=user).first()
            data['profile_id'] = sp.id if sp else None
        elif user.role == BaseUser.Role.TEACHER:
            tp = TeacherProfile.objects.filter(user=user).first()
            data['profile_id'] = tp.id if tp else None
        else:
            data['profile_id'] = None

        return Response(data)
