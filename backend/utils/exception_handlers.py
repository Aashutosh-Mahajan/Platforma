from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework.response import Response
import uuid


def custom_exception_handler(exc, context):
    """Standardized error response format."""
    response = drf_exception_handler(exc, context)

    if response is None:
        return None

    error_data = {
        'error': {
            'code': _get_error_code(response.status_code),
            'message': _get_error_message(response),
            'details': response.data if isinstance(response.data, list) else [],
        },
        'request_id': str(uuid.uuid4())[:8],
    }

    # If response.data is a dict, move details
    if isinstance(response.data, dict):
        error_data['error']['details'] = [
            {'field': k, 'message': v[0] if isinstance(v, list) else str(v)}
            for k, v in response.data.items()
            if k not in ('detail',)
        ]
        if 'detail' in response.data:
            error_data['error']['message'] = str(response.data['detail'])

    response.data = error_data
    return response


def _get_error_code(status_code):
    codes = {
        400: 'BAD_REQUEST',
        401: 'UNAUTHORIZED',
        403: 'FORBIDDEN',
        404: 'NOT_FOUND',
        409: 'CONFLICT',
        422: 'VALIDATION_ERROR',
        429: 'RATE_LIMITED',
        500: 'INTERNAL_ERROR',
    }
    return codes.get(status_code, 'ERROR')


def _get_error_message(response):
    if hasattr(response, 'data') and isinstance(response.data, dict):
        return response.data.get('detail', 'An error occurred.')
    return 'An error occurred.'
