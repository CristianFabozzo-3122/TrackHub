def public_route(view_func):
    """
    Mark a route as public (no authentication required)
    """
    view_func.is_public = True
    return view_func