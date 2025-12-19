http://127.0.0.1:8000/accounts/register/
{
  "email": "testuser@example.com",
  "username": "testuser",
  "password": "StrongPassword123!"
}
{
  "email": "tanuj.web4buddy@gmail.com",
  "username": "tanuj",
  "password": "7043092004@Maa"
}


Models.py
Line-by-line Explanation
Imports:

AbstractBaseUser: Gives core user fields and password logic.

PermissionsMixin: Adds permission functionality (groups, superuser status).

BaseUserManager: Used to create users/superusers correctly.

models, timezone: For fields and time management.

CustomUserManager (Class):

Handles create_user and create_superuser (for normal and admin users).

create_user:

Validates the email.

Normalizes email formatting (like lowercasing).

Sets is_active=False (inactive, normal users).

Sets and hashes password securely.

Tracks the time when password was last changed.

create_superuser:

Ensures the account is staff/admin, superuser (can do anything), and active.

Calls main user creation method with correct flags.

CustomUser (Class, Main Model):

username: Unique name for login.

email: Unique email address.

is_active: User can log in only if True.

is_staff: Can access Django admin panel.

date_joined: When the user account was created.

password_last_changed: Tracks when password was last changed (security).

objects: Tells Django to use your custom manager.

USERNAME_FIELD and REQUIRED_FIELDS: Tells Django which fields are used for login/superuser creation.

save() (Method):

Checks if the password was changed; updates the timestamp accordingly.

Calls the parent class’s save to persist changes.

str() (Method):

For printing/displaying users, shows their username.

About PermissionsMixin
Adds Django's permission system features to your model:

Superuser status

Group and user permissions

The ability to use the is_superuser and permission checks in code/admin

This lets your app use Django’s built-in methods to check for admin rights, group membership, etc.

Summary
This structure is robust and ready for production.

Handles inactive users on registration (set to active after email verification).

Superusers are active, have full permissions/access.

Tracks password changes for security.

Uses Django’s authentication systems fully.

If you need more (admin integration, migrations, email verification logic), let me know!