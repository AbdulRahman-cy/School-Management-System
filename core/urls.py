from django.contrib import admin
from django.urls import include, path

from users.api.views import (
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
    LogoutView,
    MeView,
    RegisterView,
)

urlpatterns = [
    path('admin/', admin.site.urls),

    # Auth lifecycle
    path('api/auth/token/',         CustomTokenObtainPairView.as_view(), name='token_obtain'),
    path('api/auth/token/refresh/', CustomTokenRefreshView.as_view(),    name='token_refresh'),
    path('api/auth/register/',      RegisterView.as_view(),              name='register'),
    path('api/auth/logout/',        LogoutView.as_view(),                name='logout'),
    path('api/auth/me/',            MeView.as_view(),                    name='me'),

    # App-specific CRUD
    path('api/academics/',  include('academics.api.urls')),
    path('api/users/',      include('users.api.urls')),
    path('api/scheduling/', include('scheduling.api.urls')),
    path('api/records/',    include('records.api.urls')),
]