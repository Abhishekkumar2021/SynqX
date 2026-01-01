from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from app.models.connections import Asset
from app.core.config import settings

# Mock settings if needed or ensure PYTHONPATH is correct
# We assume standard setup
def check_asset_metrics():
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    print(f"Checking assets in DB: {settings.DATABASE_URL}")
    
    try:
        assets = db.query(Asset).limit(10).all()
        print(f"Found {len(assets)} assets.")
        
        for asset in assets:
            print(f"ID: {asset.id} | Name: {asset.name}")
            print(f"  - Rows: {asset.row_count_estimate}")
            print(f"  - Size: {asset.size_bytes_estimate}")
            print(f"  - Type: {asset.asset_type}")
            print("---")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_asset_metrics()
