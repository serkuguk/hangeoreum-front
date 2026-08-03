import {Dirent, readFileSync, readdirSync} from 'node:fs';
import {join, relative} from 'node:path';

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
});
