from synqx_engine.transforms.factory import TransformFactory
from synqx_engine.transforms.impl.aggregate_transform import AggregateTransform
from synqx_engine.transforms.impl.code_transform import CodeTransform
from synqx_engine.transforms.impl.dbt_transform import DbtTransform
from synqx_engine.transforms.impl.deduplicate_transform import DeduplicateTransform
from synqx_engine.transforms.impl.drop_columns_transform import DropColumnsTransform
from synqx_engine.transforms.impl.fill_nulls_transform import FillNullsTransform
from synqx_engine.transforms.impl.filter_transform import FilterTransform
from synqx_engine.transforms.impl.join_transform import JoinTransform
from synqx_engine.transforms.impl.map_transform import MapTransform
from synqx_engine.transforms.impl.merge_transform import MergeTransform
from synqx_engine.transforms.impl.noop_transform import NoOpTransform
from synqx_engine.transforms.impl.pandas_transform import PandasTransform
from synqx_engine.transforms.impl.pii_mask import PIIMaskTransform
from synqx_engine.transforms.impl.regex_replace_transform import RegexReplaceTransform
from synqx_engine.transforms.impl.rename_columns_transform import RenameColumnsTransform
from synqx_engine.transforms.impl.scd_type_2 import SCDType2Transform
from synqx_engine.transforms.impl.sort_transform import SortTransform
from synqx_engine.transforms.impl.type_cast_transform import TypeCastTransform
from synqx_engine.transforms.impl.union_transform import UnionTransform
from synqx_engine.transforms.impl.validate_transform import ValidateTransform

# Register all available transforms
# Note: We provide standardized names. Backend/Agent automatically use the high-performance Polars-based implementation.  # noqa: E501
TransformFactory.register_transform("filter", FilterTransform)
TransformFactory.register_transform("map", MapTransform)
TransformFactory.register_transform("aggregate", AggregateTransform)
TransformFactory.register_transform("join", JoinTransform)
TransformFactory.register_transform("union", UnionTransform)
TransformFactory.register_transform("merge", MergeTransform)
TransformFactory.register_transform("validate", ValidateTransform)
TransformFactory.register_transform("scd_type_2", SCDType2Transform)
TransformFactory.register_transform("pii_mask", PIIMaskTransform)
TransformFactory.register_transform("dbt", DbtTransform)
TransformFactory.register_transform("rename_columns", RenameColumnsTransform)
TransformFactory.register_transform("drop_columns", DropColumnsTransform)
TransformFactory.register_transform("deduplicate", DeduplicateTransform)
TransformFactory.register_transform("fill_nulls", FillNullsTransform)
TransformFactory.register_transform("sort", SortTransform)
TransformFactory.register_transform("type_cast", TypeCastTransform)
TransformFactory.register_transform("regex_replace", RegexReplaceTransform)
TransformFactory.register_transform("code", CodeTransform)
TransformFactory.register_transform("polars_code", CodeTransform)
TransformFactory.register_transform("noop", NoOpTransform)
TransformFactory.register_transform("pass_through", NoOpTransform)

# Keep PandasTransform for users who explicitly want to write Pandas scripts
TransformFactory.register_transform("pandas_transform", PandasTransform)
