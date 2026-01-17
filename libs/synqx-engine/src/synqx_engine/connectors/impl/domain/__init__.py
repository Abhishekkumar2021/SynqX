from synqx_engine.connectors.factory import ConnectorFactory
from synqx_engine.connectors.impl.domain.osdu import OSDUConnector
from synqx_engine.connectors.impl.domain.prosource import ProSourceConnector

ConnectorFactory.register_connector("osdu", OSDUConnector)
ConnectorFactory.register_connector("prosource", ProSourceConnector)
