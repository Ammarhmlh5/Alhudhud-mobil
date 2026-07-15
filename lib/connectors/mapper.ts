import { MappingRule } from './types';

interface MappingConfig {
  rules: MappingRule[];
  template?: Record<string, any>;
}

export class DataMapper {
  applyMapping(data: Record<string, any>, mapping: MappingConfig): Record<string, any> {
    if (mapping.template) {
      return this.applyTemplate(mapping.template, data);
    }

    const result: Record<string, any> = { ...data };
    for (const rule of mapping.rules) {
      const value = this.resolveValue(data, rule);
      if (value !== undefined) {
        result[rule.targetField] = value;
      } else if (rule.defaultValue !== undefined) {
        result[rule.targetField] = rule.defaultValue;
      }
    }
    return result;
  }

  extractFromPayload(payload: any, mapping: MappingConfig): any {
    if (mapping.rules.length === 0) return payload;

    const result: Record<string, any> = {};
    for (const rule of mapping.rules) {
      const value = this.getNestedValue(payload, rule.sourceField);
      if (value !== undefined) {
        result[rule.targetField] = this.transform(value, rule.transform || 'none');
      } else if (rule.defaultValue !== undefined) {
        result[rule.targetField] = rule.defaultValue;
      }
    }
    return result;
  }

  private applyTemplate(template: Record<string, any>, data: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(template)) {
      if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
        const field = value.slice(2, -2).trim();
        result[key] = this.getNestedValue(data, field);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = this.applyTemplate(value, data);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  private resolveValue(data: Record<string, any>, rule: MappingRule): any {
    let value: any;

    if (rule.concatFields && rule.transform === 'concat') {
      const separator = (rule as any).separator ?? ' ';
      value = rule.concatFields
        .map(f => this.getNestedValue(data, f))
        .filter(v => v !== undefined && v !== null && v !== '')
        .join(separator);
    } else {
      value = this.getNestedValue(data, rule.sourceField);
    }

    return this.transform(value, rule.transform || 'none');
  }

  private getNestedValue(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = current[part];
    }
    return current;
  }

  private transform(value: any, transform: string): any {
    switch (transform) {
      case 'uppercase':
        return String(value).toUpperCase();
      case 'lowercase':
        return String(value).toLowerCase();
      case 'to_string':
        return String(value);
      case 'to_number':
        const num = Number(value);
        return isNaN(num) ? value : num;
      case 'timestamp':
        return new Date().toISOString();
      default:
        return value;
    }
  }

  generateMappingFromSample(sampleData: Record<string, any>): MappingRule[] {
    const rules: MappingRule[] = [];
    for (const [key] of Object.entries(sampleData)) {
      rules.push({
        sourceField: key,
        targetField: key,
        transform: 'none',
      });
    }
    return rules;
  }
}

export const dataMapper = new DataMapper();
