from django.contrib import admin
from django.urls import include, path

from core.admin_login import throttled_admin_login

from users.api.views import (
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
    LogoutView,
    MeView,
)

urlpatterns = [
    # Must come before admin.site.urls so it shadows the stock login view;
    # reverse('admin:login') still resolves to this same /admin/login/ URL.
    path('admin/login/', throttled_admin_login, name='throttled_admin_login'),
    path('admin/', admin.site.urls),

    # Auth lifecycle
    path('api/auth/token/',         CustomTokenObtainPairView.as_view(), name='token_obtain'),
    path('api/auth/token/refresh/', CustomTokenRefreshView.as_view(),    name='token_refresh'),
    path('api/auth/logout/',        LogoutView.as_view(),                name='logout'),
    path('api/auth/me/',            MeView.as_view(),                    name='me'),

    # App-specific CRUD
    path('api/academics/',  include('academics.api.urls')),
    path('api/users/',      include('users.api.urls')),
    path('api/scheduling/', include('scheduling.api.urls')),
    path('api/records/',    include('records.api.urls')),
]