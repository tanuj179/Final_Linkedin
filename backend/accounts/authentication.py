from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken

class PasswordTimestampJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        iat = validated_token.get('iat', None)
        if iat is not None:
            password_last_changed = int(user.password_last_changed.timestamp())
            if iat < password_last_changed:
                raise InvalidToken('Session expired! Password reset required login.')
        return user
