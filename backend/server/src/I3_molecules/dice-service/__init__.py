import importlib.util
import os

_path = os.path.join(os.path.dirname(__file__), "dice_service.py")
_spec = importlib.util.spec_from_file_location("dice_service", _path)
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)

start_roll = _mod.start_roll
finalize_roll = _mod.finalize_roll
clear_rolls_for_course = _mod.clear_rolls_for_course
MAX_DICE_ROLL_ATTEMPTS = _mod.MAX_DICE_ROLL_ATTEMPTS
