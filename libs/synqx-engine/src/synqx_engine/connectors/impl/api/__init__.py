from synqx_engine.connectors.factory import ConnectorFactory
from synqx_engine.connectors.impl.api.airtable import AirtableConnector
from synqx_engine.connectors.impl.api.google_sheets import GoogleSheetsConnector
from synqx_engine.connectors.impl.api.graphql import GraphQLConnector
from synqx_engine.connectors.impl.api.rest import RestApiConnector
from synqx_engine.connectors.impl.api.salesforce import SalesforceConnector

ConnectorFactory.register_connector("rest_api", RestApiConnector)
ConnectorFactory.register_connector("graphql", GraphQLConnector)
ConnectorFactory.register_connector("google_sheets", GoogleSheetsConnector)
ConnectorFactory.register_connector("airtable", AirtableConnector)
ConnectorFactory.register_connector("salesforce", SalesforceConnector)
