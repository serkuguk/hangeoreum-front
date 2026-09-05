import {Dirent, readFileSync, readdirSync} from 'node:fs';
import {join, relative, resolve} from 'node:path';
import ts from 'typescript';

interface TemplateSource {
  content: string;
  file: string;
  offset: number;
  sourceFile: string;
}

interface Violation {
  file: string;
  line: number;
  message: string;
}

const projectRoot = process.cwd();
const sourceRoots = [
  join(projectRoot, 'src', 'app', 'features'),
  join(projectRoot, 'src', 'app', 'layouts'),
];

const nativeFieldPattern = /<\s*(input|select|textarea)\b/gi;
const nativeButtonPattern = /<button\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
const primeMarkupPattern = /<\s*p-(button|select|checkbox|toggleswitch|textarea|dialog|fileupload|inputnumber)\b|\bp(Button|InputText|InputTextarea)\b/gi;
const primeImportPattern = /from\s*['"]primeng\/(button|inputtext|select|checkbox|toggleswitch|textarea|dialog|fileupload|inputnumber)['"]/gi;
const inlineTemplatePattern = /\btemplate\s*:\s*(`(?:\\[\s\S]|[^`])*`|'(?:\\.|[^'])*'|"(?:\\.|[^"])*")/g;

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, {withFileTypes: true})
    .flatMap((entry: Dirent) => entry.isDirectory()
      ? sourceFiles(join(directory, entry.name))
      : /\.(html|ts)$/.test(entry.name) && !entry.name.endsWith('.spec.ts')
        ? [join(directory, entry.name)]
        : [])
    .sort();
}

function displayPath(file: string): string {
  return relative(projectRoot, file).replace(/\\/g, '/');
}

function lineAt(source: string, index: number): number {
  return source.slice(0, index).split('\n').length;
}

function templates(file: string): TemplateSource[] {
  const sourceFile = readFileSync(file, 'utf8');
  if (file.endsWith('.html')) {
    return [{content: sourceFile, file: displayPath(file), offset: 0, sourceFile}];
  }

  return [...sourceFile.matchAll(inlineTemplatePattern)].map(match => {
    const literal = match[1];
    const content = literal.slice(1, -1);
    return {
      content,
      file: displayPath(file),
      offset: (match.index ?? 0) + match[0].indexOf(literal) + 1,
      sourceFile,
    };
  });
}

function templateLine(template: TemplateSource, matchIndex: number): number {
  return lineAt(template.sourceFile, template.offset + matchIndex);
}

const config = ts.readConfigFile(join(projectRoot, 'tsconfig.json'), ts.sys.readFile);
const compilerOptions = ts.parseJsonConfigFileContent(config.config, ts.sys, projectRoot).options;
const publicBoundaries: Record<string, readonly string[]> = {
  identity: ['gamification/public-api.ts'],
  dashboard: ['learning/course-path.ts'],
  learning: ['vocabulary/public-api.ts'],
  media: ['vocabulary/public-api.ts'],
};

function dependencies(source: ts.SourceFile, unresolved: ts.Node[] = []): ts.StringLiteralLike[] {
  const imports: ts.StringLiteralLike[] = [];
  function visit(node: ts.Node): void {
    let target: ts.Node | undefined;
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) target = node.moduleSpecifier;
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      target = node.moduleReference.expression;
    }
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) target = node.argument.literal;
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword
      || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
      target = node.arguments[0];
      if (!target || !ts.isStringLiteralLike(target)) unresolved.push(node);
    }
    if (target && ts.isStringLiteralLike(target)) imports.push(target);
    ts.forEachChild(node, visit);
  }
  visit(source);
  return imports;
}

function boundaryIssue(from: string, to: string, specifier: string): string | null {
  const owner = from.match(/^src\/app\/features\/([^/]+)\//)?.[1];
  const target = to.match(/^src\/app\/features\/(.+)$/)?.[1];
  const targetOwner = target?.split('/')[0];
  if (from.includes('/domain/') && (
    specifier.startsWith('@angular/') || specifier.startsWith('@ngx-translate/')
    || specifier.startsWith('primeng/') || /^src\/app\/(core|layouts)\//.test(to)
    || (target && (targetOwner !== owner || !target.startsWith(`${owner}/domain/`)))
  )) return 'domain must remain independent from framework and outer layers';
  if (/^src\/app\/(core|shared)\//.test(from) && target) return 'core/shared must not depend on features';
  if (owner && target && owner !== targetOwner && !publicBoundaries[owner]?.includes(target)) {
    return 'cross-feature dependency must use an explicitly allowed public entry point';
  }
  return null;
}

function featureCycles(edges: Map<string, Set<string>>): string[][] {
  const visited = new Set<string>();
  const active: string[] = [];
  const cycles: string[][] = [];
  function visit(feature: string): void {
    const start = active.indexOf(feature);
    if (start !== -1) {
      cycles.push([...active.slice(start), feature]);
      return;
    }
    if (visited.has(feature)) return;
    active.push(feature);
    for (const target of edges.get(feature) ?? []) visit(target);
    active.pop();
    visited.add(feature);
  }
  for (const feature of edges.keys()) visit(feature);
  return cycles;
}

describe('shared UI architecture', () => {
  const files = sourceRoots.flatMap(sourceFiles);

  it('keeps native fields and PrimeNG controls inside shared components', () => {
    const violations: Violation[] = [];

    for (const file of files) {
      const source = readFileSync(file, 'utf8');

      if (file.endsWith('.ts')) {
        for (const match of source.matchAll(primeImportPattern)) {
          violations.push({
            file: displayPath(file),
            line: lineAt(source, match.index ?? 0),
            message: `PrimeNG ${match[1]} must be wrapped by a shared component`,
          });
        }
      }

      for (const template of templates(file)) {
        const content = template.content.replace(/<!--[\s\S]*?-->/g, match => ' '.repeat(match.length));

        for (const match of content.matchAll(nativeFieldPattern)) {
          violations.push({
            file: template.file,
            line: templateLine(template, match.index ?? 0),
            message: `raw <${match[1].toLowerCase()}> must use a shared control`,
          });
        }

        for (const match of content.matchAll(primeMarkupPattern)) {
          violations.push({
            file: template.file,
            line: templateLine(template, match.index ?? 0),
            message: `direct PrimeNG ${match[0].trim()} must use a shared control`,
          });
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('allows native buttons only for explicit domain interactions', () => {
    const violations: Violation[] = [];

    for (const file of files) {
      for (const template of templates(file)) {
        const content = template.content.replace(/<!--[\s\S]*?-->/g, match => ' '.repeat(match.length));
        for (const match of content.matchAll(nativeButtonPattern)) {
          const tag = match[0];
          const hasButtonType = /\btype\s*=\s*(['"])button\1/i.test(tag);
          const isDomainControl = /\bdata-domain-control(?:\s|=|>)/i.test(tag);
          if (hasButtonType && isDomainControl) continue;

          violations.push({
            file: template.file,
            line: templateLine(template, match.index ?? 0),
            message: 'raw <button> requires type="button" and data-domain-control',
          });
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('enforces resolved domain, shared and public feature boundaries without cycles', () => {
    const violations: Violation[] = [];
    const edges = new Map<string, Set<string>>();
    for (const file of sourceFiles(join(projectRoot, 'src/app')).filter(file => file.endsWith('.ts'))) {
      const from = displayPath(file);
      const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
      const unresolved: ts.Node[] = [];
      for (const dependency of dependencies(source, unresolved)) {
        const specifier = dependency.text;
        const resolved = ts.resolveModuleName(specifier, file, compilerOptions, ts.sys).resolvedModule;
        const to = resolved ? displayPath(resolved.resolvedFileName) : '';
        const issue = !resolved && /^(\.|@features\/|@core\/|@shared\/|@layouts\/)/.test(specifier)
          ? 'local dependency could not be resolved'
          : boundaryIssue(from, to, specifier);
        if (issue) violations.push({
          file: from,
          line: source.getLineAndCharacterOfPosition(dependency.getStart(source)).line + 1,
          message: `${issue}: ${specifier}`,
        });
        const owner = from.match(/^src\/app\/features\/([^/]+)\//)?.[1];
        const targetOwner = to.match(/^src\/app\/features\/([^/]+)\//)?.[1];
        if (owner && targetOwner && owner !== targetOwner) {
          if (!edges.has(owner)) edges.set(owner, new Set());
          edges.get(owner)!.add(targetOwner);
        }
      }
      for (const dependency of unresolved) violations.push({
        file: from,
        line: source.getLineAndCharacterOfPosition(dependency.getStart(source)).line + 1,
        message: 'module path must be a literal so architecture boundaries can be checked',
      });
    }
    expect(violations).toEqual([]);
    expect(featureCycles(edges)).toEqual([]);
  });

  it('recognizes imports, re-exports, dynamic imports and type imports', () => {
    const source = ts.createSourceFile('sample.ts', `
      import {A} from 'a'; import 'b'; export {C} from 'c'; export * from 'd';
      const e = import('e'); type F = import('f').F; import g = require('g');
      const h = require('h'); const i = import(\`i\`);
      // import {ignored} from 'comment';
    `, ts.ScriptTarget.Latest, true);
    expect(dependencies(source).map(node => node.text)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']);
  });

  it('rejects computed module paths instead of silently skipping their boundaries', () => {
    const source = ts.createSourceFile('sample.ts', `
      const a = import('@features/' + name); const b = require(name);
      const c = import(\`@features/\${name}\`);
    `, ts.ScriptTarget.Latest, true);
    const unresolved: ts.Node[] = [];
    expect(dependencies(source, unresolved)).toEqual([]);
    expect(unresolved).toHaveLength(3);
  });

  it('resolves relative and alias paths before applying ownership rules', () => {
    const from = 'src/app/features/learning/routes.ts';
    for (const specifier of [
      '../vocabulary/infrastructure/vocabulary.http-repository',
      '@features/vocabulary/infrastructure/vocabulary.http-repository',
    ]) {
      const resolved = ts.resolveModuleName(specifier, resolve(projectRoot, from), compilerOptions, ts.sys).resolvedModule;
      expect(resolved).toBeDefined();
      expect(boundaryIssue(from, displayPath(resolved!.resolvedFileName), specifier)).not.toBeNull();
    }
    expect(boundaryIssue(from, 'src/app/features/vocabulary/public-api.ts', '')).toBeNull();
    expect(boundaryIssue('src/app/features/admin/routes.ts', 'src/app/features/vocabulary/public-api.ts', '')).not.toBeNull();
    expect(boundaryIssue('src/app/features/learning/domain/model.ts', 'src/app/features/learning/application/service.ts', '')).not.toBeNull();
    expect(boundaryIssue('src/app/shared/bridge.ts', 'src/app/features/vocabulary/public-api.ts', '')).not.toBeNull();
  });

  it('detects indirect feature cycles but permits one-way reuse', () => {
    const edges = new Map([['a', new Set(['b'])], ['b', new Set(['c'])]]);
    expect(featureCycles(edges)).toEqual([]);
    edges.set('c', new Set(['a']));
    expect(featureCycles(edges)).toEqual([['a', 'b', 'c', 'a']]);
  });
});
