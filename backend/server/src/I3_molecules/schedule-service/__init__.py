import importlib.util, os

_path = os.path.join(os.path.dirname(__file__), "schedule_service.py")
_spec = importlib.util.spec_from_file_location("schedule_service", _path)
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)

enroll = _mod.enroll
drop = _mod.drop
get_schedule = _mod.get_schedule
