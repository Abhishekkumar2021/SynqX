import logging
import importlib
from engine.transforms.factory import TransformFactory

logger = logging.getLogger("SynqX-Agent")

def _register(name, module_path, class_name):
    try:
        mod = importlib.import_module(module_path)
        cls = getattr(mod, class_name)
        TransformFactory.register_transform(name, cls)
    except ImportError as e:
        logger.warning(f"Transform '{name}' skipped due to missing dependency: {e}")
    except Exception as e:
        logger.warning(f"Error registering transform '{name}': {e}")

# Core Transforms
_register("pandas_transform", "engine.transforms.impl.pandas_transform", "PandasTransform")
_register("filter", "engine.transforms.impl.filter_transform", "FilterTransform")
_register("map", "engine.transforms.impl.map_transform", "MapTransform")
_register("aggregate", "engine.transforms.impl.aggregate_transform", "AggregateTransform")
_register("join", "engine.transforms.impl.join_transform", "JoinTransform")
_register("union", "engine.transforms.impl.union_transform", "UnionTransform")
_register("merge", "engine.transforms.impl.merge_transform", "MergeTransform")
_register("validate", "engine.transforms.impl.validate_transform", "ValidateTransform")

# Cleaning & Shaping
_register("rename_columns", "engine.transforms.impl.rename_columns_transform", "RenameColumnsTransform")
_register("drop_columns", "engine.transforms.impl.drop_columns_transform", "DropColumnsTransform")
_register("deduplicate", "engine.transforms.impl.deduplicate_transform", "DeduplicateTransform")
_register("fill_nulls", "engine.transforms.impl.fill_nulls_transform", "FillNullsTransform")
_register("sort", "engine.transforms.impl.sort_transform", "SortTransform")
_register("type_cast", "engine.transforms.impl.type_cast_transform", "TypeCastTransform")
_register("regex_replace", "engine.transforms.impl.regex_replace_transform", "RegexReplaceTransform")

# Advanced
_register("code", "engine.transforms.impl.code_transform", "CodeTransform")
_register("noop", "engine.transforms.impl.noop_transform", "NoOpTransform")
_register("pass_through", "engine.transforms.impl.noop_transform", "NoOpTransform")