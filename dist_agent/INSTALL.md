# SynqX Agent Installation

## Quick Start

1. Extract this archive
2. Install dependencies:
   ```bash
   cd dist_agent
   uv venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   uv pip install packages/*.whl
   uv pip install -r requirements.txt
   ```

3. Configure and run:
   ```bash
   python main.py start
   ```

## Verification

Check installation:
```bash
python main.py --version
```

For help:
```bash
python main.py --help
```
