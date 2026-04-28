"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path
from rest_framework.authtoken import views

from rest_framework_simplejwt.views import TokenObtainPairView,TokenRefreshView

from django.urls import path
from rest_framework_simplejwt.views import TokenVerifyView
from users.api.views import (
    RegisterView, 
    LogoutView, 
    CustomTokenObtainPairView, 
    CustomTokenRefreshView
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/academics/', include('academics.api.urls')),
    path('api/users/', include('users.api.urls')),
    path('api/scheduling/', include('scheduling.api.urls')),
    path('api/records/', include('records.api.urls')),
    
    
    path("api/auth/token/", CustomTokenObtainPairView.as_view(), name="token-obtain"),
    path("api/auth/token/refresh/", CustomTokenRefreshView.as_view(), name="token-refresh"),
    path("api/auth/token/verify/", TokenVerifyView.as_view(), name="token-verify"),
    path("api/auth/register/", RegisterView.as_view(), name="register"),
    path("api/auth/logout/", LogoutView.as_view(), name="logout"),
]




