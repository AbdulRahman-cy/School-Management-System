from datetime import timedelta

from django.conf import settings
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from users.models import BaseUser, StudentProfile, TeacherProfile

from .serializers import (
    BaseUserSerializer,
    CustomTokenObtainPairSerializer,
    RegisterSerializer,
    StudentProfileSerializer,
    TeacherProfileSerializer,
)

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
        'secure':   not settings.DEBUG,   # HTTPS-only in production
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


def set_auth_cookies(response, refresh):
    set_access_cookie(response, refresh.access_token)
    set_refresh_cookie(response, refresh)
    return response


def clear_auth_cookies(response):
    response.delete_cookie(ACCESS_COOKIE_NAME,  path='/')
    response.delete_cookie(REFRESH_COOKIE_NAME, path='/api/auth/')
    return response


# ─────────────────────────────────────────────────────────────────────
# CRUD viewsets (unchanged)
# ─────────────────────────────────────────────────────────────────────

class BaseUserViewSet(viewsets.ModelViewSet):
    queryset = BaseUser.objects.all()
    serializer_class = BaseUserSerializer


class TeacherProfileViewSet(viewsets.ModelViewSet):
    queryset = TeacherProfile.objects.all()
    serializer_class = TeacherProfileSerializer


class StudentProfileViewSet(viewsets.ModelViewSet):
    queryset = StudentProfile.objects.all()
    serializer_class = StudentProfileSerializer


# ─────────────────────────────────────────────────────────────────────
# 1. Registration
# ─────────────────────────────────────────────────────────────────────

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.save()
        refresh = CustomTokenObtainPairSerializer.get_token(user)

        response = Response(
            {
                'message': 'Registration successful.',
                'user':    BaseUserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )
        return set_auth_cookies(response, refresh)


# ─────────────────────────────────────────────────────────────────────
# 2. Login
# ─────────────────────────────────────────────────────────────────────

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

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
# 3. Refresh
# ─────────────────────────────────────────────────────────────────────

class CustomTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get(REFRESH_COOKIE_NAME)
        if not refresh_token:
            raise InvalidToken('No refresh token cookie found.')

        # SimpleJWT expects request.data['refresh']
        request.data['refresh'] = refresh_token

        response = super().post(request, *args, **kwargs)
        if response.status_code != 200:
            return response

        new_access  = response.data.get('access')
        new_refresh = response.data.get('refresh')   # only if ROTATE_REFRESH_TOKENS

        response.data = {'message': 'Token refreshed.'}

        set_access_cookie(response, new_access)
        if new_refresh:
            set_refresh_cookie(response, new_refresh)
        return response


# ─────────────────────────────────────────────────────────────────────
# 4. Logout
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
# 5. Me — current user info
# ─────────────────────────────────────────────────────────────────────

class MeView(APIView):
    """
    Returns the currently authenticated user.
    Frontend calls this on mount to ask "am I logged in, and as whom?"
    Since the JWT lives in an HttpOnly cookie, JS cannot decode it itself.
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