LinkedIn Productivity
====================

A productivity-focused tool to enhance LinkedIn usage using a Django backend
and a Chrome extension frontend.

This project includes:
- Django Backend (Python)
- Chrome Extension
- Core services for Email, OpenAI, and Google Cloud integrations


Prerequisites
-------------

Required versions:

Python version: 3.11.9  
Django version: 4.2.11

Check versions using VS Code Terminal or PowerShell:

python --version
python -m django --version


Backend Setup (Windows)
----------------------

1. Open the backend folder

- Open VS Code
- Click File → Open Folder
- Select the "backend" folder of this project


2. Create a virtual environment (only once)

Open VS Code → Terminal and run:

python -m venv venv

This creates a virtual environment inside the backend folder.


3. Activate the virtual environment

In the same terminal, run:

venv\Scripts\Activate

After activation, the terminal prompt will start with (venv).


4. Install project dependencies

Make sure the virtual environment is active and you are inside the backend folder:

pip install -r requirements.txt


Environment Configuration
-------------------------

Backend environment variables are managed using .env files.
These files are ignored by Git and should never be committed.


Example backend environment values:

DEBUG=True
SECRET_KEY=change-me-to-a-long-random-secret-string
DATABASE_URL=sqlite:///db.sqlite3
CORS_ALLOWED_ORIGINS=http://localhost:3000
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
SIMPLE_JWT_ACCESS_MINUTES=15
SIMPLE_JWT_REFRESH_DAYS=7


Core Service Environment Setup
------------------------------

1. Copy the core environment example file:

cp backend/core/.env.example backend/core/.env


2. Open backend/core/.env and add values as needed:

# -----------------------------
# Email Configuration
# -----------------------------
EMAIL_HOST_USER=""
EMAIL_HOST_PASSWORD=""

# -----------------------------
# Application Security
# -----------------------------
SECRET_KEY=""

# -----------------------------
# OpenAI Configuration
# -----------------------------
OPENAI_API_KEY=""
OPENAI_API_MODEL=""

# -----------------------------
# Google Cloud Configuration
# -----------------------------
GOOGLE_APPLICATION_CREDENTIALS=""


Database Setup
--------------

From the backend folder with the virtual environment active:

python manage.py makemigrations
python manage.py migrate

- makemigrations prepares database schema changes
- migrate applies them to the local SQLite database


Run the Backend Server
----------------------

Start the Django development server:

python manage.py runserver

The backend will be available at:

http://127.0.0.1:8000/


Chrome Extension Setup (Unpacked)
--------------------------------

1. Open Google Chrome
2. Go to: chrome://extensions
3. Enable Developer mode (top-right)
4. Click "Load unpacked"
5. Select the chrome-extension folder from this project

The extension will now appear in the extensions list.
You can pin it to the toolbar for quick access.


Important Note
--------------

Make sure the Django backend is running before using the Chrome extension.
The extension depends on backend APIs to function correctly.


Development Checklist
---------------------

- Python 3.11.9 installed
- Virtual environment created and activated
- Dependencies installed
- Environment variables configured
- Database migrations applied
- Backend server running
- Chrome extension loaded


Best Practices
--------------

- .env files are never committed
- .env.example files are used for documentation
- Secrets are kept local and secure
- Virtual environments are isolated per project
- Backend and frontend are clearly separated
