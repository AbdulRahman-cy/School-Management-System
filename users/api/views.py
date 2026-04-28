from rest_framework import viewsets
from .serializers import BaseUserSerializer, TeacherProfileSerializer, StudentProfileSerializer
from users.models import BaseUser, TeacherProfile, StudentProfile
from .permissions import IsAdmin

class BaseUserViewSet(viewsets.ModelViewSet):
    queryset = BaseUser.objects.all()
    serializer_class = BaseUserSerializer


class TeacherProfileViewSet(viewsets.ModelViewSet):
    queryset = TeacherProfile.objects.all()
    serializer_class = TeacherProfileSerializer

class StudentProfileViewSet(viewsets.ModelViewSet):
    queryset = StudentProfile.objects.all()
    serializer_class = StudentProfileSerializer


from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.conf import settings

from .serializers import RegisterSerializer

# --- Helper function for setting the cookie ---
def set_jwt_cookie(response, refresh_token):
    response.set_cookie(
        key='refresh_token',
        value=str(refresh_token),
        httponly=True,  # JavaScript CANNOT access this
        secure=not settings.DEBUG,  # True in production (HTTPS), False in dev
        samesite='Lax', # Protects against CSRF
        max_age=7 * 24 * 60 * 60,  # 7 days
    )
    return response

# ---------------------------------------------------------
# 1. Registration View
# ---------------------------------------------------------
class RegisterView(APIView):
    permission_classes = [AllowAny] 

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            
            # Note: We ONLY send the access token in the JSON body
            response = Response({
                'message': 'Registration successful.',
                'access': str(refresh.access_token),
            }, status=status.HTTP_201_CREATED)
            
            # Set the refresh token securely in the cookie
            return set_jwt_cookie(response, refresh)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# ---------------------------------------------------------
# 2. Custom Login View
# ---------------------------------------------------------
class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        
        if response.status_code == 200:
            refresh_token = response.data.get('refresh')
            response = set_jwt_cookie(response, refresh_token)
            
            # Remove the refresh token from the JSON payload so React never sees it
            del response.data['refresh']
            
        return response

# ---------------------------------------------------------
# 3. Custom Token Refresh View
# ---------------------------------------------------------
class CustomTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        # Read the refresh token from the cookie instead of the JSON body
        refresh_token = request.COOKIES.get('refresh_token')
        
        if not refresh_token:
            raise InvalidToken("No valid refresh token found in cookies.")
            
        # Inject it into request.data so SimpleJWT can process it normally
        request.data['refresh'] = refresh_token
        
        response = super().post(request, *args, **kwargs)
        
        # If token rotation is enabled, save the NEW refresh token in the cookie
        if response.status_code == 200 and 'refresh' in response.data:
            response = set_jwt_cookie(response, response.data['refresh'])
            del response.data['refresh']
            
        return response

# ---------------------------------------------------------
# 4. Logout View
# ---------------------------------------------------------
class LogoutView(APIView):
    permission_classes = [IsAuthenticated] 

    def post(self, request):
        try:
            # Read from the cookie, not the payload
            refresh_token = request.COOKIES.get('refresh_token')
            
            if not refresh_token:
                return Response(
                    {"error": "No refresh token found."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            token = RefreshToken(refresh_token)
            token.blacklist()
            
            response = Response(
                {"message": "Successfully logged out."}, 
                status=status.HTTP_205_RESET_CONTENT
            )
            # Delete the cookie from the user's browser
            response.delete_cookie('refresh_token')
            return response
            
        except TokenError:
            return Response(
                {"error": "Token is invalid or already expired."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
