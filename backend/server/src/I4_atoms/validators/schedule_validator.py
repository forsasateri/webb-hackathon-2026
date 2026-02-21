"""
I4 Atom: Schedule Validator
Pure function for detecting time-slot conflicts within the same period.
"""


def check_slot_conflict(
    existing_slots: list[tuple[int, int]],
    new_slots: list[tuple[int, int]],
) -> list[tuple[int, int]]:
    """
    Check if any new (period, slot) pairs conflict with existing ones.
    Conflict = same period AND same slot.

    Args:
        existing_slots: list of (period, slot) tuples the user already occupies.
        new_slots: list of (period, slot) tuples the target course occupies.

    Returns:
        list of conflicting (period, slot) tuples. Empty list = no conflict.
    """
    existing_set = set(existing_slots)
    return [ps for ps in new_slots if ps in existing_set]


if __name__ == "__main__":
    # User already has period=1/slot=2 and period=3/slot=1
    existing = [(1, 2), (3, 1)]
    # New course wants period=1/slot=2 and period=2/slot=3
    new = [(1, 2), (2, 3)]
    conflicts = check_slot_conflict(existing, new)
    print(f"Conflicts: {conflicts}")  # [(1, 2)]
    assert conflicts == [(1, 2)]

    # No conflict case
    assert check_slot_conflict([(1, 1)], [(1, 2), (2, 1)]) == []
    print("✅ schedule_validator.py OK")
