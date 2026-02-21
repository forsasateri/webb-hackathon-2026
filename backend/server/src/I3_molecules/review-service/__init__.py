import importlib.util, os

_path = os.path.join(os.path.dirname(__file__), "review_service.py")
_spec = importlib.util.spec_from_file_location("review_service", _path)
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)

get_reviews = _mod.get_reviews
create_review = _mod.create_review
delete_review = _mod.delete_review
