"""Run this script after any endpoint change to regenerate openapi.yaml."""
import yaml
from main import app

spec = app.openapi()
with open("openapi.yaml", "w", encoding="utf-8") as f:
    yaml.dump(spec, f, allow_unicode=True, sort_keys=False)
print("openapi.yaml generated")
