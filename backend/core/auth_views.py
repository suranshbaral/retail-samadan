from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken

from core.models import Business, Location


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '')
        business_name = data.get('business_name', '').strip()
        store_address = data.get('store_address', '').strip()
        city = data.get('city', '').strip()
        state = data.get('state', '').strip()
        zip_code = data.get('zip_code', '').strip()

        if not username or not password or not email:
            return Response({'error': 'Username, email and password are required'}, status=400)

        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already taken'}, status=400)

        if User.objects.filter(email=email).exists():
            return Response({'error': 'Email already registered'}, status=400)

        # Create user
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
        )

        # Create business
        business = Business.objects.create(
            name=business_name or f"{username}'s Store",
            owner_email=email,
        )

        # Create first location
        Location.objects.create(
            business=business,
            name='Main Store',
            address=store_address or '123 Main St',
            city=city or 'Greeley',
            state=state or 'CO',
            zip_code=zip_code or '80631',
        )

        tokens = get_tokens_for_user(user)

        return Response({
            'message': 'Account created successfully',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
            },
            'business': {
                'id': str(business.id),
                'name': business.name,
            },
            'tokens': tokens,
        }, status=201)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')

        if not username or not password:
            return Response({'error': 'Username and password required'}, status=400)

        user = authenticate(username=username, password=password)
        if not user:
            return Response({'error': 'Invalid credentials'}, status=401)

        tokens = get_tokens_for_user(user)

        # Get their business and location
        business = Business.objects.filter(owner_email=user.email).first()
        location = Location.objects.filter(business=business).first() if business else None

        return Response({
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
            },
            'business': {
                'id': str(business.id),
                'name': business.name,
            } if business else None,
            'location': {
                'id': str(location.id),
                'name': location.name,
            } if location else None,
            'tokens': tokens,
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Logged out successfully'})
        except Exception:
            return Response({'error': 'Invalid token'}, status=400)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        business = Business.objects.filter(owner_email=user.email).first()
        location = Location.objects.filter(business=business).first() if business else None

        return Response({
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
            },
            'business': {
                'id': str(business.id),
                'name': business.name,
            } if business else None,
            'location': {
                'id': str(location.id),
                'name': location.name,
            } if location else None,
        })