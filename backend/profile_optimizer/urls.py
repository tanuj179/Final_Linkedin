from django.urls import path
from .views import VisionDebugView, ProfileAnalysisHistoryView,LatestProfileAnalysisView

urlpatterns = [
    path("vision-debug/", VisionDebugView.as_view(), name="vision-debug"),
    path("analyses/", ProfileAnalysisHistoryView.as_view(), name="profile-analyses"),
    path("latest/", LatestProfileAnalysisView.as_view(), name="profile-latest"),
]