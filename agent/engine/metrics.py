from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Dict, Any

@dataclass
class ExecutionMetrics:
    """Comprehensive execution metrics for agent monitoring."""
    total_nodes: int = 0
    completed_nodes: int = 0
    failed_nodes: int = 0
    
    total_records_processed: int = 0
    total_bytes_processed: int = 0
    
    execution_start: Optional[datetime] = None
    execution_end: Optional[datetime] = None
    
    node_durations: Dict[str, float] = field(default_factory=dict)
    
    @property
    def duration_seconds(self) -> float:
        if self.execution_start and self.execution_end:
            return (self.execution_end - self.execution_start).total_seconds()
        elif self.execution_start:
            return (datetime.utcnow() - self.execution_start).total_seconds()
        return 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_nodes": self.total_nodes,
            "completed_nodes": self.completed_nodes,
            "failed_nodes": self.failed_nodes,
            "total_records": self.total_records_processed,
            "duration": round(self.duration_seconds, 2),
            "throughput": round(self.total_records_processed / self.duration_seconds, 2) if self.duration_seconds > 0 else 0
        }
