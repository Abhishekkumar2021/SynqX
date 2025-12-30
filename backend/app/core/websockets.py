import asyncio
import json
from typing import Dict, Set, Optional
from fastapi import WebSocket, WebSocketDisconnect
from redis import asyncio as aioredis
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

class ConnectionManager:
    """
    Manages WebSocket connections and streams messages from Redis Pub/Sub.
    Uses a singleton-like pattern to share Redis listeners across multiple clients
    subscribing to the same channel.
    """
    def __init__(self):
        self.redis_url = settings.REDIS_URL
        self._active_connections: Dict[str, Set[WebSocket]] = {}
        self._redis_tasks: Dict[str, asyncio.Task] = {}
        self._redis_client: Optional[aioredis.Redis] = None

    async def _get_redis(self) -> aioredis.Redis:
        if self._redis_client is None:
            self._redis_client = aioredis.from_url(self.redis_url, decode_responses=True)
        return self._redis_client

    async def connect_and_stream(self, websocket: WebSocket, channel: str):
        """
        Accepts WebSocket and subscribes it to a logical channel.
        If no listener exists for this channel, one is started.
        """
        await websocket.accept()
        
        if channel not in self._active_connections:
            self._active_connections[channel] = set()
            # Start a new background task to listen to this Redis channel
            self._redis_tasks[channel] = asyncio.create_task(self._listen_to_redis(channel))
        
        self._active_connections[channel].add(websocket)
        logger.info(f"Client connected to channel: {channel} (Total: {len(self._active_connections[channel])})")

        try:
            # Keep the connection alive
            while True:
                # We don't expect messages from client, but we need to detect disconnect
                await websocket.receive_text()
        except WebSocketDisconnect:
            self._active_connections[channel].remove(websocket)
            logger.info(f"Client disconnected from channel {channel}")
            
            # Clean up if no more clients
            if not self._active_connections[channel]:
                if channel in self._redis_tasks:
                    self._redis_tasks[channel].cancel()
                    del self._redis_tasks[channel]
                del self._active_connections[channel]

    async def _listen_to_redis(self, channel: str):
        """
        Background task that listens to a Redis channel and broadcasts to all
        connected WebSockets for that channel.
        """
        redis = await self._get_redis()
        pubsub = redis.pubsub()
        try:
            await pubsub.subscribe(channel)
            async for message in pubsub.listen():
                if message["type"] == "message":
                    data = message["data"]
                    # Broadcast to all active websockets for this channel
                    if channel in self._active_connections:
                        # Create a list to avoid 'Set size changed during iteration'
                        websockets = list(self._active_connections[channel])
                        for ws in websockets:
                            try:
                                await ws.send_text(data)
                            except Exception:
                                # Handle broken connections that weren't caught by receive_text yet
                                if ws in self._active_connections[channel]:
                                    self._active_connections[channel].remove(ws)
        except asyncio.CancelledError:
            logger.debug(f"Redis listener for {channel} cancelled")
        except Exception as e:
            logger.error(f"Error in Redis listener for {channel}: {e}")
        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.close()

    async def broadcast(self, channel: str, message: dict):
        """
        Publishes a message to a Redis channel (Async).
        """
        redis = await self._get_redis()
        await redis.publish(channel, json.dumps(message))

    def broadcast_sync(self, channel: str, message: dict):
        """
        Synchronously publishes a message to a Redis channel.
        Useful for Celery workers.
        """
        import redis
        r = redis.from_url(self.redis_url)
        try:
            r.publish(channel, json.dumps(message))
        finally:
            r.close()

manager = ConnectionManager()
