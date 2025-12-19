from django.urls import path
from .views import (
    GenerateCommentView,
    CommentHistoryView,
    LatestCommentView,
    CommentQuotaCheckView,
)

urlpatterns = [
    path("generate/", GenerateCommentView.as_view(), name="comment-generate"),
    path("history/", CommentHistoryView.as_view(), name="comment-history"),
    path("latest/", LatestCommentView.as_view(), name="comment-latest"),
    path("check-quota/", CommentQuotaCheckView.as_view(), name="comment-check-quota"),
]
