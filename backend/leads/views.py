from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Lead
from .serializers import LeadSerializer
from billing.services import check_and_increment_leads, LimitError


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_lead_api(request):
    try:
        check_and_increment_leads(request.user)
    except LimitError as e:
        return Response(
            {
                "detail": str(e),
                "limit_reached": True,
                "upgrade_url": "http://127.0.0.1:8000/home/",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    serializer = LeadSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(added_by=request.user)
        return Response(
            {"message": "Lead saved successfully!", "lead": serializer.data},
            status=status.HTTP_201_CREATED,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_leads_api(request):
    leads = Lead.objects.filter(added_by=request.user)
    serializer = LeadSerializer(leads, many=True)
    return Response(serializer.data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_lead_api(request, pk):
    try:
        lead = Lead.objects.get(pk=pk, added_by=request.user)
    except Lead.DoesNotExist:
        return Response(
            {"error": "Lead not found or not authorized"},
            status=status.HTTP_404_NOT_FOUND,
        )
    lead.delete()
    return Response(
        {"message": "Lead deleted successfully"},
        status=status.HTTP_200_OK,
    )
