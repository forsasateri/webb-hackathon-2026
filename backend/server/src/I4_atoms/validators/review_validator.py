"""
I4 Atom: Review Validator
Pure validation functions for review data.
"""


def validate_rating(rating: int) -> int:
    """
    Validate that rating is an integer between 1 and 5 inclusive.
    Returns the rating if valid, raises ValueError otherwise.
    """
    if not isinstance(rating, int) or rating < 1 or rating > 5:
        raise ValueError(f"Rating must be an integer between 1 and 5, got {rating}")
    return rating


def validate_comment(comment: str | None, max_length: int = 2000) -> str | None:
    """
    Validate and sanitize a review comment.
    - None or empty string → None
    - Strips whitespace
    - Enforces max length
    Returns cleaned comment or None. Raises ValueError if too long.
    """
    if comment is None:
        return None
    comment = comment.strip()
    if not comment:
        return None
    if len(comment) > max_length:
        raise ValueError(f"Comment must be at most {max_length} characters, got {len(comment)}")
    return comment


if __name__ == "__main__":
    # Rating tests
    assert validate_rating(1) == 1
    assert validate_rating(5) == 5
    try:
        validate_rating(0)
        assert False, "Should have raised"
    except ValueError:
        pass
    try:
        validate_rating(6)
        assert False, "Should have raised"
    except ValueError:
        pass

    # Comment tests
    assert validate_comment(None) is None
    assert validate_comment("") is None
    assert validate_comment("  ") is None
    assert validate_comment("  great course!  ") == "great course!"
    try:
        validate_comment("x" * 2001)
        assert False, "Should have raised"
    except ValueError:
        pass
    print("✅ review_validator.py OK")
