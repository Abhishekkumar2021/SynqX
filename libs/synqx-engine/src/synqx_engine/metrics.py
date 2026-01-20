from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any


@dataclass
class ExecutionMetrics:
    """
    Comprehensive execution metrics for pipeline monitoring and optimization.
    Tracks performance, throughput, and resource utilization.
    """

    # Node execution metrics
    total_nodes: int = 0
    completed_nodes: int = 0
    failed_nodes: int = 0
    skipped_nodes: int = 0

    # Data processing metrics
    total_records_processed: int = 0
    total_bytes_processed: int = 0
    total_chunks_processed: int = 0

    # Timing metrics
    execution_start: datetime | None = None
    execution_end: datetime | None = None

    # Layer execution tracking
    layer_durations: dict[int, float] = field(default_factory=dict)
    node_durations: dict[str, float] = field(default_factory=dict)

    @property
    def duration_seconds(self) -> float:
        """Calculate total execution duration in seconds"""
        if self.execution_start and self.execution_end:
            return (self.execution_end - self.execution_start).total_seconds()
        elif self.execution_start:
            return (datetime.now(UTC) - self.execution_start).total_seconds()
        return 0.0

    @property
    def throughput_records_per_sec(self) -> float:
        """Calculate records processed per second"""
        duration = self.duration_seconds
        return self.total_records_processed / duration if duration > 0 else 0.0

    @property
    def throughput_mb_per_sec(self) -> float:
        """Calculate MB processed per second"""
        duration = self.duration_seconds
        mb = self.total_bytes_processed / (1024 * 1024)
        return mb / duration if duration > 0 else 0.0

    @property
    def completion_percentage(self) -> float:
        """Calculate completion percentage"""
        if self.total_nodes == 0:
            return 0.0
        return (self.completed_nodes / self.total_nodes) * 100

    @property
    def avg_records_per_node(self) -> float:
        """Calculate average records per node"""
        if self.completed_nodes == 0:
            return 0.0
        return self.total_records_processed / self.completed_nodes

    @property
    def avg_duration_per_node(self) -> float:
        """Calculate average duration per node"""
        if self.completed_nodes == 0:
            return 0.0
        return self.duration_seconds / self.completed_nodes

    def record_layer_duration(self, layer_idx: int, duration: float):
        """Record duration for a specific layer"""
        self.layer_durations[layer_idx] = duration

    def record_node_duration(self, node_id: str, duration: float):
        """Record duration for a specific node"""
        self.node_durations[node_id] = duration

    def to_dict(self) -> dict[str, Any]:
        """Convert metrics to dictionary for serialization"""
        return {
            "total_nodes": self.total_nodes,
            "completed_nodes": self.completed_nodes,
            "failed_nodes": self.failed_nodes,
            "skipped_nodes": self.skipped_nodes,
            "total_records_processed": self.total_records_processed,
            "total_bytes_processed": self.total_bytes_processed,
            "total_chunks_processed": self.total_chunks_processed,
            "duration_seconds": round(self.duration_seconds, 2),
            "throughput_records_per_sec": round(self.throughput_records_per_sec, 2),
            "throughput_mb_per_sec": round(self.throughput_mb_per_sec, 2),
            "completion_percentage": round(self.completion_percentage, 2),
            "avg_records_per_node": round(self.avg_records_per_node, 2),
            "avg_duration_per_node": round(self.avg_duration_per_node, 2),
            "execution_start": self.execution_start.isoformat()
            if self.execution_start
            else None,
            "execution_end": self.execution_end.isoformat()
            if self.execution_end
            else None,
            "layer_durations": self.layer_durations,
            "top_slowest_nodes": self._get_slowest_nodes(5),
        }

    def _get_slowest_nodes(self, limit: int = 5) -> dict[str, float]:
        """Get top N slowest nodes"""
        sorted_nodes = sorted(
            self.node_durations.items(), key=lambda x: x[1], reverse=True
        )
        return dict(sorted_nodes[:limit])

    def __str__(self) -> str:
        """Human-readable string representation"""
        return (
            f"ExecutionMetrics("
            f"nodes={self.completed_nodes}/{self.total_nodes}, "
            f"records={self.total_records_processed:,}, "
            f"duration={self.duration_seconds:.2f}s, "
            f"throughput={self.throughput_records_per_sec:.2f} rec/s"
            f")"
        )
