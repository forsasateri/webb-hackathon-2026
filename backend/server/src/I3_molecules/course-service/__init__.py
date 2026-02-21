import importlib.util, os

_path = os.path.join(os.path.dirname(__file__), "course_service.py")
_spec = importlib.util.spec_from_file_location("course_service", _path)
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)

list_courses = _mod.list_courses
get_course = _mod.get_course
get_recommendations = _mod.get_recommendations
