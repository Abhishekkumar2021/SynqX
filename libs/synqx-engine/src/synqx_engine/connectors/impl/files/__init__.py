from synqx_engine.connectors.factory import ConnectorFactory
from synqx_engine.connectors.impl.files.azure_blob import AzureBlobConnector
from synqx_engine.connectors.impl.files.ftp import FTPConnector
from synqx_engine.connectors.impl.files.gcs import GCSConnector
from synqx_engine.connectors.impl.files.local import LocalFileConnector
from synqx_engine.connectors.impl.files.s3 import S3Connector
from synqx_engine.connectors.impl.files.sftp import SFTPConnector

ConnectorFactory.register_connector("local_file", LocalFileConnector)
ConnectorFactory.register_connector("s3", S3Connector)
ConnectorFactory.register_connector("gcs", GCSConnector)
ConnectorFactory.register_connector("azure_blob", AzureBlobConnector)
ConnectorFactory.register_connector("sftp", SFTPConnector)
ConnectorFactory.register_connector("ftp", FTPConnector)
