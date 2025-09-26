import { constructSelector, checkRobotsTxt } from '../modules/utils.js';
import { jest } from '@jest/globals';

describe('Utils', () => {
  describe('constructSelector', () => {
    test('should construct CSS selector', () => {
      expect(constructSelector('body', 'tag')).toBe('body');
    });

    test('should construct ID selector', () => {
      expect(constructSelector('main', 'id')).toBe('#main');
    });

    test('should construct class selector', () => {
      expect(constructSelector('content', 'class')).toBe('.content');
    });

    test('should construct tag selector', () => {
      expect(constructSelector('div', 'tag')).toBe('div');
    });

    test('should throw error for invalid type', () => {
      expect(() => constructSelector('test', 'invalid')).toThrow('Invalid selector type');
    });
  });

  describe('checkRobotsTxt', () => {
    test('should return true when robots.txt allows access', async () => {
      // Mock fetch for robots.txt
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve('User-agent: *\nAllow: /')
        })
      );

      const result = await checkRobotsTxt('https://example.com', 'TestBot');
      expect(result).toBe(true);
    });

    test('should return false when robots.txt disallows access', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve('User-agent: *\nDisallow: /')
        })
      );

      const result = await checkRobotsTxt('https://example.com', 'TestBot');
      expect(result).toBe(false);
    });

    test('should return true when robots.txt does not exist', async () => {
      global.fetch = jest.fn(() => Promise.resolve({ ok: false }));

      const result = await checkRobotsTxt('https://example.com', 'TestBot');
      expect(result).toBe(true);
    });
  });
});