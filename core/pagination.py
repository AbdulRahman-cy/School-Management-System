from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """
    Global default for every list endpoint. Clients may ask for bigger pages
    via ?page_size=, capped at max_page_size so an unfiltered admin request
    can never serialize an entire table in one response.
    """
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 500

    def paginate_queryset(self, queryset, request, view=None):
        # Offset pagination over an unordered queryset can repeat or skip rows
        # between pages (Postgres gives no order guarantee), so fall back to pk.
        if getattr(queryset, "ordered", True) is False:
            queryset = queryset.order_by("pk")
        return super().paginate_queryset(queryset, request, view)
