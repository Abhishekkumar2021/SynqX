from synqx_engine.transforms.factory import TransformFactory
from synqx_engine.transforms.impl.pandas_transform import PandasTransform
from synqx_engine.transforms.impl.filter_transform import FilterTransform
from synqx_engine.transforms.impl.filter_polars import FilterPolarsTransform
from synqx_engine.transforms.impl.map_transform import MapTransform
from synqx_engine.transforms.impl.aggregate_transform import AggregateTransform
from synqx_engine.transforms.impl.join_transform import JoinTransform
from synqx_engine.transforms.impl.join_polars import JoinPolarsTransform
from synqx_engine.transforms.impl.merge_transform import MergeTransform
from synqx_engine.transforms.impl.rename_columns_transform import RenameColumnsTransform
from synqx_engine.transforms.impl.drop_columns_transform import DropColumnsTransform
from synqx_engine.transforms.impl.deduplicate_transform import DeduplicateTransform
from synqx_engine.transforms.impl.deduplicate_polars import DeduplicatePolarsTransform
from synqx_engine.transforms.impl.fill_nulls_transform import FillNullsTransform
from synqx_engine.transforms.impl.sort_transform import SortTransform
from synqx_engine.transforms.impl.type_cast_transform import TypeCastTransform
from synqx_engine.transforms.impl.regex_replace_transform import RegexReplaceTransform
from synqx_engine.transforms.impl.code_transform import CodeTransform
from synqx_engine.transforms.impl.code_polars import CodePolarsTransform
from synqx_engine.transforms.impl.union_transform import UnionTransform
from synqx_engine.transforms.impl.validate_transform import ValidateTransform
from synqx_engine.transforms.impl.validate_polars import ValidatePolarsTransform
from synqx_engine.transforms.impl.dbt_transform import DbtTransform
from synqx_engine.transforms.impl.noop_transform import NoOpTransform

# Register all available transforms
TransformFactory.register_transform("pandas_transform", PandasTransform)
TransformFactory.register_transform("filter", FilterPolarsTransform)
TransformFactory.register_transform("pandas_filter", FilterTransform)
TransformFactory.register_transform("map", MapTransform)
TransformFactory.register_transform("aggregate", AggregateTransform)
TransformFactory.register_transform("join", JoinPolarsTransform)
TransformFactory.register_transform("pandas_join", JoinTransform)
TransformFactory.register_transform("union", UnionTransform)
TransformFactory.register_transform("merge", MergeTransform)
TransformFactory.register_transform("validate", ValidatePolarsTransform)
TransformFactory.register_transform("pandas_validate", ValidateTransform)
TransformFactory.register_transform("dbt", DbtTransform)
TransformFactory.register_transform("rename_columns", RenameColumnsTransform)
TransformFactory.register_transform("drop_columns", DropColumnsTransform)
TransformFactory.register_transform("deduplicate", DeduplicatePolarsTransform)
TransformFactory.register_transform("pandas_deduplicate", DeduplicateTransform)
TransformFactory.register_transform("fill_nulls", FillNullsTransform)
TransformFactory.register_transform("sort", SortTransform)
TransformFactory.register_transform("type_cast", TypeCastTransform)
TransformFactory.register_transform("regex_replace", RegexReplaceTransform)
TransformFactory.register_transform("code", CodeTransform)
TransformFactory.register_transform("polars_code", CodePolarsTransform)
TransformFactory.register_transform("noop", NoOpTransform)
TransformFactory.register_transform("pass_through", NoOpTransform)