# ProSource / Seabed SQL Templates

# 1. Scope / Schema Validation
Q_SCOPE_VALIDATION = """
WITH project_name AS (
    SELECT scope, type 
    FROM SDS_ACCOUNT 
    WHERE account = {PROJECT_NAME}
) 
SELECT COALESCE(sa.scope, pn.scope) AS scope 
FROM project_name pn 
LEFT JOIN SDS_ACCOUNT sa ON sa.account = pn.scope
"""

# 2. Schema Discovery (Fallback)
Q_DISCOVER_SCHEMA = """
SELECT owner 
FROM all_tables 
WHERE table_name = 'META_ENTITY' 
ORDER BY CASE WHEN owner LIKE 'DD_%' THEN 1 ELSE 2 END, owner DESC
"""

# 3. Asset Discovery (Views/Tables with Domain Metadata)
# Uses LEFT JOIN optimization over correlated subqueries
Q_DISCOVER_ASSETS = """
SELECT 
    me.entity AS view_name, 
    NULL AS count, 
    mov.base_entity, 
    COALESCE(me2.primary_submodel, me.primary_submodel) AS domain, 
    me.description, 
    me.entity_type AS view_type 
FROM {SCHEMA_DD}.meta_entity me 
LEFT JOIN {SCHEMA_DD}.meta_object_view mov ON me.entity = mov.view_name 
LEFT JOIN {SCHEMA_DD}.meta_entity me2 ON me2.entity = mov.base_entity AND me.entity_type = 'ObjectView'
WHERE me.primary_submodel NOT IN ('Spatial','Meta','Root','System') 
AND me.entity_type IN ('View','ObjectView','Extension','Table')
"""

# 4. Schema Inference (Columns & Types)
Q_INFER_SCHEMA = """
SELECT 
    mfa.entity, 
    mfa.attribute, 
    mfa.db_type, 
    mfa.description, 
    mfa.measurement, 
    mfa.unit 
FROM {SCHEMA_DD}.meta_flat_attribute mfa 
WHERE mfa.entity = '{ASSET}'
"""

# 5. Row Count (Simple)
Q_ROW_COUNT = "SELECT COUNT(*) as cnt FROM {SCHEMA_DD}.{ASSET}"

# 6. Coordinate Reference System (CRS)
Q_CRS_INFO = """
SELECT 
    name, 
    opengis_well_known_text AS persistable_reference 
FROM {SCHEMA_DD}.r_coordinate_ref_system 
WHERE code = (
    SELECT crs 
    FROM {PROJECT}.coordinate_system 
    WHERE id = (SELECT storage_coord_sys_id FROM {PROJECT}.project_default)
)
"""

# 7. Unit System
Q_UNIT_SYSTEM = """
SELECT us.standard as namespace 
FROM {PROJECT}.project_default pd 
JOIN {SCHEMA_DD}.r_unit_system us ON pd.storage_unit_system = us.code
"""

# 8. Document Listing (Unfiltered)
Q_LIST_DOCUMENTS = """
SELECT 
    ed.document_id, 
    ed.document_format, 
    ed.document_type, 
    ed.path, 
    ed.contributor, 
    ed.name, 
    ed.original_path, 
    ed.update_date, 
    ed.insert_date, 
    ed.entity_id, 
    ed.entity_tbl, 
    ed.file_size 
FROM {PROJECT}.entity_document ed 
WHERE entity_id IN ({ENTITY_IDS})
"""

# 9. Domain Stats Aggregation
Q_DOMAIN_STATS = """
SELECT 
    COALESCE(me2.primary_submodel, me.primary_submodel) AS domain, 
    COUNT(*) as count
FROM {SCHEMA_DD}.meta_entity me 
LEFT JOIN {SCHEMA_DD}.meta_object_view mov ON me.entity = mov.view_name 
LEFT JOIN {SCHEMA_DD}.meta_entity me2 ON me2.entity = mov.base_entity AND me.entity_type = 'ObjectView'
WHERE me.primary_submodel NOT IN ('Spatial','Meta','Root','System') 
AND me.entity_type IN ('View','ObjectView','Extension','Table')
GROUP BY COALESCE(me2.primary_submodel, me.primary_submodel)
"""

# 10. Relationship Metadata (Lineage)
Q_RELATIONSHIPS_META = """
WITH relationaltable AS (
    SELECT
        ml.entity,
        ml.link,
        ml.entity_domain,
        mla.source_attribute,
        mla.target_attribute,
        ROW_NUMBER() OVER (PARTITION BY ml.entity_domain ORDER BY mla.source_attribute) AS rankedrows
    FROM {SCHEMA_DD}.meta_link ml
    JOIN {SCHEMA_DD}.meta_link_attribute mla
      ON UPPER(ml.entity) = UPPER(mla.entity)
     AND ml.link = mla.link
    WHERE UPPER(ml.entity) = UPPER('{ASSET}')
)
SELECT entity, link, entity_domain, source_attribute, target_attribute
FROM relationaltable
WHERE rankedrows = 1
"""

# 11. Reference Data Listing
Q_LIST_CRS = "SELECT * FROM {SCHEMA_DD}.r_coordinate_ref_system"
Q_LIST_UNITS = "SELECT * FROM {SCHEMA_DD}.r_unit_system"

# 12. Global Discovery
Q_LIST_ALL_DOCUMENTS = "SELECT * FROM {PROJECT}.entity_document"
Q_LIST_ACCOUNTS = "SELECT * FROM SDS_ACCOUNT"

# 13. Dashboard Diagnostics
Q_DOC_FORMAT_STATS = """
SELECT document_format as label, COUNT(*) as value 
FROM {PROJECT}.entity_document 
GROUP BY document_format 
ORDER BY value DESC
"""

Q_ENTITY_TYPE_STATS = """
SELECT entity_type as label, COUNT(*) as value 
FROM {SCHEMA_DD}.meta_entity 
WHERE primary_submodel NOT IN ('Spatial','Meta','Root','System')
GROUP BY entity_type 
ORDER BY value DESC
"""

Q_SCHEMA_SOURCE_STATS = """
SELECT source as label, COUNT(*) as value 
FROM {SCHEMA_DD}.meta_entity 
WHERE source IS NOT NULL
GROUP BY source 
ORDER BY value DESC
"""
