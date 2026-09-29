"""
Regression tests for the auth hardening: no public registration, CSRF on
cookie-authenticated writes, form-encoded token refresh, and the Django admin
login throttle.
"""
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from core.admin_login import AdminLoginIPThrottle
from users.models import BaseUser


class AuthSecurityTestBase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = BaseUser.objects.create_user(
            email="admin@test.edu", password="password123",
            first_name="A", last_name="Admin", role=BaseUser.Role.ADMIN,
            is_staff=True, is_superuser=True,
        )

    def setUp(self):
        cache.clear()  # throttle counters

    def logged_in_client(self):
        client = APIClient(enforce_csrf_checks=True)
        response = client.post("/api/auth/token/", {"email": "admin@test.edu", "password": "password123"}, format="json")
        self.assertEqual(response.status_code, 200)
        return client


class PublicRegistrationRemoved(AuthSecurityTestBase):
    def test_register_endpoint_is_gone(self):
        response = APIClient().post("/api/auth/register/", {
            "email": "new@test.edu", "first_name": "N", "last_name": "U", "role": "TEACHER",
            "password": "Str0ng!pass", "password2": "Str0ng!pass",
        }, format="json")
        self.assertEqual(response.status_code, 404)
        self.assertFalse(BaseUser.objects.filter(email="new@test.edu").exists())


class CookieAuthRequiresCSRF(AuthSecurityTestBase):
    def test_me_sets_csrf_cookie(self):
        client = self.logged_in_client()
        self.assertEqual(client.get("/api/auth/me/").status_code, 200)
        self.assertIn("csrftoken", client.cookies)

    def test_unsafe_request_without_csrf_token_is_rejected(self):
        client = self.logged_in_client()
        client.get("/api/auth/me/")
        response = client.post("/api/auth/logout/", {}, format="json")
        self.assertEqual(response.status_code, 403)
        self.assertIn("CSRF", response.json()["detail"])

    def test_unsafe_request_with_csrf_token_succeeds(self):
        client = self.logged_in_client()
        client.get("/api/auth/me/")
        response = client.post(
            "/api/auth/logout/", {}, format="json",
            HTTP_X_CSRFTOKEN=client.cookies["csrftoken"].value,
        )
        self.assertEqual(response.status_code, 200)

    def test_safe_request_needs_no_csrf_token(self):
        client = self.logged_in_client()
        self.assertEqual(client.get("/api/records/exams/").status_code, 200)


class TokenRefresh(AuthSecurityTestBase):
    def test_form_encoded_refresh_does_not_500(self):
        client = self.logged_in_client()
        # multipart/form-data body → request.data is an immutable QueryDict
        response = client.post("/api/auth/token/refresh/", {"unrelated": "field"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"message": "Token refreshed."})
        self.assertIn("access_token", response.cookies)

    def test_refresh_without_cookie_is_401(self):
        self.assertEqual(APIClient().post("/api/auth/token/refresh/", {}, format="json").status_code, 401)


class AdminLoginThrottle(AuthSecurityTestBase):
    def test_admin_login_is_throttled(self):
        client = APIClient()
        limit = AdminLoginIPThrottle().num_requests
        for _ in range(limit):
            response = client.post("/admin/login/", {"username": "admin@test.edu", "password": "wrong"})
            self.assertEqual(response.status_code, 200)  # form re-rendered with an error
        response = client.post("/admin/login/", {"username": "someone-else@test.edu", "password": "wrong"})
        self.assertEqual(response.status_code, 429)
        self.assertIn("Retry-After", response)

    def test_admin_login_page_still_renders_and_logs_in(self):
        client = APIClient()
        self.assertEqual(client.get("/admin/login/").status_code, 200)
        response = client.post("/admin/login/", {"username": "admin@test.edu", "password": "password123", "next": "/admin/"})
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], "/admin/")
