import { describe, it, expect } from 'vitest';
import {
  substitutePromptVariables,
  extractVariableNames,
  validatePromptVariables,
} from '../prompts';

describe('substitutePromptVariables', () => {
  it('should substitute single variable', () => {
    const template = 'A {color} robot';
    const values = { color: 'red' };
    expect(substitutePromptVariables(template, values)).toBe('A red robot');
  });

  it('should substitute multiple variables', () => {
    const template = '{count} {color} {item}';
    const values = { count: 3, color: 'blue', item: 'turrets' };
    expect(substitutePromptVariables(template, values)).toBe('3 blue turrets');
  });

  it('should substitute same variable multiple times', () => {
    const template = '{color} {item} with {color} accents';
    const values = { color: 'neon', item: 'turret' };
    expect(substitutePromptVariables(template, values)).toBe(
      'neon turret with neon accents'
    );
  });

  it('should handle numeric values', () => {
    const template = 'Level {level}';
    const values = { level: 42 };
    expect(substitutePromptVariables(template, values)).toBe('Level 42');
  });

  it('should leave unmatched variables unchanged', () => {
    const template = 'A {color} {item}';
    const values = { color: 'red' };
    expect(substitutePromptVariables(template, values)).toBe('A red {item}');
  });

  it('should handle empty template', () => {
    expect(substitutePromptVariables('', {})).toBe('');
  });

  it('should handle template with no variables', () => {
    const template = 'A static template';
    expect(substitutePromptVariables(template, {})).toBe('A static template');
  });
});

describe('extractVariableNames', () => {
  it('should extract single variable', () => {
    expect(extractVariableNames('A {color} robot')).toEqual(['color']);
  });

  it('should extract multiple variables', () => {
    const result = extractVariableNames('{count} {color} {item}');
    expect(result).toEqual(expect.arrayContaining(['count', 'color', 'item']));
    expect(result).toHaveLength(3);
  });

  it('should deduplicate repeated variables', () => {
    const result = extractVariableNames('{color} item with {color} accent');
    expect(result).toEqual(['color']);
  });

  it('should return empty array for no variables', () => {
    expect(extractVariableNames('A red robot')).toEqual([]);
  });

  it('should extract alphanumeric and underscore variables', () => {
    const result = extractVariableNames('{var_1} {var2} {VAR_3}');
    expect(result).toEqual(expect.arrayContaining(['var_1', 'var2', 'VAR_3']));
  });

  it('should handle empty template', () => {
    expect(extractVariableNames('')).toEqual([]);
  });
});

describe('validatePromptVariables', () => {
  it('should validate when all variables provided', () => {
    const template = '{color} {item}';
    const values = { color: 'red', item: 'turret' };
    const result = validatePromptVariables(template, values);
    expect(result.isValid).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('should detect missing variables', () => {
    const template = '{color} {item} {size}';
    const values = { color: 'red' };
    const result = validatePromptVariables(template, values);
    expect(result.isValid).toBe(false);
    expect(result.missing).toEqual(expect.arrayContaining(['item', 'size']));
  });

  it('should treat empty string as missing', () => {
    const template = '{color}';
    const values = { color: '   ' };
    const result = validatePromptVariables(template, values);
    expect(result.isValid).toBe(false);
    expect(result.missing).toContain('color');
  });

  it('should accept numeric values', () => {
    const template = '{count}';
    const values = { count: 5 };
    const result = validatePromptVariables(template, values);
    expect(result.isValid).toBe(true);
  });

  it('should treat zero as falsy (current behavior)', () => {
    const template = '{count}';
    const values = { count: 0 };
    const result = validatePromptVariables(template, values);
    expect(result.isValid).toBe(false);
    expect(result.missing).toContain('count');
  });

  it('should handle template with no variables', () => {
    const result = validatePromptVariables('static text', {});
    expect(result.isValid).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('should detect multiple missing variables', () => {
    const template = '{a} {b} {c}';
    const values = { a: 'value' };
    const result = validatePromptVariables(template, values);
    expect(result.isValid).toBe(false);
    expect(result.missing).toHaveLength(2);
    expect(result.missing).toContain('b');
    expect(result.missing).toContain('c');
  });
});
