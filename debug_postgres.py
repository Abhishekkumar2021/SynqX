import sys
import os
import pandas as pd
from sqlalchemy import create_engine, text

# 1. Setup Environment & Path
os.environ["DATABASE_URL"] = "postgresql://postgres:postgres@localhost:5432/synqx_db"
sys.path.append(os.getcwd() + "/backend")

# 2. Direct SQLAlchemy Connection Test
print("\n--- 1. Direct SQLAlchemy Connection Test ---")
try:
    db_url = os.environ["DATABASE_URL"]
    engine = create_engine(db_url)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT count(*) FROM environments"))
        count = result.scalar()
        print(f"Direct SQL Count from 'environments': {count}")
        
        result = conn.execute(text("SELECT * FROM environments LIMIT 1"))
        row = result.mappings().fetchone()
        print(f"Direct SQL Sample Row: {row}")
except Exception as e:
    print(f"Direct Connection Failed: {e}")
    sys.exit(1)

# 3. Connector Test
print("\n--- 2. PostgresConnector Test ---")
try:
    from app.connectors.impl.sql.postgres import PostgresConnector
    
    config = {
        "host": "localhost",
        "port": 5432,
        "database": "synqx_db",
        "db_schema": "public",
        "username": "postgres",
        "password": "postgres"
    }
    
    connector = PostgresConnector(config)
    
    # Test execute_query
    print("\n[execute_query] Testing 'SELECT * FROM environments'...")
    results = connector.execute_query("SELECT * FROM environments", limit=10)
    print(f"Results Count: {len(results)}")
    if results:
        print(f"First Result: {results[0]}")
    else:
        print("WARN: No results returned from execute_query")

    # Test read_batch (Extraction)
    print("\n[read_batch] Testing extraction for 'environments'...")
    chunks = []
    for chunk in connector.read_batch("environments", limit=10):
        chunks.append(chunk)
    
    if chunks:
        full_df = pd.concat(chunks)
        print(f"Extracted DF Shape: {full_df.shape}")
        print(f"Extracted Rows: {len(full_df)}")
    else:
        print("WARN: No chunks returned from read_batch")

except Exception as e:
    print(f"Connector Test Failed: {e}")
    import traceback
    traceback.print_exc()
