

def is_remote_group(group_name: str | None) -> bool:
    """
    Checks if an agent group name is considered 'remote'.
    Returns True if the group is not None and not 'internal'.
    """
    return group_name is not None and group_name.lower() != "internal"
