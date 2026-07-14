export interface MappingRule<TSource = any, TDestination = any> {
  source: string | ((src: TSource) => any);
  target: string;
  transform?: (value: any, source?: TSource) => any;
  reverseTransform?: (value: any, source?: TDestination) => any;
}

export interface MapperConfiguration<TSource = any, TDestination = any> {
  mappings: MappingRule<TSource, TDestination>[];
  ignoreNullValues?: boolean;
  ignoreUndefined?: boolean;
}
