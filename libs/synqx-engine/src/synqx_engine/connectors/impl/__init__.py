# Expose sub-packages to trigger their auto-registration
import synqx_engine.connectors.impl.api
import synqx_engine.connectors.impl.domain
import synqx_engine.connectors.impl.files
import synqx_engine.connectors.impl.generic
import synqx_engine.connectors.impl.nosql
import synqx_engine.connectors.impl.sql  # noqa: F401
