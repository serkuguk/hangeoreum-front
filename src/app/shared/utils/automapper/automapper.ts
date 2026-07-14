import { Injectable } from '@angular/core';
import {MapperConfiguration} from "@shared/interfaces/automapper.interface";

@Injectable({
  providedIn: 'root'
})
export class AutoMapperService {
  private configurations = new Map<string, MapperConfiguration>();

  createMap<TSource, TDestination>(
    name: string,
    config: MapperConfiguration<TSource, TDestination>
  ): void {
    this.configurations.set(name, config);
  }

  map<TSource, TDestination>(
    name: string,
    source: TSource
  ): TDestination {
    const config = this.configurations.get(name);
    if (!config) {
      throw new Error(`Configuración de mapeo "${name}" no encontrada`);
    }
    return this.mapObject<TSource, TDestination>(source, config, false);
  }

  mapReverse<TSource, TDestination>(
    name: string,
    destination: TDestination
  ): TSource {
    const config = this.configurations.get(name);
    if (!config) {
      throw new Error(`Configuración de mapeo "${name}" no encontrada`);
    }
    return this.mapObject<TDestination, TSource>(destination, config, true);
  }

  mapArray<TSource, TDestination>(
    name: string,
    sources: TSource[]
  ): TDestination[] {
    return sources.map(src => this.map<TSource, TDestination>(name, src));
  }

  mapArrayReverse<TSource, TDestination>(
    name: string,
    destinations: TDestination[]
  ): TSource[] {
    return destinations.map(dest => this.mapReverse<TSource, TDestination>(name, dest));
  }

  mapDirect<TSource, TDestination>(
    source: TSource,
    config: MapperConfiguration<TSource, TDestination>
  ): TDestination {
    return this.mapObject<TSource, TDestination>(source, config, false);
  }

  mapDirectReverse<TSource, TDestination>(
    destination: TDestination,
    config: MapperConfiguration<TSource, TDestination>
  ): TSource {
    return this.mapObject<TDestination, TSource>(destination, config, true);
  }

  mapArrayDirect<TSource, TDestination>(
    sources: TSource[],
    config: MapperConfiguration<TSource, TDestination>
  ): TDestination[] {
    return sources.map(src => this.mapDirect<TSource, TDestination>(src, config));
  }

  mapArrayDirectReverse<TSource, TDestination>(
    destinations: TDestination[],
    config: MapperConfiguration<TSource, TDestination>
  ): TSource[] {
    return destinations.map(dest => this.mapDirectReverse<TSource, TDestination>(dest, config));
  }

  private mapObject<TSource, TDestination>(
    source: TSource,
    config: MapperConfiguration<any, any>,
    isReverse: boolean
  ): TDestination {
    const result: any = {};

    config.mappings.forEach(rule => {
      const sourcePath = isReverse ? rule.target : (typeof rule.source === 'string' ? rule.source : null);
      const targetPath = isReverse ? (typeof rule.source === 'string' ? rule.source : null) : rule.target;

      if (!sourcePath || !targetPath) {
        // Para funciones lambda en modo normal
        if (!isReverse && typeof rule.source === 'function') {
          let value = rule.source(source);
          if (rule.transform) {
            value = rule.transform(value, source);
          }
          this.setNestedValue(result, rule.target, value);
        }
        return;
      }

      let value: any = this.getNestedValue(source, sourcePath);

      if (isReverse && rule.reverseTransform) {
        value = rule.reverseTransform(value, source);
      } else if (!isReverse && rule.transform) {
        value = rule.transform(value, source);
      }

      if (config.ignoreNullValues && value === null) {
        return;
      }
      if (config.ignoreUndefined && value === undefined) {
        return;
      }

      this.setNestedValue(result, targetPath, value);
    });

    return result as TDestination;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => {
      return current?.[prop];
    }, obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;

    const target = keys.reduce((current, key) => {
      if (!(key in current)) {
        current[key] = {};
      }
      return current[key];
    }, obj);

    target[lastKey] = value;
  }
}
