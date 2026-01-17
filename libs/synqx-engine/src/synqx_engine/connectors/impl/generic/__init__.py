from synqx_engine.connectors.factory import ConnectorFactory
from synqx_engine.connectors.impl.generic.custom_script import CustomScriptConnector
from synqx_engine.connectors.impl.generic.dbt import DbtConnector

ConnectorFactory.register_connector("custom_script", CustomScriptConnector)
ConnectorFactory.register_connector("dbt", DbtConnector)