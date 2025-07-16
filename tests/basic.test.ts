/**
 * Basic functionality tests
 */

describe('Basic Tests', () => {
  it('should run basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle string operations', () => {
    const testString = 'Hello World';
    expect(testString.toLowerCase()).toBe('hello world');
    expect(testString.includes('World')).toBe(true);
  });

  it('should handle array operations', () => {
    const testArray = [1, 2, 3, 4, 5];
    expect(testArray.length).toBe(5);
    expect(testArray.filter(x => x > 3)).toEqual([4, 5]);
  });

  it('should handle async operations', async () => {
    const asyncFunction = async () => {
      return new Promise(resolve => {
        setTimeout(() => resolve('done'), 10);
      });
    };

    const result = await asyncFunction();
    expect(result).toBe('done');
  });
});