import importlib.util, os

_path = os.path.join(os.path.dirname(__file__), "auth_service.py")
_spec = importlib.util.spec_from_file_location("auth_service", _path)
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)

register = _mod.register
login = _mod.login
get_user_by_id = _mod.get_user_by_id
