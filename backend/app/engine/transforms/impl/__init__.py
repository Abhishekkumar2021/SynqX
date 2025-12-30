from app.engine.transforms.factory import TransformFactory
from app.engine.transforms.impl.pandas_transform import PandasTransform
from app.engine.transforms.impl.filter_transform import FilterTransform
from app.engine.transforms.impl.map_transform import MapTransform
from app.engine.transforms.impl.aggregate_transform import AggregateTransform
from app.engine.transforms.impl.join_transform import JoinTransform
from app.engine.transforms.impl.merge_transform import MergeTransform
from app.engine.transforms.impl.rename_columns_transform import RenameColumnsTransform
from app.engine.transforms.impl.drop_columns_transform import DropColumnsTransform
from app.engine.transforms.impl.deduplicate_transform import DeduplicateTransform
from app.engine.transforms.impl.fill_nulls_transform import FillNullsTransform
from app.engine.transforms.impl.sort_transform import SortTransform
from app.engine.transforms.impl.type_cast_transform import TypeCastTransform
from app.engine.transforms.impl.regex_replace_transform import RegexReplaceTransform
from app.engine.transforms.impl.code_transform import CodeTransform
from app.engine.transforms.impl.union_transform import UnionTransform
from app.engine.transforms.impl.validate_transform import ValidateTransform
from app.engine.transforms.impl.noop_transform import NoOpTransform

# Register all available transforms
TransformFactory.register_transform("pandas_transform", PandasTransform)
TransformFactory.register_transform("filter", FilterTransform)
TransformFactory.register_transform("map", MapTransform)
TransformFactory.register_transform("aggregate", AggregateTransform)
TransformFactory.register_transform("join", JoinTransform)
TransformFactory.register_transform("union", UnionTransform)
TransformFactory.register_transform("merge", MergeTransform)
TransformFactory.register_transform("validate", ValidateTransform)
TransformFactory.register_transform("rename_columns", RenameColumnsTransform)
TransformFactory.register_transform("drop_columns", DropColumnsTransform)
TransformFactory.register_transform("deduplicate", DeduplicateTransform)
TransformFactory.register_transform("fill_nulls", FillNullsTransform)
TransformFactory.register_transform("sort", SortTransform)
TransformFactory.register_transform("type_cast", TypeCastTransform)
TransformFactory.register_transform("regex_replace", RegexReplaceTransform)
TransformFactory.register_transform("code", CodeTransform)
TransformFactory.register_transform("noop", NoOpTransform)
TransformFactory.register_transform("pass_through", NoOpTransform)