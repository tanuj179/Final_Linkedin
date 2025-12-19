from django.urls import path
from .views import save_lead_api, my_leads_api,delete_lead_api

urlpatterns = [
    path('save/', save_lead_api, name='save_lead_api'),  # POST only
    path('my/', my_leads_api, name='my_leads_api'),      # GET only
    path('delete/<int:pk>/', delete_lead_api, name='delete_lead_api'),
]
