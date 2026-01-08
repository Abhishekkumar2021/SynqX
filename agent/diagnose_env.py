import sys
import os
import pkg_resources

print("--- SynqX Agent Diagnostic ---")
print(f"Python Executable: {sys.executable}")
print(f"Python Version: {sys.version}")
print(f"CWD: {os.getcwd()}")
print(f"PYTHONPATH: {sys.path}")

print("\n--- Installed Packages (Subset) ---")
required = ['pydantic', 'pydantic-settings', 'pandas', 'sqlalchemy', 'requests']
for req in required:
    try:
        ver = pkg_resources.get_distribution(req).version
        print(f"[OK] {req}: {ver}")
    except pkg_resources.DistributionNotFound:
        print(f"[ERROR] {req}: NOT FOUND")

print("\n--- Import Tests ---")
try:
    import pydantic
    print(f"[OK] pydantic imported from {pydantic.__file__}")
except ImportError as e:
    print(f"[ERROR] pydantic import failed: {e}")

try:
    import pydantic_settings
    print(f"[OK] pydantic_settings imported from {pydantic_settings.__file__}")
except ImportError as e:
    print(f"[ERROR] pydantic_settings import failed: {e}")

# Try to replicate the agent's import logic
agent_dir = os.path.dirname(os.path.abspath(__file__))
if agent_dir not in sys.path:
    sys.path.append(agent_dir)

print("\n--- Connector Import Test ---")
try:
    print("Attempting to import engine.connectors.impl.files.local...")
    from importlib.util import find_spec
    if find_spec("engine.connectors.impl.files.local"):
        print("[OK] engine.connectors.impl.files.local spec found.")
    else:
        print("[ERROR] engine.connectors.impl.files.local spec NOT found.")
except ImportError as e:
    print(f"[ERROR] Failed to import engine.connectors.impl.files.local: {e}")
except Exception as e:
    print(f"[ERROR] Unexpected error during import: {e}")