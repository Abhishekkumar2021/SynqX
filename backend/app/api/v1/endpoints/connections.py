from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session

from app import models
from app.api import deps
from app.schemas.connection import (
    ConnectionCreate,
    ConnectionUpdate,
    ConnectionRead,
    ConnectionDetailRead,
    ConnectionListResponse,
    ConnectionTestRequest,
    ConnectionTestResponse,
    AssetCreate,
    AssetUpdate,
    AssetRead,
    AssetDetailRead,
    AssetListResponse,
    AssetDiscoverRequest,
    AssetDiscoverResponse,
    SchemaDiscoveryRequest,
    SchemaDiscoveryResponse,
    AssetSchemaVersionRead,
    AssetSampleRead,
    ConnectionImpactRead,
    ConnectionUsageStatsRead,
    AssetBulkCreate,
    AssetBulkCreateResponse,
    ConnectionEnvironmentInfo,
)
from app.services.connection_service import ConnectionService
from app.services.audit_service import AuditService
from app.services.vault_service import VaultService
from app.core.errors import AppError
from app.core.logging import get_logger
from app.models.enums import ConnectorType, AssetType
from app.services.dependency_service import DependencyService

router = APIRouter()
logger = get_logger(__name__)


# ==================== CONNECTION ENDPOINTS ====================


@router.post(
    "",
    response_model=ConnectionDetailRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create Connection",
    description="Create a new data source/destination connection",
)
def create_connection(
    connection_create: ConnectionCreate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_editor),
):
    try:
        service = ConnectionService(db)
        connection = service.create_connection(
            connection_create,
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id
        )

        AuditService.log_event(
            db,
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id,
            event_type="connection.create",
            target_type="Connection",
            target_id=connection.id,
            details={"name": connection.name, "type": connection.connector_type.value}
        )

        return ConnectionRead.model_validate(connection)
    except AppError as e:
        logger.error(f"Error creating connection: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Bad request", "message": str(e)},
        )
    except Exception as e:
        logger.error(f"Unexpected error creating connection: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Internal server error",
                "message": "Failed to create connection",
            },
        )


@router.get(
    "",
    response_model=ConnectionListResponse,
    summary="List Connections",
    description="List all connections",
)
def list_connections(
    connector_type: Optional[ConnectorType] = Query(
        None, description="Filter by connector type"
    ),
    health_status: Optional[str] = Query(None, description="Filter by health status"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_viewer),
):
    try:
        service = ConnectionService(db)
        connections, total = service.list_connections(
            connector_type=connector_type,
            health_status=health_status,
            limit=limit,
            offset=offset,
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id
        )
        
        return ConnectionListResponse(
            connections=[ConnectionRead.model_validate(c) for c in connections],
            total=total,
            limit=limit,
            offset=offset,
        )
    except Exception as e:
        logger.error(f"Error listing connections: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Internal server error",
                "message": "Failed to list connections",
            },
        )


@router.get(
    "/{connection_id}",
    response_model=ConnectionDetailRead,
    summary="Get Connection",
    description="Get detailed information about a specific connection",
)
def get_connection(
    connection_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_viewer),
):
    service = ConnectionService(db)
    connection = service.get_connection(
        connection_id, 
        user_id=current_user.id,
        workspace_id=current_user.active_workspace_id
    )
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "Not found",
                "message": f"Connection {connection_id} not found",
            },
        )
    response = ConnectionDetailRead.model_validate(connection)
    response.asset_count = len(connection.assets) if connection.assets else 0
    try:
        response.config = VaultService.decrypt_config(connection.config_encrypted)
    except Exception:
        response.config = {"error": "Failed to decrypt configuration"}
    return response


@router.patch(
    "/{connection_id}",
    response_model=ConnectionRead,
    summary="Update Connection",
    description="Update connection details and configuration",
)
def update_connection(
    connection_id: int,
    connection_update: ConnectionUpdate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_editor),
):
    try:
        service = ConnectionService(db)
        connection = service.update_connection(
            connection_id, 
            connection_update, 
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id
        )

        AuditService.log_event(
            db,
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id,
            event_type="connection.update",
            target_type="Connection",
            target_id=connection.id,
            details={"updated_fields": connection_update.model_dump(exclude_unset=True)}
        )

        return ConnectionRead.model_validate(connection)
    except AppError as e:
        logger.error(f"Error updating connection {connection_id}: {e}")
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "Not found", "message": str(e)},
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Bad request", "message": str(e)},
        )
    except Exception as e:
        logger.error(
            f"Unexpected error updating connection {connection_id}: {e}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Internal server error",
                "message": "Failed to update connection",
            },
        )


@router.delete(
    "/{connection_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Connection",
    description="Delete a connection (soft delete by default)",
)
def delete_connection(
    connection_id: int,
    hard_delete: bool = Query(False, description="Permanently delete from database"),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_admin),
) -> None:
    try:
        service = ConnectionService(db)
        # Fetch name before deletion
        connection = service.get_connection(connection_id, user_id=current_user.id, workspace_id=current_user.active_workspace_id)
        connection_name = connection.name if connection else "Unknown"

        service.delete_connection(
            connection_id, 
            hard_delete=hard_delete, 
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id
        )

        AuditService.log_event(
            db,
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id,
            event_type="connection.delete",
            target_type="Connection",
            target_id=connection_id,
            details={"name": connection_name, "hard_delete": hard_delete}
        )

        return None
    except AppError as e:
        logger.error(f"Error deleting connection {connection_id}: {e}")
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "Not found", "message": str(e)},
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Bad request", "message": str(e)},
        )
    except Exception as e:
        logger.error(
            f"Unexpected error deleting connection {connection_id}: {e}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Internal server error",
                "message": "Failed to delete connection",
            },
        )


@router.post(
    "/{connection_id}/test",
    response_model=ConnectionTestResponse,
    summary="Test Connection",
    description="Test connection health and connectivity",
)
def test_connection(
    connection_id: int,
    test_request: ConnectionTestRequest = Body(default=ConnectionTestRequest()),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_viewer),
):
    try:
        service = ConnectionService(db)
        result = service.test_connection(
            connection_id, 
            custom_config=test_request.config, 
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id
        )
        return result
    except AppError as e:
        logger.error(f"Error testing connection {connection_id}: {e}")
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "Not found", "message": str(e)},
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Bad request", "message": str(e)},
        )
    except Exception as e:
        logger.error(
            f"Unexpected error testing connection {connection_id}: {e}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Internal server error",
                "message": "Failed to test connection",
            },
        )


@router.post(
    "/{connection_id}/discover",
    response_model=AssetDiscoverResponse,
    summary="Discover Assets",
    description="Discover available assets (tables, files, etc.) in the connection",
)
def discover_assets(
    connection_id: int,
    discover_request: AssetDiscoverRequest = Body(default=AssetDiscoverRequest()),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_viewer),
):
    try:
        service = ConnectionService(db)
        result = service.discover_assets(
            connection_id=connection_id,
            include_metadata=discover_request.include_metadata,
            pattern=discover_request.pattern,
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id
        )
        return result
    except AppError as e:
        logger.error(f"Error discovering assets for connection {connection_id}: {e}")
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "Not found", "message": str(e)},
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Bad request", "message": str(e)},
        )
    except Exception as e:
        logger.error(f"Unexpected error discovering assets: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Internal server error",
                "message": "Failed to discover assets",
            },
        )


@router.get(
    "/{connection_id}/assets",
    response_model=AssetListResponse,
    summary="List Assets for Connection",
    description="List all assets for a specific connection",
)
def list_connection_assets(
    connection_id: int,
    asset_type: Optional[AssetType] = Query(None, description="Filter by asset type"),
    is_source: Optional[bool] = Query(None, description="Filter source assets"),
    is_destination: Optional[bool] = Query(
        None, description="Filter destination assets"
    ),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_viewer),
):
    try:
        service = ConnectionService(db)
        assets, total = service.list_assets(
            connection_id=connection_id,
            asset_type=asset_type,
            is_source=is_source,
            is_destination=is_destination,
            limit=limit,
            offset=offset,
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id
        )
        return AssetListResponse(
            assets=[AssetRead.model_validate(a) for a in assets],
            total=total,
            limit=limit,
            offset=offset,
        )
    except Exception as e:
        logger.error(f"Error listing assets: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Internal server error",
                "message": "Failed to list assets",
            },
        )


@router.post(
    "/{connection_id}/assets",
    response_model=AssetDetailRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create Asset",
    description="Create a new asset for this connection",
)
def create_asset(
    connection_id: int,
    asset_create: AssetCreate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_editor),
):
    try:
        asset_create.connection_id = connection_id

        service = ConnectionService(db)
        asset = service.create_asset(
            asset_create, 
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id
        )
        response = AssetDetailRead.model_validate(asset)
        response.connection_name = asset.connection.name if asset.connection else None
        response.schema_version_count = (
            len(asset.schema_versions) if asset.schema_versions else 0
        )
        return response
    except AppError as e:
        logger.error(f"Error creating asset: {e}")
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "Not found", "message": str(e)},
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Bad request", "message": str(e)},
        )
    except Exception as e:
        logger.error(f"Unexpected error creating asset: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Internal server error",
                "message": "Failed to create asset",
            },
        )


@router.post(
    "/{connection_id}/assets/bulk-create",
    response_model=AssetBulkCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Bulk Create Assets",
    description="Create multiple assets for this connection in one request.",
)
def bulk_create_assets(
    connection_id: int,
    bulk_create_request: AssetBulkCreate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_editor),
):
    try:
        service = ConnectionService(db)
        result = service.bulk_create_assets(
            connection_id=connection_id,
            assets_to_create=bulk_create_request.assets,
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id
        )
        return AssetBulkCreateResponse(**result)
    except AppError as e:
        logger.error(f"Error during bulk asset creation for connection {connection_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Bad request", "message": str(e)},
        )
    except Exception as e:
        logger.error(f"Unexpected error during bulk asset creation: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Internal server error",
                "message": "An unexpected error occurred during bulk asset creation.",
            },
        )


@router.get(
    "/{connection_id}/assets/{asset_id}",
    response_model=AssetDetailRead,
    summary="Get Asset",
    description="Get detailed information about a specific asset",
)
def get_asset(
    connection_id: int,
    asset_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_viewer),
):
    service = ConnectionService(db)
    asset = service.get_asset(
        asset_id, 
        user_id=current_user.id,
        workspace_id=current_user.active_workspace_id
    )

    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Not found", "message": f"Asset {asset_id} not found"},
        )

    # Verify asset belongs to this connection
    if asset.connection_id != connection_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "Not found",
                "message": f"Asset {asset_id} not found in connection {connection_id}",
            },
        )

    response = AssetDetailRead.model_validate(asset)
    response.connection_name = asset.connection.name if asset.connection else None
    response.schema_version_count = (
        len(asset.schema_versions) if asset.schema_versions else 0
    )

    if asset.schema_versions:
        latest_schema = asset.schema_versions[0]
        response.latest_schema = AssetSchemaVersionRead.model_validate(latest_schema)

    return response


@router.patch(
    "/{connection_id}/assets/{asset_id}",
    response_model=AssetRead,
    summary="Update Asset",
    description="Update asset details and metadata",
)
def update_asset(
    connection_id: int,
    asset_id: int,
    asset_update: AssetUpdate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_editor),
):
    try:
        service = ConnectionService(db)
        # Check existence and permission via service
        asset = service.get_asset(
            asset_id, 
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id
        )

        if not asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "Not found", "message": f"Asset {asset_id} not found"},
            )

        if asset.connection_id != connection_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error": "Not found",
                    "message": f"Asset {asset_id} not found in connection {connection_id}",
                },
            )

        asset = service.update_asset(
            asset_id, 
            asset_update, 
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id
        )
        return AssetRead.model_validate(asset)
    except HTTPException:
        raise
    except AppError as e:
        logger.error(f"Error updating asset {asset_id}: {e}")
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "Not found", "message": str(e)},
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Bad request", "message": str(e)},
        )
    except Exception as e:
        logger.error(f"Unexpected error updating asset {asset_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Internal server error",
                "message": "Failed to update asset",
            },
        )


@router.delete(
    "/{connection_id}/assets/{asset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Asset",
    description="Delete an asset (soft delete by default)",
)
def delete_asset(
    connection_id: int,
    asset_id: int,
    hard_delete: bool = Query(False, description="Permanently delete from database"),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_admin),
) -> None:
    try:
        service = ConnectionService(db)
        asset = service.get_asset(
            asset_id, 
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id
        )

        if not asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "Not found", "message": f"Asset {asset_id} not found"},
            )

        if asset.connection_id != connection_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error": "Not found",
                    "message": f"Asset {asset_id} not found in connection {connection_id}",
                },
            )

        service.delete_asset(
            asset_id, 
            hard_delete=hard_delete, 
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id
        )
        return None
    except HTTPException:
        raise
    except AppError as e:
        logger.error(f"Error deleting asset {asset_id}: {e}")
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "Not found", "message": str(e)},
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Bad request", "message": str(e)},
        )
    except Exception as e:
        logger.error(f"Unexpected error deleting asset {asset_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Internal server error",
                "message": "Failed to delete asset",
            },
        )


@router.post(
    "/{connection_id}/assets/{asset_id}/discover-schema",
    response_model=SchemaDiscoveryResponse,
    summary="Discover Asset Schema",
    description="Discover and version the schema of an asset",
)
def discover_schema(
    connection_id: int,
    asset_id: int,
    discovery_request: SchemaDiscoveryRequest = Body(default=SchemaDiscoveryRequest()),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_viewer),
):
    try:
        service = ConnectionService(db)
        asset = service.get_asset(
            asset_id, 
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id
        )

        if not asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "Not found", "message": f"Asset {asset_id} not found"},
            )

        if asset.connection_id != connection_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error": "Not found",
                    "message": f"Asset {asset_id} not found in connection {connection_id}",
                },
            )

        result = service.discover_schema(
            asset_id=asset_id,
            sample_size=discovery_request.sample_size,
            force_refresh=discovery_request.force_refresh,
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id
        )
        return result
    except HTTPException:
        raise
    except AppError as e:
        logger.error(f"Error discovering schema for asset {asset_id}: {e}")
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "Not found", "message": str(e)},
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Bad request", "message": str(e)},
        )
    except Exception as e:
        logger.error(f"Unexpected error discovering schema: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Internal server error",
                "message": "Failed to discover schema",
            },
        )


@router.get(
    "/{connection_id}/assets/{asset_id}/schema-versions",
    response_model=List[AssetSchemaVersionRead],
    summary="List Schema Versions",
    description="Get all schema versions for an asset",
)
def list_schema_versions(
    connection_id: int,
    asset_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_viewer),
):
    service = ConnectionService(db)
    asset = service.get_asset(
        asset_id, 
        user_id=current_user.id,
        workspace_id=current_user.active_workspace_id
    )

    if not asset.schema_versions:
        return []

    return [AssetSchemaVersionRead.model_validate(v) for v in asset.schema_versions]


@router.get(
    "/{connection_id}/assets/{asset_id}/sample",
    response_model=AssetSampleRead,
    summary="Get Asset Sample Data",
    description="Fetch a sample of rows from the asset",
)
def get_asset_sample_data(
    connection_id: int,
    asset_id: int,
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_viewer),
):
    try:
        service = ConnectionService(db)
        asset = service.get_asset(
            asset_id, 
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id
        )

        if not asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "Not found", "message": f"Asset {asset_id} not found"},
            )

        if asset.connection_id != connection_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error": "Not found",
                    "message": f"Asset {asset_id} not found in connection {connection_id}",
                },
            )

        result = service.get_sample_data(
            asset_id=asset_id,
            limit=limit,
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id
        )
        return result
    except AppError as e:
        logger.error(f"Error fetching sample for asset {asset_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Bad request", "message": str(e)},
        )
    except Exception as e:
        logger.error(f"Unexpected error fetching sample: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Internal server error",
                "message": "Failed to fetch sample data",
            },
        )


@router.get(
    "/{connection_id}/impact",
    response_model=ConnectionImpactRead,
    summary="Get Connection Impact",
    description="Get number of pipelines using this connection",
)
def get_connection_impact(
    connection_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_viewer),
):
    try:
        service = ConnectionService(db)
        impact = service.get_connection_impact(
            connection_id, 
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id
        )
        return impact
    except AppError as e:
        logger.error(f"Error fetching connection impact for {connection_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Bad request", "message": str(e)},
        )
    except Exception as e:
        logger.error(f"Unexpected error fetching connection impact: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Internal server error",
                "message": "Failed to fetch connection impact",
            },
        )


@router.get(
    "/{connection_id}/usage-stats",
    response_model=ConnectionUsageStatsRead,
    summary="Get Connection Usage Stats",
    description="Get usage statistics for this connection",
)
def get_connection_usage_stats(
    connection_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_viewer),
):
    try:
        service = ConnectionService(db)
        stats = service.get_connection_usage_stats(
            connection_id, 
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id
        )
        return stats
    except AppError as e:
        logger.error(f"Error fetching connection usage stats for {connection_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Bad request", "message": str(e)},
        )
    except Exception as e:
        logger.error(f"Unexpected error fetching connection usage stats: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Internal server error",
                "message": "Failed to fetch connection usage stats",
            },
        )


@router.get(
    "/{connection_id}/environment",
    response_model=ConnectionEnvironmentInfo,
    summary="Get Connection Environment Info",
    description="Get detailed environment information (versions, tools) for the connector",
)
def get_connection_environment(
    connection_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_viewer),
):
    try:
        service = ConnectionService(db)
        info = service.get_environment_info(
            connection_id, 
            user_id=current_user.id,
            workspace_id=current_user.active_workspace_id
        )
        return info
    except AppError as e:
        logger.error(f"Error fetching environment info for {connection_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Bad request", "message": str(e)},
        )
    except Exception as e:
        logger.error(f"Unexpected error fetching environment info: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Internal server error",
                "message": "Failed to fetch environment information",
            },
        )

# --- Dependency Management ---

@router.post("/{connection_id}/environment/initialize", summary="Initialize environment")
def initialize_environment(
    connection_id: int,
    language: str = Body(..., embed=True),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_editor),
):
    try:
        service = DependencyService(db, connection_id, user_id=current_user.id)
        env = service.initialize_environment(language)
        return {"id": env.id, "status": env.status, "version": env.version}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{connection_id}/dependencies/{language}", summary="List installed packages")
def list_dependencies(
    connection_id: int,
    language: str,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_editor),
):
    try:
        service = DependencyService(db, connection_id, user_id=current_user.id)
        return service.list_packages(language)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{connection_id}/dependencies/{language}/install", summary="Install package")
def install_dependency(
    connection_id: int,
    language: str,
    package: str = Body(..., embed=True),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_editor),
):
    try:
        service = DependencyService(db, connection_id, user_id=current_user.id)
        return {"output": service.install_package(language, package)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{connection_id}/dependencies/{language}/uninstall", summary="Uninstall package")
def uninstall_dependency(
    connection_id: int,
    language: str,
    package: str = Body(..., embed=True),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    _: models.WorkspaceMember = Depends(deps.require_editor),
):
    try:
        service = DependencyService(db, connection_id, user_id=current_user.id)
        return {"output": service.uninstall_package(language, package)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
